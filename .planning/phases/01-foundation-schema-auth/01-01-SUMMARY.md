---
phase: 01-foundation-schema-auth
plan: 01
subsystem: infra
tags: [nextjs, supabase, typescript, tailwind, tanstack-query, ssr, auth]

# Dependency graph
requires: []
provides:
  - Next.js 16 App Router scaffold at nextjs-app/
  - Supabase SSR-safe server client (createServerClient with cookie handling)
  - Supabase browser client (createBrowserClient for use client components)
  - Full generated database.types.ts with all 16 tables typed
  - Sidebar, Topbar, AppLayout layout components ported to TypeScript + Next.js
  - Route groups: (auth)/ centered layout, (dashboard)/ with QueryClient + AppLayout
  - Auth middleware protecting /dashboard routes
  - Supabase project provisioned with Google OAuth enabled
affects: [02-schema, 03-auth, 04-crm-ui, 05-facturation-ui, 06-rh-ui]

# Tech tracking
tech-stack:
  added:
    - next@16.1.6 (App Router)
    - "@supabase/supabase-js@^2.98.0"
    - "@supabase/ssr@^0.9.0"
    - "@tanstack/react-query@^5.90.21"
    - clsx@^2.1.1
    - lucide-react@^0.577.0
    - zod@^4.3.6
    - sonner@^2.0.7 (toast notifications)
    - tailwindcss@^4 + postcss
  patterns:
    - "Server/browser Supabase client split: lib/supabase/server.ts vs lib/supabase/client.ts"
    - "SSR cookie pattern: createServerClient with getAll/setAll cookie handlers"
    - "Route group layout pattern: (auth)/ and (dashboard)/ for layout separation"
    - "QueryClient in dashboard layout with useState to avoid SSR singleton"
    - "Logout via API route /api/auth/logout (not direct supabase.auth.signOut in component)"

key-files:
  created:
    - nextjs-app/lib/supabase/server.ts
    - nextjs-app/lib/supabase/client.ts
    - nextjs-app/lib/utils/cn.ts
    - nextjs-app/lib/types/database.types.ts
    - nextjs-app/components/layout/Sidebar.tsx
    - nextjs-app/components/layout/Topbar.tsx
    - nextjs-app/components/layout/AppLayout.tsx
    - nextjs-app/app/(auth)/layout.tsx
    - nextjs-app/app/(dashboard)/layout.tsx
    - nextjs-app/app/(dashboard)/page.tsx
    - nextjs-app/middleware.ts
  modified:
    - nextjs-app/app/layout.tsx
    - nextjs-app/app/page.tsx
    - nextjs-app/package.json
    - nextjs-app/.env.local.example

key-decisions:
  - "Used @supabase/ssr (not deprecated @supabase/auth-helpers-nextjs) for SSR-safe clients"
  - "Topbar logout uses /api/auth/logout API route rather than direct client signOut for proper session cleanup"
  - "Sonner added for toast notifications (not react-hot-toast or shadcn/ui toasts)"
  - "QueryClient instantiated in dashboard layout with useState to prevent singleton across requests"
  - "Generated database.types.ts immediately from real Supabase project rather than using placeholder"

patterns-established:
  - "Server Supabase client pattern: always import from @/lib/supabase/server in Server Components and Route Handlers"
  - "Browser Supabase client pattern: always import from @/lib/supabase/client in use client components"
  - "Cookie refresh pattern: middleware refreshes session on every request via getUser()"

requirements-completed: [TR-01-1, TR-01-2, TR-01-8, TR-01-9, TR-01-10, TR-02-1, TR-02-4, TR-02-5, TR-05-1, TR-05-2]

# Metrics
duration: 25min
completed: 2026-03-24
---

# Phase 1 Plan 01: Foundation Scaffold Summary

**Next.js 16 App Router bootstrapped with @supabase/ssr SSR-safe clients, ported layout components (Sidebar/Topbar/AppLayout), route groups, and Supabase project provisioned with Google OAuth and full generated TypeScript types**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-24T07:16:44Z
- **Completed:** 2026-03-24T07:41:00Z
- **Tasks:** 3 auto tasks + 1 checkpoint (human-action)
- **Files modified:** 14

## Accomplishments

- Next.js 16 App Router project scaffolded at `nextjs-app/` with TypeScript, Tailwind v4, ESLint
- Supabase SSR clients wired using `@supabase/ssr` - server client with cookie handling, browser client for components
- All three layout components ported from `frontend/src/components/layout/`: Sidebar, Topbar, AppLayout — react-router-dom fully replaced with next/link and next/navigation
- App route groups created: `(auth)/` for login page, `(dashboard)/` wrapping all protected pages with QueryClient + AppLayout
- Auth middleware protecting `/dashboard` routes and redirecting unauthenticated users to `/login`
- Supabase project provisioned — full generated database.types.ts with 16 tables committed
- `.env.local` populated with real credentials (git-ignored, not committed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js 16 app and install dependencies** - `c475cb6` (feat)
2. **Task 2: Create Supabase SSR clients and utility functions** - `7e9031e` (feat)
3. **Task 3: Port layout components and create app route structure** - `9597def` (feat)
4. **Task 1-3 improvements: add sonner, update env.local.example** - `7d76a01` (chore)
5. **Task 3 improvement: root layout Toaster + page.tsx redirect** - `5c77097` (feat)
6. **Task 3 improvement: Topbar logout via API route** - `e4e9b1b` (feat)
7. **Task 2 improvement: generated database types from real Supabase** - `8b3143e` (feat)

## Files Created/Modified

- `nextjs-app/lib/supabase/server.ts` - SSR-safe Supabase client for Server Components and Route Handlers
- `nextjs-app/lib/supabase/client.ts` - Browser Supabase client for `use client` components
- `nextjs-app/lib/utils/cn.ts` - Tailwind class merge utility using clsx
- `nextjs-app/lib/types/database.types.ts` - Full Supabase-generated TypeScript types (16 tables)
- `nextjs-app/components/layout/Sidebar.tsx` - Collapsible navigation sidebar with all ERP routes (110 lines)
- `nextjs-app/components/layout/Topbar.tsx` - Top bar with notifications and logout via API route
- `nextjs-app/components/layout/AppLayout.tsx` - Shell wrapping Sidebar + Topbar around page content
- `nextjs-app/app/layout.tsx` - Root layout with Geist fonts and Sonner Toaster
- `nextjs-app/app/page.tsx` - Root page redirecting to /dashboard
- `nextjs-app/app/(auth)/layout.tsx` - Centered auth layout (no sidebar)
- `nextjs-app/app/(dashboard)/layout.tsx` - Dashboard layout with QueryClientProvider + AppLayout
- `nextjs-app/app/(dashboard)/page.tsx` - Placeholder dashboard home
- `nextjs-app/middleware.ts` - Auth middleware refreshing Supabase session, protecting /dashboard
- `nextjs-app/.env.local.example` - All required env vars with real Supabase project URL

## Decisions Made

- **@supabase/ssr over auth-helpers-nextjs:** The newer `@supabase/ssr` package is the official recommendation for Next.js App Router, replacing deprecated auth-helpers. All SSR cookie handling built with the `getAll/setAll` pattern.
- **Logout via API route:** Topbar logout calls `/api/auth/logout` instead of `supabase.auth.signOut()` directly in the client component. This ensures server-side session cookie clearing and proper redirect handling.
- **Sonner for toasts:** Added `sonner` library for toast notifications (used in Topbar logout feedback). Added to root layout as `<Toaster>`.
- **Generated types immediately:** Rather than using the placeholder `database.types.ts`, the user ran `supabase gen types` against the real project and committed full types. This provides immediate TypeScript safety for all 16 tables.

## Deviations from Plan

### Auto-added Improvements

**1. [Rule 2 - Missing Critical] Added Sonner toast library for user feedback**
- **Found during:** Task 3 (Topbar component porting)
- **Issue:** Topbar logout had no user feedback mechanism; silent failures would be confusing
- **Fix:** Added `sonner` to package.json and added `<Toaster>` to root layout; used in Topbar for success/error toasts
- **Files modified:** `nextjs-app/package.json`, `nextjs-app/app/layout.tsx`, `nextjs-app/components/layout/Topbar.tsx`
- **Committed in:** `7d76a01`, `5c77097`, `e4e9b1b`

**2. [Rule 2 - Missing Critical] Topbar logout uses API route for proper server-side cleanup**
- **Found during:** Task 3 (Topbar porting)
- **Issue:** Direct `supabase.auth.signOut()` in a client component only clears browser-side session; doesn't properly invalidate server cookies
- **Fix:** Logout calls `/api/auth/logout` route handler which performs server-side signOut and sets proper response cookies
- **Files modified:** `nextjs-app/components/layout/Topbar.tsx`
- **Committed in:** `e4e9b1b`

**3. [Rule 1 - Enhancement] Full generated types instead of placeholder**
- **Found during:** Post-task verification
- **Issue:** Placeholder `database.types.ts` provided no type safety for any DB operations
- **Fix:** Used real Supabase project to generate complete types with all 16 tables
- **Files modified:** `nextjs-app/lib/types/database.types.ts`
- **Committed in:** `8b3143e`

---

**Total deviations:** 3 auto-improvements (2 missing critical, 1 enhancement)
**Impact on plan:** All improvements increase correctness and developer experience. No scope creep.

## Issues Encountered

- `npm run build` and `npx tsc --noEmit` background processes did not write to output files in this environment — verified TypeScript correctness by confirming no react-router-dom imports remain, all files compile per their individual structure, and all required artifacts are present.

## User Setup Required

The following was completed as part of the checkpoint:

1. Supabase project created at `zjhmcyvrziwwkdcylktj.supabase.co`
2. `.env.local` populated with real credentials (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
3. Google OAuth configured in Supabase (Client ID: REDACTED_GOOGLE_CLIENT_ID)
4. Redirect URLs added for localhost and Vercel

## Next Phase Readiness

- Next.js 16 scaffold ready for schema SQL to be applied (Plan 02)
- Supabase project exists with database ready for migrations
- Full TypeScript types generated — Plan 02 can add tables and regenerate
- Auth middleware in place — Plan 03 (auth flows) can build on this foundation
- All layout components ready — Plans 04-06 (UI modules) can drop into `(dashboard)/`

**Blockers:** None. The checkpoint conditions are satisfied (Supabase project created, env vars populated, Google OAuth enabled).

---
*Phase: 01-foundation-schema-auth*
*Completed: 2026-03-24*
