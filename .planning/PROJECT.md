# Radiance ERP — Next.js Migration

## What This Is

Radiance ERP is a full-featured CRM and ERP system for Algerian businesses, covering CRM, invoicing, accounting, HR/payroll, and analytics. The project is migrating its entire stack from React + Django + MongoDB (hosted on Render) to Next.js 14 + Supabase + Vercel — a new `/nextjs-app` folder in the same monorepo, with a clean PostgreSQL schema and data migration from MongoDB Atlas.

The existing Django backend and React frontend remain untouched during migration; they continue running on Render until the new Next.js app is fully deployed and verified on Vercel.

## Core Value

ERP functionality must be identical to the current system — every module users rely on today (CRM, invoicing, accounting, HR) must work in the new stack before the old stack is decommissioned.

## Requirements

### Validated

<!-- Existing capabilities confirmed in production codebase -->

- ✓ User authentication: email/password login, Google OAuth, 2FA (TOTP) — existing
- ✓ CRM: contacts, companies, deals, pipeline management, tasks, notes — existing
- ✓ Facturation: invoices, quotes, payments with Stripe integration — existing
- ✓ Comptabilité module — existing
- ✓ RH/Paie module — existing
- ✓ Analytics dashboard — existing
- ✓ Global search across CRM entities — existing
- ✓ Role-based access control (admin / manager / user) — existing
- ✓ Audit logging — existing
- ✓ Gmail / Google API integration — existing
- ✓ WhatsApp + Instagram (Meta API) real-time integration — existing (deferred to v2)
- ✓ Claude AI integration — existing (deferred to v2)
- ✓ Celery background task processing — existing (deferred to v2)

### Active

<!-- Migration targets — building these in Next.js + Supabase -->

- [ ] Next.js 14 App Router project scaffolded under `/nextjs-app`
- [ ] Supabase Auth: email/password + Google OAuth (native), replacing custom JWT + bcrypt
- [ ] Custom TOTP 2FA layer on top of Supabase Auth (preserving 2FA for existing users)
- [ ] Clean PostgreSQL schema designed from scratch for all modules (not a 1:1 MongoDB mirror)
- [ ] MongoDB → Supabase data migration scripts for all collections (users, contacts, companies, deals, invoices, etc.)
- [ ] CRM module: contacts, companies, deals, pipeline, tasks, notes — rebuilt in Next.js
- [ ] Facturation module: invoices, quotes, payments + Stripe — rebuilt in Next.js API Routes
- [ ] Comptabilité module rebuilt in Next.js
- [ ] RH/Paie module rebuilt in Next.js
- [ ] Analytics dashboard rebuilt in Next.js
- [ ] Role-based access control enforced via Supabase Row-Level Security (RLS) policies
- [ ] Gmail / Google API integration ported to Next.js API Routes
- [ ] Deployed to Vercel (already connected to GitHub)
- [ ] Old Render + Firebase deployments decommissioned after verification

### Out of Scope (v1)

- WhatsApp / Instagram real-time WebSocket features — defer to v2 (replace Channels with Supabase Realtime)
- Celery background tasks — defer to v2 (replace with Vercel Cron Jobs or Supabase Edge Functions)
- Claude AI integration — defer to v2
- Mobile app — not applicable

## Context

**Current Stack (being replaced):**
- Frontend: React 19 + Vite + Tailwind + React Query + Zustand — on Firebase Hosting
- Backend: Django 5.2 + DRF + MongoEngine — on Render (Daphne ASGI)
- Database: MongoDB Atlas (`erp_radiance` collection)
- Auth: Custom simplejwt + bcrypt + TOTP 2FA + Firebase Auth (inconsistent dual-auth state)
- Real-time: Django Channels + Redis (WebSocket)
- Background tasks: Celery + Redis broker
- External: Stripe, Gmail SMTP, Google APIs, Meta (WhatsApp/Instagram), Anthropic Claude

**Migration Target:**
- Full-stack: Next.js 14 App Router in `/nextjs-app` folder (same monorepo)
- Auth: Supabase Auth (Google OAuth native) + custom TOTP wrapper
- DB: Supabase PostgreSQL with clean relational schema + RLS policies
- Hosting: Vercel (already linked to GitHub)
- API integrations stay: Stripe, Gmail, Google APIs

**Known Concerns from Codebase Analysis:**
- Firebase config hardcoded in source (fix during migration: use env vars)
- Current auth uses both Firebase Auth + custom JWT — inconsistent (Supabase Auth unifies this)
- No test suite exists (add tests in new stack from the start)
- MongoDB data has no strict schema validation (design clean PostgreSQL schema with proper constraints)
- Denormalized `contact.company_name` field causes staleness (fix with proper FK in PostgreSQL)
- Token blacklisting via Redis silently fails (Supabase Auth handles session revocation natively)

## Constraints

- **Tech Stack**: Next.js 14 + Supabase + Vercel — fixed, no alternatives
- **Repo Structure**: New app lives in `/nextjs-app` — same Git repo, independent deployable
- **Data Continuity**: Existing MongoDB Atlas data must be migrated (not discarded) — users and records preserved
- **Backward Compatibility**: Old Django backend continues running during transition — no hard cutover
- **Auth**: Supabase Auth replaces all existing auth mechanisms — no custom JWT logic
- **Schema**: Fresh PostgreSQL schema — not a mirror of MongoDB documents

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Same monorepo, new `/nextjs-app` folder | Avoids new repo setup; old and new can coexist during transition | — Pending |
| Supabase Auth over custom JWT | Handles OAuth, sessions, JWT natively; eliminates current dual-auth inconsistency | — Pending |
| Clean PostgreSQL schema (not MongoDB mirror) | MongoDB documents are denormalized; relational schema enables proper FK constraints and RLS | — Pending |
| Vercel for deployment | Already connected to GitHub; native Next.js support; no config overhead | — Pending |
| v2 for real-time / background tasks | WebSockets and Celery require significant reimplementation; core ERP features ship first | — Pending |

---
*Last updated: 2026-03-04 after initialization*
