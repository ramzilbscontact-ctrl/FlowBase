---
phase: 02-port-crm-analytics-ui
plan: "01"
subsystem: ui
tags: [react, lucide-react, tailwind, supabase, postgresql, modal, kpi-card, pipeline]

# Dependency graph
requires:
  - phase: 01-foundation-schema-auth
    provides: pipeline_stages table schema, Supabase project, PageShell component pattern

provides:
  - Modal.tsx shared overlay component used by all CRM create/edit forms
  - StatsCard.tsx KPI card component used by analytics dashboard
  - 005_seed_stages.sql migration seeding 6 default pipeline stages for first user

affects:
  - 02-port-crm-analytics-ui (plans 02-06 all import Modal and/or StatsCard)
  - Phase 3 (Facturation/RH pages use Modal for create forms)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Modal pattern: fixed overlay with backdrop dismiss + X button, size variants via max-w map"
    - "StatsCard pattern: colored left-border accent card with icon container, null-safe value display"

key-files:
  created:
    - nextjs-app/components/ui/Modal.tsx
    - nextjs-app/components/ui/StatsCard.tsx
    - nextjs-app/supabase/migrations/005_seed_stages.sql
  modified: []

key-decisions:
  - "Migration named 005_seed_stages.sql (not 002) to avoid conflict with existing 002_rls.sql"
  - "pipeline_stages migration uses DO block with first auth.users entry — safe for dev, app auto-seeds in production (Plan 03)"

patterns-established:
  - "Modal pattern: 'use client', null return when closed, size map, backdrop onClick dismiss, lucide X button"
  - "StatsCard pattern: color map object for icon bg/color/border, null-safe value, optional hint slot"

requirements-completed: [FR-02-3, FR-02-4]

# Metrics
duration: 8min
completed: 2026-03-24
---

# Phase 2 Plan 01: Shared UI Components + Pipeline Stages Summary

**Modal overlay and StatsCard KPI components created as reusable primitives, plus idempotent DO-block migration seeding 6 French pipeline stages for the Kanban board**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-24T00:00:00Z
- **Completed:** 2026-03-24T00:08:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- `Modal.tsx` — reusable overlay modal with backdrop dismiss, X close button, 4 size variants; works as drop-in for all CRM create/edit forms
- `StatsCard.tsx` — KPI card with 6 color themes, left-border accent, null-safe value display ('—' fallback), optional hint text
- `005_seed_stages.sql` — idempotent DO block inserting Prospect/Qualifié/Proposition/Négociation/Gagné/Perdu stages for the first auth.users entry

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Modal.tsx shared component** - `d21b71f` (feat)
2. **Task 2: Create StatsCard.tsx shared component** - `49d72a7` (feat)
3. **Task 3: Create pipeline_stages seed migration** - `b74516d` (feat)

## Files Created/Modified

- `nextjs-app/components/ui/Modal.tsx` — Reusable overlay modal; exports `Modal`; `use client`
- `nextjs-app/components/ui/StatsCard.tsx` — KPI analytics card; exports `StatsCard`; `use client`
- `nextjs-app/supabase/migrations/005_seed_stages.sql` — DO block seeding 6 default pipeline stages

## Decisions Made

- **Migration numbered 005 not 002:** Plan specified `002_seed_stages.sql` but `002_rls.sql` already existed. Renamed to `005_seed_stages.sql` to maintain sequential order and avoid overwriting an existing migration. Naming in the plan was an artifact of when it was written (before other migrations existed).
- **DO block strategy for owner-scoped stages:** `pipeline_stages.owner_id` is NOT NULL, so the migration must reference a real user. Using first `auth.users` entry is safe for dev; production seeding is handled per-user in Plan 03 (deals page auto-seed).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Migration file renamed from 002 to 005 to avoid naming conflict**
- **Found during:** Task 3 (pipeline_stages seed migration)
- **Issue:** Plan specified `002_seed_stages.sql` but `002_rls.sql` already exists in migrations directory. Creating a duplicate-numbered file would break Supabase migration ordering.
- **Fix:** Created as `005_seed_stages.sql` — the next available sequential slot after existing 001-004 migrations.
- **Files modified:** `nextjs-app/supabase/migrations/005_seed_stages.sql`
- **Verification:** `ls` confirms unique sequential names; SQL content unchanged from plan spec.
- **Committed in:** b74516d (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 naming conflict / bug)
**Impact on plan:** Necessary correctness fix — file content is identical to plan spec, only the filename changed to avoid overwriting an existing migration.

## Issues Encountered

None beyond the migration naming conflict documented above.

## User Setup Required

To apply the seed migration to your Supabase project, run:
```bash
cd nextjs-app && npx supabase db push
```
Or apply `005_seed_stages.sql` directly via the Supabase SQL editor if `supabase db push` is not configured.

## Next Phase Readiness

- `Modal` and `StatsCard` are importable by all Phase 2 plans immediately
- Pipeline stages seed is ready to apply — required before Plan 03 (deals Kanban) works correctly
- Plans 02-06 can now proceed in any order since their shared dependencies are in place

---
*Phase: 02-port-crm-analytics-ui*
*Completed: 2026-03-24*
