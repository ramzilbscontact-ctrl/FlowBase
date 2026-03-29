// GET /api/v1/deals — List deals (paginated, filterable)
// POST /api/v1/deals — Create a deal
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

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req)
  if (auth instanceof NextResponse) return auth
  const user = auth as ApiUser

  if (!hasPermission(user, 'deals', 'read')) {
    return apiError('Insufficient permissions for deals', 403)
  }

  const { page, perPage, offset } = parsePagination(req)
  const url = new URL(req.url)
  const supabase = admin()

  let query = supabase
    .from('deals')
    .select('id, title, value, stage_id, contact_id, company_id, assigned_to, closed_at, created_at, updated_at', { count: 'exact' })
    .eq('owner_id', user.userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  const stageId = url.searchParams.get('stage_id')
  if (stageId) query = query.eq('stage_id', stageId)

  const assignedTo = url.searchParams.get('assigned_to')
  if (assignedTo) query = query.eq('assigned_to', assignedTo)

  const contactId = url.searchParams.get('contact_id')
  if (contactId) query = query.eq('contact_id', contactId)

  const search = url.searchParams.get('q')
  if (search) query = query.textSearch('search_vector', search)

  const { data, count, error } = await query

  if (error) return apiError(error.message, 500)

  return paginatedResponse(data || [], count || 0, page, perPage)
}

export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req)
  if (auth instanceof NextResponse) return auth
  const user = auth as ApiUser

  if (!hasPermission(user, 'deals', 'write')) {
    return apiError('Insufficient permissions for deals', 403)
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
    .from('deals')
    .insert({
      owner_id: user.userId,
      title: body.title as string,
      value: (body.value as number) || 0,
      stage_id: body.stage_id as string || null,
      contact_id: body.contact_id as string || null,
      company_id: body.company_id as string || null,
      assigned_to: body.assigned_to as string || null,
    })
    .select()
    .single()

  if (error) return apiError(error.message, 422)

  dispatchWebhook(user.userId, 'deal.created', data)

  return NextResponse.json({ data }, { status: 201 })
}
