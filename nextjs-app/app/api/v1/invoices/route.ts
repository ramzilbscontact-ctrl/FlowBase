// GET /api/v1/invoices — List invoices (paginated)
// POST /api/v1/invoices — Create an invoice
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
  'id, invoice_number, contact_id, company_id, status, issue_date, due_date, subtotal, tax_rate, tax_amount, total, amount_paid, notes, created_at, updated_at'

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req)
  if (auth instanceof NextResponse) return auth
  const user = auth as ApiUser

  if (!hasPermission(user, 'invoices', 'read')) {
    return apiError('Insufficient permissions for invoices', 403)
  }

  const { page, perPage, offset } = parsePagination(req)
  const url = new URL(req.url)
  const supabase = admin()

  let query = supabase
    .from('invoices')
    .select(SELECT_FIELDS, { count: 'exact' })
    .eq('owner_id', user.userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  const status = url.searchParams.get('status')
  if (status) query = query.eq('status', status)

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

  if (!hasPermission(user, 'invoices', 'write')) {
    return apiError('Insufficient permissions for invoices', 403)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  if (!body.invoice_number) return apiError('invoice_number is required', 400)

  // Calculate totals
  const subtotal = (body.subtotal as number) || 0
  const taxRate = (body.tax_rate as number) || 0
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount

  const supabase = admin()
  const { data, error } = await supabase
    .from('invoices')
    .insert({
      owner_id: user.userId,
      invoice_number: body.invoice_number as string,
      contact_id: body.contact_id as string || null,
      company_id: body.company_id as string || null,
      status: (body.status as string) || 'draft',
      issue_date: body.issue_date as string || new Date().toISOString().split('T')[0],
      due_date: body.due_date as string || null,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      notes: body.notes as string || null,
    })
    .select(SELECT_FIELDS)
    .single()

  if (error) return apiError(error.message, 422)

  // If items are provided, insert them
  if (Array.isArray(body.items) && body.items.length > 0 && data) {
    const items = (body.items as Array<Record<string, unknown>>).map((item) => ({
      invoice_id: data.id,
      description: item.description as string,
      quantity: (item.quantity as number) || 1,
      unit_price: (item.unit_price as number) || 0,
      total: ((item.quantity as number) || 1) * ((item.unit_price as number) || 0),
    }))

    await supabase.from('invoice_items').insert(items)
  }

  dispatchWebhook(user.userId, 'invoice.created', data)

  return NextResponse.json({ data }, { status: 201 })
}
