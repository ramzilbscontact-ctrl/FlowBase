'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function TwoFactorPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get the enrolled TOTP factor ID
    async function getFactorId() {
      const supabase = createClient()
      const { data } = await supabase.auth.mfa.listFactors()
      const totpFactor = data?.totp?.[0]
      if (totpFactor) setFactorId(totpFactor.id)
    }
    getFactorId()
  }, [])

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId) return
    setLoading(true)
    setError(null)
    const supabase = createClient()

    // Step 1: Create a challenge
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
    if (challengeError) {
      setError(challengeError.message)
      setLoading(false)
      return
    }

    // Step 2: Verify the code against the challenge
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    })

    if (verifyError) {
      setError('Code incorrect. Veuillez réessayer.')
      setLoading(false)
      return
    }

    // Success — session is now AAL2, proxy.ts will allow dashboard access
    router.push('/')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-center">Vérification 2FA</h1>
      <p className="text-gray-600 text-sm text-center">
        Entrez le code de votre application d&apos;authentification.
      </p>
      {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded">{error}</div>}
      <form onSubmit={handleVerify} className="space-y-4">
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          maxLength={6}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-center text-2xl tracking-widest focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={loading || code.length < 6}
          className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md disabled:opacity-50"
        >
          {loading ? 'Vérification...' : 'Vérifier'}
        </button>
      </form>
    </div>
  )
}
