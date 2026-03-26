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
  const upcomingOnly = searchParams.get('upcoming') !== 'false'

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: upcomingOnly ? new Date().toISOString() : undefined,
    maxResults: 20,
    singleEvents: true,
    orderBy: 'startTime',
  })

  const events = (res.data.items ?? []).map(evt => ({
    id: evt.id,
    title: evt.summary ?? '(Sans titre)',
    description: evt.description ?? '',
    start: evt.start?.dateTime ?? evt.start?.date,
    end: evt.end?.dateTime ?? evt.end?.date,
    htmlLink: evt.htmlLink,
  }))

  return NextResponse.json({ events })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const oauth2Client = await loadAndRefreshToken(user.id)
  if (!oauth2Client) {
    return NextResponse.json({ error: 'google_not_connected' }, { status: 400 })
  }

  const { title, description, startDateTime, endDateTime, attendees } = await request.json() as {
    title: string
    description?: string
    startDateTime: string
    endDateTime: string
    attendees?: string[]
  }

  if (!title || !startDateTime || !endDateTime) {
    return NextResponse.json({ error: 'title, startDateTime, and endDateTime are required' }, { status: 422 })
  }

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  const res = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: title,
      description: description ?? '',
      start: { dateTime: startDateTime, timeZone: 'Africa/Algiers' },
      end: { dateTime: endDateTime, timeZone: 'Africa/Algiers' },
      attendees: attendees?.map(email => ({ email })) ?? [],
    },
  })

  return NextResponse.json({ event: { id: res.data.id, htmlLink: res.data.htmlLink } }, { status: 201 })
}
