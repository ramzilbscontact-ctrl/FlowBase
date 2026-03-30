'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface StepFirstDealProps {
  onComplete: () => void
  onBack: () => void
}

const stageOptions = [
  'Prospect',
  'Qualification',
  'Proposal',
  'Negotiation',
  'Won',
]

export default function StepFirstDeal({ onComplete, onBack }: StepFirstDealProps) {
  const [dealName, setDealName] = useState('Acme Corp - Licence Pro')
  const [company, setCompany] = useState('Acme Corp')
  const [value, setValue] = useState('12000')
  const [stage, setStage] = useState('Prospect')
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const finishOnboarding = useCallback(async () => {
    try {
      await fetch('/api/onboarding/complete', { method: 'POST' })
    } catch {
      // continue even if this fails
    }
  }, [])

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Create pipeline stages if none exist
      const { data: existingStages } = await supabase
        .from('pipeline_stages')
        .select('id, name')
        .eq('owner_id', user.id)

      let stageId: string | null = null

      if (!existingStages || existingStages.length === 0) {
        // Create default stages
        const defaultStages = stageOptions.map((name, i) => ({
          owner_id: user.id,
          name,
          position: i,
        }))
        const { data: created } = await supabase
          .from('pipeline_stages')
          .insert(defaultStages)
          .select('id, name')

        if (created) {
          const match = created.find((s) => s.name === stage)
          stageId = match?.id ?? created[0]?.id ?? null
        }
      } else {
        const match = existingStages.find((s) => s.name === stage)
        stageId = match?.id ?? existingStages[0]?.id ?? null
      }

      // Create the deal
      await supabase.from('deals').insert({
        owner_id: user.id,
        title: dealName,
        value: parseFloat(value) || 0,
        stage_id: stageId,
      })

      await finishOnboarding()
      setCompleted(true)
      setShowConfetti(true)
    } catch {
      // handle error silently
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSkip() {
    await finishOnboarding()
    setCompleted(true)
    setShowConfetti(true)
  }

  // Confetti effect
  useEffect(() => {
    if (!showConfetti) return
    // Create confetti particles
    const container = document.getElementById('confetti-container')
    if (!container) return

    const colors = ['#4f46e5', '#818cf8', '#c7d2fe', '#fbbf24', '#34d399', '#f472b6']
    for (let i = 0; i < 60; i++) {
      const particle = document.createElement('div')
      particle.style.cssText = `
        position: absolute;
        width: ${Math.random() * 10 + 5}px;
        height: ${Math.random() * 10 + 5}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        left: ${Math.random() * 100}%;
        top: -10px;
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        animation: confetti-fall ${Math.random() * 2 + 1.5}s ease-out forwards;
        animation-delay: ${Math.random() * 0.5}s;
        opacity: 0;
      `
      container.appendChild(particle)
    }

    return () => {
      if (container) container.innerHTML = ''
    }
  }, [showConfetti])

  if (completed) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center relative overflow-hidden">
        {/* Confetti container */}
        <div id="confetti-container" className="absolute inset-0 pointer-events-none overflow-hidden" />

        <style>{`
          @keyframes confetti-fall {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(600px) rotate(720deg); opacity: 0; }
          }
        `}</style>

        <div className="relative z-10">
          <div className="text-6xl mb-4">&#127881;</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Bienvenue sur GetAgenzia !
          </h2>
          <p className="text-gray-500 mb-8">
            Votre compte est prêt. Explorez votre nouveau CRM et commencez à closer vos deals.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            Aller au Dashboard
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-5 h-5 text-indigo-600" />
        <h2 className="text-2xl font-bold text-gray-900">Votre premier deal</h2>
      </div>
      <p className="text-gray-500 mb-8">
        Créez votre premier deal pour tester le pipeline. Des données d&apos;exemple sont pré-remplies.
      </p>

      <div className="space-y-5">
        {/* Deal name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom du deal</label>
          <input
            type="text"
            value={dealName}
            onChange={(e) => setDealName(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Company */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Entreprise</label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Valeur (EUR)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">EUR</span>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full rounded-lg border border-gray-200 pl-12 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Stage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Étape</label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              {stageOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-8 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        Créer le deal
      </button>

      {/* Navigation */}
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Retour
        </button>
        <button
          type="button"
          onClick={handleSkip}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Passer cette étape
        </button>
      </div>
    </div>
  )
}
