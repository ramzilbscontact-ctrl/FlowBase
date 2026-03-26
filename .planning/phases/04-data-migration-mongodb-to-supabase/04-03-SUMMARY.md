---
phase: "04"
plan: "04-03"
title: "Validation, Runbook, and Cutover Documentation"
subsystem: "data-migration"
tags: ["migration", "validation", "runbook", "postgresql", "mongodb", "supabase"]
requires: ["04-01", "04-02"]
provides: ["migration/validate.py", "migration/README.md", "nextjs-app/.env.production.example"]
affects: ["migration pipeline", "cutover process"]
tech-stack:
  added: []
  patterns: ["post-migration integrity checks", "count parity", "FK NOT EXISTS queries", "financial sanity checks", "spot-check sampling"]
key-files:
  created:
    - migration/validate.py
    - migration/README.md
    - nextjs-app/.env.production.example
  modified:
    - .gitignore
decisions:
  - "validate.py loads id_map.json from migrate.py to resolve ObjectIds to UUIDs for spot-checks — existence check only (no field comparison) because schema transforms change column names and types"
  - "google_tokens spot-check uses user_id as PK not id — table has user_id as primary key per schema"
  - "gitignore extended to cover validation_report.json, id_map.json, user_id_map.json, migration/output/ — all are generated artifacts"
metrics:
  duration: "5min"
  completed: "2026-03-26"
  tasks: 3
  files: 4
---

# Phase 4 Plan 03: Validation, Runbook, and Cutover Documentation Summary

**One-liner:** Post-migration integrity suite with 20-table count parity, 10 FK NOT EXISTS checks, 3 financial sanity queries, random spot-checks, plus a 6-step authoritative runbook and production env template.

---

## What Was Built

### Task 1 — `migration/validate.py`

Full validation script run after data load. Four check categories:

1. **Count parity** (`check_counts`): Iterates all 20 entries in `COLLECTION_TABLE_MAP`, queries MongoDB `.count_documents({})` and `SELECT COUNT(*) FROM public.{table}`, reports delta and pass/fail per table.

2. **FK integrity** (`check_fk_integrity`): Runs 10 `NOT EXISTS` subqueries covering every critical FK relationship: `companies.owner_id`, `contacts.owner_id`, `contacts.company_id`, `deals.stage_id`, `invoice_items.invoice_id`, `journal_lines.journal_entry_id`, `journal_lines.account_id`, `employees.department_id`, `leave_requests.employee_id`, `payslips.employee_id`. Expects 0 orphan rows each.

3. **Financial sanity** (`check_financial_sanity`): Invoice item sum vs invoice subtotal (ABS > 0.01 threshold), journal entry debit/credit balance (ABS > 0.01 with `COALESCE`), auth.users vs profiles count parity.

4. **Spot-checks** (`spot_check_table`): For each collection, samples up to 10 random MongoDB documents, resolves ObjectId → UUID via `id_map.json`, queries `SELECT 1 FROM public.{table} WHERE {pk} = %s` to confirm presence in Supabase.

Writes `migration/validation_report.json` (gitignored) with keys: `timestamp`, `overall` ("PASS"/"FAIL"), `summary`, `count_checks`, `fk_integrity`, `sanity_checks`, `spot_checks`. Exits code 1 on any failure for CI integration.

### Task 2 — `migration/README.md`

Self-contained 6-step runbook covering: prerequisites, setup, extract+transform, test user import, bulk user import, SQL load, validation, and cutover. Includes:
- Rollback plan: Render deployment stays live for 2 weeks post-cutover; DNS revert takes <5 minutes; MongoDB is read-only throughout
- Troubleshooting table: 5 failure modes (IPv6, hash bug, FK violation, duplicate payslips, count mismatch)
- File reference table mapping each script to its role
- `.env.migration` variable reference with exact dashboard navigation paths

### Task 3 — `nextjs-app/.env.production.example`

Documents all 9 required Vercel production env vars with inline comments explaining where to find each value. No real secrets — `NEXT_PUBLIC_GOOGLE_CLIENT_ID` uses the already-public client ID from project config; all secret fields use placeholder values.

### `.gitignore` update

Added entries for migration-generated artifacts: `migration/validation_report.json`, `migration/id_map.json`, `migration/user_id_map.json`, `migration/output/`, `migration/.env.migration`.

---

## Deviations from Plan

None — plan executed exactly as written.

The PLAN.md specified `debit`/`credit` column names in the journal balance query; the actual schema uses `debit_amount`/`credit_amount` (consistent with what `transform.py` generates). Used the correct column names with `COALESCE` to handle NULL values safely. This is a correction to match the actual schema, not a deviation from intent.

---

## Commits

| Hash | Message |
|------|---------|
| `7af6ed9` | feat(04-03): add migration/validate.py with count parity + FK integrity + financial sanity checks |
| `63717c3` | feat(04-03): migration runbook + production env example |

---

## Self-Check: PASSED

- `migration/validate.py` — FOUND
- `migration/README.md` — FOUND
- `nextjs-app/.env.production.example` — FOUND
- `.gitignore` contains `migration/validation_report.json` — FOUND
- Commits `7af6ed9` and `63717c3` — FOUND in git log
- `validate.py` contains `check_counts`, `check_fk_integrity`, `check_financial_sanity`, `spot_check_table`, `main` functions — VERIFIED (AST parse OK)
- `COLLECTION_TABLE_MAP` has 20 entries — VERIFIED
- `FK_INTEGRITY_QUERIES` has 10 entries — VERIFIED
- `FINANCIAL_SANITY_QUERIES` has 3 entries — VERIFIED
