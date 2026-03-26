'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type EnrollStep = 'idle' | 'scanning' | 'verifying' | 'enrolled'

export default function TwoFactorSettingsPage() {
  const [step, setStep] = useState<EnrollStep>('idle')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [hasTotp, setHasTotp] = useState(false)

  useEffect(() => {
    async function checkFactors() {
      const supabase = createClient()
      const { data } = await supabase.auth.mfa.listFactors()
      setHasTotp(!!data?.totp?.length)
    }
    checkFactors()
  }, [])

  async function handleEnroll() {
    const supabase = createClient()
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      // friendlyName is optional — 'Radiance ERP' would show in the authenticator app
    })
    if (error || !data) {
      setError(error?.message ?? 'Enrollment failed')
      return
    }
    // data.totp.qr_code is an SVG string — render as image
    setFactorId(data.id)
    setQrCode(data.totp.qr_code)
    setStep('scanning')
  }

  async function handleVerifyEnrollment(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId) return
    const supabase = createClient()

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
    if (challengeError) { setError(challengeError.message); return }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    })
    if (verifyError) { setError('Code incorrect.'); return }

    setStep('enrolled')
    setHasTotp(true)
  }

  async function handleUnenroll() {
    const supabase = createClient()
    const { data } = await supabase.auth.mfa.listFactors()
    const factor = data?.totp?.[0]
    if (!factor) return
    await supabase.auth.mfa.unenroll({ factorId: factor.id })
    setHasTotp(false)
    setStep('idle')
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h1 className="text-xl font-bold">Authentification à deux facteurs (2FA)</h1>

      {step === 'idle' && !hasTotp && (
        <button
          onClick={handleEnroll}
          className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Activer la 2FA
        </button>
      )}

      {step === 'scanning' && qrCode && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Scannez ce QR code avec votre application d&apos;authentification (Google Authenticator, Authy, etc.)
          </p>
          {/* qr_code is an SVG string from Supabase */}
          <div
            className="flex justify-center"
            dangerouslySetInnerHTML={{ __html: qrCode }}
          />
          <form onSubmit={handleVerifyEnrollment} className="space-y-3">
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Code à 6 chiffres"
              maxLength={6}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-center text-xl tracking-widest"
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={code.length < 6}
              className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              Confirmer l&apos;activation
            </button>
          </form>
        </div>
      )}

      {(step === 'enrolled' || hasTotp) && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <span>2FA activée</span>
          </div>
          <button
            onClick={handleUnenroll}
            className="w-full py-2 px-4 border border-red-300 text-red-600 rounded-md hover:bg-red-50"
          >
            Désactiver la 2FA
          </button>
        </div>
      )}
    </div>
  )
}
