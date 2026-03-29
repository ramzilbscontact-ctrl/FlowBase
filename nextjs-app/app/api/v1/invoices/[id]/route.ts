// GET /api/v1/invoices/[id] — Get single invoice with items
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import {
  authenticateApiKey,
  hasPermission,
  apiError,
  type ApiUser,
} from '@/lib/api/auth'

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

  if (!hasPermission(user, 'invoices', 'read')) {
    return apiError('Insufficient permissions for invoices', 403)
  }

  const supabase = admin()

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, contact_id, company_id, status, issue_date, due_date, subtotal, tax_rate, tax_amount, total, amount_paid, notes, created_at, updated_at')
    .eq('id', id)
    .eq('owner_id', user.userId)
    .is('deleted_at', null)
    .single()

  if (error || !invoice) return apiError('Invoice not found', 404)

  // Fetch items
  const { data: items } = await supabase
    .from('invoice_items')
    .select('id, description, quantity, unit_price, total')
    .eq('invoice_id', id)

  return NextResponse.json({ data: { ...invoice, items: items || [] } })
}
