# Project State

**Project:** Radiance ERP Migration → Next.js 14 + Supabase + Vercel
**Last updated:** 2026-03-04
**Status:** 🟡 Planning complete — ready to execute

---

## Current Position

| Item | Status |
|------|--------|
| Codebase mapped | ✅ `.planning/codebase/` (7 documents) |
| Project initialized | ✅ `.planning/PROJECT.md` |
| Requirements written | ✅ `.planning/REQUIREMENTS.md` (10 FR modules, 6 TR groups) |
| Roadmap created | ✅ `.planning/ROADMAP.md` (10 phases) |
| Research done | ✅ `.planning/research/NEXTJS_PATTERNS.md` |
| Active phase | None — run `/gsd:plan-phase 1` to start |

---

## Milestone

**M1 — Full Stack Migration**
- 10 phases total
- Current phase: none started

## Phase Progress

| Phase | Name | Status |
|-------|------|--------|
| 1 | Project Scaffolding & Database Schema | ⬜ Not started |
| 2 | Authentication | ⬜ Not started |
| 3 | CRM Module | ⬜ Not started |
| 4 | Facturation Module | ⬜ Not started |
| 5 | Comptabilité Module | ⬜ Not started |
| 6 | RH / Paie Module | ⬜ Not started |
| 7 | Analytics Dashboard | ⬜ Not started |
| 8 | Data Migration | ⬜ Not started |
| 9 | Google Workspace Integration | ⬜ Not started |
| 10 | Testing, CI/CD & Deployment | ⬜ Not started |

---

## Key Context

**Source stack (being replaced):**
- React 19 + Vite → Next.js 14 App Router
- Django 5.2 + DRF → Next.js Route Handlers
- MongoDB Atlas (MongoEngine) → Supabase PostgreSQL
- Custom JWT + bcrypt + Firebase Auth → Supabase Auth
- Redis (Channels + Celery) → deferred to v2
- Render + Firebase Hosting → Vercel

**New app location:** `/nextjs-app` (same monorepo)
**Supabase project:** to be created in Phase 1
**Vercel:** already connected to GitHub

**V2 (deferred):**
- WhatsApp / Instagram (Meta API) real-time
- Celery background tasks → Vercel Cron Jobs
- Claude AI integration

**Critical env vars needed for Phase 1:**
- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase dashboard
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase dashboard
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase dashboard (server-only)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` = `REDACTED_GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET` = `REDACTED_GOOGLE_CLIENT_SECRET`
- `STRIPE_SECRET_KEY` — from Stripe dashboard
- `STRIPE_WEBHOOK_SECRET` — from Stripe dashboard
- `STRIPE_PUBLISHABLE_KEY` — from Stripe dashboard

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

## Next Action

```
/gsd:plan-phase 1
```

---

*State initialized: 2026-03-04*
