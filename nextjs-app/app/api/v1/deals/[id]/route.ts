// GET /api/v1/deals/[id] — Get single deal
// PATCH /api/v1/deals/[id] — Update deal
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

const SELECT_FIELDS = 'id, title, value, stage_id, contact_id, company_id, assigned_to, closed_at, created_at, updated_at'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticateApiKey(req)
  if (auth instanceof NextResponse) return auth
  const user = auth as ApiUser
  const { id } = await ctx.params

  if (!hasPermission(user, 'deals', 'read')) {
    return apiError('Insufficient permissions for deals', 403)
  }

  const supabase = admin()
  const { data, error } = await supabase
    .from('deals')
    .select(SELECT_FIELDS)
    .eq('id', id)
    .eq('owner_id', user.userId)
    .is('deleted_at', null)
    .single()

  if (error || !data) return apiError('Deal not found', 404)

  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticateApiKey(req)
  if (auth instanceof NextResponse) return auth
  const user = auth as ApiUser
  const { id } = await ctx.params

  if (!hasPermission(user, 'deals', 'write')) {
    return apiError('Insufficient permissions for deals', 403)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  const allowed = ['title', 'value', 'stage_id', 'contact_id', 'company_id', 'assigned_to', 'closed_at']
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const supabase = admin()
  const { data, error } = await supabase
    .from('deals')
    .update(updates)
    .eq('id', id)
    .eq('owner_id', user.userId)
    .is('deleted_at', null)
    .select(SELECT_FIELDS)
    .single()

  if (error || !data) return apiError('Deal not found or update failed', 404)

  dispatchWebhook(user.userId, 'deal.updated', data)

  return NextResponse.json({ data })
}
