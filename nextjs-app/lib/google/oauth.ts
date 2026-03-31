import { google } from 'googleapis'

/**
 * Build an OAuth2 client for Google API calls.
 *
 * Server-side env vars used:
 *   GOOGLE_CLIENT_ID          – preferred (server-only, not leaked to client)
 *   NEXT_PUBLIC_GOOGLE_CLIENT_ID – fallback (also available server-side on Vercel)
 *   GOOGLE_CLIENT_SECRET       – required
 *   NEXT_PUBLIC_SITE_URL       – base URL for redirect URI
 */
export function buildOAuthClient() {
  const clientId =
    process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  if (!clientId) {
    throw new Error(
      '[Google OAuth] Missing GOOGLE_CLIENT_ID (or NEXT_PUBLIC_GOOGLE_CLIENT_ID). ' +
        'Set it in Vercel Environment Variables.'
    )
  }
  if (!clientSecret) {
    throw new Error(
      '[Google OAuth] Missing GOOGLE_CLIENT_SECRET. Set it in Vercel Environment Variables.'
    )
  }
  if (!siteUrl) {
    throw new Error(
      '[Google OAuth] Missing NEXT_PUBLIC_SITE_URL. Set it in Vercel Environment Variables.'
    )
  }

  const redirectUri = `${siteUrl}/api/google/callback`

  console.log('[Google OAuth] buildOAuthClient:', {
    clientId: clientId.slice(0, 20) + '…',
    redirectUri,
    hasSecret: !!clientSecret,
  })

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

export function buildOAuthUrl(oauthClient: ReturnType<typeof buildOAuthClient>, state?: string) {
  return oauthClient.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Required — ensures refresh_token is always returned
    state,
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/calendar.events',
    ],
  })
}
