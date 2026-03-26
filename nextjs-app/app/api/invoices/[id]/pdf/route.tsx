import { renderToBuffer } from '@react-pdf/renderer'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { InvoicePDF } from '@/components/pdf/InvoicePDF'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, invoice_items(*), contacts(first_name, last_name)')
    .eq('id', id)
    .single()
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const buffer = await renderToBuffer(<InvoicePDF invoice={invoice} />)
  return new Response(Uint8Array.from(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="facture-${invoice.invoice_number}.pdf"`,
    },
  })
}
