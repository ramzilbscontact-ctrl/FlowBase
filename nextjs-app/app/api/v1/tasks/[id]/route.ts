// GET /api/v1/tasks/[id] — Get single task
// PATCH /api/v1/tasks/[id] — Update task
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

const SELECT_FIELDS =
  'id, title, description, due_date, completed, completed_at, contact_id, deal_id, assigned_to, created_at, updated_at'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticateApiKey(req)
  if (auth instanceof NextResponse) return auth
  const user = auth as ApiUser
  const { id } = await ctx.params

  if (!hasPermission(user, 'tasks', 'read')) {
    return apiError('Insufficient permissions for tasks', 403)
  }

  const supabase = admin()
  const { data, error } = await supabase
    .from('tasks')
    .select(SELECT_FIELDS)
    .eq('id', id)
    .eq('owner_id', user.userId)
    .is('deleted_at', null)
    .single()

  if (error || !data) return apiError('Task not found', 404)

  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticateApiKey(req)
  if (auth instanceof NextResponse) return auth
  const user = auth as ApiUser
  const { id } = await ctx.params

  if (!hasPermission(user, 'tasks', 'write')) {
    return apiError('Insufficient permissions for tasks', 403)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  const allowed = ['title', 'description', 'due_date', 'completed', 'contact_id', 'deal_id', 'assigned_to']
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  // Auto-set completed_at when marking complete
  if (body.completed === true) {
    updates.completed_at = new Date().toISOString()
  } else if (body.completed === false) {
    updates.completed_at = null
  }

  const supabase = admin()
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .eq('owner_id', user.userId)
    .is('deleted_at', null)
    .select(SELECT_FIELDS)
    .single()

  if (error || !data) return apiError('Task not found or update failed', 404)

  dispatchWebhook(user.userId, 'task.updated', data)

  return NextResponse.json({ data })
}
