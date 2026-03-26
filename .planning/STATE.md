# Project State

**Project:** Radiance ERP Migration → Next.js 16 + Supabase + Vercel
**Last updated:** 2026-03-25
**Status: 🟢 Phase 4 Complete ✅ — Ready for Phase 5 (Google Workspace)

---

## Current Position

| Item | Status |
|------|--------|
| Codebase mapped | ✅ `.planning/codebase/` (7 documents) |
| Project initialized | ✅ `.planning/PROJECT.md` |
| Requirements written | ✅ `.planning/REQUIREMENTS.md` (10 FR modules, 6 TR groups) |
| Roadmap created | ✅ `.planning/ROADMAP.md` (6 phases) |
| Research done | ✅ `.planning/research/NEXTJS_PATTERNS.md` |
| Active phase | Phase 5 — Google Workspace Integration |
| Current plan | Phase 3 UAT complete ✅ — Phase 4 not yet started |

---

## Milestone

**M1 — Full Stack Migration**
- 6 phases total (compressed from 10 — existing React UI reused directly)
- Phase 1 complete ✅
- Phase 2 complete ✅
- Current phase: Phase 3 — Port Facturation + Comptabilité + RH/Paie UI

## Phase Progress

| Phase | Name | Status |
|-------|------|--------|
| 1 | Foundation + Schema + Auth | ✅ Complete (4/4 plans) |
| 2 | Port CRM + Analytics UI | ✅ Complete (5/5 plans) |
| 3 | Port Facturation + Comptabilité + RH/Paie UI | ✅ Complete (5/5 plans, UAT passed) |
| 4 | Data Migration (MongoDB → Supabase) | ✅ Complete (3/3 plans, verified) |
| 5 | Google Workspace Integration | ⬜ Not started |
| 6 | Testing, CI/CD & Production Deployment | ⬜ Not started |

---

## Decisions

1. **Used @supabase/ssr (not deprecated @supabase/auth-helpers-nextjs)** — Official Next.js App Router pattern, SSR-safe with getAll/setAll cookie handlers [01-01]
2. **Topbar logout via API route (/api/auth/logout)** — Server-side session cleanup is more reliable than direct client signOut in component [01-01]
3. **Sonner for toast notifications** — Lightweight toast library added alongside layout components for UX feedback [01-01]
4. **Full generated database.types.ts immediately** — Generated real types from live Supabase project (zjhmcyvrziwwkdcylktj) instead of using placeholder [01-01]
5. **Migration files as source of truth** — SQL committed to version control for reproducible schema management [01-02]
6. **No hard DELETE policies** — Soft delete only (deleted_at) on all data tables for audit trails and recovery [01-02]
7. **SECURITY DEFINER RPCs for pre-auth lockout** — record_failed_login and check_login_allowed bypass RLS to work before user is authenticated [01-02]
8. **PageShell component for uniform module layout** — Shared wrapper with title, subtitle, action button slot — all module pages use it [01-04 polish]
9. **Sidebar uses /dashboard/... convention** — All routes under /dashboard/* for clarity with (dashboard) route group [01-04 polish]
10. **Module scaffold pages created ahead of Phase 2** — 18 placeholder pages built during Phase 1 UAT to unblock navigation testing [01-04 polish]
11. **Combined create+edit modal via editingContact/editingCompany state** — Single modal component, two mutation branches; avoids duplicate form definitions [02-02]
12. **contacts(count) aggregate uses (supabase as any) cast** — PostgREST count aggregate not reflected in generated types; cast preserves type safety elsewhere [02-02]

---
- [Phase 02-01]: Migration named 005_seed_stages.sql (not 002) to avoid conflict with existing 002_rls.sql
- [Phase 02-01]: pipeline_stages migration uses DO block seeding first auth.users entry for dev; app auto-seeds per-user in production (Plan 03)
- [Phase 02-03]: @dnd-kit chosen for Kanban drag-and-drop — DndContext + useDroppable + useSortable with PointerSensor distance:8 prevents accidental drags
- [Phase 02-03]: KanbanBoard drop target: checks if over.id matches stage id; falls back to finding deal's stage_id for card-on-card drops
- [Phase 02-04]: Migration named 006_ (not 003_) to avoid collision with existing 003_functions.sql
- [Phase 02-04]: tasks.assigned_to FK join uses profiles!tasks_assigned_to_fkey alias with (supabase as any) cast since FK targets auth.users not profiles
- [Phase 02-04]: editingTask state drives modal mode (null=create, non-null=edit) with single saveMut branching on value
- [Phase 02-05]: recharts imported directly (not via dynamic()) — page is already use client, no SSR risk
- [Phase 02-05]: Client-side groupBy for deals by stage — avoids PostgREST GROUP BY complexity
- [Phase 03-01]: Invoice edit modal opens with empty line-items row — existing invoice_items are deleted and re-inserted on save (avoids pre-load query)
- [Phase 03-01]: quotes use subtotal input (not line items) since quotes table has no invoice_items child in schema
- [Phase 03-01]: payments page is read-only — no manual payment creation UI per plan spec
- [Phase 03-02]: renderToBuffer used in all PDF Route Handlers — PDFDownloadLink/PDFViewer are browser-only and crash in Node/server context
- [Phase 03-02]: Stripe webhook reads owner_id from invoice row (not getUser()) — webhook is unauthenticated server-to-server, getUser() returns null
- [Phase 03-02]: isPublicRoute guard in proxy.ts excludes /api/stripe/webhook and /pay/* from auth redirect
- [Phase 03-02]: use(params) React hook for pay page params — Next.js 16 passes page params as Promise to client components
- [Phase 03-port-facturation-comptabilite-rh-paie-ui]: No delete on accounts — accounts with journal_lines must not be deleted; Edit-only UI enforced [03-03]
- [Phase 03-port-facturation-comptabilite-rh-paie-ui]: Single-amount double-entry mode — debit_account and credit_account receive identical amount ensuring balance by construction [03-03]
- [Phase 03-port-facturation-comptabilite-rh-paie-ui]: Client-side aggregation for reports — sum debits/credits per account type from journal_lines join [03-03]
- [Phase 03-04]: calculatePayslip uses exact Algerian 2024 IRG brackets (0%/23%/27%/30%/35%) on (gross - CNAS) annualized income
- [Phase 03-04]: Payroll page uses inline useMemo preview (no modal) — two-panel lg:grid-cols-2 layout; 23505 duplicate payslip caught with toast error
- [Phase 04-01]: UUID5 namespace: RFC 4122 DNS UUID (6ba7b810-...) as fixed migration namespace for deterministic, idempotent ObjectId->UUID conversion
- [Phase 04-01]: escape() placed in utils.py for reuse across transform tests; enum coercion added in all transform functions to silently handle out-of-range MongoDB values
- [Phase 04]: verify_hash_saved() queries auth.users.encrypted_password directly via psycopg2 to detect Supabase issue #1678 (hash not persisted by GoTrue Admin API)
- [Phase 04]: load_data.py aborts on first SQL file failure; ON CONFLICT DO NOTHING makes re-runs safe [04-02]
- [Phase 04-03]: validate.py spot-checks use id_map.json for ObjectId→UUID resolution with existence-only confirmation (no field comparison) since schema transforms alter column names

## Key Context

**Source stack (being replaced):**
- React 19 + Vite → Next.js 16 App Router
- Django 5.2 + DRF → Next.js Route Handlers
- MongoDB Atlas (MongoEngine) → Supabase PostgreSQL
- Custom JWT + bcrypt + Firebase Auth → Supabase Auth
- Redis (Channels + Celery) → deferred to v2
- Render + Firebase Hosting → Vercel

**New app location:** `/nextjs-app` (same monorepo)
**Supabase project:** `zjhmcyvrziwwkdcylktj.supabase.co`
**Vercel:** connected to GitHub

**Phase 2 starting state (what's already done):**
- All 18 module pages scaffolded with PageShell + empty Supabase queries
- Sidebar links all wired to correct /dashboard/* routes
- Responsive table layout via PageShell component
- Real Supabase client connected (server-side queries in Server Components)

**Phase 2 remaining work:**
- Real data: CRUD operations (create, edit, delete) for contacts, companies, deals, tasks
- Analytics page with real aggregated data
- CRM pipeline view (Kanban for deals by stage)
- Form modals for record creation
- Search and filter on list pages

**V2 (deferred):**
- WhatsApp / Instagram (Meta API) real-time
- Celery background tasks → Vercel Cron Jobs
- Claude AI integration

**Environment vars status:**
- `NEXT_PUBLIC_SUPABASE_URL` = `https://zjhmcyvrziwwkdcylktj.supabase.co` ✅
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — populated in .env.local ✅
- `SUPABASE_SERVICE_ROLE_KEY` — populated in .env.local ✅
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` = `REDACTED_GOOGLE_CLIENT_ID` ✅
- `GOOGLE_CLIENT_SECRET` = `REDACTED_GOOGLE_CLIENT_SECRET` ✅
- `STRIPE_SECRET_KEY` — not yet populated ⬜
- `STRIPE_WEBHOOK_SECRET` — not yet populated ⬜
- `STRIPE_PUBLISHABLE_KEY` — not yet populated ⬜

---

## Workflow Config

```json
{
  "mode": "yolo",
  "depth": "standard",
  "parallelization": false,
  "commit_docs": true,
  "model_profile": "balanced",
  "workflow": {
    "research": true,
    "plan_check": true,
    "verifier": true
  }
}
```

---

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 01-foundation-schema-auth | 01 | 25min | 3 | 14 |
| 01-foundation-schema-auth | 02 | 5min | 3 | 4 |
| 01-foundation-schema-auth | 03 | 40min | 3 | 8 |
| 01-foundation-schema-auth | 04 | 10min | UAT | — |

| 02-port-crm-analytics-ui | 01 | 8min | 3 | 3 |
| 02-port-crm-analytics-ui | 02 | 14min | 2 | 2 |
| 02-port-crm-analytics-ui | 03 | 42min | 2 | 3 |
| Phase 02-port-crm-analytics-ui P04 | 9min | 2 tasks | 2 files |
| Phase 02-port-crm-analytics-ui P05 | 8min | 2 tasks | 3 files |
| 03-port-facturation-comptabilite-rh-paie-ui | 01 | 9min | 2 | 3 |
| 03-port-facturation-comptabilite-rh-paie-ui | 02 | 14min | 2 | 12 |
| Phase 03-port-facturation-comptabilite-rh-paie-ui P03 | 7min | 3 tasks | 5 files |
| Phase 03-port-facturation-comptabilite-rh-paie-ui P04 | 11min | 2 tasks | 6 files |
| Phase 04 P01 | 11 | 3 tasks | 8 files |
| Phase 04 P04-02 | 12 | 2 tasks | 2 files |
| Phase 04-data-migration-mongodb-to-supabase P04-03 | 5min | 3 tasks | 4 files |

## Last Session

- **Stopped at:** Completed 04-03-PLAN.md
- **Timestamp:** 2026-03-25

---

*State initialized: 2026-03-04*
*Last executed: 2026-03-24*
