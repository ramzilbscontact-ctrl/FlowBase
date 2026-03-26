// lib/supabase/audit.ts
// Use in Route Handlers to record mutations to audit_logs table.
// Uses service role key to bypass RLS on audit_logs (users cannot write audit logs directly).
import { createClient as createServerClient } from '@/lib/supabase/server'

interface AuditLogEntry {
  action: string       // e.g., 'create', 'update', 'delete', 'logout'
  resource: string     // e.g., 'contacts', 'invoices', 'session'
  resourceId?: string  // UUID of the affected row
  metadata?: Record<string, unknown>  // e.g., { previous: {...}, next: {...} }
  ipAddress?: string
}

export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Use service role client to bypass audit_logs RLS
    // Note: in Route Handlers, the server client has the user's JWT context
    // audit_logs has no INSERT policy for authenticated users — use service role
    const { createClient } = await import('@supabase/supabase-js')
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await adminClient.from('audit_logs').insert({
      user_id: user?.id ?? null,
      action: entry.action,
      resource: entry.resource,
      resource_id: entry.resourceId ?? null,
      metadata: entry.metadata ?? null,
      ip_address: entry.ipAddress ?? null,
    })

    if (error) {
      console.warn('[audit] insert failed:', error.message)
    }
  } catch (err) {
    // Non-blocking: log failure to stderr but don't interrupt the request
    console.error('[audit] Failed to write audit log:', err)
  }
}
