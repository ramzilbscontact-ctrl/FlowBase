import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Shield, Chrome, Puzzle } from 'lucide-react'
import { DisconnectButton } from '@/components/google/DisconnectButton'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>
}) {
  const { connected, error } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: tokenRow } = user
    ? await supabase.from('google_tokens').select('id').eq('user_id', user.id).maybeSingle()
    : { data: null }

  const isConnected = !!tokenRow

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Paramètres</h1>

      {connected === 'true' && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          Compte Google connecté avec succès.
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error === 'oauth_config_error'
            ? 'Erreur de configuration OAuth. Vérifiez les variables d\'environnement Google.'
            : error === 'oauth_denied'
            ? 'Accès Google refusé. Assurez-vous que votre email est ajouté comme utilisateur test dans la console Google Cloud (OAuth en mode Testing).'
            : error === 'token_exchange_failed'
            ? 'Échec de l\'échange de token Google. Vérifiez que le Client ID et Secret sont corrects et que l\'URI de redirection est bien configurée.'
            : 'Erreur de connexion Google. Veuillez réessayer.'}
        </div>
      )}

      {/* 2FA Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-start gap-4">
        <div className="rounded-lg bg-violet-100 p-2.5">
          <Shield className="h-5 w-5 text-violet-600" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-gray-900">Authentification à deux facteurs</h2>
          <p className="mt-1 text-sm text-gray-500">
            Sécurisez votre compte avec un code TOTP à usage unique.
          </p>
          <Link
            href="/dashboard/settings/2fa"
            className="mt-3 inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-violet-600 text-white hover:bg-violet-700"
          >
            Gérer la 2FA
          </Link>
        </div>
      </div>

      {/* Google Workspace Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-start gap-4">
        <div className="rounded-lg bg-blue-100 p-2.5">
          <Chrome className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-gray-900">Google Workspace</h2>
          <p className="mt-1 text-sm text-gray-500">
            Connectez votre compte Google pour envoyer des emails via Gmail et créer des événements Google Calendar.
          </p>
          <div className="mt-3 flex items-center gap-3">
            {isConnected ? (
              <>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  Connecté
                </span>
                <DisconnectButton />
              </>
            ) : (
              <a
                href="/api/google/connect"
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                Connecter Google
              </a>
            )}
          </div>
        </div>
      </div>
      {/* Integrations Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-start gap-4">
        <div className="rounded-lg bg-amber-100 p-2.5">
          <Puzzle className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-gray-900">Integrations</h2>
          <p className="mt-1 text-sm text-gray-500">
            Cles API, webhooks, Notion, n8n, Make et autres applications connectees.
          </p>
          <Link
            href="/settings/integrations"
            className="mt-3 inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700"
          >
            Gerer les integrations
          </Link>
        </div>
      </div>
    </div>
  )
}
