// lib/api/auth.ts — API key authentication middleware for public REST API
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export interface ApiUser {
  userId: string
  keyId: string
  permissions: Record<string, string>
}

/**
 * Hash an API key using SHA-256 (Web Crypto API, works in Edge + Node).
 */
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Create a Supabase admin client (service role) that bypasses RLS.
 * Required because API key requests don't carry a user session cookie.
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createSupabaseAdmin(url, serviceKey)
}

/**
 * Authenticate an incoming request via `Authorization: Bearer <api_key>`.
 * Returns the user context or a 401 NextResponse.
 */
export async function authenticateApiKey(
  req: NextRequest
): Promise<ApiUser | NextResponse> {
  const authHeader = req.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or invalid Authorization header. Use: Bearer <api_key>' },
      { status: 401 }
    )
  }

  const apiKey = authHeader.slice(7).trim()
  if (!apiKey) {
    return NextResponse.json(
      { error: 'API key is empty' },
      { status: 401 }
    )
  }

  const keyHash = await hashApiKey(apiKey)
  const supabase = getAdminClient()

  const { data: keyRow, error } = await supabase
    .from('api_keys')
    .select('id, user_id, permissions, revoked_at')
    .eq('key_hash', keyHash)
    .single()

  if (error || !keyRow) {
    return NextResponse.json(
      { error: 'Invalid API key' },
      { status: 401 }
    )
  }

  if (keyRow.revoked_at) {
    return NextResponse.json(
      { error: 'API key has been revoked' },
      { status: 401 }
    )
  }

  // Update last_used_at (fire-and-forget)
  supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRow.id)
    .then(() => {}) // swallow

  return {
    userId: keyRow.user_id,
    keyId: keyRow.id,
    permissions: keyRow.permissions as Record<string, string>,
  }
}

/**
 * Check if the API key has the required permission for a resource.
 * Permissions are stored as { "contacts": "rw", "deals": "r", ... }
 * "r" = read-only, "rw" = read-write
 */
export function hasPermission(
  user: ApiUser,
  resource: string,
  action: 'read' | 'write'
): boolean {
  const perm = user.permissions[resource]
  if (!perm) return false
  if (action === 'read') return perm === 'r' || perm === 'rw'
  if (action === 'write') return perm === 'rw'
  return false
}

/**
 * Helper to generate a new API key. Returns the raw key (show once) and its hash.
 */
export async function generateApiKey(): Promise<{
  rawKey: string
  keyHash: string
  keyPrefix: string
}> {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const rawKey =
    'fb_live_' +
    Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  const keyHash = await hashApiKey(rawKey)
  const keyPrefix = rawKey.slice(0, 16)
  return { rawKey, keyHash, keyPrefix }
}

/**
 * Standard JSON error response helper.
 */
export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Standard paginated response wrapper.
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  perPage: number
) {
  return NextResponse.json({
    data,
    pagination: {
      page,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage),
    },
  })
}

/**
 * Parse pagination query params from a request.
 */
export function parsePagination(req: NextRequest) {
  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get('per_page') || '25', 10)))
  const offset = (page - 1) * perPage
  return { page, perPage, offset }
}
