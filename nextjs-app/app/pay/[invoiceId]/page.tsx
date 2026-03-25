'use client'

import { use, useEffect, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function CheckoutForm({ invoiceId }: { invoiceId: string }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href + '?paid=1' },
    })
    if (error) setMessage(error.message ?? 'Erreur de paiement')
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <button
        type="submit"
        disabled={loading || !stripe}
        className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-lg font-medium disabled:opacity-50 transition-colors"
      >
        {loading ? 'Traitement...' : 'Payer maintenant'}
      </button>
      {message && <p className="text-red-600 text-sm">{message}</p>}
    </form>
  )
}

export default function PayPage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = use(params)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paid, setPaid] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search)
      setPaid(searchParams.get('paid') === '1')
    }
  }, [])

  useEffect(() => {
    if (paid) return
    fetch(`/api/invoices/${invoiceId}/pay`, { method: 'POST' })
      .then(r => r.json())
      .then(d => {
        if (d.client_secret) setClientSecret(d.client_secret)
        else setError(d.error ?? 'Erreur')
      })
      .catch(() => setError('Erreur réseau'))
  }, [invoiceId, paid])

  if (paid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Paiement confirmé</h1>
          <p className="text-gray-500 text-sm">Merci, votre paiement a été traité avec succès.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Payer la facture</h1>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        {clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm invoiceId={invoiceId} />
          </Elements>
        ) : !error ? (
          <p className="text-gray-400 text-sm">Chargement...</p>
        ) : null}
      </div>
    </div>
  )
}
