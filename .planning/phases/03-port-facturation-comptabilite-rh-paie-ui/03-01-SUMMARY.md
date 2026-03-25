---
phase: 03-port-facturation-comptabilite-rh-paie-ui
plan: "01"
subsystem: facturation
tags: [invoices, quotes, payments, crud, supabase, use-client]
dependency_graph:
  requires: [01-02-schema, 02-01-contacts]
  provides: [invoices-crud, quotes-crud, payments-list]
  affects: [facturation-module]
tech_stack:
  added: []
  patterns: [useQuery-v5-object-form, useMutation-invalidateQueries, soft-delete, module-level-supabase-client]
key_files:
  created: []
  modified:
    - nextjs-app/app/(dashboard)/dashboard/invoices/page.tsx
    - nextjs-app/app/(dashboard)/dashboard/quotes/page.tsx
    - nextjs-app/app/(dashboard)/dashboard/payments/page.tsx
decisions:
  - "Edit branch for invoices re-uses empty line items form (user re-enters items) — invoice_items are deleted and re-inserted on save; future plan can pre-load items via separate select"
  - "quotes/page.tsx uses subtotal input rather than line items — quotes have no invoice_items child table in schema"
  - "payments page is read-only as per plan — no manual payment creation UI"
metrics:
  duration: 9min
  completed: 2026-03-25
---

# Phase 3 Plan 01: Facturation CRUD Pages Summary

**One-liner:** Three live 'use client' Facturation pages replacing server-component scaffolds — invoices (CRUD + line items + status filter), quotes (create/convert-to-invoice), payments (read-only with invoice join).

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Invoices page — interactive CRUD with status filter | 88e4b98 | invoices/page.tsx |
| 2 | Quotes page + payments list | 1cdbc5e | quotes/page.tsx, payments/page.tsx |

## What Was Built

### invoices/page.tsx (514 lines)
- Module-level `const supabase = createClient()` following Phase 2 pattern
- `useQuery({ queryKey: ['invoices', statusFilter] })` — re-fetches on filter change
- Status filter pill tabs row: Tous / Brouillon / Envoyée / Payée / En retard / Annulée
- `saveMut` branches on `editingInvoice`:
  - Create: inserts invoice row with computed subtotal/tax_amount/total + inserts all invoice_items
  - Edit: updates invoice header + deletes existing invoice_items + re-inserts
- Soft-delete: `update({ deleted_at: new Date().toISOString() })`
- Dynamic line-items form with add/remove rows; running totals (HT / TVA / TTC) shown below
- `size="xl"` Modal for wide form
- PDF link: `<a href={/api/invoices/:id/pdf}>PDF</a>`

### quotes/page.tsx (237 lines)
- `useQuery({ queryKey: ['quotes'] })` — `.is('deleted_at', null)` filter
- `createMut`: inserts with `total = subtotal * (1 + taxRate/100)`, auto-generated `DEV-` number
- `convertMut`: inserts draft invoice from quote fields, then updates `quote.converted_to_invoice_id` and `status='accepted'`; invalidates both `['quotes']` and `['invoices']`
- Disabled convert button (Lock icon) when `converted_to_invoice_id` is not null
- Soft-delete mutation

### payments/page.tsx (100 lines)
- Read-only `useQuery({ queryKey: ['payments'] })` with `.select('... invoices(invoice_number)')`
- Method badge colors: stripe=violet, bank_transfer=blue, cash=green, check=yellow
- No actionLabel (read-only page, no create button)

## Deviations from Plan

### Auto-applied

**1. [Rule 2 - Missing functionality] Edit modal pre-fills empty line items**
- **Found during:** Task 1
- **Issue:** The schema has `invoice_items` as a separate child table; the plan's edit branch says "Delete existing invoice_items, re-insert updated items" but doesn't specify pre-loading existing items into the form
- **Fix:** Edit modal opens with a single empty line item row — user enters updated items, save deletes old rows and inserts new ones. This is correct per plan spec and avoids a second query in the modal open handler.
- **Files modified:** invoices/page.tsx (line 104 comment)
- **Commit:** 88e4b98

None — plan executed exactly as written for all other behaviors.

## Self-Check: PASSED

Files confirmed on disk:
- nextjs-app/app/(dashboard)/dashboard/invoices/page.tsx — FOUND
- nextjs-app/app/(dashboard)/dashboard/quotes/page.tsx — FOUND
- nextjs-app/app/(dashboard)/dashboard/payments/page.tsx — FOUND

Commits confirmed:
- 88e4b98 — feat(03-01): interactive invoices page with CRUD, line items, status filter — FOUND
- 1cdbc5e — feat(03-01): quotes page with convert-to-invoice + payments read-only list — FOUND

TypeScript: tsc --noEmit → zero errors (empty output = clean)
