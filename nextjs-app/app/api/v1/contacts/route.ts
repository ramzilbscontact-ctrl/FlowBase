// GET /api/v1/contacts — List contacts (paginated, filterable)
// POST /api/v1/contacts — Create a contact
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

  if (!hasPermission(user, 'contacts', 'read')) {
    return apiError('Insufficient permissions for contacts', 403)
  }

  const { page, perPage, offset } = parsePagination(req)
  const url = new URL(req.url)
  const supabase = admin()

  let query = supabase
    .from('contacts')
    .select('id, first_name, last_name, email, phone, company_id, company_name, tags, notes, created_at, updated_at', { count: 'exact' })
    .eq('owner_id', user.userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  // Filters
  const email = url.searchParams.get('email')
  if (email) query = query.ilike('email', `%${email}%`)

  const company = url.searchParams.get('company')
  if (company) query = query.ilike('company_name', `%${company}%`)

  const tags = url.searchParams.get('tags')
  if (tags) query = query.overlaps('tags', tags.split(','))

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

  if (!hasPermission(user, 'contacts', 'write')) {
    return apiError('Insufficient permissions for contacts', 403)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  const supabase = admin()
  const { data, error } = await supabase
    .from('contacts')
    .insert({
      owner_id: user.userId,
      first_name: body.first_name as string || null,
      last_name: body.last_name as string || null,
      email: body.email as string || null,
      phone: body.phone as string || null,
      company_id: body.company_id as string || null,
      company_name: body.company_name as string || null,
      tags: body.tags as string[] || null,
      notes: body.notes as string || null,
    })
    .select()
    .single()

  if (error) return apiError(error.message, 422)

  dispatchWebhook(user.userId, 'contact.created', data)

  return NextResponse.json({ data }, { status: 201 })
}
