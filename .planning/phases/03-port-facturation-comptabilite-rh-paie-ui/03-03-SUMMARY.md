---
phase: 03-port-facturation-comptabilite-rh-paie-ui
plan: "03"
subsystem: comptabilite
tags: [accounts, journal, ledger, reports, double-entry, chart-of-accounts]
dependency_graph:
  requires: [03-01]
  provides: [FR-04-1, FR-04-2, FR-04-3, FR-04-4]
  affects: [Sidebar, comptabilite-module]
tech_stack:
  added: []
  patterns: [useQuery+useMutation, client-side-groupBy, client-side-running-balance, client-side-aggregation, double-entry-insert]
key_files:
  created:
    - nextjs-app/app/(dashboard)/dashboard/accounts/page.tsx
    - nextjs-app/app/(dashboard)/dashboard/ledger/page.tsx
  modified:
    - nextjs-app/app/(dashboard)/dashboard/journal/page.tsx
    - nextjs-app/app/(dashboard)/dashboard/reports/page.tsx
    - nextjs-app/components/layout/Sidebar.tsx
decisions:
  - "No delete on accounts — accounts with journal_lines must not be deleted; Edit-only UI enforced"
  - "Single-amount double-entry mode — debit_account and credit_account receive identical amount, ensuring balance by construction without validateJournalLines"
  - "Client-side groupBy for chart of accounts — Map<type, AccountRow[]> avoids PostgREST GROUP BY complexity"
  - "Client-side running balance — cumulative reduce over ordered journal_lines avoids DB window function"
  - "client-side aggregation for reports — sum debits/credits per account type from journal_lines join"
metrics:
  duration: 7min
  completed: 2026-03-25
  tasks: 3
  files: 5
---

# Phase 3 Plan 03: Comptabilité Module — Chart of Accounts, Journal, Ledger, Reports Summary

Full Comptabilité module with double-entry bookkeeping — chart of accounts grouped by type with create/edit CRUD, journal entries using single-amount double-entry insert (1 journal_entry + 2 journal_lines), general ledger per-account view with client-side running balance, and financial reports (income statement + balance sheet) from aggregated journal_lines.

---

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Chart of accounts + journal entries | da45199 | accounts/page.tsx, journal/page.tsx, Sidebar.tsx |
| 2 | Financial reports page | 2711ad4 | reports/page.tsx |
| 3 | General ledger page | 5c2bdb2 | ledger/page.tsx |

---

## What Was Built

### accounts/page.tsx (new, 247 lines)
- Chart of accounts list grouped by type: asset/Actif, liability/Passif, equity/Capitaux propres, income/Produits, expense/Charges
- Grouped using `Map<string, AccountRow[]>` client-side with TYPE_ORDER constant for deterministic rendering
- Type badges with color per type (blue/orange/purple/green/red)
- Create modal: code, name, type select, optional parent account select
- Edit modal: pre-populated form with same fields
- Duplicate code error: catches PostgreSQL error code 23505 → toast "Code déjà utilisé"
- No delete (accounts are immutable once they have journal_lines — per plan spec)

### journal/page.tsx (replaced, 222 lines)
- Journal entries list: Date, Description, Facture liée columns
- "Nouvelle écriture" modal with: date (default=today), description, compte débiteur select, compte créditeur select, montant DZD, facture liée (optional)
- Double-entry insert: `supabase.from('journal_entries').insert(...)` → `supabase.from('journal_lines').insert([debitLine, creditLine])`
- Balance always valid by construction (same amount, different accounts)

### reports/page.tsx (replaced, 215 lines)
- Read-only page with client-side aggregation from `journal_lines.select('debit, credit, accounts(type, name)')`
- Income statement: `income.credit - income.debit` (produits) vs `expense.debit - expense.credit` (charges), net result with trend icon
- Balance sheet: assets vs liabilities+equity, "Bilan équilibré" badge when |actif - passif| < 0.01
- Rafraîchir button → `qc.invalidateQueries({ queryKey: ['reports'] })`
- DZD amounts formatted with `Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' })`
- Empty state when no journal_lines exist

### ledger/page.tsx (new, 204 lines)
- Account selector dropdown showing "code — name (type_label)" for each account
- Loads `journal_lines` filtered by `account_id`, ordered by `journal_entries(date)` ascending
- Running balance: cumulative `reduce((sum, l) => sum + debit - credit)` per row
- Table: Date, Libellé (line description or entry description fallback), Débit, Crédit, Solde courant
- Positive balance = text-green-600, negative = text-red-600
- Shows "—" instead of 0 DZD in debit/credit columns

### Sidebar.tsx (modified)
- Added imports: `LayoutList`, `BookMarked` from lucide-react
- Added nav entries: `Plan comptable` → `/dashboard/accounts`, `Grand livre` → `/dashboard/ledger`
- Both inserted in Comptabilité section

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Self-Check: PASSED

| Item | Status |
|------|--------|
| accounts/page.tsx | FOUND |
| journal/page.tsx | FOUND |
| reports/page.tsx | FOUND |
| ledger/page.tsx | FOUND |
| 03-03-SUMMARY.md | FOUND |
| Commit da45199 | FOUND |
| Commit 2711ad4 | FOUND |
| Commit 5c2bdb2 | FOUND |
