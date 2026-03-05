# Phase 1: Foundation, Schema & Auth — Research

**Researched:** 2026-03-04
**Domain:** Next.js 16.x App Router + Supabase Auth + PostgreSQL Schema
**Confidence:** HIGH (primary sources: official Next.js docs v16.1.6, official Supabase docs, npm registry)

---

## Summary

Phase 1 bootstraps the entire new stack: a Next.js app in `/nextjs-app`, a complete 20+ table PostgreSQL schema in Supabase, and all authentication flows (email/password, Google OAuth, TOTP 2FA, account lockout). Everything else in the migration depends on this phase being done correctly.

The most significant discovery is that **Next.js v16.0.0 renamed `middleware.ts` → `proxy.ts`** (export function renamed `middleware` → `proxy`). Since `create-next-app@latest` installs v16.1.6, all auth route protection uses `proxy.ts`. The existing research doc in `.planning/research/NEXTJS_PATTERNS.md` already covers this — the planner should treat that as authoritative for Next.js App Router patterns.

The second significant discovery is that **Supabase has native TOTP MFA** via `supabase.auth.mfa.enroll/challenge/verify`. This means there is NO need for the `otpauth` npm library, NO custom `profiles.totp_secret` column, and NO custom TOTP implementation. The Roadmap's plan to store `totp_secret` in `profiles` is incorrect — use `supabase.auth.mfa.*` APIs instead and check AAL (Authenticator Assurance Level) in `proxy.ts` to gate dashboard access.

**Primary recommendation:** Scaffold with `npx create-next-app@latest nextjs-app --typescript --tailwind --eslint --app --use-npm`, then follow `@supabase/ssr` official patterns for `lib/supabase/server.ts`, `lib/supabase/client.ts`, and `proxy.ts` cookie refresh.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.1.6 | React framework, App Router, Route Handlers, proxy.ts | Official — installs via create-next-app@latest |
| @supabase/supabase-js | 2.98.0 | Supabase JS client — DB queries, auth, storage | Official Supabase client |
| @supabase/ssr | 0.9.0 | SSR-safe Supabase client factories with cookie handling | Required for Next.js App Router server components |
| typescript | 5.x (bundled) | Type safety throughout | Mandated by requirements TR-01-2 |
| tailwindcss | 3.x (bundled) | Utility CSS | Same as existing frontend, bundled in create-next-app |
| zod | 3.x | Runtime validation, form schemas, API route validation | Replaces DRF serializers, mandated TR-01-10 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-query | 5.90.21 | Server state, caching, pagination | All interactive data pages (CRM, invoices, etc.) |
| lucide-react | ^0.575.0 | Icon library | Same icon set as existing frontend |
| clsx | ^2.x | Conditional className builder | Component styling |

### Explicitly NOT Needed (Roadmap Correction)
| Library | Why NOT needed |
|---------|----------------|
| `otpauth` | Supabase has native TOTP MFA — `supabase.auth.mfa.*` handles it |
| `qrcode` | `supabase.auth.mfa.enroll()` returns an SVG QR code directly |
| Custom `profiles.totp_secret` column | Supabase stores TOTP secrets internally |
| Custom `profiles.totp_enabled` column | AAL level from `getAuthenticatorAssuranceLevel()` replaces this |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@supabase/ssr` | `@supabase/auth-helpers-nextjs` | Auth helpers is deprecated — use `@supabase/ssr` only |
| proxy.ts | middleware.ts | middleware.ts is deprecated in v16.0.0, will be removed |

**Installation (inside `/nextjs-app` after scaffold):**
```bash
npm install @supabase/supabase-js @supabase/ssr @tanstack/react-query zod lucide-react clsx
```

---

## Architecture Patterns

### Recommended Project Structure
```
nextjs-app/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx          # Email/password + Google OAuth buttons
│   │   ├── callback/
│   │   │   └── route.ts          # OAuth + magic link callback (exchangeCodeForSession)
│   │   ├── 2fa/
│   │   │   └── page.tsx          # TOTP verification page (after AAL1 login)
│   │   └── layout.tsx            # Auth layout (centered card, no sidebar)
│   ├── (dashboard)/
│   │   ├── layout.tsx            # Sidebar + Topbar layout (wraps all protected pages)
│   │   ├── crm/...               # CRM pages (Phase 2)
│   │   ├── settings/
│   │   │   └── 2fa/
│   │   │       └── page.tsx      # TOTP enrollment/management
│   │   └── page.tsx              # Dashboard home
│   ├── api/                      # Route Handlers (Stripe webhooks, PDF, etc.)
│   └── layout.tsx                # Root layout (QueryClientProvider, fonts)
├── components/
│   ├── layout/                   # Sidebar, Topbar, AppLayout (ported from frontend/)
│   └── shared/                   # DataTable, Modal, StatsCard (ported in Phase 2-3)
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # createBrowserClient — use in "use client" components
│   │   └── server.ts             # createServerClient — use in Server Components, Route Handlers
│   ├── types/
│   │   └── database.types.ts     # Generated from: npx supabase gen types typescript
│   └── utils/                    # Shared helpers (cn(), formatCurrency(), etc.)
├── proxy.ts                      # Session cookie refresh + auth redirect + AAL2 check
├── next.config.ts
└── tsconfig.json                 # strict: true
```

### Pattern 1: Supabase Server Client (Server Components + Route Handlers)
**What:** Cookie-based Supabase client for server-side code. Reads and writes session via Next.js cookie API.
**When to use:** Server Components, Route Handlers, Server Actions — anywhere `"use client"` is NOT present.

```typescript
// lib/supabase/server.ts
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types/database.types'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from a Server Component — cookies read-only here
            // proxy.ts handles the actual cookie write
          }
        },
      },
    }
  )
}
```

### Pattern 2: Supabase Browser Client (Client Components)
**What:** Browser-based Supabase client. Uses cookies automatically for session.
**When to use:** Any component with `"use client"` directive.

```typescript
// lib/supabase/client.ts
// Source: https://supabase.com/docs/guides/auth/server-side/creating-a-client
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Pattern 3: proxy.ts — Session Refresh + Auth Guard + AAL Check
**What:** Intercepts every request, refreshes expired tokens, redirects unauthenticated users, enforces TOTP (AAL2) when enrolled.
**When to use:** Root of project — runs on every matched request.
**Critical:** Use `getClaims()` NOT `getSession()` in server code for security.

```typescript
// proxy.ts (NOT middleware.ts — renamed in Next.js v16.0.0)
// Source: official Next.js docs v16.1.6 + Supabase SSR docs
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // CRITICAL: Use getClaims() not getSession() — getClaims validates JWT signature
  const { data: { user } } = await supabase.auth.getUser()

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/callback') ||
    request.nextUrl.pathname.startsWith('/2fa')

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // AAL2 enforcement: if user has TOTP enrolled, require verification
  if (user && !isAuthRoute) {
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aalData?.nextLevel === 'aal2' && aalData.currentLevel !== 'aal2') {
      const url = request.nextUrl.clone()
      url.pathname = '/2fa'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Pattern 4: OAuth Callback Route
**What:** Exchanges the authorization code from Google OAuth / magic links for a Supabase session.
**When to use:** After `signInWithOAuth({ provider: 'google', options: { redirectTo: '/callback' } })`.

```typescript
// app/(auth)/callback/route.ts
// Source: https://supabase.com/docs/guides/auth/social-login/auth-google
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_error`)
}
```

### Pattern 5: Supabase Native TOTP MFA (Correct Approach)
**What:** Supabase's built-in `supabase.auth.mfa.*` APIs handle TOTP entirely. No custom secret storage needed.
**When to use:** Settings page (enroll) and 2FA verification page (challenge/verify after login).

```typescript
// ENROLL — Settings page: app/(dashboard)/settings/2fa/page.tsx
// Source: https://supabase.com/docs/guides/auth/auth-mfa/totp
const { data, error } = await supabase.auth.mfa.enroll({
  factorType: 'totp',
  // optional: friendlyName: 'Radiance ERP'
})
// data.totp.qr_code is an SVG — render with <img src={`data:image/svg+xml;utf8,${data.totp.qr_code}`} />
// data.id is factorId — store temporarily for the verify step

// CHALLENGE + VERIFY — 2FA page: app/(auth)/2fa/page.tsx
const { data: challenge } = await supabase.auth.mfa.challenge({ factorId })
const { data, error } = await supabase.auth.mfa.verify({
  factorId,
  challengeId: challenge.id,
  code: userEnteredCode, // 6-digit from authenticator app
})
// On success, session is upgraded to AAL2 — proxy.ts no longer redirects to /2fa

// CHECK AAL — after login, before routing
const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
// aalData.currentLevel: 'aal1' | 'aal2'
// aalData.nextLevel: 'aal1' | 'aal2'
// If nextLevel === 'aal2' && currentLevel !== 'aal2' → redirect to /2fa

// UNENROLL
const { error } = await supabase.auth.mfa.unenroll({ factorId: '<factor-id>' })
```

### Pattern 6: profiles Table + Auto-Insert Trigger
**What:** Extends `auth.users` with app-specific fields (role, full_name, avatar_url). Auto-created on signup.
**Critical:** `security definer set search_path = ''` prevents privilege escalation via search_path hijack.

```sql
-- Source: https://supabase.com/docs/guides/auth/managing-user-data
create table public.profiles (
  id          uuid not null references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  role        text not null default 'user' check (role in ('admin', 'manager', 'user')),
  -- Account lockout fields (managed via Route Handler, not trigger)
  failed_login_attempts  integer not null default 0,
  locked_until           timestamptz,
  primary key (id)
);

alter table public.profiles enable row level security;

-- Auto-create profile on auth.users INSERT
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### Pattern 7: RLS Policies — Owner + Admin Pattern
**What:** Row-level security so users see only their own data; admins bypass via `profiles.role` check.
**When to use:** Every CRM/facturation/HR table.

```sql
-- Source: https://supabase.com/docs/guides/database/postgres/row-level-security

-- Enable RLS (must be done for EVERY table)
alter table public.contacts enable row level security;

-- SELECT: owner sees own rows, admin sees all, soft-deleted rows excluded
create policy "contacts_select" on public.contacts
  for select to authenticated
  using (
    deleted_at is null
    and (
      owner_id = (select auth.uid())
      or (
        select role from public.profiles
        where id = (select auth.uid())
      ) = 'admin'
    )
  );

-- INSERT: owner_id automatically set to current user
create policy "contacts_insert" on public.contacts
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

-- UPDATE: only owner or admin can update
create policy "contacts_update" on public.contacts
  for update to authenticated
  using (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  )
  with check (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  );

-- SOFT DELETE: UPDATE sets deleted_at (no hard DELETE policy needed)
-- Hard DELETE: disallowed via no policy (RLS blocks by default)
```

### Pattern 8: Full-Text Search with GENERATED tsvector
**What:** PostgreSQL generated column that keeps `search_vector` in sync automatically. GIN index for speed.
**When to use:** contacts, companies, deals tables.

```sql
-- Source: https://supabase.com/docs/guides/database/full-text-search
-- Use 'simple' config (no stemming) — better for proper names (Algerian names)
alter table public.contacts
add column search_vector tsvector generated always as (
  to_tsvector('simple',
    coalesce(first_name, '') || ' ' ||
    coalesce(last_name, '') || ' ' ||
    coalesce(email, '') || ' ' ||
    coalesce(phone, '') || ' ' ||
    coalesce(company_name, '')
  )
) stored;

create index contacts_search_vector_idx on public.contacts using gin (search_vector);

-- Query via supabase-js:
-- const { data } = await supabase
--   .from('contacts')
--   .select('*')
--   .textSearch('search_vector', searchTerm)
--   .is('deleted_at', null)
```

### Anti-Patterns to Avoid

- **Using `getSession()` in proxy.ts:** `getSession()` reads from cookies without validating against Supabase's auth server. Use `getUser()` (calls Supabase to validate) or `getClaims()` instead. This is a security vulnerability, not just a best-practice issue.
- **Using `middleware.ts` filename:** Renamed to `proxy.ts` in Next.js v16.0.0. Using the old name will cause a build warning and may break in future versions.
- **Custom TOTP with `otpauth` library:** Supabase has native TOTP MFA. Building custom TOTP means re-implementing what Supabase already provides, including QR generation and time window validation.
- **Storing `totp_secret` in `profiles` table:** Supabase Auth stores TOTP secrets internally and encrypted. Don't replicate them in the app database.
- **`profiles` trigger that can fail:** If the trigger function throws, it blocks ALL sign-ups. Always wrap trigger body in `begin/exception/end` or test thoroughly before deploy.
- **Forgetting `set search_path = ''` on SECURITY DEFINER functions:** Without this, a malicious user could create a schema that intercepts calls to `public` schema functions.
- **English text config for tsvector on Algerian names:** Use `'simple'` (no stemming, no stop words) for proper names. `'english'` would incorrectly stem "Ali" → "al" and drop French stop words.
- **Hard deletes on CRM data:** All CRM tables must use soft delete (`UPDATE deleted_at = NOW()`). No `DELETE` RLS policy should exist on CRM tables.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session cookie management | Custom JWT cookie logic | `@supabase/ssr` createServerClient | Handles httpOnly cookies, token refresh, cookie splitting for large tokens |
| TOTP 2FA | `otpauth` + custom secret storage | `supabase.auth.mfa.*` | Supabase handles secret generation, QR code, time window, factor management |
| QR code generation | `qrcode` library + manual otpauth URI | `supabase.auth.mfa.enroll()` returns SVG | Built-in, no extra dependency |
| Google OAuth flow | Custom OAuth state + PKCE | `supabase.auth.signInWithOAuth({ provider: 'google' })` | Supabase handles PKCE, state parameter, token exchange |
| Password hashing | bcrypt | Supabase Auth (internal) | Supabase manages password hashing; never touches plaintext |
| UUID generation | `uuid` package | PostgreSQL `gen_random_uuid()` default | Built into PostgreSQL 13+ |
| tsvector update | Custom trigger | `GENERATED ALWAYS AS ... STORED` | Postgres generated columns self-update on INSERT/UPDATE automatically |
| Role-based data access | Application-layer WHERE clauses | RLS policies | DB enforces at query level — even service calls respect RLS unless using service role key |

**Key insight:** The entire auth layer — sessions, tokens, OAuth, TOTP — is fully managed by Supabase. The app's job is only to call the right Supabase API and route the user correctly based on what Supabase returns.

---

## Common Pitfalls

### Pitfall 1: middleware.ts vs proxy.ts
**What goes wrong:** Developer creates `middleware.ts` with `export function middleware()`. Build succeeds with a deprecation warning. Works initially but will break when Next.js removes support.
**Why it happens:** All tutorials prior to Next.js v16.0.0 use `middleware.ts`. This rename is new (v16.0.0).
**How to avoid:** Always create `proxy.ts` with `export function proxy()`. Run codemod if starting from an example: `npx @next/codemod@canary middleware-to-proxy .`
**Warning signs:** Build output shows `[DEPRECATED] middleware.ts is deprecated, use proxy.ts instead`

### Pitfall 2: getSession() in Server Code
**What goes wrong:** Using `supabase.auth.getSession()` in `proxy.ts` or Server Components. Returns stale or spoofed session data without validation.
**Why it happens:** `getSession()` only reads from the cookie without making a network call to validate. An attacker could craft a valid-looking JWT cookie.
**How to avoid:** Use `supabase.auth.getUser()` in proxy.ts (makes a network call to validate with Supabase). Use `supabase.auth.getClaims()` as an alternative for pure local JWT validation.
**Warning signs:** Authentication feels insecure; admin pages accessible by manipulating cookies.

### Pitfall 3: profiles Trigger Blocking Signups
**What goes wrong:** If `handle_new_user` trigger function throws (e.g., NOT NULL constraint violation, bad default value), ALL new signups fail with a 500 error.
**Why it happens:** `after insert on auth.users ... for each row` runs in the same transaction. Trigger failure = transaction rollback = user not created.
**How to avoid:** Keep the trigger function minimal — only insert the minimum required fields with defaults. Add `EXCEPTION WHEN OTHERS THEN NULL;` if non-critical fields might fail. Test with Google OAuth (passes different metadata) and email signup separately.
**Warning signs:** "Database error" on signup; new users not appearing in `auth.users`.

### Pitfall 4: AAL2 Infinite Redirect Loop
**What goes wrong:** proxy.ts redirects non-AAL2 users to `/2fa`, but `/2fa` is also a protected route, causing an infinite redirect loop.
**Why it happens:** The `isAuthRoute` check doesn't include `/2fa`, so the redirect fires even on the 2FA page itself.
**How to avoid:** Ensure `/2fa`, `/login`, and `/callback` are all in the `isAuthRoute` whitelist in `proxy.ts`.
**Warning signs:** Browser shows "too many redirects" on login.

### Pitfall 5: Supabase Auth Helpers (Deprecated)
**What goes wrong:** Tutorials suggest `@supabase/auth-helpers-nextjs`. Installing it pulls in a deprecated package that conflicts with `@supabase/ssr`.
**Why it happens:** Large volume of pre-2024 documentation still references auth-helpers.
**How to avoid:** Use ONLY `@supabase/ssr` (current) + `@supabase/supabase-js`. Never install `@supabase/auth-helpers-nextjs`.
**Warning signs:** npm install warnings about peer dependency conflicts; session refresh not working.

### Pitfall 6: RLS Subquery Performance
**What goes wrong:** Writing RLS policies like `where role = (select role from profiles where id = auth.uid())` causes a subquery per row, killing performance on large tables.
**Why it happens:** Each row evaluation executes the subquery without caching.
**How to avoid:** Wrap in `(select ...)` at the policy level: `(select role from public.profiles where id = (select auth.uid()))` — PostgreSQL optimizes this as a single call per query, not per row.
**Warning signs:** Slow queries on `contacts` or `companies` list pages.

### Pitfall 7: Vercel Subdirectory Deployment
**What goes wrong:** Vercel deploys from monorepo root, can't find `nextjs-app/package.json`, build fails.
**Why it happens:** Vercel defaults to the repository root as the build directory.
**How to avoid:** In Vercel Project Settings → Build & Deployment → Root Directory: set to `nextjs-app`. Do this BEFORE the first deploy. Can also use `vercel.json` at monorepo root with `{ "root": "nextjs-app" }`.
**Warning signs:** Vercel build log shows "No Next.js installation found".

### Pitfall 8: tsvector with NULL columns
**What goes wrong:** `to_tsvector('simple', first_name || ' ' || last_name)` returns NULL if any column is NULL. NULL columns in contacts break search entirely.
**Why it happens:** PostgreSQL `||` with NULL propagates NULL.
**How to avoid:** Always use `COALESCE(column, '')` in tsvector expressions.
**Warning signs:** Search returns no results for contacts missing email or phone.

### Pitfall 9: Account Lockout and RLS
**What goes wrong:** Route Handler increments `profiles.failed_login_attempts` but fails because authenticated users can't write to `profiles` rows they don't own (the anon user during login has no session yet).
**Why it happens:** Login attempt happens before authentication, so `auth.uid()` is NULL. RLS on `profiles` blocks the update.
**How to avoid:** Use a **SECURITY DEFINER function** to increment `failed_login_attempts`, callable via Supabase RPC with the anon key. The function runs as the postgres role and bypasses RLS:
```sql
create or replace function public.record_failed_login(user_email text)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = user_email;
  if found then
    update public.profiles
    set
      failed_login_attempts = failed_login_attempts + 1,
      locked_until = case
        when failed_login_attempts + 1 >= 5
        then now() + interval '15 minutes'
        else locked_until
      end
    where id = v_user_id;
  end if;
end;
$$;
```
Then call via: `supabase.rpc('record_failed_login', { user_email: email })`
**Warning signs:** 403 errors when incrementing failed attempts; lockout never triggers.

---

## Code Examples

### Full Login Flow (email/password + lockout check)
```typescript
// app/(auth)/login/page.tsx — "use client"
// Source: https://supabase.com/docs/guides/auth/auth-email
async function handleLogin(email: string, password: string) {
  const supabase = createClient() // from lib/supabase/client.ts

  // 1. Check lockout before attempting login
  const { data: profile } = await supabase
    .from('profiles')
    .select('locked_until, failed_login_attempts')
    .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
    .single()
  // Note: we need email-based lockout check via RPC since user isn't authenticated yet

  // 2. Attempt login
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Increment failed attempts via SECURITY DEFINER RPC (bypasses RLS)
    await supabase.rpc('record_failed_login', { user_email: email })
    return { error: error.message }
  }

  // 3. Check if MFA required
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aalData?.nextLevel === 'aal2' && aalData.currentLevel !== 'aal2') {
    redirect('/2fa')
  }

  redirect('/')
}
```

### Google OAuth Sign-In
```typescript
// Source: https://supabase.com/docs/guides/auth/social-login/auth-google
const supabase = createClient()
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/callback`,
    queryParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  },
})
// Browser is redirected to Google, then back to /callback
// callback/route.ts calls exchangeCodeForSession(code)
```

### Database Schema Snippets — Key Tables
```sql
-- profiles (extends auth.users)
create table public.profiles (
  id                    uuid references auth.users(id) on delete cascade primary key,
  full_name             text,
  avatar_url            text,
  role                  text not null default 'user' check (role in ('admin', 'manager', 'user')),
  failed_login_attempts integer not null default 0,
  locked_until          timestamptz
  -- NO totp_secret, NO totp_enabled — Supabase MFA handles this internally
);

-- contacts (CRM) — representative of all CRM tables
create table public.contacts (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  first_name    text not null,
  last_name     text,
  email         text,
  phone         text,
  company_id    uuid references public.companies(id),
  company_name  text,  -- denormalized for display speed
  tags          text[],
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,  -- soft delete
  search_vector tsvector generated always as (
    to_tsvector('simple',
      coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' ||
      coalesce(email, '') || ' ' || coalesce(company_name, '')
    )
  ) stored
);

create index contacts_owner_id_idx on public.contacts(owner_id);
create index contacts_deleted_at_idx on public.contacts(deleted_at) where deleted_at is null;
create index contacts_search_vector_idx on public.contacts using gin(search_vector);
```

### TypeScript Type Generation
```bash
# Run AFTER Supabase schema is finalized (after all SQL migrations)
# Source: official Supabase CLI docs
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/types/database.types.ts
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` + `export function middleware()` | `proxy.ts` + `export function proxy()` | Next.js v16.0.0 | Must use proxy.ts for new projects |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 | auth-helpers is deprecated, causes conflicts |
| `getSession()` in server code | `getUser()` or `getClaims()` in server code | 2024 Supabase security advisory | `getSession()` unvalidated — security vulnerability |
| Custom TOTP with `otpauth` library | `supabase.auth.mfa.*` native TOTP | Supabase added native MFA | No custom secret storage needed |
| English tsvector for all text | `'simple'` config for proper names | Best practice | Avoids incorrect stemming of Arabic/French names |

**Deprecated/outdated patterns to avoid:**
- `@supabase/auth-helpers-nextjs`: replaced by `@supabase/ssr`
- `middleware.ts`: renamed to `proxy.ts` in v16.0.0
- `supabase.auth.getSession()` in server code: use `getUser()` instead
- `create-next-app@14`: current is v16.1.6; use `@latest`

---

## Open Questions

1. **Next.js version target: 14 vs 16**
   - What we know: Requirements specify "Next.js 14 App Router" (TR-01-1). `create-next-app@latest` installs v16.1.6. The `proxy.ts` rename happened in v16.0.0.
   - What's unclear: Does the user specifically want v14, or was "14" written when v14 was current? v14 is still supported but won't get new features.
   - Recommendation: Install `create-next-app@latest` (v16.1.6). The App Router API is identical; all React and Supabase patterns work the same. The only difference is `proxy.ts` instead of `middleware.ts`. If v14 is strictly required, use `create-next-app@14` — but document the `middleware.ts` convention divergence.

2. **Lockout check before login (pre-auth RLS problem)**
   - What we know: Before a user authenticates, `auth.uid()` is NULL. RLS on `profiles` blocks anonymous reads of other users' `locked_until` field.
   - What's unclear: The cleanest way to check lockout status before login attempt.
   - Recommendation: Use a SECURITY DEFINER RPC function `public.check_login_allowed(email text) returns boolean` that checks `locked_until > now()` for the given email. Call this before `signInWithPassword`. Reset `failed_login_attempts = 0` on successful login via a separate RPC or Server Action with the service role key.

3. **Google OAuth Redirect URI for Vercel preview URLs**
   - What we know: Google OAuth requires explicit redirect URIs in the Google Cloud Console. Vercel preview URLs are dynamic (e.g., `nextjs-app-xyz-ramzilbs.vercel.app`).
   - What's unclear: Whether Supabase's wildcard redirect configuration supports Vercel preview URL patterns.
   - Recommendation: Add both production URL and Vercel preview URL pattern to Google Cloud Console's authorized redirect URIs. Also add to Supabase Auth → URL Configuration → Redirect URLs. For development, add `http://localhost:3000`.

4. **TOTP unenroll and locked device handling**
   - What we know: `supabase.auth.mfa.unenroll({ factorId })` removes the factor. But users need to be AAL2 to unenroll (chicken-and-egg if device lost).
   - What's unclear: The Supabase admin API path for resetting MFA for a user.
   - Recommendation: Build an admin dashboard action using the service role key (`supabase.auth.admin.mfa.deleteFactor()`) to disable TOTP for locked-out users. Document this as an admin-only recovery path.

---

## Full Database Schema (All 20+ Tables)

This section documents every table needed for Phase 1 SQL migrations. All tables follow the pattern: UUID PK, `owner_id FK auth.users`, `deleted_at` soft delete, `created_at`/`updated_at` timestamps.

```sql
-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table public.profiles (
  id                    uuid references auth.users(id) on delete cascade primary key,
  full_name             text,
  avatar_url            text,
  role                  text not null default 'user'
                        check (role in ('admin', 'manager', 'user')),
  failed_login_attempts integer not null default 0,
  locked_until          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ============================================================
-- CRM
-- ============================================================
create table public.companies (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id),
  name        text not null,
  industry    text,
  website     text,
  address     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(industry, ''))
  ) stored
);

create table public.contacts (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id),
  first_name   text not null,
  last_name    text,
  email        text,
  phone        text,
  company_id   uuid references public.companies(id),
  company_name text,
  tags         text[],
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  search_vector tsvector generated always as (
    to_tsvector('simple',
      coalesce(first_name,'') || ' ' || coalesce(last_name,'') || ' ' ||
      coalesce(email,'') || ' ' || coalesce(company_name,'')
    )
  ) stored
);

create table public.pipeline_stages (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id),
  name       text not null,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.deals (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id),
  title        text not null,
  value        numeric(15,2) default 0,
  stage_id     uuid references public.pipeline_stages(id),
  contact_id   uuid references public.contacts(id),
  company_id   uuid references public.companies(id),
  assigned_to  uuid references auth.users(id),
  closed_at    timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(title,''))
  ) stored
);

create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id),
  title        text not null,
  description  text,
  due_date     timestamptz,
  completed    boolean not null default false,
  completed_at timestamptz,
  contact_id   uuid references public.contacts(id),
  deal_id      uuid references public.deals(id),
  assigned_to  uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id),
  content    text not null,
  contact_id uuid references public.contacts(id),
  company_id uuid references public.companies(id),
  deal_id    uuid references public.deals(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ============================================================
-- FACTURATION
-- ============================================================
create table public.invoices (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references auth.users(id),
  invoice_number   text not null unique,
  contact_id       uuid references public.contacts(id),
  company_id       uuid references public.companies(id),
  status           text not null default 'draft'
                   check (status in ('draft','sent','paid','overdue','cancelled')),
  issue_date       date not null default current_date,
  due_date         date,
  subtotal         numeric(15,2) not null default 0,
  tax_rate         numeric(5,2) not null default 0,
  tax_amount       numeric(15,2) not null default 0,
  total            numeric(15,2) not null default 0,
  amount_paid      numeric(15,2) not null default 0,
  notes            text,
  stripe_payment_intent_id text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create table public.invoice_items (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity    numeric(10,2) not null default 1,
  unit_price  numeric(15,2) not null default 0,
  total       numeric(15,2) not null default 0
);

create table public.quotes (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id),
  quote_number   text not null unique,
  contact_id     uuid references public.contacts(id),
  status         text not null default 'draft'
                 check (status in ('draft','sent','accepted','rejected')),
  valid_until    date,
  subtotal       numeric(15,2) not null default 0,
  tax_rate       numeric(5,2) not null default 0,
  total          numeric(15,2) not null default 0,
  converted_to_invoice_id uuid references public.invoices(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

create table public.payments (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id),
  invoice_id  uuid not null references public.invoices(id),
  amount      numeric(15,2) not null,
  method      text check (method in ('stripe','bank_transfer','cash','check')),
  paid_at     timestamptz not null default now(),
  reference   text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- COMPTABILITE
-- ============================================================
create table public.accounts (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id),
  code        text not null,
  name        text not null,
  type        text not null check (type in ('asset','liability','equity','income','expense')),
  parent_id   uuid references public.accounts(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (owner_id, code)
);

create table public.journal_entries (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id),
  date        date not null default current_date,
  description text,
  invoice_id  uuid references public.invoices(id),
  payment_id  uuid references public.payments(id),
  created_at  timestamptz not null default now()
);

create table public.journal_lines (
  id               uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  account_id       uuid not null references public.accounts(id),
  debit            numeric(15,2) not null default 0,
  credit           numeric(15,2) not null default 0,
  description      text
);

-- ============================================================
-- RH / PAIE
-- ============================================================
create table public.departments (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id),
  name       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.employees (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id),
  full_name     text not null,
  email         text,
  job_title     text,
  department_id uuid references public.departments(id),
  base_salary   numeric(15,2) not null default 0,
  start_date    date,
  status        text not null default 'active' check (status in ('active','inactive')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create table public.leave_requests (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id),
  employee_id uuid not null references public.employees(id),
  type        text not null check (type in ('annual','sick','unpaid','other')),
  start_date  date not null,
  end_date    date not null,
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  approved_by uuid references auth.users(id),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.payslips (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id),
  employee_id  uuid not null references public.employees(id),
  period_month integer not null check (period_month between 1 and 12),
  period_year  integer not null,
  gross_salary numeric(15,2) not null,
  cnas_deduction numeric(15,2) not null default 0,
  irg_deduction  numeric(15,2) not null default 0,
  net_salary     numeric(15,2) not null,
  generated_at timestamptz not null default now(),
  unique (employee_id, period_month, period_year)
);

-- ============================================================
-- CROSS-CUTTING
-- ============================================================
create table public.google_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade unique,
  access_token  text not null,  -- encrypt at application layer
  refresh_token text,
  expires_at    timestamptz,
  scopes        text[],
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id),
  action      text not null,
  resource    text not null,
  resource_id text,
  metadata    jsonb,
  ip_address  text,
  created_at  timestamptz not null default now()
);
```

---

## Sources

### Primary (HIGH confidence)
- Next.js official docs v16.1.6 — proxy.ts file convention, middleware rename, create-next-app CLI flags
  - https://nextjs.org/docs/app/api-reference/file-conventions/proxy
  - https://nextjs.org/docs/app/api-reference/cli/create-next-app
- Supabase official docs — SSR setup, RLS patterns, TOTP MFA, full-text search, profiles trigger, Google OAuth
  - https://supabase.com/docs/guides/auth/server-side/nextjs
  - https://supabase.com/docs/guides/auth/auth-mfa/totp
  - https://supabase.com/docs/guides/auth/auth-mfa
  - https://supabase.com/docs/guides/database/postgres/row-level-security
  - https://supabase.com/docs/guides/database/full-text-search
  - https://supabase.com/docs/guides/auth/managing-user-data
  - https://supabase.com/docs/guides/auth/social-login/auth-google
- npm registry — package versions confirmed via `npm show`:
  - next@16.1.6, @supabase/ssr@0.9.0, @supabase/supabase-js@2.98.0, @tanstack/react-query@5.90.21
- Existing project research: `.planning/research/NEXTJS_PATTERNS.md` — HIGH confidence, confirmed 2026-03-04
- Vercel official docs — Root Directory subdirectory deployment configuration
  - https://vercel.com/docs/deployments/configure-a-build#root-directory

### Secondary (MEDIUM confidence)
- Supabase community — AAL2 enforcement in middleware pattern (multiple sources confirm the pattern)
- npm show output — all version numbers confirmed live

### Tertiary (LOW confidence)
- Account lockout SECURITY DEFINER RPC pattern — derived from Supabase RLS docs + PostgreSQL docs. No official Supabase example for this specific pattern. Validate during implementation.

---

## Metadata

**Confidence breakdown:**
- Standard stack (versions): HIGH — confirmed via npm show and official docs
- proxy.ts rename: HIGH — confirmed via official Next.js v16.1.6 docs
- Supabase native TOTP MFA: HIGH — confirmed via official Supabase docs
- `@supabase/ssr` patterns: HIGH — confirmed via official Supabase SSR docs
- RLS policies: HIGH — confirmed via official Supabase RLS docs
- tsvector / GIN patterns: HIGH — confirmed via official Supabase FTS docs
- profiles trigger: HIGH — confirmed via official Supabase user management docs
- Account lockout via SECURITY DEFINER RPC: MEDIUM — pattern derived from docs, not direct example
- Vercel subdirectory config: HIGH — confirmed via official Vercel docs

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable libraries; proxy.ts is newly renamed — verify if Next.js updates further)

---

## Critical Corrections to Roadmap

The following items in `.planning/ROADMAP.md` Phase 1 description need correction before planning:

| Roadmap Assumption | Correct Approach |
|--------------------|-----------------|
| Install `otpauth`, `qrcode` for TOTP | Use `supabase.auth.mfa.*` — no extra libraries needed |
| Store `totp_secret`, `totp_enabled` in `profiles` | Remove these columns — Supabase stores TOTP secrets internally |
| File name `middleware.ts` | Must be `proxy.ts` — middleware.ts deprecated in v16.0.0 |
| `create-next-app@14` | Use `create-next-app@latest` (installs v16.1.6) |
| TOTP via separate `app/(auth)/2fa/page.tsx` with otpauth verify | 2FA page uses `supabase.auth.mfa.challenge()` + `supabase.auth.mfa.verify()` |
| CLI: `--src-dir=no` flag | Flag is `--no-src-dir` or omit (default is no src dir) |
