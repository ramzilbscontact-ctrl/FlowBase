# Requirements — Radiance ERP Migration

**Project:** Radiance ERP → Next.js 14 + Supabase + Vercel
**Scope:** Full stack migration, all modules, data migration included
**Out of scope (v1):** WhatsApp/Instagram, Celery background tasks, Claude AI
**Date:** 2026-03-04

---

## Functional Requirements

### FR-01 — Authentication

| ID | Requirement | Source | Priority |
|----|-------------|--------|----------|
| FR-01-1 | Email/password login with Supabase Auth (replaces custom JWT + bcrypt) | Existing | Must |
| FR-01-2 | Google OAuth login via Supabase native provider (replaces Firebase Auth + custom backend) | Existing | Must |
| FR-01-3 | TOTP 2FA: generate secret, enable/disable, verify code at login (custom layer on Supabase Auth) | Existing | Must |
| FR-01-4 | Account lockout after N failed login attempts (preserve existing logic) | Existing | Must |
| FR-01-5 | Session management: access token + refresh, automatic refresh on expiry | Existing | Must |
| FR-01-6 | Logout: server-side session revocation via Supabase Auth | Existing | Must |
| FR-01-7 | Role-based access: admin / manager / user roles stored in Supabase `profiles` table | Existing | Must |
| FR-01-8 | Protected routes: unauthenticated users redirected to /login | Existing | Must |

### FR-02 — CRM Module

| ID | Requirement | Source | Priority |
|----|-------------|--------|----------|
| FR-02-1 | Contacts: create, read, update, delete with full field set (name, email, phone, company, tags, notes) | Existing | Must |
| FR-02-2 | Companies: CRUD with name, industry, address, website, associated contacts | Existing | Must |
| FR-02-3 | Deals: CRUD with title, value, stage, assigned user, associated contact and company | Existing | Must |
| FR-02-4 | Pipeline view: Kanban board of deals grouped by stage | Existing | Must |
| FR-02-5 | Tasks: create, assign to user, set due date, mark complete, filter by status | Existing | Must |
| FR-02-6 | Notes: attach notes to any CRM entity (contact, company, deal) | Existing | Must |
| FR-02-7 | Global search: full-text search across contacts, companies, deals | Existing | Must |
| FR-02-8 | Pagination: all list endpoints paginated (default 25, configurable) | Existing | Must |
| FR-02-9 | Filtering and sorting: by multiple fields on all list views | Existing | Must |
| FR-02-10 | Owner assignment: records scoped to user or team; admins see all | Existing | Must |

### FR-03 — Facturation Module

| ID | Requirement | Source | Priority |
|----|-------------|--------|----------|
| FR-03-1 | Invoices: create, edit, preview as PDF, send by email, mark as paid | Existing | Must | ✅ 03-01 |
| FR-03-2 | Quotes: create, edit, convert to invoice | Existing | Must | ✅ 03-01 |
| FR-03-3 | Payment tracking: record payments against invoices, show balance due | Existing | Must | ✅ 03-01 |
| FR-03-4 | Stripe integration: create payment intent, handle webhook events (payment_intent.succeeded, invoice.paid) | Existing | Must |
| FR-03-5 | Email notifications: send invoice/reminder emails via Gmail SMTP or Supabase SMTP | Existing | Must |
| FR-03-6 | Invoice numbering: auto-increment invoice number with configurable prefix | Existing | Must | ✅ 03-01 |
| FR-03-7 | Tax calculation: apply configurable tax rates to line items | Existing | Must | ✅ 03-01 |
| FR-03-8 | Client portal: public link to view/pay invoice (no login required for client) | Existing | Should |

### FR-04 — Comptabilité Module

| ID | Requirement | Source | Priority |
|----|-------------|--------|----------|
| FR-04-1 | Chart of accounts: manage account types (assets, liabilities, equity, income, expense) | Existing | Must |
| FR-04-2 | Journal entries: create double-entry journal entries linked to invoices/payments | Existing | Must |
| FR-04-3 | General ledger: view all transactions by account | Existing | Must |
| FR-04-4 | Financial reports: income statement, balance sheet | Existing | Must |
| FR-04-5 | Fiscal year management: configure fiscal year start/end | Existing | Should |

### FR-05 — RH / Paie Module

| ID | Requirement | Source | Priority |
|----|-------------|--------|----------|
| FR-05-1 | Employee management: create/edit employee profiles (name, job title, salary, start date, department) | Existing | Must |
| FR-05-2 | Department management: create/edit/delete departments | Existing | Must |
| FR-05-3 | Leave management: submit, approve/reject leave requests | Existing | Must |
| FR-05-4 | Payroll: generate monthly payslips with gross/net calculation | Existing | Must |
| FR-05-5 | Payslip export: download payslip as PDF | Existing | Should |

### FR-06 — Analytics Dashboard

| ID | Requirement | Source | Priority |
|----|-------------|--------|----------|
| FR-06-1 | CRM metrics: total contacts, companies, open deals, deals closed this month | Existing | Must |
| FR-06-2 | Revenue pipeline: deal value by stage | Existing | Must |
| FR-06-3 | Sales performance: deals won/lost over time (chart) | Existing | Must |
| FR-06-4 | Invoice analytics: total invoiced, total paid, total outstanding | Existing | Must |
| FR-06-5 | User activity: recent actions by user (from audit log) | Existing | Should |
| FR-06-6 | Date range filters: select last 7d / 30d / 90d / custom | Existing | Should |

### FR-07 — Data Migration

| ID | Requirement | Source | Priority |
|----|-------------|--------|----------|
| FR-07-1 | Migration script: export all MongoDB collections to JSON | Migration | Must |
| FR-07-2 | Schema mapping: MongoDB documents → PostgreSQL rows with correct types | Migration | Must |
| FR-07-3 | User migration: existing bcrypt hashes → Supabase Auth (keep hashes, no re-registration required) | Migration | Must |
| FR-07-4 | Data validation: post-migration integrity checks (record counts, FK integrity) | Migration | Must |
| FR-07-5 | Zero-downtime strategy: new app runs alongside old until verified | Migration | Must |
| FR-07-6 | Rollback plan: old Render deployment stays live until new app is verified stable | Migration | Must |

### FR-08 — Google Workspace Integration (v1)

| ID | Requirement | Source | Priority |
|----|-------------|--------|----------|
| FR-08-1 | Gmail API: read and send emails via OAuth-connected Google account | Existing | Should |
| FR-08-2 | Google Calendar API: sync meetings/appointments | Existing | Should |
| FR-08-3 | OAuth token storage: store/refresh Google API tokens in Supabase (replaces MongoDB google_tokens) | Existing | Should |

### FR-09 — Audit Logging

| ID | Requirement | Source | Priority |
|----|-------------|--------|----------|
| FR-09-1 | Middleware-level audit log: capture user, action, resource, timestamp on every mutating request | Existing | Must |
| FR-09-2 | Audit log storage: write to Supabase `audit_logs` table | Existing | Must |
| FR-09-3 | Audit log viewer: admin UI to browse recent activity | Existing | Should |

---

## Technical Requirements

### TR-01 — Tech Stack

| ID | Requirement | Notes |
|----|-------------|-------|
| TR-01-1 | Next.js 14 App Router (not Pages Router) | Server Components, Route Handlers, Middleware |
| TR-01-2 | TypeScript throughout (strict mode) | Replaces plain JavaScript |
| TR-01-3 | Supabase Auth for all authentication | No custom JWT logic |
| TR-01-4 | Supabase PostgreSQL as primary database | Replaces MongoDB Atlas |
| TR-01-5 | Row-Level Security (RLS) on all Supabase tables | Enforces authorization at DB level |
| TR-01-6 | Supabase Storage for file uploads (avatars, docs) | Replaces local filesystem |
| TR-01-7 | Vercel for hosting and deployment | Auto-deploy from GitHub main branch |
| TR-01-8 | TailwindCSS for styling | Consistent with existing visual design |
| TR-01-9 | TanStack Query (React Query v5) for server state | Consistent with existing patterns |
| TR-01-10 | Zod for runtime validation (forms + API routes) | Replaces DRF serializers |
| TR-01-11 | Stripe SDK v14+ for payment processing | Keep existing Stripe integration |

### TR-02 — Architecture

| ID | Requirement | Notes |
|----|-------------|-------|
| TR-02-1 | New app lives in `/nextjs-app` folder in same monorepo | Old frontend/ and backend/ untouched |
| TR-02-2 | Next.js API Routes (Route Handlers) replace Django REST endpoints | No separate backend service |
| TR-02-3 | Server Components for all data-fetching pages | Client Components only where interactivity required |
| TR-02-4 | Supabase client: `createServerClient` in Server Components/Routes, `createBrowserClient` in Client Components | SSR-safe client usage |
| TR-02-5 | Environment variables: all secrets in Vercel dashboard + `.env.local` for local dev | No hardcoded credentials |

### TR-03 — Database Schema

| ID | Requirement | Notes |
|----|-------------|-------|
| TR-03-1 | Clean PostgreSQL schema — not a 1:1 mirror of MongoDB documents | Proper FK relations, indexes, constraints |
| TR-03-2 | UUID primary keys on all tables | Consistent with Supabase convention |
| TR-03-3 | `profiles` table extending Supabase `auth.users` | Stores role, full_name, avatar_url |
| TR-03-4 | Unique constraints at DB level (email, invoice_number, etc.) | Enforced by PostgreSQL, not app layer |
| TR-03-5 | Soft deletes: `deleted_at TIMESTAMPTZ` on CRM and facturation tables | Prevents unrecoverable data loss |
| TR-03-6 | RLS policies: tenant/user isolation on every table | Security baseline |
| TR-03-7 | Full-text search indexes: `tsvector` columns on contacts, companies, deals | Replaces MongoDB icontains queries |

### TR-04 — Performance

| ID | Requirement | Notes |
|----|-------------|-------|
| TR-04-1 | Core Web Vitals: LCP < 2.5s, CLS < 0.1 on dashboard | Measured on Vercel Analytics |
| TR-04-2 | Supabase query caching: use React Query cache + Supabase connection pooling | Reduces DB round trips |
| TR-04-3 | Image optimization: Next.js `<Image>` component for avatars | Automatic WebP conversion |
| TR-04-4 | Bundle optimization: dynamic imports for heavy modules (charts, PDF) | Smaller initial JS bundle |

### TR-05 — Security

| ID | Requirement | Notes |
|----|-------------|-------|
| TR-05-1 | httpOnly cookies for Supabase session tokens | Eliminates XSS token theft risk |
| TR-05-2 | CSRF protection via Supabase PKCE flow | Replaces manual token header injection |
| TR-05-3 | Environment variables never committed to git | `.env.local` in `.gitignore` |
| TR-05-4 | Stripe webhook signature verification | Prevent forged webhook events |
| TR-05-5 | Rate limiting on auth endpoints via Vercel middleware | Brute-force protection |
| TR-05-6 | Supabase RLS: every table has policies; no public access by default | Authorization at DB level |

### TR-06 — Testing

| ID | Requirement | Notes |
|----|-------------|-------|
| TR-06-1 | Unit tests: Vitest for utilities, validation schemas, data transformers | Replaces zero test coverage |
| TR-06-2 | Integration tests: API Route tests using Next.js test helpers | Cover auth, CRM, facturation |
| TR-06-3 | E2E tests: Playwright for critical flows (login, create contact, create invoice) | Smoke test coverage |
| TR-06-4 | CI pipeline: GitHub Actions runs tests on every PR | Automated quality gate |

---

## Constraints

| ID | Constraint | Impact |
|----|------------|--------|
| C-01 | Tech stack is fixed: Next.js 14 + Supabase + Vercel | No alternative approaches |
| C-02 | Same monorepo: new app in `/nextjs-app` | Old code stays, no forced migration of dev workflow |
| C-03 | All existing MongoDB data must be migrated | No data loss acceptable |
| C-04 | Old Render + Firebase deployments stay live during transition | Parallel running period |
| C-05 | WhatsApp, Instagram, Celery, Claude AI deferred to v2 | Out of scope for this milestone |
| C-06 | Supabase Auth replaces all custom JWT/bcrypt logic | No custom JWT endpoints |
| C-07 | TypeScript required | No plain JavaScript in new app |

---

## Module → Phase Mapping (draft)

```
Phase 1 → Project scaffolding, Supabase setup, PostgreSQL schema design
Phase 2 → Authentication (Supabase Auth + Google OAuth + 2FA)
Phase 3 → CRM module (contacts, companies, deals, pipeline, tasks, notes)
Phase 4 → Facturation module (invoices, quotes, payments, Stripe)
Phase 5 → Comptabilité module
Phase 6 → RH/Paie module
Phase 7 → Analytics dashboard
Phase 8 → Data migration (MongoDB → Supabase PostgreSQL)
Phase 9 → Google Workspace integration (Gmail, Calendar)
Phase 10 → Testing, CI/CD, Vercel deployment + decommission old stack
```

---

*Requirements finalized: 2026-03-04*
