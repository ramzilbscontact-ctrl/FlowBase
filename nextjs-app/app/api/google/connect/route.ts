export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildOAuthClient, buildOAuthUrl } from '@/lib/google/oauth'

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${siteUrl}/login?next=/settings`)
  }

  try {
    const oauth2 = buildOAuthClient()
    const url = buildOAuthUrl(oauth2)
    return NextResponse.redirect(url)
  } catch (err) {
    console.error('[google/connect] Failed to build OAuth URL:', err)
    return NextResponse.redirect(
      `${siteUrl}/settings?error=oauth_config_error`
    )
  }
}
