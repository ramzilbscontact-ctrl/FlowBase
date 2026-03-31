export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'node:crypto'

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const clientId = process.env.NOTION_CLIENT_ID

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${siteUrl}/login?next=/settings/integrations`)
  }

  if (!clientId) {
    console.error('[notion/connect] Missing NOTION_CLIENT_ID env var')
    return NextResponse.redirect(
      `${siteUrl}/settings/integrations?error=notion_config_error`
    )
  }

  const redirectUri = `${siteUrl}/api/notion/callback`
  const state = randomUUID()

  const authUrl = new URL('https://api.notion.com/v1/oauth/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('owner', 'user')
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('state', state)

  const response = NextResponse.redirect(authUrl.toString())
  response.cookies.set('notion_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/api/notion/callback',
  })

  return response
}
