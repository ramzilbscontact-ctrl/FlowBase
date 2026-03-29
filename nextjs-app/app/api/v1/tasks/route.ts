// GET /api/v1/tasks — List tasks (paginated, filterable)
// POST /api/v1/tasks — Create a task
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import {
  authenticateApiKey,
  hasPermission,
  apiError,
  paginatedResponse,
  parsePagination,
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

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req)
  if (auth instanceof NextResponse) return auth
  const user = auth as ApiUser

  if (!hasPermission(user, 'tasks', 'read')) {
    return apiError('Insufficient permissions for tasks', 403)
  }

  const { page, perPage, offset } = parsePagination(req)
  const url = new URL(req.url)
  const supabase = admin()

  let query = supabase
    .from('tasks')
    .select(SELECT_FIELDS, { count: 'exact' })
    .eq('owner_id', user.userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  const completed = url.searchParams.get('completed')
  if (completed === 'true') query = query.eq('completed', true)
  if (completed === 'false') query = query.eq('completed', false)

  const assignedTo = url.searchParams.get('assigned_to')
  if (assignedTo) query = query.eq('assigned_to', assignedTo)

  const dealId = url.searchParams.get('deal_id')
  if (dealId) query = query.eq('deal_id', dealId)

  const contactId = url.searchParams.get('contact_id')
  if (contactId) query = query.eq('contact_id', contactId)

  const { data, count, error } = await query

  if (error) return apiError(error.message, 500)

  return paginatedResponse(data || [], count || 0, page, perPage)
}

export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req)
  if (auth instanceof NextResponse) return auth
  const user = auth as ApiUser

  if (!hasPermission(user, 'tasks', 'write')) {
    return apiError('Insufficient permissions for tasks', 403)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  if (!body.title) return apiError('title is required', 400)

  const supabase = admin()
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      owner_id: user.userId,
      title: body.title as string,
      description: body.description as string || null,
      due_date: body.due_date as string || null,
      completed: (body.completed as boolean) || false,
      contact_id: body.contact_id as string || null,
      deal_id: body.deal_id as string || null,
      assigned_to: body.assigned_to as string || null,
    })
    .select(SELECT_FIELDS)
    .single()

  if (error) return apiError(error.message, 422)

  dispatchWebhook(user.userId, 'task.created', data)

  return NextResponse.json({ data }, { status: 201 })
}
