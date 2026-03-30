'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import ProgressBar from '@/components/onboarding/ProgressBar'
import StepProfile, { type ProfileData } from '@/components/onboarding/StepProfile'
import StepConnect from '@/components/onboarding/StepConnect'
import StepFirstDeal from '@/components/onboarding/StepFirstDeal'

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [profileData, setProfileData] = useState<ProfileData>({
    fullName: '',
    companyName: '',
    role: '',
    teamSize: '',
    industry: '',
  })

  // Load user data to pre-fill from Google if available
  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          window.location.href = '/login'
          return
        }

        // Check if already onboarded
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed, full_name, company_name, user_role, team_size, industry')
          .eq('id', user.id)
          .single()

        if (profile?.onboarding_completed) {
          window.location.href = '/dashboard'
          return
        }

        // Pre-fill from existing data
        const fullName =
          profile?.full_name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          ''

        setProfileData((prev) => ({
          ...prev,
          fullName,
          companyName: profile?.company_name || '',
          role: profile?.user_role || '',
          teamSize: profile?.team_size || '',
          industry: profile?.industry || '',
        }))
      } catch {
        // silently continue
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [])

  async function handleProfileNext(data: ProfileData) {
    setProfileData(data)

    // Save profile data to Supabase
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').update({
          full_name: data.fullName,
          company_name: data.companyName,
          user_role: data.role,
          team_size: data.teamSize,
          industry: data.industry,
        }).eq('id', user.id)
      }
    } catch {
      // continue even if save fails
    }

    setStep(1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <>
      <ProgressBar currentStep={step} />

      {step === 0 && (
        <StepProfile initialData={profileData} onNext={handleProfileNext} />
      )}

      {step === 1 && (
        <StepConnect onNext={() => setStep(2)} onBack={() => setStep(0)} />
      )}

      {step === 2 && (
        <StepFirstDeal onComplete={() => {}} onBack={() => setStep(1)} />
      )}
    </>
  )
}
