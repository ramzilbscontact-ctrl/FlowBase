'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AppLayout } from '@/components/layout/AppLayout'
import { CommandBarProvider } from '@/components/ai/CommandBarProvider'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } }
  }))
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function checkOnboarding() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setChecking(false)
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single()

        if (profile && !profile.onboarding_completed) {
          window.location.href = '/onboarding'
          return
        }
      } catch {
        // If check fails, let user proceed to dashboard
      }
      setChecking(false)
    }
    checkOnboarding()
  }, [])

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <CommandBarProvider>
        <AppLayout>{children}</AppLayout>
      </CommandBarProvider>
    </QueryClientProvider>
  )
}
