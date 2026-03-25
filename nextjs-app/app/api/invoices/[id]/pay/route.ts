import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, total, invoice_number')
    .eq('id', id)
    .single()
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const intent = await stripe.paymentIntents.create({
    amount: Math.round((invoice.total ?? 0) * 100),
    currency: 'dzd',
    metadata: { invoice_id: invoice.id, invoice_number: invoice.invoice_number ?? '' },
  })
  await supabase.from('invoices').update({ stripe_payment_intent_id: intent.id }).eq('id', id)
  return NextResponse.json({ client_secret: intent.client_secret })
}
