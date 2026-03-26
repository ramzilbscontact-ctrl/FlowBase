export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'
import { loadAndRefreshToken } from '@/lib/google/tokens'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const oauth2Client = await loadAndRefreshToken(user.id)
  if (!oauth2Client) {
    return NextResponse.json({ error: 'google_not_connected' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const maxResults = Math.min(50, Number(searchParams.get('limit') ?? '20'))

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  // Step 1: Get message IDs from inbox
  const listRes = await gmail.users.messages.list({
    userId: 'me',
    labelIds: ['INBOX'],
    maxResults,
  })

  const messageIds = listRes.data.messages ?? []
  if (messageIds.length === 0) {
    return NextResponse.json({ messages: [] })
  }

  // Step 2: Fetch metadata for each message (headers only — no full body for list view)
  const messages = await Promise.all(
    messageIds.map(async ({ id }) => {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: id!,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date'],
      })
      const headers = msg.data.payload?.headers ?? []
      const getHeader = (name: string) => headers.find(h => h.name === name)?.value ?? ''
      return {
        id: msg.data.id,
        threadId: msg.data.threadId,
        from: getHeader('From'),
        subject: getHeader('Subject'),
        date: getHeader('Date'),
        snippet: msg.data.snippet ?? '',
        labelIds: msg.data.labelIds ?? [],
      }
    })
  )

  return NextResponse.json({ messages })
}
