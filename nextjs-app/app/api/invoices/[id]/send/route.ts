import { Resend } from 'resend'
import { renderToBuffer } from '@react-pdf/renderer'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { InvoicePDF } from '@/components/pdf/InvoicePDF'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, invoice_items(*), contacts(first_name, last_name, email)')
    .eq('id', id)
    .single()
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const toEmail = (invoice.contacts as { email?: string | null } | null)?.email
  if (!toEmail) return NextResponse.json({ error: 'No contact email' }, { status: 400 })

  const buffer = await renderToBuffer(<InvoicePDF invoice={invoice} />)

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'factures@yourdomain.com',
    to: toEmail,
    subject: `Facture ${invoice.invoice_number}`,
    html: `<p>Veuillez trouver ci-joint votre facture <strong>${invoice.invoice_number}</strong>.</p>`,
    attachments: [
      {
        filename: `facture-${invoice.invoice_number}.pdf`,
        content: buffer,
      },
    ],
  })

  // Update invoice status to 'sent'
  await supabase.from('invoices').update({ status: 'sent' }).eq('id', id)

  return NextResponse.json({ sent: true })
}
