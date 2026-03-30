export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin

  if (error || !code) {
    console.error('[notion/callback] OAuth error or missing code:', { error, hasCode: !!code })
    return NextResponse.redirect(`${siteUrl}/settings/integrations?error=notion_denied`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${siteUrl}/login?next=/settings/integrations`)
  }

  const clientId = process.env.NOTION_CLIENT_ID
  const clientSecret = process.env.NOTION_CLIENT_SECRET
  const redirectUri = `${siteUrl}/api/notion/callback`

  if (!clientId || !clientSecret) {
    console.error('[notion/callback] Missing Notion OAuth env vars')
    return NextResponse.redirect(`${siteUrl}/settings/integrations?error=notion_config_error`)
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errData = await tokenResponse.text()
      console.error('[notion/callback] Token exchange failed:', errData)
      return NextResponse.redirect(`${siteUrl}/settings/integrations?error=notion_token_failed`)
    }

    const tokenData = await tokenResponse.json()

    // Upsert the token into Supabase
    const { error: dbError } = await supabase
      .from('notion_tokens')
      .upsert(
        {
          user_id: user.id,
          access_token: tokenData.access_token,
          workspace_id: tokenData.workspace_id ?? null,
          workspace_name: tokenData.workspace_name ?? null,
          bot_id: tokenData.bot_id ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (dbError) {
      console.error('[notion/callback] DB upsert error:', dbError)
      return NextResponse.redirect(`${siteUrl}/settings/integrations?error=notion_save_failed`)
    }

    return NextResponse.redirect(`${siteUrl}/settings/integrations?notion=connected`)
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[notion/callback] Unexpected error:', errMsg)
    return NextResponse.redirect(`${siteUrl}/settings/integrations?error=notion_token_failed`)
  }
}
