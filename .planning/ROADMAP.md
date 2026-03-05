# Roadmap — Radiance ERP Migration

**Project:** Radiance ERP → Next.js 14 + Supabase + Vercel
**Milestone:** M1 — Full Stack Migration
**Total phases:** 10
**Created:** 2026-03-04

---

## Milestone M1 — Full Stack Migration

> Migrate the entire Radiance ERP (React + Django + MongoDB) to Next.js 14 + Supabase + Vercel.
> All modules migrated, data transferred, old stack decommissioned.

---

## Phase 1 — Project Scaffolding & Database Schema

**Goal:** Bootstrap the Next.js application in `/nextjs-app`, configure Supabase, and establish the complete PostgreSQL schema with RLS policies before writing any feature code.

### Why First
Everything else depends on the directory structure, TypeScript config, Supabase connection, and database schema. Getting this right prevents painful refactors in later phases.

### Tasks
1. Scaffold Next.js 14 App Router project in `/nextjs-app` with TypeScript, Tailwind, ESLint strict
2. Configure Supabase project (create via Supabase dashboard), add environment variables (`.env.local`)
3. Install core dependencies: `@supabase/ssr`, `@supabase/supabase-js`, `@tanstack/react-query`, `zod`, `lucide-react`
4. Set up Supabase server/browser client utilities (`lib/supabase/server.ts`, `lib/supabase/client.ts`)
5. Design and create PostgreSQL schema for **all modules**:
   - `profiles` (extends auth.users — role, full_name, avatar_url, totp_secret, totp_enabled, failed_login_attempts, locked_until)
   - `companies` (id, name, industry, address, website, phone, owner_id, deleted_at, created_at)
   - `contacts` (id, first_name, last_name, email, phone, company_id FK, owner_id, tags, deleted_at, search_vector tsvector)
   - `deals` (id, title, value, stage, contact_id FK, company_id FK, assigned_to FK, owner_id, deleted_at)
   - `pipeline_stages` (id, name, order, color)
   - `tasks` (id, title, due_date, status, assigned_to FK, related_contact_id, related_deal_id, owner_id)
   - `notes` (id, body, author_id FK, contact_id, company_id, deal_id, created_at)
   - `invoices` (id, number, status, client_name, client_email, subtotal, tax_rate, total, due_date, owner_id, deleted_at)
   - `invoice_items` (id, invoice_id FK, description, quantity, unit_price, total)
   - `quotes` (id, number, status, client_name, converted_to_invoice_id, owner_id, deleted_at)
   - `payments` (id, invoice_id FK, amount, method, stripe_payment_intent_id, paid_at)
   - `accounts` (id, code, name, type ENUM, parent_id FK, owner_id)
   - `journal_entries` (id, date, description, reference_id, reference_type, owner_id)
   - `journal_lines` (id, entry_id FK, account_id FK, debit, credit)
   - `employees` (id, first_name, last_name, email, job_title, salary, department_id FK, start_date, owner_id, deleted_at)
   - `departments` (id, name, manager_id FK, owner_id)
   - `leave_requests` (id, employee_id FK, type, start_date, end_date, status, owner_id)
   - `payslips` (id, employee_id FK, month, year, gross, deductions, net, owner_id)
   - `google_tokens` (id, user_id FK, access_token_enc, refresh_token_enc, expires_at)
   - `audit_logs` (id, user_id, action, resource_type, resource_id, metadata jsonb, created_at)
6. Write RLS policies for all tables (owner isolation, admin override, soft-delete filtering)
7. Create full-text search indexes (`tsvector` GIN indexes on contacts, companies, deals)
8. Set up Next.js layout: root `layout.tsx`, dashboard `layout.tsx`, sidebar navigation shell
9. Configure Vercel project (link GitHub repo, set env vars, configure `/nextjs-app` as root)

### Deliverables
- `/nextjs-app` project compiles, runs locally, deploys to Vercel preview URL
- Supabase project live with complete schema (all 20+ tables)
- RLS enabled and policies written for all tables
- Full-text search indexes in place
- Vercel preview URL accessible

### Success Criteria
- `npm run build` passes with zero TypeScript errors
- Supabase schema visible in dashboard with all tables
- Vercel preview URL loads the app shell (sidebar + empty pages)
- RLS: anonymous requests to any table return empty results

### Dependencies
- None (first phase)

---

## Phase 2 — Authentication

**Goal:** Full auth system using Supabase Auth — email/password, Google OAuth, TOTP 2FA, session middleware, and role-based route protection.

### Why Second
Every other module needs authenticated users and protected routes. Auth must be solid before any feature module is built.

### Tasks
1. Configure Supabase Auth: email/password enabled, Google OAuth provider (use existing Google Cloud credentials)
2. Implement login page (`/login`): email/password form with Supabase `signInWithPassword`
3. Implement Google OAuth button: `signInWithOAuth({ provider: 'google' })` + callback route handler
4. Implement TOTP 2FA: server-side TOTP verification using `otpauth` library after Supabase login
   - Generate TOTP secret server-side, store encrypted in `profiles.totp_secret`
   - 2FA setup page: QR code display, verify code to activate
   - 2FA login step: show code input if `profiles.totp_enabled = true`
5. Implement `middleware.ts`: validate Supabase session on every request, redirect to `/login` if missing
6. Implement role-based route protection: admin routes guarded, manager routes guarded
7. Account lockout: increment `failed_login_attempts` on bad password, lock if ≥ 5 attempts
8. Implement logout: `supabase.auth.signOut()` + redirect to `/login`
9. User profile page: update full_name, avatar (upload to Supabase Storage), change email, enable/disable 2FA
10. Implement `profiles` trigger: auto-insert into `profiles` on Supabase Auth user creation
11. Audit log middleware: server-side function to log mutations (wrap Route Handlers)

### Deliverables
- `/login` with email/password and Google OAuth working
- TOTP 2FA setup and verification working
- All `/dashboard/*` routes protected by middleware
- Role-based guards on admin pages
- Account lockout after 5 failed attempts

### Success Criteria
- Login with email/password → redirected to dashboard
- Login with Google → redirected to dashboard
- Login with 2FA enabled → TOTP code prompt appears
- Unauthenticated request to `/dashboard` → redirected to `/login`
- 5 failed logins → account locked, 6th attempt returns locked error

### Dependencies
- Phase 1 (schema: `profiles`, `audit_logs`, Supabase client setup)

---

## Phase 3 — CRM Module

**Goal:** Full CRM functionality — contacts, companies, deals, Kanban pipeline, tasks, notes, global search.

### Tasks
1. **Contacts module**
   - List view: paginated table with search, filter by company/tag/owner, sort by name/date
   - Create/edit contact form: all fields, company autocomplete, tag input
   - Contact detail page: info, associated deals, tasks, notes, activity timeline
   - Delete (soft): set `deleted_at`, hide from all queries
2. **Companies module**
   - List view: paginated table with search and filter
   - Create/edit company form
   - Company detail page: info, associated contacts, deals, notes
3. **Deals module**
   - List view: table with filter by stage/assignee/value
   - Create/edit deal form: title, value, stage, contact, company, assigned user
   - Deal detail page: info, tasks, notes, activity
4. **Pipeline Kanban view**
   - Drag-and-drop deal cards between stages using `@dnd-kit/core`
   - Stage column totals (count + total value)
   - Update deal stage on drop via Route Handler
5. **Tasks module**
   - Task list: filter by status/assignee/due date
   - Create/edit task form with due date picker and entity linking
   - Mark complete inline
6. **Notes**
   - Add/edit/delete notes on contacts, companies, deals
   - Rich text via `react-quill` or plain textarea
7. **Global search**
   - Search bar in header: full-text search via Supabase `textSearch()` on contacts, companies, deals
   - Results grouped by entity type, keyboard-navigable
8. **Route Handlers** for all CRUD operations (GET, POST, PATCH, DELETE per resource)
9. **RLS validation**: verify users only see their own records (or all, if admin)

### Deliverables
- All CRM pages functional with real Supabase data
- Kanban pipeline with drag-and-drop stage updates
- Global search returning results across all entities

### Success Criteria
- CRUD for contacts, companies, deals, tasks, notes works end-to-end
- Kanban: drag deal card changes stage in DB, reflects immediately
- Search: typing "Dupont" finds matching contacts and companies
- RLS: user A cannot access user B's contacts

### Dependencies
- Phase 2 (auth + middleware)

---

## Phase 4 — Facturation Module

**Goal:** Full invoicing and quoting system with Stripe payment processing and email delivery.

### Tasks
1. **Invoices**
   - List view: filter by status (draft, sent, paid, overdue), search by client/number
   - Create/edit invoice: line items table, tax rate, due date, client info
   - Invoice preview: real-time total calculation, styled invoice template
   - PDF generation: `@react-pdf/renderer` server-side in Route Handler → download or email
   - Send invoice: compose email with PDF attachment via Nodemailer/Resend
   - Mark as paid: manual payment recording
2. **Quotes**
   - List and CRUD for quotes
   - Convert quote → invoice (copy all line items, set status)
3. **Stripe integration**
   - Payment link: create Stripe Payment Intent from invoice, embed Stripe Elements or redirect to Stripe Checkout
   - Client-facing payment page: `/pay/[invoiceId]` — public route (no auth required for client)
   - Webhook Route Handler: `/api/stripe/webhook` — verify signature, handle `payment_intent.succeeded`, mark invoice paid, record in `payments` table
4. **Invoice numbering**: auto-increment with configurable prefix (e.g. `FAC-2026-0001`)
5. **Tax management**: configurable tax rates stored in settings table

### Deliverables
- Invoice CRUD with PDF generation working
- Stripe Payment Intent flow working (test mode)
- Webhook received and invoice marked paid in Supabase
- Email with PDF attachment sends successfully

### Success Criteria
- Create invoice → download PDF → PDF renders correctly
- Click "Pay" → Stripe checkout → complete → webhook → invoice marked paid in DB
- Quote → "Convert to Invoice" → invoice created with all line items

### Dependencies
- Phase 2 (auth), Phase 1 (schema: invoices, invoice_items, payments, quotes)

---

## Phase 5 — Comptabilité Module

**Goal:** Double-entry accounting with chart of accounts, journal entries, and financial reports.

### Tasks
1. **Chart of Accounts**
   - Tree view of accounts grouped by type (Assets, Liabilities, Equity, Income, Expense)
   - Create/edit/delete accounts with type and parent account
2. **Journal Entries**
   - List view with date range filter
   - Create journal entry: multiple debit/credit lines, must balance to zero
   - Auto-create entries when invoice paid (debit Receivables, credit Income, credit Tax Payable)
   - Link journal entries to invoices/payments (reference polymorphism)
3. **General Ledger**
   - Ledger view: all transactions for selected account with running balance
4. **Financial Reports**
   - Income statement: income vs expense for date range
   - Balance sheet: assets, liabilities, equity at point in time
   - Export to PDF and CSV

### Deliverables
- Chart of accounts manageable
- Journal entries balance-validated before save
- Income statement and balance sheet render correctly

### Success Criteria
- Creating an account, adding manual journal entry, seeing it in ledger works end-to-end
- Income statement: Income - Expenses = Net Profit for test data
- Unbalanced journal entry (debits ≠ credits) is rejected

### Dependencies
- Phase 2 (auth), Phase 4 (auto-generate entries from invoice payments)

---

## Phase 6 — RH / Paie Module

**Goal:** Employee management, leave tracking, and payroll processing with PDF payslips.

### Tasks
1. **Employees**
   - Employee list: paginated, filter by department/status
   - Create/edit employee: personal info, job title, salary, start date, department
   - Employee profile page with leave history and payslip history
2. **Departments**
   - CRUD for departments, assign manager
3. **Leave Management**
   - Leave request form: type (annual, sick, unpaid), date range
   - Manager approval flow: approve/reject leave requests
   - Leave calendar view
4. **Payroll**
   - Generate monthly payslip: gross salary, configurable deductions (CNAS, IRG for Algeria)
   - Payslip list per employee
   - PDF export of individual payslip via `@react-pdf/renderer`
5. **Algerian payroll rules**: IRG tax brackets, CNAS rates configurable in settings

### Deliverables
- Employee CRUD working
- Leave requests submittable and approvable
- Payslip generated with correct gross/net calculation and downloadable as PDF

### Success Criteria
- Create employee → submit leave request → manager approves → status updates
- Generate payslip → correct net pay based on gross salary and deductions
- Download payslip PDF → renders employee name, month, salary breakdown

### Dependencies
- Phase 2 (auth + roles: manager approval)

---

## Phase 7 — Analytics Dashboard

**Goal:** Data-driven dashboard with KPIs, charts, and date-range filtering across all modules.

### Tasks
1. **Overview KPIs**: total contacts, open deals, deals closed this month, outstanding invoices, total revenue YTD
2. **CRM charts**:
   - Deals by stage (bar chart)
   - Revenue pipeline (funnel chart)
   - Deals won vs lost over time (line chart)
3. **Facturation charts**:
   - Monthly revenue (bar chart)
   - Invoice status breakdown (pie chart — paid/overdue/draft)
4. **RH metrics**: headcount, leave requests pending, payroll total this month
5. **Date range filters**: 7d / 30d / 90d / this year / custom date picker
6. **Charts library**: `recharts` (lightweight, React-native, no canvas dependency)
7. **Data fetching**: all metrics via Supabase aggregation queries (GROUP BY, SUM, COUNT) in Route Handlers
8. **Performance**: chart data cached in React Query (5-minute TTL)

### Deliverables
- Dashboard page with all KPIs populating from real Supabase data
- All charts rendering correctly
- Date range filter changes data without page reload

### Success Criteria
- KPIs match counts in their respective modules
- Date range: switching "last 30d" to "this year" updates all charts
- Empty state handled (no data → helpful message, not broken chart)

### Dependencies
- Phase 3 (CRM data), Phase 4 (facturation data), Phase 6 (RH data)

---

## Phase 8 — Data Migration

**Goal:** Migrate all existing production data from MongoDB Atlas to Supabase PostgreSQL, including users migrated to Supabase Auth without re-registration.

### Tasks
1. **Export MongoDB data**: `mongoexport` all collections to JSON (users, contacts, companies, deals, invoices, invoice_items, quotes, payments, accounts, journal_entries, employees, departments, leave_requests, payslips, audit_logs, google_tokens)
2. **Write ETL scripts** (Python or Node.js):
   - Map MongoDB ObjectIds → UUIDs (maintain lookup table for cross-reference)
   - Transform document fields → relational columns (nested objects → FK rows)
   - Handle null/missing fields (apply defaults or skip)
   - Denormalized `contact.company_name` → resolve to actual `companies.id` FK
3. **Migrate users to Supabase Auth**:
   - Use Supabase Admin API `createUser()` with existing bcrypt hashes (Supabase supports `password_hash` import)
   - Map old MongoDB `_id` → new Supabase `auth.users.id` (UUID)
   - Insert `profiles` rows with roles and TOTP settings
4. **Load data into Supabase**: run INSERT scripts per table, respecting FK order
5. **Post-migration validation**:
   - Record count verification: MongoDB collection count = Supabase table count
   - FK integrity check: no orphaned rows
   - Sample data spot-check (10 random records per table)
   - Login test: existing user can log in with original credentials
6. **Cutover**: update Vercel env vars to point to production Supabase, update DNS if needed
7. **Keep old stack running** for 2 weeks post-cutover as rollback safety

### Deliverables
- All MongoDB data present in Supabase tables
- All users login successfully post-migration (passwords unchanged)
- Post-migration validation report (counts match, no FK violations)
- New Vercel deployment connects to migrated Supabase production DB

### Success Criteria
- `contacts` in Supabase = contacts in MongoDB (count + spot check 10 records)
- Existing user logs in with their email/password on the new Next.js app
- Zero FK integrity violations in Supabase after migration
- Old Django app still running and accessible (rollback available)

### Dependencies
- All feature phases complete (1-7) — migrate only when app is feature-complete

---

## Phase 9 — Google Workspace Integration

**Goal:** Port the Gmail API and Google Calendar integration from Django to Next.js Route Handlers.

### Tasks
1. **Google OAuth token storage**: Supabase `google_tokens` table — store/refresh tokens server-side (replaces MongoDB `google_tokens` collection)
2. **Gmail Route Handlers**:
   - `GET /api/google/gmail/messages` — list recent emails
   - `GET /api/google/gmail/messages/[id]` — read full email
   - `POST /api/google/gmail/send` — send email with optional attachment
3. **Google Calendar Route Handlers**:
   - `GET /api/google/calendar/events` — list upcoming events
   - `POST /api/google/calendar/events` — create event from deal/task
4. **OAuth token refresh**: middleware checks token expiry, refreshes automatically before API call
5. **Gmail integration in CRM**: "Send Email" button on contact page opens compose modal, sends via Gmail API
6. **Calendar integration**: "Add to Calendar" from deal/task creates Google Calendar event
7. **Google OAuth connect flow**: user settings page → "Connect Google Account" → OAuth consent → tokens stored

### Deliverables
- Users can connect their Google account from settings
- Emails readable and sendable from within the CRM contact view
- Calendar events createable from deals/tasks

### Success Criteria
- Connect Google → send email to contact → email appears in Gmail sent folder
- Create calendar event from deal → event visible in Google Calendar
- Token auto-refresh: works 24h after initial connect without re-authentication

### Dependencies
- Phase 2 (auth + user profiles), Phase 3 (CRM for email/calendar integration points)

---

## Phase 10 — Testing, CI/CD & Deployment

**Goal:** Full test suite, CI/CD pipeline, Vercel production deployment, and decommission of old Render + Firebase stack.

### Tasks
1. **Vitest unit tests**:
   - Zod schemas (all form validation schemas)
   - Data transformation utilities (ETL helpers, date formatters, currency formatters)
   - Auth helpers (TOTP generation/verification)
2. **Integration tests** (Next.js Route Handlers via `supertest` or fetch):
   - Auth: login, Google OAuth callback, TOTP verification, logout
   - CRM: create/read/update/delete contact, company, deal
   - Facturation: create invoice, generate PDF, Stripe webhook handling
3. **Playwright E2E tests**:
   - Login with email/password → dashboard loads
   - Create contact → appears in list → edit → delete (soft)
   - Create invoice → generate PDF → mark paid
   - 2FA: enable TOTP → login requires code → disable TOTP
4. **GitHub Actions CI pipeline**:
   - On PR: `npm run typecheck` + `npm run lint` + Vitest + Playwright
   - On merge to main: auto-deploy to Vercel production
5. **Vercel production config**:
   - Production env vars configured (Supabase prod keys, Stripe live keys)
   - Custom domain configured (replace `erpro-dz-frontend.onrender.com`)
   - Vercel Analytics enabled
6. **Decommission old stack** (after 2-week parallel running period post-migration):
   - Delete Render services: `erpro-dz-api`, `erpro-dz-worker`, `erpro-dz-redis`
   - Delete Firebase Hosting project
   - Archive old `frontend/` and `backend/` directories in git

### Deliverables
- Test suite running in CI (no skipped tests)
- Vercel production URL live with real data
- Custom domain pointing to Vercel
- Old Render/Firebase stack decommissioned

### Success Criteria
- All Vitest and Playwright tests pass in CI
- Production URL loads with real migrated data
- Old Render API returns 404 or is deleted
- Zero regressions reported in first 2 weeks post-launch

### Dependencies
- All previous phases (full feature set required before test coverage)
- Phase 8 (data migration complete for production deployment)

---

## Coverage Validation

| Requirement | Phase |
|-------------|-------|
| FR-01 Auth (email, Google, 2FA, lockout, roles) | Phase 2 |
| FR-02 CRM (contacts, companies, deals, pipeline, tasks, notes, search) | Phase 3 |
| FR-03 Facturation (invoices, quotes, payments, Stripe, PDF, email) | Phase 4 |
| FR-04 Comptabilité (accounts, journal, ledger, reports) | Phase 5 |
| FR-05 RH/Paie (employees, departments, leaves, payroll, payslips) | Phase 6 |
| FR-06 Analytics (KPIs, charts, date filters) | Phase 7 |
| FR-07 Data migration (MongoDB → Supabase, user migration) | Phase 8 |
| FR-08 Google Workspace (Gmail, Calendar, OAuth tokens) | Phase 9 |
| FR-09 Audit logging | Phase 2 (middleware) |
| TR-01 Tech stack (Next.js, TS, Supabase, Vercel, Tailwind, RQ, Zod) | Phase 1 |
| TR-02 Architecture (App Router, RSC, Route Handlers, monorepo folder) | Phase 1 |
| TR-03 Database schema (UUID PKs, RLS, soft deletes, FTS indexes) | Phase 1 |
| TR-04 Performance (Core Web Vitals, caching, image optimization) | Phase 1 + 7 + 10 |
| TR-05 Security (httpOnly cookies, CSRF, RLS, rate limiting, webhooks) | Phase 2 |
| TR-06 Testing (Vitest, Playwright, CI/CD) | Phase 10 |

All 56 functional requirements and 16 technical requirements covered.

---

## Phase Dependency Graph

```
Phase 1 (Scaffold + Schema)
    └─► Phase 2 (Auth)
            ├─► Phase 3 (CRM)
            │       └─► Phase 7 (Analytics) ─────────────────────┐
            ├─► Phase 4 (Facturation)                            │
            │       ├─► Phase 5 (Comptabilité)                  │
            │       └─► (Analytics) ─────────────────────────────┤
            └─► Phase 6 (RH/Paie)                                │
                    └─► (Analytics) ─────────────────────────────┘
                                                                  │
                                                           Phase 7 complete
                                                                  │
                                                    Phase 8 (Data Migration)
                                                                  │
                                             Phase 9 (Google Workspace)
                                                                  │
                                              Phase 10 (Testing + Deployment)
```

---

*Roadmap created: 2026-03-04*
