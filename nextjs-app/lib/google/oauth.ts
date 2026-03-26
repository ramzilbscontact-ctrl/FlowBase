import { google } from 'googleapis'

export function buildOAuthClient() {
  return new google.auth.OAuth2(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`
  )
}

export function buildOAuthUrl(oauthClient: ReturnType<typeof buildOAuthClient>) {
  return oauthClient.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Required — ensures refresh_token is always returned
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/calendar.events',
    ],
  })
}
