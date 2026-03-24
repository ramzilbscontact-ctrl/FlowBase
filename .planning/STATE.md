# Project State

**Project:** Radiance ERP Migration → Next.js 16 + Supabase + Vercel
**Last updated:** 2026-03-24
**Status:** 🟢 Executing — Phase 1, Plan 2 complete

---

## Current Position

| Item | Status |
|------|--------|
| Codebase mapped | ✅ `.planning/codebase/` (7 documents) |
| Project initialized | ✅ `.planning/PROJECT.md` |
| Requirements written | ✅ `.planning/REQUIREMENTS.md` (10 FR modules, 6 TR groups) |
| Roadmap created | ✅ `.planning/ROADMAP.md` (10 phases) |
| Research done | ✅ `.planning/research/NEXTJS_PATTERNS.md` |
| Active phase | Phase 1 — Plan 2 (01-02) complete |
| Current plan | Phase 1, Plan 3 (01-03-PLAN.md) — Auth flows |

---

## Milestone

**M1 — Full Stack Migration**
- 6 phases total (compressed from 10 — existing React UI reused directly)
- Current phase: Phase 1 — Foundation + Schema + Auth (in progress)
- Current plan: 3 of 4 in Phase 1

## Phase Progress

| Phase | Name | Status |
|-------|------|--------|
| 1 | Foundation + Schema + Auth | 🟡 In progress (2/4 plans done) |
| 2 | Port CRM + Analytics UI | ⬜ Not started |
| 3 | Port Facturation + Comptabilité + RH/Paie UI | ⬜ Not started |
| 4 | Data Migration (MongoDB → Supabase) | ⬜ Not started |
| 5 | Google Workspace Integration | ⬜ Not started |
| 6 | Testing, CI/CD & Production Deployment | ⬜ Not started |

> Compressed from 10 → 6 phases. Phases 2-3 port existing React JSX directly (not rebuilds).

---

## Decisions

1. **Used @supabase/ssr (not deprecated @supabase/auth-helpers-nextjs)** — Official Next.js App Router pattern, SSR-safe with getAll/setAll cookie handlers [01-01]
2. **Topbar logout via API route (/api/auth/logout)** — Server-side session cleanup is more reliable than direct client signOut in component [01-01]
3. **Sonner for toast notifications** — Lightweight toast library added alongside layout components for UX feedback [01-01]
4. **Full generated database.types.ts immediately** — Generated real types from live Supabase project (zjhmcyvrziwwkdcylktj) instead of using placeholder [01-01]
5. **Migration files as source of truth** — SQL committed to version control for reproducible schema management [01-02]
6. **No hard DELETE policies** — Soft delete only (deleted_at) on all data tables for audit trails and recovery [01-02]
7. **SECURITY DEFINER RPCs for pre-auth lockout** — record_failed_login and check_login_allowed bypass RLS to work before user is authenticated [01-02]

---

## Key Context

**Source stack (being replaced):**
- React 19 + Vite → Next.js 16 App Router
- Django 5.2 + DRF → Next.js Route Handlers
- MongoDB Atlas (MongoEngine) → Supabase PostgreSQL
- Custom JWT + bcrypt + Firebase Auth → Supabase Auth
- Redis (Channels + Celery) → deferred to v2
- Render + Firebase Hosting → Vercel

**New app location:** `/nextjs-app` (same monorepo)
**Supabase project:** `zjhmcyvrziwwkdcylktj.supabase.co` (created in Plan 01)
**Vercel:** already connected to GitHub

**V2 (deferred):**
- WhatsApp / Instagram (Meta API) real-time
- Celery background tasks → Vercel Cron Jobs
- Claude AI integration

**Environment vars status:**
- `NEXT_PUBLIC_SUPABASE_URL` = `https://zjhmcyvrziwwkdcylktj.supabase.co` (populated)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — populated in .env.local
- `SUPABASE_SERVICE_ROLE_KEY` — populated in .env.local
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` = `REDACTED_GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET` = `REDACTED_GOOGLE_CLIENT_SECRET`
- `STRIPE_SECRET_KEY` — from Stripe dashboard (not yet populated)
- `STRIPE_WEBHOOK_SECRET` — from Stripe dashboard (not yet populated)
- `STRIPE_PUBLISHABLE_KEY` — from Stripe dashboard (not yet populated)

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

---

## Last Session

- **Stopped at:** Completed 01-02-PLAN.md
- **Timestamp:** 2026-03-24T07:44:00Z

---

*State initialized: 2026-03-04*
*Last executed: 2026-03-24*
