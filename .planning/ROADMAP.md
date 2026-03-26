# Roadmap — Radiance ERP Migration

**Project:** Radiance ERP → Next.js 14 + Supabase + Vercel
**Milestone:** M1 — Full Stack Migration
**Total phases:** 6 (compressed from 10 — existing React UI reused directly)
**Created:** 2026-03-04 | **Revised:** 2026-03-04

---

## Strategy: Port, Don't Rebuild

The existing frontend is React (JSX + Tailwind + React Query) — identical to what Next.js uses.
Rather than rebuilding each module from scratch, each UI phase **directly ports** existing components:

```
frontend/src/pages/crm/Contacts.jsx
  → nextjs-app/app/(dashboard)/crm/contacts/page.tsx
  Changes: "use client", axios → supabase.from('contacts'), React Router Link → next/link

frontend/src/components/shared/DataTable.jsx
  → nextjs-app/components/shared/DataTable.tsx
  Changes: prop types only (add TypeScript types)
```

**Backend (Django) is NOT ported to Route Handlers for CRUD.**
Supabase client + RLS replaces it entirely for list/get/create/update/delete operations.
Route Handlers are only needed for: Stripe webhooks, PDF generation, Google OAuth proxy.

---

## Milestone M1 — Full Stack Migration

---

## Phase 1: Foundation, Schema & Auth

**Goal:** Bootstrap Next.js in `/nextjs-app`, create Supabase project with the complete PostgreSQL schema (all 20+ tables, RLS, indexes), wire up Supabase Auth (email/password + Google OAuth + TOTP 2FA), and protect all routes via proxy.ts. Old stack untouched.

### Why First
Every other phase needs: the schema to write Supabase queries against, the auth session to know who's logged in, and proxy.ts to protect routes. Doing all three here removes all blocking dependencies in one shot.

### Key Research Corrections (from 01-RESEARCH.md)
- **proxy.ts** (not middleware.ts) — Next.js v16.0.0 renamed it
- **Supabase native TOTP MFA** — use `supabase.auth.mfa.*`, no otpauth/qrcode libraries, no totp_secret column in profiles
- **SECURITY DEFINER RPC** for account lockout — `record_failed_login(email)` bypasses RLS pre-auth
- **getUser()** not getSession() in proxy.ts — security requirement
- **'simple' tsvector config** — not 'english' (Algerian names: Arabic + French)

**Plans:** 4/4 plans executed

Plans:
- [x] 01-01-PLAN.md — Next.js 16 scaffold, Supabase clients, layout port, Supabase project setup (checkpoint) — DONE 2026-03-24
- [x] 01-02-PLAN.md — Complete PostgreSQL schema (20+ tables), RLS, SECURITY DEFINER functions, FTS indexes, TS types — DONE 2026-03-24
- [x] 01-03-PLAN.md — Auth flows: proxy.ts, login page, Google OAuth callback, TOTP 2FA pages, logout, audit helper, Vercel config — DONE 2026-03-24
- [x] 01-04-PLAN.md — Human verification: end-to-end auth flow testing (checkpoint) — DONE 2026-03-24

### Deliverables
- `nextjs-app/` compiles, deploys to Vercel preview
- All 20+ Supabase tables live with RLS and FTS indexes
- Login with email/password → dashboard
- Login with Google → dashboard
- TOTP 2FA prompt appears when enabled
- Unauthenticated → `/login` redirect

### Success Criteria
- `npm run build` zero TypeScript errors
- RLS: anonymous query to any table returns 0 rows
- Email/password login works end-to-end
- Google OAuth callback completes and creates session
- 5 failed logins → 6th attempt returns locked error

### Dependencies
- None

---

## Phase 2: Port CRM + Analytics UI

**Goal:** Port the entire CRM module and Analytics dashboard from existing React pages to Next.js using Supabase client queries, replacing the axios/Django layer.

### Porting Strategy (applies to all UI phases)

```
For each page in frontend/src/pages/crm/:
1. Copy JSX to equivalent .tsx file in nextjs-app/app/(dashboard)/crm/
2. Add "use client" at top (all CRM pages are interactive)
3. Replace: import { getContacts } from '../../api/crm'
   With:     const { data } = useQuery({ queryFn: () => supabase.from('contacts').select() })
4. Replace: React Router <Link to="/crm/contacts/1"> with next/link <Link href="/crm/contacts/1">
5. Replace: useNavigate() with useRouter() from next/navigation
6. TypeScript: add prop types — copy component, let TS errors guide type definitions
```

### Tasks

**Contacts (port Contacts.jsx)**
1. `app/(dashboard)/crm/contacts/page.tsx` — paginated table with search, filter by company/tag, sort
2. `app/(dashboard)/crm/contacts/[id]/page.tsx` — detail: info, deals, tasks, notes, timeline
3. `app/(dashboard)/crm/contacts/new/page.tsx` — create form
4. Supabase queries: `contacts` table with `company_id` join, full-text search via `textSearch()`
5. Soft delete: `supabase.from('contacts').update({ deleted_at: new Date() }).eq('id', id)`

**Companies (port Companies.jsx)**
6. `app/(dashboard)/crm/companies/page.tsx` — list with search/filter
7. `app/(dashboard)/crm/companies/[id]/page.tsx` — detail with associated contacts + deals
8. `app/(dashboard)/crm/companies/new/page.tsx` — create form

**Deals + Pipeline (port Deals.jsx)**
9. `app/(dashboard)/crm/deals/page.tsx` — list view with filter by stage/assignee
10. `app/(dashboard)/crm/deals/pipeline/page.tsx` — Kanban board: install `@dnd-kit/core`, port drag-and-drop logic, update stage via `supabase.from('deals').update({ stage })`
11. `app/(dashboard)/crm/deals/[id]/page.tsx` — detail page

**Tasks + Notes**
12. `app/(dashboard)/crm/tasks/page.tsx` — list with status/due date filter, inline complete toggle
13. Notes rendered inline on contact/company/deal detail pages (not a separate page)

**Global Search**
14. Header search bar → Supabase `textSearch()` on `contacts`, `companies`, `deals` (union results)
15. Keyboard-navigable results dropdown (port existing logic)

**Analytics Dashboard (port Analytics pages)**
16. `app/(dashboard)/analytics/page.tsx` — KPI cards: total contacts, open deals, revenue YTD, invoices outstanding
17. Install `recharts` (keep same charts as existing, port chart config)
18. Supabase aggregation queries: `count()`, `sum()` with date range filters
19. Date range filter: 7d / 30d / 90d / custom — React state, re-runs queries

### Deliverables
- All CRM pages functional with live Supabase data
- Kanban pipeline with drag-and-drop working
- Global search returning grouped results
- Analytics dashboard showing real numbers

### Success Criteria
- CRUD for contacts, companies, deals, tasks, notes — all operations persist in Supabase
- Kanban: drag deal → stage updates in DB instantly
- Search "Dupont" → finds contacts + companies
- RLS: user sees only their own records (admin sees all)
- Analytics KPIs match real row counts in Supabase tables

**Plans:** 5/6 plans executed

Plans:
- [x] 02-01-PLAN.md — Shared UI components (Modal, StatsCard) + pipeline_stages seed migration — DONE 2026-03-24
- [x] 02-02-PLAN.md — Contacts + Companies pages: live CRUD with search and modals — DONE 2026-03-24
- [ ] 02-03-PLAN.md — Deals Kanban page: @dnd-kit, KanbanBoard component, stage mutations
- [ ] 02-04-PLAN.md — Tasks page: complete toggle, priority migration, filter tabs
- [ ] 02-05-PLAN.md — Analytics page: recharts install, KPI cards, deals-by-stage chart, audit log
- [ ] 02-06-PLAN.md — UAT: human verification of all CRM + analytics flows

### Dependencies
- Phase 1 (schema + auth + Supabase client)

---

## Phase 3: Port Facturation + Comptabilite + RH/Paie UI

**Goal:** Port the remaining three modules using the same porting strategy. Add Stripe Payment Intent for invoices. Generate PDF payslips and invoices server-side.

### Tasks

**Facturation (port Invoices.jsx, Quotes.jsx)**
1. `app/(dashboard)/facturation/invoices/page.tsx` — list with status filter (draft/sent/paid/overdue)
2. `app/(dashboard)/facturation/invoices/[id]/page.tsx` — detail with line items, payment history
3. `app/(dashboard)/facturation/invoices/new/page.tsx` — create form with dynamic line items table, auto-total
4. `app/(dashboard)/facturation/quotes/page.tsx` — list, create, convert to invoice
5. Invoice PDF Route Handler: `app/api/invoices/[id]/pdf/route.ts` — server-side render with `@react-pdf/renderer`, return PDF stream
6. Invoice email: `app/api/invoices/[id]/send/route.ts` — send PDF via Resend (replaces Gmail SMTP)
7. Stripe Payment Intent: `app/api/invoices/[id]/pay/route.ts` — create Stripe PaymentIntent, return client_secret
8. Public payment page: `app/pay/[invoiceId]/page.tsx` — no auth required, embed Stripe Elements
9. Stripe webhook: `app/api/stripe/webhook/route.ts` — verify signature, handle `payment_intent.succeeded`, update invoice + insert payment row

**Comptabilité (port Compta pages)**
10. `app/(dashboard)/comptabilite/accounts/page.tsx` — tree view of accounts by type
11. `app/(dashboard)/comptabilite/journal/page.tsx` — journal entries list + create form (balance validation: debits = credits)
12. `app/(dashboard)/comptabilite/ledger/page.tsx` — ledger per account with running balance
13. `app/(dashboard)/comptabilite/reports/page.tsx` — income statement + balance sheet (Supabase aggregation queries)

**RH / Paie (port RH pages)**
14. `app/(dashboard)/rh/employees/page.tsx` — list with department filter
15. `app/(dashboard)/rh/employees/[id]/page.tsx` — detail: info, leave history, payslip history
16. `app/(dashboard)/rh/departments/page.tsx` — CRUD
17. `app/(dashboard)/rh/leaves/page.tsx` — submit request (employee) + approve/reject (manager)
18. `app/(dashboard)/rh/payroll/page.tsx` — generate monthly payslip, Algerian IRG/CNAS deductions
19. Payslip PDF Route Handler: `app/api/payslips/[id]/pdf/route.ts` — same pattern as invoice PDF

**Shared components**
20. Port `frontend/src/components/shared/DataTable.jsx` → `components/shared/DataTable.tsx` (used by all modules)
21. Port `frontend/src/components/shared/Modal.jsx` → `components/shared/Modal.tsx`
22. Port `frontend/src/components/shared/StatsCard.jsx` → `components/shared/StatsCard.tsx`

### Deliverables
- All invoices/quotes CRUD functional, Stripe payment flow working (test mode)
- PDF download for invoices and payslips
- Chart of accounts + journal entries + financial reports
- Employee/department/leave/payroll cycle complete

### Success Criteria
- Create invoice → download PDF → correct rendering
- Pay invoice (Stripe test card) → webhook fires → invoice marked paid in Supabase
- Unbalanced journal entry (debits ≠ credits) rejected
- Generate payslip for employee → correct net pay (gross - CNAS - IRG)
- Manager can approve leave requests, employee sees status change

**Plans:** 4/5 plans executed

Plans:
- [x] 03-01-PLAN.md — Facturation CRUD: invoices (line items + status filter), quotes (convert-to-invoice), payments list
- [x] 03-02-PLAN.md — PDF Route Handlers + Stripe PaymentIntent + webhook + Resend email + public /pay page
- [ ] 03-03-PLAN.md — Comptabilité: chart of accounts (grouped CRUD) + journal entries (double-entry) + financial reports
- [ ] 03-04-PLAN.md — RH/Paie: employees + departments + leaves (approve/reject) + payroll generation (IRG/CNAS)
- [ ] 03-05-PLAN.md — UAT: human verification of all Phase 3 flows

### Dependencies
- Phase 1 (schema + auth), Phase 2 (shared components ported)

---

## Phase 4: Data Migration MongoDB to Supabase

**Goal:** Export all production MongoDB data, transform to relational format, and import into Supabase. Migrate existing users to Supabase Auth without requiring password resets.

### Why After Phases 1-3
The schema must be finalized and validated with real data before migrating production data into it. Running phases 1-3 against a fresh Supabase DB surfaces schema issues safely, before production data is touched.

### Tasks

**Export**
1. Run `mongoexport` on all MongoDB collections: users, contacts, companies, deals, pipeline_stages, tasks, notes, invoices, invoice_items, quotes, payments, accounts, journal_entries, journal_lines, employees, departments, leave_requests, payslips, audit_logs, google_tokens
2. Save as JSON files, validate counts: `mongoexport --count` matches `wc -l` on JSON

**Transform (Python ETL script)**
3. Write `scripts/migrate.py`:
   - Build ObjectId → UUID lookup table (one UUID per MongoDB `_id`)
   - Transform each document: ObjectId refs → UUID, nested objects → FK rows, missing fields → NULL or default
   - Handle denormalized `contact.company_name` → resolve to `companies.id` FK
   - Output: one `.sql` INSERT file per table, ordered by FK dependency
4. Validate transform: run against a subset (100 records), check FK integrity manually

**Migrate Users to Supabase Auth**
5. Use Supabase Admin API (`supabase.auth.admin.createUser()`) with `password_hash` param to import existing bcrypt hashes — users keep original passwords, no reset needed
6. Map old MongoDB user `_id` → new Supabase `auth.users.id` (UUID), update the ObjectId→UUID lookup table
7. Insert `profiles` rows with role from old User documents

**Load into Supabase**
8. Execute INSERT `.sql` files against Supabase PostgreSQL in FK dependency order:
   `auth.users → profiles → companies → contacts → deals → invoices → …`
9. Use `supabase db push` or direct `psql` connection

**Validate**
10. Record count check: every table count in Supabase = collection count in MongoDB
11. FK integrity: `SELECT * FROM contacts WHERE company_id NOT IN (SELECT id FROM companies)` → 0 rows
12. Sample spot-check: 10 random records per table — compare Supabase vs MongoDB values
13. Login test: existing user logs in on new Next.js app with original email + password

**Cutover**
14. Update Vercel env vars to point at migrated Supabase project (production keys)
15. Keep old Render deployment running for 2 weeks (rollback safety)

### Deliverables
- All MongoDB data present in Supabase
- All users can log in without password reset
- Post-migration validation report (counts + FK integrity)
- Next.js app on Vercel serving real migrated data

### Success Criteria
- `SELECT COUNT(*) FROM contacts` in Supabase = `db.contacts.count()` in MongoDB
- Existing user logs in with original password on Next.js app
- Zero FK violations across all tables
- 10 random records per table match MongoDB source

### Dependencies
- Phases 1-3 complete (schema finalized, app functional)

**Plans:** 1/3 plans executed

Plans:
- [ ] 04-01-PLAN.md — Python ETL script: extract.py, transform.py (19 collections), migrate.py orchestrator outputting FK-ordered SQL files
- [ ] 04-02-PLAN.md — User migration via Supabase Admin API (bcrypt hash import) + load_data.py bulk SQL loader
- [ ] 04-03-PLAN.md — validate.py (count parity, FK integrity, spot-checks) + migration README runbook + .env.production.example

---

## Phase 5: Google Workspace Integration

**Goal:** Port Gmail and Google Calendar integrations from Django to Next.js Route Handlers, storing OAuth tokens in Supabase.

### Tasks
1. Google OAuth token storage: `google_tokens` table — encrypt access + refresh tokens at rest (AES via `crypto` Node built-in)
2. Connect Google Account flow: settings page → `supabase.auth.signInWithOAuth({ provider: 'google', scopes: 'gmail.readonly gmail.send calendar.events' })` → save tokens to `google_tokens`
3. Token refresh middleware: check `expires_at` before every Google API call, refresh automatically
4. Gmail Route Handlers (port `backend/apps/gmail_app/`):
   - `GET /api/google/gmail/messages` — list recent emails (Gmail API)
   - `POST /api/google/gmail/send` — send email with attachment
5. Calendar Route Handlers (port `backend/apps/calendar_app/`):
   - `GET /api/google/calendar/events` — list upcoming events
   - `POST /api/google/calendar/events` — create event
6. Gmail compose modal on contact detail page — sends via Gmail API Route Handler
7. "Add to Calendar" button on deal/task detail page

### Deliverables
- Users can connect Google account from Settings
- Emails readable and sendable from CRM contact view
- Calendar events createable from deals/tasks

### Success Criteria
- Send email from contact page → appears in Gmail Sent
- Create event from deal → visible in Google Calendar
- Token refresh: still works 24h after initial connect

### Dependencies
- Phase 1 (auth + google_tokens schema), Phase 2 (CRM contact detail page)

---

## Phase 6: Testing, CI/CD and Production Deployment

**Goal:** Test suite, GitHub Actions CI, Vercel production deployment, decommission old Render + Firebase stack.

### Tasks

**Tests**
1. Vitest unit tests: Zod schemas, data transform utilities, Algerian payroll calculations
2. Integration tests (fetch-based): auth flow, CRM CRUD, invoice creation, Stripe webhook handler
3. Playwright E2E:
   - Login (email/password) → dashboard loads
   - Create contact → edit → soft delete → not visible in list
   - Create invoice → PDF download → Stripe test payment → marked paid
   - Enable 2FA → logout → login requires TOTP code

**CI/CD**
4. `.github/workflows/ci.yml`: on PR → `tsc --noEmit` + `eslint` + Vitest + Playwright
5. Vercel GitHub integration: auto-deploy `main` to production, PR branches to preview URLs

**Production**
6. Vercel production env vars: Supabase prod keys, Stripe live keys, Google credentials
7. Custom domain configured in Vercel (replaces Firebase Hosting domain)
8. Vercel Analytics enabled

**Decommission (2 weeks after production cutover)**
9. Delete Render services: `erpro-dz-api`, `erpro-dz-worker`, `erpro-dz-redis`
10. Delete Firebase Hosting project
11. Archive `frontend/` and `backend/` directories: `git mv frontend _archive/frontend && git mv backend _archive/backend`

### Deliverables
- CI runs and passes on every PR
- Production Vercel URL live with migrated data
- Custom domain pointing to Vercel
- Old stack decommissioned

### Success Criteria
- All Vitest + Playwright tests pass in CI (no skips)
- Production loads with real data, no console errors
- Old Render API returns 404 or is deleted
- Custom domain resolves to Vercel

### Dependencies
- All previous phases

---

## Coverage Map

| Requirements | Phase |
|---|---|
| Auth (email, Google, 2FA, lockout, roles, proxy.ts) | Phase 1 |
| Supabase schema (all 20+ tables, RLS, FTS, soft deletes) | Phase 1 |
| CRM (contacts, companies, deals, pipeline, tasks, notes, search) | Phase 2 |
| Analytics (KPIs, charts, date filters) | Phase 2 |
| Facturation (invoices, quotes, Stripe, PDF, email) | Phase 3 |
| Comptabilité (accounts, journal, ledger, reports) | Phase 3 |
| RH/Paie (employees, departments, leaves, payroll, PDF) | Phase 3 |
| Data migration (MongoDB → Supabase, user migration) | Phase 4 |
| Google Workspace (Gmail, Calendar, OAuth tokens) | Phase 5 |
| Testing (Vitest, Playwright, CI/CD, production, decommission) | Phase 6 |

All 56 functional requirements and 16 technical requirements covered in 6 phases.

---

## Phase Dependency Graph

```
Phase 1 (Foundation + Schema + Auth)
    │
    ├─► Phase 2 (CRM + Analytics)
    │       │
    │       └─► Phase 3 (Facturation + Compta + RH)
    │               │
    │               └─► Phase 4 (Data Migration)
    │                       │
    │                       ├─► Phase 5 (Google Workspace)
    │                       │
    │                       └─► Phase 6 (Tests + Deployment)
    └──────────────────────────────────────────────────┘
```

---

## What Changed vs Original 10-Phase Plan

| Original | New | Why |
|---|---|---|
| Phase 1 (Scaffold) + Phase 2 (Auth) | **Phase 1** | Schema and auth are always done together; no benefit to splitting |
| Phases 3-7 (one module each) | **Phase 2 + Phase 3** | Existing React JSX is ported directly — 2 phases cover all 5 modules |
| Phase 8 (Data migration) | **Phase 4** | Unchanged, just renumbered |
| Phase 9 (Google) | **Phase 5** | Unchanged |
| Phase 10 (Testing + Deploy) | **Phase 6** | Unchanged |
| **10 phases** | **6 phases** | -4 phases by reusing existing React code instead of rebuilding |

---

*Roadmap revised: 2026-03-04*
