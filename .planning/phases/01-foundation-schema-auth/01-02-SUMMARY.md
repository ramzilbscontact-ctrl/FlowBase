---
phase: 01-foundation-schema-auth
plan: 02
subsystem: database
tags: [supabase, postgresql, rls, schema, migrations, typescript]

# Dependency graph
requires:
  - 01-01 (Supabase project provisioned, database.types.ts generated)
provides:
  - nextjs-app/supabase/migrations/001_schema.sql (all 20 tables DDL)
  - nextjs-app/supabase/migrations/002_rls.sql (RLS enabled + policies for all tables)
  - nextjs-app/supabase/migrations/003_functions.sql (SECURITY DEFINER trigger + RPCs)
  - nextjs-app/supabase/migrations/004_indexes.sql (GIN + owner + partial + FK indexes)
  - nextjs-app/lib/types/database.types.ts (generated TypeScript types — 22 Row types)
affects: [03-auth, 04-crm-ui, 05-facturation-ui, 06-rh-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RLS pattern: (select auth.uid()) subquery avoids per-row execution"
    - "Admin bypass pattern: check role from profiles in every RLS policy"
    - "Child table RLS: invoice_items and journal_lines inherit parent ownership via EXISTS subquery"
    - "SECURITY DEFINER set search_path = '': prevents search_path injection attacks"
    - "GENERATED ALWAYS AS tsvector: automatic full-text search vector maintenance"
    - "Soft delete pattern: deleted_at IS NULL in SELECT policies"

# Key files
key-files:
  created:
    - nextjs-app/supabase/migrations/001_schema.sql
    - nextjs-app/supabase/migrations/002_rls.sql
    - nextjs-app/supabase/migrations/003_functions.sql
    - nextjs-app/supabase/migrations/004_indexes.sql
  modified:
    - nextjs-app/lib/types/database.types.ts (already committed in 01-01)

# Decisions
key-decisions:
  - "Migration files as source of truth: SQL committed to version control for reproducibility, schema already live in Supabase from plan 01-01"
  - "No hard DELETE policies on any table: all deletes are soft (UPDATE sets deleted_at)"
  - "SECURITY DEFINER RPCs for pre-auth lockout: record_failed_login and check_login_allowed bypass RLS to work before user is authenticated"
  - "handle_new_user trigger has exception handler: non-blocking — signup completes even if profile insert fails"
  - "(select auth.uid()) subquery pattern in all RLS policies: evaluated once per query, not per row"

# Metrics
duration: 5min
completed: 2026-03-24
---

# Phase 1 Plan 02: Schema Migration Summary

**PostgreSQL schema with all 20 tables, RLS policies on every table, SECURITY DEFINER trigger + lockout RPCs, GIN full-text search indexes, and generated TypeScript types — all committed as versioned migration files**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-24T07:39:48Z
- **Completed:** 2026-03-24T07:44:00Z
- **Tasks:** 3 (Task 3 completed in prior plan 01-01)
- **Files modified:** 4 new migration files (types already generated)

## Accomplishments

- All 20 tables created in FK-dependency order: profiles, companies, contacts, pipeline_stages, deals, tasks, notes, invoices, invoice_items, quotes, payments, accounts, journal_entries, journal_lines, departments, employees, leave_requests, payslips, google_tokens, audit_logs
- RLS enabled on all 20 tables with owner+admin access policies using the performant `(select auth.uid())` subquery pattern
- Child table policies for `invoice_items` and `journal_lines` inherit ownership from their parent tables via EXISTS subquery
- `handle_new_user` SECURITY DEFINER trigger auto-creates profile row on every `auth.users` insert
- `record_failed_login`, `check_login_allowed`, `reset_failed_login` RPCs implemented as SECURITY DEFINER functions (called pre-auth with anon key — bypass RLS safely)
- GIN indexes on `search_vector` columns for contacts/companies/deals full-text search
- Partial indexes for soft-deleted rows, owner_id indexes for RLS evaluation performance, FK indexes for join performance
- TypeScript types (22 Row types) already generated and committed in plan 01-01

## Task Commits

Each task was committed atomically:

1. **Task 1: Create schema migration — all 20+ tables** - `e6e3c18` (feat)
2. **Task 2: Apply RLS policies and SECURITY DEFINER functions** - `c87af59` (feat)
3. **Task 3: TypeScript types** - `8b3143e` (already committed in 01-01 — no new commit needed)

## Files Created

- `nextjs-app/supabase/migrations/001_schema.sql` — 292 lines, all 20 table DDL with proper constraints and generated tsvector columns
- `nextjs-app/supabase/migrations/002_rls.sql` — 460 lines, RLS enable + SELECT/INSERT/UPDATE policies for all tables
- `nextjs-app/supabase/migrations/003_functions.sql` — 104 lines, handle_new_user trigger + 3 SECURITY DEFINER RPCs
- `nextjs-app/supabase/migrations/004_indexes.sql` — 33 lines, GIN + owner + partial + FK + audit_logs indexes
- `nextjs-app/lib/types/database.types.ts` — 22 Row types with full Insert/Update types and FK relationships (committed in 01-01)

## Decisions Made

- **SQL committed as migration files:** Provides version control, reproducibility, and documentation for the schema. Supabase CLI can use these for future environments.
- **No hard DELETE policies:** All data tables use soft delete (UPDATE sets `deleted_at`). This enables audit trails and recovery. `SELECT` policies filter `deleted_at IS NULL` automatically.
- **SECURITY DEFINER for lockout RPCs:** `record_failed_login` and `check_login_allowed` must work before a user is authenticated (called with anon key). SECURITY DEFINER with `set search_path = ''` bypasses RLS safely.
- **Non-blocking trigger:** `handle_new_user` wraps the INSERT in a try/catch so auth signup never fails due to profile creation issues.

## Deviations from Plan

None — plan executed exactly as written. The migration SQL files precisely match the plan's specification. Task 3 (TypeScript types) was noted as already complete from plan 01-01.

## Next Phase Readiness

- Schema is the foundation — all CRUD in plans 03-06 can query these tables
- RLS is active — application code does NOT need authorization checks in CRUD operations
- `check_login_allowed` and `record_failed_login` RPCs ready for plan 03 (auth flows)
- `handle_new_user` trigger ensures every new user gets a profile row
- TypeScript types are accurate — all queries will be type-safe

**Blockers:** None.

---
*Phase: 01-foundation-schema-auth*
*Completed: 2026-03-24*

## Self-Check: PASSED

- FOUND: nextjs-app/supabase/migrations/001_schema.sql
- FOUND: nextjs-app/supabase/migrations/002_rls.sql
- FOUND: nextjs-app/supabase/migrations/003_functions.sql
- FOUND: nextjs-app/supabase/migrations/004_indexes.sql
- FOUND: nextjs-app/lib/types/database.types.ts
- FOUND: .planning/phases/01-foundation-schema-auth/01-02-SUMMARY.md
- FOUND: commit e6e3c18 (feat: schema migration)
- FOUND: commit c87af59 (feat: RLS + functions + indexes)
