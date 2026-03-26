export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'
import { loadAndRefreshToken } from '@/lib/google/tokens'

function buildRawEmail(to: string, subject: string, body: string): string {
  const lines = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    `Content-Type: text/plain; charset=utf-8`,
    `MIME-Version: 1.0`,
    '',
    body,
  ]
  return Buffer.from(lines.join('\r\n')).toString('base64url')
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const oauth2Client = await loadAndRefreshToken(user.id)
  if (!oauth2Client) {
    return NextResponse.json({ error: 'google_not_connected' }, { status: 400 })
  }

  const { to, subject, body } = await request.json() as { to: string; subject: string; body: string }
  if (!to || !subject || !body) {
    return NextResponse.json({ error: 'to, subject, and body are required' }, { status: 422 })
  }

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: buildRawEmail(to, subject, body) },
  })

  return NextResponse.json({ success: true })
}
