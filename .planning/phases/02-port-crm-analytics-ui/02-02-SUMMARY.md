---
phase: 02-port-crm-analytics-ui
plan: "02"
subsystem: crm
tags: [contacts, companies, crud, supabase, react-query, modal, soft-delete, fts]
dependency_graph:
  requires: [02-01]
  provides: [contacts-crud-page, companies-crud-page]
  affects: [nextjs-app/app/(dashboard)/dashboard/contacts/page.tsx, nextjs-app/app/(dashboard)/dashboard/companies/page.tsx]
tech_stack:
  added: []
  patterns: [use-client-with-react-query, combined-create-edit-modal, soft-delete-via-update, fts-search-vector]
key_files:
  created: []
  modified:
    - nextjs-app/app/(dashboard)/dashboard/contacts/page.tsx
    - nextjs-app/app/(dashboard)/dashboard/companies/page.tsx
decisions:
  - "contacts(count) on companies uses (supabase as any) cast — PostgREST aggregate syntax not in generated types"
  - "Combined create+edit modal driven by editingContact/editingCompany state — avoids duplicate form components"
  - "tags stored as string[] in DB; form input is comma-separated string, split on save"
  - "address column exists in companies schema — no as any cast needed for update/insert payload"
metrics:
  duration: "14min"
  completed: "2026-03-24"
requirements_fulfilled: [FR-02-1, FR-02-2]
---

# Phase 02 Plan 02: Contacts & Companies CRUD Pages Summary

Replaced both static server-component scaffold pages with fully interactive "use client" versions wiring real Supabase CRUD operations: list with FTS search, combined create+edit modal, and soft-delete for both contacts and companies.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Wire contacts page — use client + search + CRUD modal with tags | ce2ea7c | contacts/page.tsx |
| 2 | Wire companies page — use client + search + CRUD modal with address + contacts count | 287637c | companies/page.tsx |

## What Was Built

### Task 1 — Contacts Page

Full replacement of the server-component contacts scaffold. Key behaviors:

- `'use client'` at top; module-level `supabase = createClient()` singleton
- `useQuery(['contacts', search])` fetches with `companies(name)` join and `.is('deleted_at', null)` filter
- FTS search via `textSearch('search_vector', search, { type: 'websearch', config: 'simple' })`
- Combined `saveMut` handles both insert (with `owner_id`) and update (by `editingContact.id`) — single modal form, different mutation branch
- `deleteMut` sets `deleted_at` (soft delete, never `.delete()`)
- Tags column renders as gray badge pills (`string[]` from DB, comma input in form)
- Pencil icon opens modal pre-filled via `openEdit(contact)` helper
- `invalidateQueries({ queryKey: ['contacts'] })` — v5 object form throughout
- Table columns: Nom, Email, Téléphone, Entreprise, Tags, Actions

### Task 2 — Companies Page

Full replacement of the server-component companies scaffold. Key behaviors:

- Same structural pattern as contacts
- `useQuery(['companies', search])` fetches with `contacts(count)` aggregate — cast `(supabase as any)` to bypass missing type relationship
- Contacts count displayed per company row: `company.contacts?.[0]?.count ?? 0`
- `address` field exists in schema (`database.types.ts`) — no `as any` cast needed in update/insert
- Modal fields: Nom (required), Secteur, Site web (url type), Adresse
- Clickable website link in table (`target="_blank"` with `noopener noreferrer`)
- Table columns: Nom, Secteur, Site web, Adresse, Contacts, Créé le, Actions

## Deviations from Plan

None — plan executed exactly as written.

Notable type handling confirmed during implementation:
- `contacts.tags` is `string[] | null` in generated types → array approach used (plan Note confirmed)
- `companies.address` is present in `database.types.ts` → no cast needed (plan Note confirmed — cast not required)
- `contacts(count)` PostgREST aggregate is not reflected in generated `companies` Relationships → `(supabase as any)` cast on the query chain (plan Note anticipated this)

## Self-Check: PASSED

| Item | Status |
|------|--------|
| contacts/page.tsx | FOUND |
| companies/page.tsx | FOUND |
| 02-02-SUMMARY.md | FOUND |
| commit ce2ea7c (contacts) | VERIFIED |
| commit 287637c (companies) | VERIFIED |
