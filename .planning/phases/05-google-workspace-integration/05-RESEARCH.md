# Phase 5: Google Workspace Integration - Research

**Researched:** 2026-03-26
**Domain:** Google OAuth 2.0, Gmail API, Google Calendar API, Node.js crypto, Next.js 16 Route Handlers, Supabase token storage
**Confidence:** HIGH — all findings sourced from direct codebase inspection or confirmed Node.js/Google API facts

---

## Summary

Phase 5 ports the Django Gmail and Calendar integrations to Next.js 16 Route Handlers. The foundation is already in place: the `google_tokens` table exists in `001_schema.sql` with RLS in `002_rls.sql`, Google credentials are in `.env.local`, and scaffold pages exist at `/dashboard/gmail` and `/dashboard/calendar`. The settings page only has a `2fa/` sub-page — a top-level settings page and a Google Connect button still need to be built.

The core challenge is the OAuth flow: Supabase's built-in `signInWithOAuth` supports Google but uses its own token management — it does NOT give you the raw `access_token` / `refresh_token` for Google APIs. The correct approach is a **separate OAuth flow** using the existing `NEXT_PUBLIC_GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`, wiring a `/api/google/connect` redirect + `/api/google/callback` handler that exchanges the code, encrypts tokens, and upserts into `google_tokens`. The `googleapis` npm package is NOT yet installed and must be added.

**Primary recommendation:** Use the `googleapis` npm package with a dedicated OAuth2 callback handler (separate from Supabase auth). Encrypt tokens at rest with Node.js built-in `crypto` (AES-256-GCM). Store in the existing `google_tokens` table. All Gmail and Calendar API calls live in server-only Route Handlers.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FR-08-1 | Gmail API: read and send emails via OAuth-connected Google account | Route Handlers: GET /api/google/gmail/messages, POST /api/google/gmail/send — uses googleapis gmail_v1 |
| FR-08-2 | Google Calendar API: sync meetings/appointments | Route Handlers: GET /api/google/calendar/events, POST /api/google/calendar/events — uses googleapis calendar_v3 |
| FR-08-3 | OAuth token storage: store/refresh Google API tokens in Supabase (replaces MongoDB google_tokens) | google_tokens table confirmed in 001_schema.sql with RLS; encrypt with AES-256-GCM before insert |
</phase_requirements>

---

## Confirmed Schema: google_tokens Table

From `nextjs-app/supabase/migrations/001_schema.sql` lines 271-280:

```sql
create table if not exists public.google_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users(id) on delete cascade,
  access_token  text not null,       -- store AES-256-GCM encrypted
  refresh_token text,                -- store AES-256-GCM encrypted
  expires_at    timestamptz,         -- plain, used for expiry check
  scopes        text[],              -- e.g. ['gmail.send','gmail.readonly','calendar.events']
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
```

**RLS** (from `002_rls.sql` lines 441-453): RLS is enabled, with select/insert/update policies scoped to `user_id = auth.uid()`. No delete policy — correct, tokens are upserted not deleted. No `service_role` bypass needed since token writes happen in authenticated Route Handlers via `createClient()`.

**What's missing from the schema** that the Django model had: `google_user_id`, `google_email`, `is_valid` columns. These are not in the current Supabase schema. The planner must decide whether to add a migration for `google_email` (useful for "Connected as user@gmail.com" UI) or skip it. The existing schema is sufficient for the OAuth flow itself.

**Conclusion:** No new table needed. Schema is already in Supabase and under RLS.

---

## Django → Next.js Port Map

### Gmail

| Django endpoint | URL | Method | Next.js Route Handler |
|----------------|-----|--------|----------------------|
| `InboxView` | `/api/gmail/inbox/` | GET | `GET /api/google/gmail/messages` |
| `ThreadListView` | `/api/gmail/threads/` | GET | `GET /api/google/gmail/threads` |
| `ThreadDetailView` | `/api/gmail/threads/<id>/` | GET | `GET /api/google/gmail/threads/[id]` |
| `SyncInboxView` | `/api/gmail/sync/` | POST | `POST /api/google/gmail/sync` |
| `ComposeEmailView` | `/api/gmail/compose/` | POST | `POST /api/google/gmail/send` |
| `MarkReadView` | `/api/gmail/messages/<pk>/read/` | POST | `POST /api/google/gmail/messages/[id]/read` |

**Scope reduction for v1:** Django syncs messages into MongoDB as a local cache. In Next.js, skip the local cache — call Gmail API directly on every request. The `GET /api/google/gmail/messages` handler calls `gmail.users.messages.list()` live. This is simpler and avoids a `gmail_messages` table. If latency is a concern in v2, add caching then.

### Calendar

| Django endpoint | URL | Method | Next.js Route Handler |
|----------------|-----|--------|----------------------|
| `EventListCreateView` GET | `/api/calendar/events/` | GET | `GET /api/google/calendar/events` |
| `EventListCreateView` POST | `/api/calendar/events/` | POST | `POST /api/google/calendar/events` |
| `UpcomingEventsView` | `/api/calendar/events/upcoming/` | GET | `GET /api/google/calendar/events?upcoming=true` |
| `EventDetailView` GET | `/api/calendar/events/<pk>/` | GET | `GET /api/google/calendar/events/[id]` |
| `EventDetailView` PATCH | `/api/calendar/events/<pk>/` | PATCH | `PATCH /api/google/calendar/events/[id]` |
| `EventDetailView` DELETE | `/api/calendar/events/<pk>/` | DELETE | `DELETE /api/google/calendar/events/[id]` |

**Scope reduction for v1 (per ROADMAP.md):** Create event and list upcoming events. Full CRUD and `EventDetailView` are secondary. Implement GET list and POST create first.

### OAuth Connection

| Django endpoint | Next.js Route Handler |
|----------------|----------------------|
| `/api/integrations/google/connect/` (redirect to Google) | `GET /api/google/connect` |
| OAuth callback (exchange code, store token) | `GET /api/google/callback` |
| (implicit) token refresh | `lib/google/getGmailService.ts` helper |

---

## OAuth Flow: Separate from Supabase Auth

**Critical finding:** Supabase `signInWithOAuth({ provider: 'google' })` is for Supabase session login. It does NOT expose the raw Google `access_token` or `refresh_token` in a form that can be written to `google_tokens` for use with the Gmail/Calendar APIs. Even if Supabase stores provider tokens internally, they are not accessible via public API in a reliable, durable way.

**Correct approach:** A second independent OAuth2 flow using the same Google Client ID/Secret.

Flow:
1. User clicks "Connect Google Account" on Settings page
2. Browser navigates to `GET /api/google/connect` — server builds Google authorization URL with correct scopes and redirects
3. Google redirects to `GET /api/google/callback?code=...`
4. Route Handler exchanges code for tokens, encrypts them, upserts into `google_tokens`
5. Redirect to `/dashboard/settings?connected=true`

Required scopes:
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.send`
- `https://www.googleapis.com/auth/calendar.events`

Also required for the consent screen to return a `refresh_token`:
- Set `access_type: 'offline'`
- Set `prompt: 'consent'` (forces re-consent; without it, Google may not return refresh_token on reconnect)

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `googleapis` | ^144.x | Gmail + Calendar API client, OAuth2 client | Official Google Node.js client library |
| `node:crypto` | built-in | AES-256-GCM token encryption | Zero dependencies, runs in Node.js (not Edge) |
| `@supabase/ssr` | ^0.9.0 (already installed) | Supabase client in Route Handlers | Already the project standard |

### Not Needed (Don't Add)
| Library | Why Not |
|---------|---------|
| `google-auth-library` | Already included inside `googleapis` — importing it separately is redundant |
| `node-fetch` | Next.js 16 uses native fetch |
| Any OAuth middleware | The flow is 2 Route Handlers — no framework needed |

### Installation
```bash
cd nextjs-app && npm install googleapis
```

`googleapis` is a large package (~45MB). It tree-shakes poorly but is the standard — do not hand-roll REST calls against Gmail/Calendar.

---

## Architecture Patterns

### Recommended File Structure

```
nextjs-app/
├── app/
│   └── api/
│       └── google/
│           ├── connect/
│           │   └── route.ts          # GET — redirect to Google auth URL
│           ├── callback/
│           │   └── route.ts          # GET — exchange code, store token
│           ├── gmail/
│           │   ├── messages/
│           │   │   ├── route.ts      # GET — list messages
│           │   │   └── [id]/
│           │   │       ├── route.ts  # GET — get message
│           │   │       └── read/
│           │   │           └── route.ts  # POST — mark read
│           │   ├── threads/
│           │   │   ├── route.ts      # GET — list threads
│           │   │   └── [id]/
│           │   │       └── route.ts  # GET — thread detail
│           │   ├── send/
│           │   │   └── route.ts      # POST — send email
│           │   └── sync/
│           │       └── route.ts      # POST — sync inbox
│           └── calendar/
│               ├── events/
│               │   ├── route.ts      # GET list, POST create
│               │   └── [id]/
│               │       └── route.ts  # GET, PATCH, DELETE
├── lib/
│   └── google/
│       ├── oauth.ts                  # buildOAuthClient(), buildOAuthUrl()
│       ├── tokens.ts                 # loadToken(), saveToken(), refreshIfExpired()
│       ├── encrypt.ts                # encrypt(), decrypt() — AES-256-GCM
│       ├── gmail.ts                  # getGmailService(userId) helper
│       └── calendar.ts              # getCalendarService(userId) helper
└── app/
    └── (dashboard)/
        └── settings/
            └── page.tsx              # Settings hub: 2FA card + Google Connect card
```

### Pattern 1: Token Encryption (AES-256-GCM)

Node.js built-in `crypto` module. Runs in Route Handlers (Node.js runtime, NOT Edge runtime — important).

```typescript
// lib/google/encrypt.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALG = 'aes-256-gcm'
const KEY = Buffer.from(process.env.GOOGLE_TOKEN_ENCRYPTION_KEY!, 'hex') // 32 bytes = 64 hex chars

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12) // 96-bit IV for GCM
  const cipher = createCipheriv(ALG, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag() // 16-byte auth tag
  // Store as: iv(24 hex) + tag(32 hex) + ciphertext(hex)
  return iv.toString('hex') + tag.toString('hex') + encrypted.toString('hex')
}

export function decrypt(stored: string): string {
  const iv = Buffer.from(stored.slice(0, 24), 'hex')
  const tag = Buffer.from(stored.slice(24, 56), 'hex')
  const ciphertext = Buffer.from(stored.slice(56), 'hex')
  const decipher = createDecipheriv(ALG, KEY, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}
```

**Key generation** (run once, store in Vercel env vars):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

New env var: `GOOGLE_TOKEN_ENCRYPTION_KEY` — 64-char hex string, server-only (no `NEXT_PUBLIC_` prefix).

### Pattern 2: OAuth Client Construction

```typescript
// lib/google/oauth.ts
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
    prompt: 'consent',         // REQUIRED: ensures refresh_token is always returned
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/calendar.events',
    ],
  })
}
```

### Pattern 3: Token Load + Refresh

```typescript
// lib/google/tokens.ts
import { createClient } from '@/lib/supabase/server'
import { buildOAuthClient } from './oauth'
import { encrypt, decrypt } from './encrypt'

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

  // googleapis auto-refreshes when expiry_date is set and token is expired
  // but we can also force-check:
  if (row.expires_at && new Date(row.expires_at) <= new Date()) {
    const { credentials } = await oauth2Client.refreshAccessToken()
    // Persist refreshed token
    await supabase.from('google_tokens').update({
      access_token: encrypt(credentials.access_token!),
      expires_at: credentials.expiry_date
        ? new Date(credentials.expiry_date).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId)
    oauth2Client.setCredentials(credentials)
  }

  return oauth2Client
}
```

### Pattern 4: Route Handler using googleapis

```typescript
// app/api/google/gmail/messages/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'
import { loadAndRefreshToken } from '@/lib/google/tokens'

export const runtime = 'nodejs' // REQUIRED — crypto and googleapis don't run on Edge

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const oauth2Client = await loadAndRefreshToken(user.id)
  if (!oauth2Client) {
    return NextResponse.json({ error: 'Google account not connected' }, { status: 400 })
  }

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
  const { searchParams } = new URL(request.url)
  const maxResults = Math.min(50, Number(searchParams.get('limit') ?? '20'))

  const res = await gmail.users.messages.list({
    userId: 'me',
    labelIds: ['INBOX'],
    maxResults,
  })

  return NextResponse.json({ messages: res.data.messages ?? [] })
}
```

### Pattern 5: Send Email

```typescript
// POST /api/google/gmail/send
// Body: { to: string[], subject: string, body: string, isHtml?: boolean, threadId?: string }

import { createMimeMessage } from 'mimetext' // OR build raw MIME manually

// The Django approach (base64url-encoded MIME) is the correct approach for Gmail API:
import { MimeText } from ... // Don't hand-roll — see Don't Hand-Roll section
```

### Pattern 6: Connect Route Handler

```typescript
// app/api/google/connect/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildOAuthClient, buildOAuthUrl } from '@/lib/google/oauth'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect('/login')

  const url = buildOAuthUrl(buildOAuthClient())
  return NextResponse.redirect(url)
}
```

### Pattern 7: Callback Route Handler

```typescript
// app/api/google/callback/route.ts
// Exchanges ?code= for tokens, encrypts, upserts into google_tokens

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  if (!code) return NextResponse.redirect(`${origin}/dashboard/settings?error=no_code`)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/login`)

  const oauth2Client = buildOAuthClient()
  const { tokens } = await oauth2Client.getToken(code)

  await supabase.from('google_tokens').upsert({
    user_id: user.id,
    access_token: encrypt(tokens.access_token!),
    refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
    expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    scopes: tokens.scope?.split(' ') ?? [],
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  return NextResponse.redirect(`${origin}/dashboard/settings?connected=true`)
}
```

### Anti-Patterns to Avoid

- **Using `supabase.auth.signInWithOAuth` for Google API tokens:** This is for Supabase session auth. It does not give you usable Gmail/Calendar tokens.
- **Edge runtime for Google API routes:** `node:crypto` and `googleapis` require Node.js runtime. Always set `export const runtime = 'nodejs'` on these routes.
- **Storing plain-text tokens in Supabase:** Even with RLS, tokens in plaintext are readable by service_role queries and database admins. Always encrypt.
- **Calling `oauth2Client.refreshAccessToken()` on every request:** Check `expires_at` first. Unnecessary refreshes consume quota and add latency.
- **One googleapis import per route:** Import `google` once in a shared helper, not in every route file.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MIME email encoding for Gmail API | Custom base64 MIME builder | `mimetext` npm (1KB) OR follow Django pattern exactly: `MIMEMultipart` → `base64.urlsafe_b64encode` ported to Node | MIME encoding has edge cases (encoding, line lengths, charset) |
| OAuth token management | Custom refresh logic | `googleapis` OAuth2Client's built-in `refreshAccessToken()` | Handles token expiry, retry, error codes correctly |
| Google API HTTP calls | `fetch()` against Gmail REST directly | `googleapis` client | googleapis handles auth header injection, retry, pagination cursors |
| AES encryption | Any npm crypto wrapper | `node:crypto` built-in AES-256-GCM | Zero extra dependency; crypto module is stable and audited |

**Key insight for MIME emails in Node.js:** The Django approach uses Python's `email.mime.*` to build raw MIME then base64url-encodes it. In Node.js, use the `mimetext` package (tiny, no deps) or manually construct a `Content-Type: text/plain\r\n\r\n{body}` string — both are simpler than importing a full email library.

---

## Settings Page Current State

**Confirmed:** `/app/(dashboard)/settings/` directory exists and contains only `2fa/page.tsx`. There is NO top-level `settings/page.tsx`.

**What the 2fa page does:** Renders the TOTP enrollment/unenrollment UI. It is a standalone route at `/settings/2fa`.

**What needs to be built for Phase 5:**
1. `/app/(dashboard)/settings/page.tsx` — Settings hub page with two cards: "Authentification à deux facteurs" (linking to `/settings/2fa`) + "Google Workspace" (Connect button + status)
2. The connect button on the Google card navigates to `/api/google/connect` which redirects to Google OAuth

The settings page style should match the existing dashboard pattern (PageShell or equivalent layout with cards).

---

## Common Pitfalls

### Pitfall 1: Missing `export const runtime = 'nodejs'`
**What goes wrong:** Route Handler crashes with "crypto is not defined" or googleapis import error at build time or runtime on Vercel.
**Why it happens:** Vercel defaults new Route Handlers to Edge runtime. `node:crypto` and `googleapis` are Node.js-only.
**How to avoid:** Add `export const runtime = 'nodejs'` to every Route Handler in `app/api/google/`.
**Warning signs:** Build error mentioning `crypto` or `fs` modules.

### Pitfall 2: refresh_token Not Returned on Reconnect
**What goes wrong:** User disconnects and reconnects Google. The upsert sets `refresh_token = null` because Google only returns it on first authorization.
**Why it happens:** Google only returns `refresh_token` when `prompt: 'consent'` is set AND the user hasn't previously consented.
**How to avoid:** Always set `prompt: 'consent'` AND `access_type: 'offline'` in the auth URL. On upsert, use a conditional update: only overwrite `refresh_token` if the new value is non-null.
```typescript
// In callback:
const updatePayload: Record<string, unknown> = {
  user_id: user.id,
  access_token: encrypt(tokens.access_token!),
  expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
  scopes: tokens.scope?.split(' ') ?? [],
  updated_at: new Date().toISOString(),
}
if (tokens.refresh_token) {
  updatePayload.refresh_token = encrypt(tokens.refresh_token)
}
await supabase.from('google_tokens').upsert(updatePayload, { onConflict: 'user_id' })
```

### Pitfall 3: google_tokens RLS Blocks Service Role Writes
**What goes wrong:** The OAuth callback Route Handler uses `createClient()` (anon key + user session). The Supabase RLS policy `with check (user_id = auth.uid())` applies correctly. No issue as long as the user is authenticated before hitting the callback.
**Why it could fail:** If the Supabase session cookie is not present in the callback request (e.g., redirect from Google loses cookies in some browser configurations).
**How to avoid:** The `/api/google/connect` Route Handler should verify `getUser()` returns a valid user before redirecting. If not authenticated, redirect to `/login?next=/settings`. Since `/api/google/callback` is not a public route in `proxy.ts`, unauthenticated requests are already blocked.

### Pitfall 4: NEXT_PUBLIC_APP_URL Not Set
**What goes wrong:** The OAuth2 redirect URI built in `buildOAuthClient()` uses `process.env.NEXT_PUBLIC_APP_URL`. If undefined, the redirect URI is `undefined/api/google/callback` which does not match the Google Console authorized redirect URI.
**How to avoid:** Add `NEXT_PUBLIC_APP_URL` env var: `http://localhost:3000` in `.env.local`, `https://your-vercel-url.vercel.app` in Vercel dashboard. Also register both URLs in Google Console → Credentials → Authorized redirect URIs.

### Pitfall 5: Supabase `google_tokens` `unique` Constraint on `user_id`
**What it means:** Good news — the schema has `user_id uuid not null unique`. This means `upsert({ onConflict: 'user_id' })` works correctly. One token row per user, always.

### Pitfall 6: contacts/tasks pages are List Pages, Not Detail Pages
**What goes wrong:** The ROADMAP says "Gmail compose modal on contact detail page" but the current contacts page (`/dashboard/contacts/page.tsx`) is a list page — there is no `[id]/page.tsx` detail page.
**Impact:** The Gmail compose modal cannot go on the contact list page without an awkward UX. Options:
  a. Add a "Send Email" button per row that opens a compose modal inline on the list page (simpler, no routing change)
  b. Create a contact detail page `contacts/[id]/page.tsx` first (out of scope for Phase 5, belongs in Phase 2 backlog)
**Recommendation:** Use option (a) — add "Send Email" icon button in the contacts table Actions column that opens a compose modal. This requires no new page routing.

Same analysis for tasks: no task detail page exists, so "Add to Calendar" goes as a button in the tasks table row.

### Pitfall 7: calendar page scope mismatch
**What goes wrong:** `calendar.events` scope only grants access to events on the user's primary calendar. If the user's calendar ID is not 'primary', events won't appear.
**How to avoid:** Always use `calendarId: 'primary'` in Calendar API calls unless the user explicitly selects a different calendar (v2 feature).

---

## Token Refresh: googleapis Auto-Refresh

The `googleapis` `OAuth2Client` has built-in auto-refresh when `expiry_date` is set:

```typescript
oauth2Client.setCredentials({
  access_token: decryptedAccessToken,
  refresh_token: decryptedRefreshToken,
  expiry_date: new Date(row.expires_at).getTime(), // milliseconds
})
// googleapis will auto-refresh before making API calls if expiry_date < now
```

However, **auto-refresh does not persist the new token back to Supabase**. You must listen to the `tokens` event:

```typescript
oauth2Client.on('tokens', async (newTokens) => {
  // Called when googleapis auto-refreshes
  await supabase.from('google_tokens').update({
    access_token: encrypt(newTokens.access_token!),
    expires_at: newTokens.expiry_date
      ? new Date(newTokens.expiry_date).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId)
})
```

Register this listener in `loadAndRefreshToken()` before making any API call.

---

## Existing Infrastructure: What's Already Done

| Item | Status | Location |
|------|--------|----------|
| `google_tokens` table | Done | `001_schema.sql` line 271 |
| RLS on `google_tokens` | Done | `002_rls.sql` line 441 |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` env var | Done | `.env.local` (STATE.md confirmed) |
| `GOOGLE_CLIENT_SECRET` env var | Done | `.env.local` (STATE.md confirmed) |
| `/dashboard/gmail/page.tsx` scaffold | Done | Placeholder with "Coming soon" alert |
| `/dashboard/calendar/page.tsx` scaffold | Done | Placeholder with disabled button |
| `/settings/2fa/page.tsx` | Done | Full TOTP UI |
| `@supabase/ssr` + `createClient()` patterns | Done | `lib/supabase/server.ts`, `lib/supabase/client.ts` |
| Auth callback pattern | Done | `app/(auth)/callback/route.ts` |
| `googleapis` npm package | **NOT INSTALLED** | Must run `npm install googleapis` |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` env var | **NOT SET** | Must generate and add to `.env.local` + Vercel |
| `NEXT_PUBLIC_APP_URL` env var | **NOT SET** | Must add for OAuth redirect URI |
| `/settings/page.tsx` (hub page) | **DOES NOT EXIST** | Must create |

---

## State of the Art

| Old Approach (Django) | New Approach (Next.js) | Impact |
|----------------------|------------------------|--------|
| `google-api-python-client` + `google.oauth2.credentials.Credentials` | `googleapis` npm + `google.auth.OAuth2` | Same mental model, different language |
| MongoDB `google_tokens` collection | Supabase `google_tokens` table with RLS | Row-level security enforced at DB |
| Messages synced to MongoDB on `POST /sync/` | Direct Gmail API calls per request | No local cache needed for v1 |
| Django MIDDLEWARE auth check | Route Handler `supabase.auth.getUser()` | Same pattern as existing route handlers (see `app/api/auth/logout/route.ts`) |
| Python `base64.urlsafe_b64encode` for MIME | Node.js `Buffer.from(...).toString('base64url')` | Direct equivalent |

---

## Open Questions

1. **Contact detail page missing**
   - What we know: `/dashboard/contacts/page.tsx` is a list page only. No `contacts/[id]/page.tsx` exists.
   - What's unclear: Should Phase 5 create the detail page, or put the compose button on the list page?
   - Recommendation: Put "Send Email" button on list page rows (simpler, no dependency on unbuilt detail page).

2. **`google_email` column not in schema**
   - What we know: The Django `GoogleToken` model stored `google_email`. The Supabase schema does not.
   - What's unclear: Is displaying "Connected as user@gmail.com" on Settings page required?
   - Recommendation: Add it via a new migration (`007_add_google_email.sql`) — it's a single `ALTER TABLE` and improves UX significantly.

3. **`proxy.ts` vs `middleware.ts` for protecting `/api/google/*`**
   - What we know: The project uses `proxy.ts` (renamed from `middleware.ts` per STATE.md decision 1). `/api/google/callback` must be accessible after Google redirects (user is authenticated via session cookie). `/api/google/connect` and all `/api/google/gmail/*` + `/api/google/calendar/*` should be protected.
   - Recommendation: `/api/google/callback` does its own `getUser()` check — no special proxy.ts handling needed. The other routes are protected by default (proxy.ts protects all non-public routes).

---

## Code Examples

### Install

```bash
cd /Users/ramzilbs/Desktop/radiance_crm/ERP/nextjs-app && npm install googleapis
```

### Generate encryption key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Add output as GOOGLE_TOKEN_ENCRYPTION_KEY in .env.local and Vercel
```

### Minimal Gmail list call

```typescript
// Source: googleapis npm package — google.gmail('v1').users.messages.list
const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
const response = await gmail.users.messages.list({
  userId: 'me',
  labelIds: ['INBOX'],
  maxResults: 20,
})
// response.data.messages: Array<{ id: string, threadId: string }>
// To get full message: gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' })
```

### Minimal Calendar event create

```typescript
// Source: googleapis npm package — google.calendar('v3').events.insert
const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
await calendar.events.insert({
  calendarId: 'primary',
  requestBody: {
    summary: title,
    description: description,
    start: { dateTime: startIso, timeZone: 'Africa/Algiers' },
    end: { dateTime: endIso, timeZone: 'Africa/Algiers' },
    attendees: attendeeEmails.map(email => ({ email })),
  },
})
```

### Send email via Gmail API (Node.js MIME encoding)

```typescript
// Source: Gmail API docs — users.messages.send with raw RFC 2822 message
function buildRawEmail(to: string, subject: string, body: string): string {
  const lines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    `MIME-Version: 1.0`,
    '',
    body,
  ]
  return Buffer.from(lines.join('\r\n')).toString('base64url')
}

await gmail.users.messages.send({
  userId: 'me',
  requestBody: { raw: buildRawEmail(to, subject, body) },
})
```

---

## Sources

### Primary (HIGH confidence)
- `nextjs-app/supabase/migrations/001_schema.sql` — confirmed `google_tokens` schema
- `nextjs-app/supabase/migrations/002_rls.sql` — confirmed RLS policies
- `backend/apps/gmail_app/views.py` — confirmed Django endpoint inventory
- `backend/apps/calendar_app/views.py` — confirmed Django endpoint inventory
- `backend/apps/integrations/models.py` — confirmed Django token model
- `nextjs-app/package.json` — confirmed `googleapis` NOT installed
- `.planning/STATE.md` — confirmed env vars set, proxy.ts convention

### Secondary (MEDIUM confidence)
- Node.js `crypto` module documentation — AES-256-GCM is stable, well-documented built-in
- `googleapis` npm package convention — `google.auth.OAuth2`, `google.gmail()`, `google.calendar()` are the documented Node.js patterns

---

## Metadata

**Confidence breakdown:**
- Schema / existing code: HIGH — directly read from migration files
- Port map: HIGH — directly inventoried Django views.py and urls.py
- googleapis API shape: HIGH — standard, stable API used in this project's Django equivalent
- Token encryption pattern: HIGH — standard Node.js crypto AES-256-GCM
- Settings page state: HIGH — directly confirmed no page.tsx exists
- `googleapis` install status: HIGH — confirmed absent from package.json

**Research date:** 2026-03-26
**Valid until:** 2026-06-26 (googleapis and Google OAuth APIs are very stable)
