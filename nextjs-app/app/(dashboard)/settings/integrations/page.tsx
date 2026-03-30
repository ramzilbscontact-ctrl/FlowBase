import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  ArrowLeft,
  Chrome,
  CheckCircle2,
  ExternalLink,
  Zap,
  Clock,
} from 'lucide-react'
import ApiKeyManager from '@/components/settings/ApiKeyManager'
import WebhookManager from '@/components/settings/WebhookManager'
import NotionExportButton from '@/components/settings/NotionExportButton'
import { CopyUrlButtonClient } from './CopyUrlButtonClient'

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ notion?: string; error?: string }>
}) {
  const { notion, error } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: googleToken } = user
    ? await supabase.from('google_tokens').select('id').eq('user_id', user.id).maybeSingle()
    : { data: null }
  const googleConnected = !!googleToken

  const { data: notionToken } = user
    ? await supabase.from('notion_tokens').select('workspace_name').eq('user_id', user.id).maybeSingle()
    : { data: null }
  const notionConnected = !!notionToken

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const apiEndpoint = `${siteUrl}/api/v1`

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Integrations</h1>
          <p className="text-sm text-gray-500">Gerez vos cles API, webhooks et applications connectees.</p>
        </div>
      </div>

      {/* Status banners */}
      {notion === 'connected' && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Notion connecte avec succes{notionToken?.workspace_name ? ` (${notionToken.workspace_name})` : ''}.
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error === 'notion_config_error'
            ? 'Erreur de configuration Notion. Verifiez les variables d\'environnement.'
            : error === 'notion_denied'
            ? 'Acces Notion refuse.'
            : error === 'notion_token_failed'
            ? 'Echange de token Notion echoue.'
            : `Erreur : ${error}`}
        </div>
      )}

      {/* Section 1: API Keys */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <ApiKeyManager />
      </section>

      {/* Section 2: Webhooks */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <WebhookManager />
      </section>

      {/* Section 3: Connected Apps */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          Applications connectees
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Google Workspace */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <Chrome className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Google Workspace</h4>
                <p className="text-xs text-gray-500">Gmail & Calendar</p>
              </div>
            </div>
            {googleConnected ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <CheckCircle2 className="h-3 w-3" />
                Connecte
              </span>
            ) : (
              <Link
                href="/settings"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Connecter
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>

          {/* Notion */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gray-900 p-2">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.29 2.15c-.467-.374-.7-.467-1.166-.42L4.32 3.015c-.466.047-.56.28-.374.466zM5.252 7.362v13.77c0 .746.373 1.026 1.213.98l14.477-.84c.84-.046.934-.56.934-1.166V6.476c0-.607-.234-.934-.747-.887L6.419 6.43c-.56.047-.84.327-.84.934h-.327zm14.15.654c.094.42 0 .84-.42.887l-.7.14v10.17c-.607.327-1.166.514-1.633.514-.747 0-.934-.234-1.494-.934L11.1 12.676v5.92l1.447.327s0 .84-1.166.84l-3.22.187c-.093-.187 0-.654.327-.747l.84-.233V10.55L7.883 10.41c-.094-.42.14-1.026.747-1.073l3.454-.233 4.249 6.49V10.13l-1.213-.14c-.094-.514.28-.887.747-.934l3.453-.233h.327z"/>
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Notion</h4>
                <p className="text-xs text-gray-500">
                  {notionConnected ? notionToken?.workspace_name ?? 'Workspace connecte' : 'Exportez vos donnees CRM'}
                </p>
              </div>
            </div>
            {notionConnected ? (
              <div className="space-y-3">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Connecte
                </span>
                <NotionExportButton />
              </div>
            ) : (
              <a
                href="/api/notion/connect"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800 transition-colors"
              >
                Connecter Notion
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {/* n8n / Make */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-100 p-2">
                <Zap className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">n8n / Make</h4>
                <p className="text-xs text-gray-500">Automatisations no-code</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                Utilisez cette URL comme endpoint dans n8n ou Make :
              </p>
              <div className="flex items-center gap-1">
                <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1.5 font-mono text-gray-700 truncate">
                  {apiEndpoint}
                </code>
                <CopyUrlButtonClient url={apiEndpoint} />
              </div>
              <p className="text-xs text-gray-400">
                Generez une cle API ci-dessus et ajoutez-la comme header Authorization: Bearer &lt;key&gt;
              </p>
            </div>
          </div>

          {/* Apollo.io */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 opacity-70">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-100 p-2">
                <svg className="h-5 w-5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Apollo.io</h4>
                <p className="text-xs text-gray-500">Prospection & enrichissement</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
              <Clock className="h-3 w-3" />
              Bientot disponible
            </span>
          </div>

          {/* Clay */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 opacity-70">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-teal-100 p-2">
                <svg className="h-5 w-5 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Clay</h4>
                <p className="text-xs text-gray-500">Enrichissement de donnees</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
              <Clock className="h-3 w-3" />
              Bientot disponible
            </span>
          </div>

          {/* Fireflies.ai */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 opacity-70">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-yellow-100 p-2">
                <svg className="h-5 w-5 text-yellow-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Fireflies.ai</h4>
                <p className="text-xs text-gray-500">Transcription de reunions</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
              <Clock className="h-3 w-3" />
              Bientot disponible
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}

