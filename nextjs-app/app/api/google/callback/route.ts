export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildOAuthClient } from '@/lib/google/oauth'
import { saveToken } from '@/lib/google/tokens'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${origin}/settings?error=oauth_denied`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login?next=/settings`)
  }

  try {
    const oauth2Client = buildOAuthClient()
    const { tokens } = await oauth2Client.getToken(code)
    await saveToken(user.id, tokens)
    return NextResponse.redirect(`${origin}/settings?connected=true`)
  } catch (err) {
    console.error('[google/callback] token exchange failed:', err)
    return NextResponse.redirect(`${origin}/settings?error=token_exchange_failed`)
  }
}
