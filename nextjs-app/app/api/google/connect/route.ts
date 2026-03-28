export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildOAuthClient, buildOAuthUrl } from '@/lib/google/oauth'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/login?next=/settings`)
  }
  const url = buildOAuthUrl(buildOAuthClient())
  return NextResponse.redirect(url)
}
