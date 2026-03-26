import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/supabase/audit'

export async function POST(request: Request) {
  const supabase = await createClient()

  // Record logout before clearing the session (user context needed for logAudit)
  await logAudit({
    action: 'logout',
    resource: 'session',
  })

  await supabase.auth.signOut()

  const { origin } = new URL(request.url)
  return NextResponse.redirect(`${origin}/login`, { status: 302 })
}
