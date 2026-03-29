export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildOAuthClient } from '@/lib/google/oauth'
import { saveToken } from '@/lib/google/tokens'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin

  if (error || !code) {
    console.error('[google/callback] OAuth error or missing code:', { error, hasCode: !!code })
    return NextResponse.redirect(`${siteUrl}/settings?error=oauth_denied`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${siteUrl}/login?next=/settings`)
  }

  try {
    const oauth2Client = buildOAuthClient()
    const { tokens } = await oauth2Client.getToken(code)
    await saveToken(user.id, tokens)
    return NextResponse.redirect(`${siteUrl}/settings?connected=true`)
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    // Log full error server-side for debugging
    console.error('[google/callback] token exchange failed:', {
      error: errMsg,
      // googleapis wraps HTTP errors with response data
      response: (err as { response?: { data?: unknown } })?.response?.data,
    })
    return NextResponse.redirect(`${siteUrl}/settings?error=token_exchange_failed`)
  }
}
