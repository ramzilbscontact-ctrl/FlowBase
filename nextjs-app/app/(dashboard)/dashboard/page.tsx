import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'

async function WelcomeMessage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        Bienvenue sur Radiance ERP
        {user?.email ? (
          <span className="text-violet-600">, {user.email}</span>
        ) : null}
         !
      </h1>
      <p className="text-gray-500 mt-2">
        Votre espace de travail est prêt. Sélectionnez un module dans le menu.
      </p>
    </div>
  )
}

function WelcomeSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-8 bg-gray-200 rounded-lg w-96 max-w-full" />
      <div className="h-4 bg-gray-100 rounded w-72 max-w-full" />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <div className="p-6">
      <Suspense fallback={<WelcomeSkeleton />}>
        <WelcomeMessage />
      </Suspense>
    </div>
  )
}
