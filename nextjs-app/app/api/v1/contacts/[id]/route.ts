// GET /api/v1/contacts/[id] — Get single contact
// PATCH /api/v1/contacts/[id] — Update contact
// DELETE /api/v1/contacts/[id] — Soft-delete contact
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import {
  authenticateApiKey,
  hasPermission,
  apiError,
  type ApiUser,
} from '@/lib/api/auth'
import { dispatchWebhook } from '@/lib/api/webhooks'

function admin() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticateApiKey(req)
  if (auth instanceof NextResponse) return auth
  const user = auth as ApiUser
  const { id } = await ctx.params

  if (!hasPermission(user, 'contacts', 'read')) {
    return apiError('Insufficient permissions for contacts', 403)
  }

  const supabase = admin()
  const { data, error } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, email, phone, company_id, company_name, tags, notes, created_at, updated_at')
    .eq('id', id)
    .eq('owner_id', user.userId)
    .is('deleted_at', null)
    .single()

  if (error || !data) return apiError('Contact not found', 404)

  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticateApiKey(req)
  if (auth instanceof NextResponse) return auth
  const user = auth as ApiUser
  const { id } = await ctx.params

  if (!hasPermission(user, 'contacts', 'write')) {
    return apiError('Insufficient permissions for contacts', 403)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  // Only allow updating safe fields
  const allowed = ['first_name', 'last_name', 'email', 'phone', 'company_id', 'company_name', 'tags', 'notes']
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const supabase = admin()
  const { data, error } = await supabase
    .from('contacts')
    .update(updates)
    .eq('id', id)
    .eq('owner_id', user.userId)
    .is('deleted_at', null)
    .select('id, first_name, last_name, email, phone, company_id, company_name, tags, notes, created_at, updated_at')
    .single()

  if (error || !data) return apiError('Contact not found or update failed', 404)

  dispatchWebhook(user.userId, 'contact.updated', data)

  return NextResponse.json({ data })
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticateApiKey(req)
  if (auth instanceof NextResponse) return auth
  const user = auth as ApiUser
  const { id } = await ctx.params

  if (!hasPermission(user, 'contacts', 'write')) {
    return apiError('Insufficient permissions for contacts', 403)
  }

  const supabase = admin()
  const { data, error } = await supabase
    .from('contacts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner_id', user.userId)
    .is('deleted_at', null)
    .select('id')
    .single()

  if (error || !data) return apiError('Contact not found', 404)

  dispatchWebhook(user.userId, 'contact.deleted', { id })

  return NextResponse.json({ data: { id, deleted: true } })
}
