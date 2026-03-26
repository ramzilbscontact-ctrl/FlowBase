import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * OAuth/PKCE callback route.
 * Supabase redirects here after Google OAuth or email magic-link.
 * We exchange the authorization code for a session and redirect to the app.
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
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Successful auth — redirect to requested destination or dashboard
      const redirectUrl = next.startsWith('/') ? `${origin}${next}` : `${origin}/dashboard`
      return NextResponse.redirect(redirectUrl)
    }

    console.error('[auth/callback] exchangeCodeForSession error:', error.message)
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent('Échec de la connexion. Veuillez réessayer.')}`
  )
}
