---
phase: 02-port-crm-analytics-ui
plan: "04"
subsystem: ui
tags: [react, supabase, tanstack-query, tasks, crud, modal, priority]

# Dependency graph
requires:
  - phase: 02-01
    provides: Modal component, PageShell, TableHead, EmptyRow, TableRow, Badge, browser Supabase client
provides:
  - Tasks page with full CRUD (create, edit, complete-toggle, soft-delete)
  - Priority badge system (high/medium/low) with French labels and color coding
  - 006_add_priority_to_tasks.sql idempotent migration
  - Unified create/edit modal with optional assignee select
  - Filter tabs (Toutes / En cours / Terminées) driving Supabase query
affects:
  - 02-05-analytics
  - 03-facturation

# Tech tracking
tech-stack:
  added: []
  patterns:
    - editingTask state drives modal mode (null=create, non-null=edit)
    - (supabase as any) cast for columns not yet in generated database.types.ts
    - Priority column added via IF NOT EXISTS migration for idempotency
    - Filter state passed as queryKey array element to scope TanStack Query cache

key-files:
  created:
    - nextjs-app/supabase/migrations/006_add_priority_to_tasks.sql
  modified:
    - nextjs-app/app/(dashboard)/dashboard/tasks/page.tsx

key-decisions:
  - "Migration named 006_ (not 003_) to avoid collision with existing 003_functions.sql"
  - "tasks.assigned_to FK references auth.users not profiles, so join uses profiles!tasks_assigned_to_fkey alias with (supabase as any) cast"
  - "profiles table has no email column in generated types — assignee select uses id + full_name only"

patterns-established:
  - "editingTask state pattern: null=create mode, non-null Task=edit mode, single saveMut branches on this"
  - "Filter tabs pass filter as second queryKey element so cache entries are filter-scoped"

requirements-completed:
  - FR-02-5

# Metrics
duration: 9min
completed: 2026-03-24
---

# Phase 2 Plan 4: Tasks CRUD Summary

**Tasks page replaced with live "use client" component: priority badges, complete toggle, unified create/edit modal with profiles-based assignee select, and filter tabs — backed by Supabase with idempotent priority column migration.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-24T18:14:09Z
- **Completed:** 2026-03-24T18:23:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `006_add_priority_to_tasks.sql` migration with `ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium' CHECK (IN ('high','medium','low'))`
- Replaced static server component tasks page with fully wired "use client" page using TanStack Query
- Delivered all must-haves: toggle complete, priority badge, create/edit modal (with pre-fill on edit), soft-delete, assignee column

## Task Commits

Each task was committed atomically:

1. **Task 1: Add priority column migration for tasks table** - `e63f0e6` (chore)
2. **Task 2: Wire tasks page — "use client" + complete toggle + create/edit modal with assignee + delete** - `77d1df5` (feat)

**Plan metadata:** (docs commit — see final_commit step)

## Files Created/Modified

- `nextjs-app/supabase/migrations/006_add_priority_to_tasks.sql` - Idempotent ALTER TABLE adding priority text column to tasks
- `nextjs-app/app/(dashboard)/dashboard/tasks/page.tsx` - Full tasks CRUD page: filter tabs, toggle, priority badges, edit modal, assignee

## Decisions Made

- Migration numbered 006 not 003 — existing migrations 001-005 already in place; 003 was taken by functions migration
- The `tasks.assigned_to` FK references `auth.users(id)` not `profiles`, so the PostgREST join alias `profiles!tasks_assigned_to_fkey` is used with `(supabase as any)` cast to avoid generated-type mismatch
- Profiles table query uses only `id, full_name` — no `email` column exists in the generated types (profiles doesn't have it)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration filename 003 already in use**
- **Found during:** Task 1 (Add priority column migration)
- **Issue:** Plan specified `003_add_priority_to_tasks.sql` but `003_functions.sql` already exists in the migrations directory
- **Fix:** Named file `006_add_priority_to_tasks.sql` (next available number after existing 005_seed_stages.sql)
- **Files modified:** nextjs-app/supabase/migrations/006_add_priority_to_tasks.sql (created with new name)
- **Verification:** File exists with correct ALTER TABLE content
- **Committed in:** e63f0e6 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Filename-only change, zero functional impact. SQL content identical to plan specification.

## Issues Encountered

- TypeScript compiler not directly available (`tsc` not in node_modules/.bin, TypeScript not listed as devDependency). Next.js bundles its own TypeScript checker via `next build`. Code manually reviewed for type correctness — all Supabase calls targeting post-migration columns use `as any` cast as specified in the plan.

## User Setup Required

The migration `006_add_priority_to_tasks.sql` must be applied to the Supabase database before the priority field will work:

1. Open Supabase Dashboard > SQL Editor
2. Run the contents of `nextjs-app/supabase/migrations/006_add_priority_to_tasks.sql`
3. Verify with: `SELECT column_name FROM information_schema.columns WHERE table_name='tasks' AND column_name='priority';`

Alternatively if using `supabase db push` from the CLI: `supabase db push` will apply all pending migrations.

## Next Phase Readiness

- Tasks CRUD is complete and wired — ready for Phase 2 Plan 5 (Analytics)
- The `profiles!tasks_assigned_to_fkey` join will succeed once the priority migration is applied and Supabase's PostgREST auto-discovers the FK
- No blockers for 02-05

---
*Phase: 02-port-crm-analytics-ui*
*Completed: 2026-03-24*
