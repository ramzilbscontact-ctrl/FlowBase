import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Unified OAuth callback.
 *
 * After Google OAuth login via Supabase, this route:
 * 1. Exchanges the auth code for a Supabase session
 * 2. Auto-connects Google Workspace (Gmail + Calendar) using the provider token
 * 3. Redirects to dashboard — zero friction, one click
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (errorParam) {
    console.error('[auth/callback] OAuth error:', errorDescription)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription ?? errorParam)}`
    )
  }

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session) {
      // ── Auto-connect Google Workspace if signed in with Google ──
      const provider = data.session.user?.app_metadata?.provider
      const providerToken = data.session.provider_token
      const providerRefreshToken = data.session.provider_refresh_token

      if (provider === 'google' && providerToken) {
        try {
          const { encrypt } = await import('@/lib/google/encrypt')
          const payload = {
            user_id: data.session.user.id,
            access_token: encrypt(providerToken),
            refresh_token: providerRefreshToken ? encrypt(providerRefreshToken) : null,
            expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
            scopes: ['gmail.readonly', 'gmail.send', 'calendar.events'],
            updated_at: new Date().toISOString(),
          }
          await supabase.from('google_tokens').upsert(payload, { onConflict: 'user_id' })
          console.log('[auth/callback] ✅ Auto-connected Google Workspace for:', data.session.user.email)
        } catch (err) {
          // Non-blocking — login still succeeds
          console.error('[auth/callback] Workspace auto-connect failed (non-blocking):', err)
        }
      }

      const redirectUrl = next.startsWith('/') ? `${origin}${next}` : `${origin}/dashboard`
      return NextResponse.redirect(redirectUrl)
    }

    console.error('[auth/callback] exchangeCodeForSession error:', error?.message)
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent('Échec de la connexion. Veuillez réessayer.')}`
  )
}
