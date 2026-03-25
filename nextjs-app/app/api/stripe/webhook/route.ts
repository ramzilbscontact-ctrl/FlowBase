import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const body = await req.text()   // MUST be raw text — not req.json()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent
    const invoiceId = intent.metadata.invoice_id
    if (invoiceId) {
      const supabase = await createClient()

      // Mark invoice as paid
      await supabase.from('invoices')
        .update({ status: 'paid', amount_paid: intent.amount / 100 })
        .eq('id', invoiceId)

      // Retrieve owner_id from the invoice row — do NOT use supabase.auth.getUser()
      // because webhooks are unauthenticated server-to-server calls (getUser() returns null).
      const { data: invoice } = await supabase
        .from('invoices')
        .select('owner_id')
        .eq('id', invoiceId)
        .single()

      if (invoice?.owner_id) {
        await supabase.from('payments').insert({
          invoice_id: invoiceId,
          amount: intent.amount / 100,
          method: 'stripe',
          reference: intent.id,
          owner_id: invoice.owner_id,
        })
      }
    }
  }

  return NextResponse.json({ received: true })
}
