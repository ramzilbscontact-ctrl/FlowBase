import { renderToBuffer } from '@react-pdf/renderer'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PayslipPDF } from '@/components/pdf/PayslipPDF'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: payslip } = await supabase
    .from('payslips')
    .select('*, employees(full_name)')
    .eq('id', id)
    .single()
  if (!payslip) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const buffer = await renderToBuffer(<PayslipPDF payslip={payslip} />)
  const name = payslip.employees?.full_name?.replace(/\s+/g, '-').toLowerCase() ?? 'employe'
  return new Response(Uint8Array.from(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="bulletin-${name}-${payslip.period_month}-${payslip.period_year}.pdf"`,
    },
  })
}
