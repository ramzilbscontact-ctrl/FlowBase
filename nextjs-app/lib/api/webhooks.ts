// lib/api/webhooks.ts — Outbound webhook dispatcher
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

const MAX_FAILURES = 10

function getAdminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Sign a payload with HMAC-SHA256 using the webhook secret.
 */
async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Dispatch webhooks for a given event.
 * Non-blocking: fires POST requests without awaiting the overall result
 * so the API response is not delayed.
 *
 * @param userId  - The owner whose webhooks to check
 * @param event   - Event name, e.g. "contact.created", "deal.updated"
 * @param payload - The event payload (the created/updated resource)
 */
export function dispatchWebhook(
  userId: string,
  event: string,
  payload: Record<string, unknown>
): void {
  // Fire and forget — don't block the API response
  _dispatchInternal(userId, event, payload).catch((err) => {
    console.error('[webhook-dispatcher] top-level error:', err)
  })
}

async function _dispatchInternal(
  userId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const supabase = getAdminClient()

  // Find all active webhooks for this user that subscribe to this event
  const { data: webhooks, error } = await supabase
    .from('webhooks')
    .select('id, url, secret, events, failure_count')
    .eq('user_id', userId)
    .eq('active', true)

  if (error || !webhooks || webhooks.length === 0) return

  const matching = webhooks.filter((wh) => {
    const events: string[] = wh.events || []
    // Match exact event or wildcard (e.g. "contact.*" matches "contact.created")
    return events.some((e: string) => {
      if (e === '*') return true
      if (e === event) return true
      if (e.endsWith('.*')) {
        const prefix = e.slice(0, -2)
        return event.startsWith(prefix + '.')
      }
      return false
    })
  })

  if (matching.length === 0) return

  const timestamp = new Date().toISOString()
  const body = JSON.stringify({ event, data: payload, timestamp })

  const deliveries = matching.map(async (wh) => {
    try {
      const signature = await signPayload(body, wh.secret)

      const response = await fetch(wh.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FlowBase-Event': event,
          'X-FlowBase-Signature': signature,
          'X-FlowBase-Timestamp': timestamp,
          'User-Agent': 'FlowBase-Webhooks/1.0',
        },
        body,
        signal: AbortSignal.timeout(10_000), // 10s timeout
      })

      if (response.ok) {
        // Reset failure count on success, update last_triggered_at
        await supabase
          .from('webhooks')
          .update({
            failure_count: 0,
            last_triggered_at: timestamp,
          })
          .eq('id', wh.id)
      } else {
        await _recordFailure(supabase, wh.id, wh.failure_count)
      }
    } catch (err) {
      console.error(`[webhook-dispatcher] delivery failed for ${wh.url}:`, err)
      await _recordFailure(supabase, wh.id, wh.failure_count)
    }
  })

  await Promise.allSettled(deliveries)
}

async function _recordFailure(
  supabase: ReturnType<typeof getAdminClient>,
  webhookId: string,
  currentFailures: number
): Promise<void> {
  const newCount = currentFailures + 1

  if (newCount >= MAX_FAILURES) {
    // Deactivate the webhook after too many consecutive failures
    await supabase
      .from('webhooks')
      .update({ failure_count: newCount, active: false })
      .eq('id', webhookId)
  } else {
    await supabase
      .from('webhooks')
      .update({ failure_count: newCount })
      .eq('id', webhookId)
  }
}
