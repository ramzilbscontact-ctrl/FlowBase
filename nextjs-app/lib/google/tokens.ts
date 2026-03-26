import { createClient } from '@/lib/supabase/server'
import { buildOAuthClient } from './oauth'
import { encrypt, decrypt } from './encrypt'

export async function saveToken(
  userId: string,
  tokens: { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null; scope?: string | null }
) {
  const supabase = await createClient()
  const payload = {
    user_id: userId,
    access_token: encrypt(tokens.access_token!),
    expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    scopes: tokens.scope?.split(' ') ?? [],
    updated_at: new Date().toISOString(),
    ...(tokens.refresh_token ? { refresh_token: encrypt(tokens.refresh_token) } : {}),
  }
  await supabase.from('google_tokens').upsert(payload, { onConflict: 'user_id' })
}

export async function loadAndRefreshToken(userId: string) {
  const supabase = await createClient()
  const { data: row } = await supabase
    .from('google_tokens')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!row) return null

  const oauth2Client = buildOAuthClient()
  oauth2Client.setCredentials({
    access_token: decrypt(row.access_token),
    refresh_token: row.refresh_token ? decrypt(row.refresh_token) : undefined,
    expiry_date: row.expires_at ? new Date(row.expires_at).getTime() : undefined,
  })

  // Listen for auto-refresh events — persist new token back to Supabase
  oauth2Client.on('tokens', async (newTokens) => {
    const updatePayload = {
      updated_at: new Date().toISOString(),
      ...(newTokens.access_token ? { access_token: encrypt(newTokens.access_token) } : {}),
      ...(newTokens.expiry_date ? { expires_at: new Date(newTokens.expiry_date).toISOString() } : {}),
      ...(newTokens.refresh_token ? { refresh_token: encrypt(newTokens.refresh_token) } : {}),
    }
    await supabase.from('google_tokens').update(updatePayload).eq('user_id', userId)
  })

  // Force refresh if expired
  if (row.expires_at && new Date(row.expires_at) <= new Date()) {
    const { credentials } = await oauth2Client.refreshAccessToken()
    oauth2Client.setCredentials(credentials)
  }

  return oauth2Client
}
