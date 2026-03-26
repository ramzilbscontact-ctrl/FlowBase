---
phase: "04"
plan: "04-01"
subsystem: data-migration
tags: [etl, mongodb, supabase, postgresql, python, uuid5, sql]
dependency_graph:
  requires: []
  provides: [migration/migrate.py, migration/transform.py, migration/extract.py, migration/utils.py]
  affects: [04-02, 04-03]
tech_stack:
  added: [pymongo==4.7.3, psycopg2-binary==2.9.9, supabase==2.5.0, python-dotenv==1.0.1, tqdm==4.66.4, python-dateutil==2.9.0]
  patterns: [UUID5-deterministic-ids, two-pass-self-reference, FK-ordered-SQL-output, payslip-deduplication]
key_files:
  created:
    - migration/__init__.py
    - migration/requirements.txt
    - migration/.env.migration.example
    - migration/utils.py
    - migration/extract.py
    - migration/transform.py
    - migration/migrate.py
    - migration/output/.gitkeep
  modified: []
decisions:
  - "Used RFC 4122 DNS namespace UUID (6ba7b810-...) as the UUID5 base — matches the plan spec and is more standard than the arbitrary namespace in the RESEARCH.md examples"
  - "escape() function placed in utils.py (not inline in migrate.py) so transform tests can use it independently"
  - "Invoice/quote status enum validation added in transform functions — invalid MongoDB values silently coerce to 'draft' rather than failing the entire migration"
  - "AuditLog user_id resolution: MongoDB stores it as a string (StringField), not ObjectId — id_map.get(str(user_id)) handles both cases safely, returns NULL if unresolvable"
metrics:
  duration: "11 minutes"
  completed_date: "2026-03-25"
  tasks_completed: 3
  files_created: 8
---

# Phase 04 Plan 01: Python ETL Script — Extract, Transform, SQL Output Summary

## One-liner

UUID5-deterministic MongoDB-to-PostgreSQL ETL: 19 collection transforms, FK-ordered SQL INSERT files, two-pass accounts self-reference, payslip deduplication, `--dry-run` flag.

## What Was Built

A complete Python ETL migration script suite under `migration/` that reads every MongoDB collection, converts ObjectIds to deterministic UUID5 values using a fixed namespace, resolves all FK references through a global id_map, and writes one SQL INSERT file per Supabase table in FK dependency order.

### Files Created

| File | Purpose |
|------|---------|
| `migration/requirements.txt` | 6 pinned dependencies |
| `migration/.env.migration.example` | Environment variable template |
| `migration/utils.py` | UUID5 helpers, escape(), type coercions, normalize_bcrypt_prefix(), resolve_fk() |
| `migration/extract.py` | MongoDB connection + all-collections extractor |
| `migration/transform.py` | 19 transform functions + deduplicate_payslips() |
| `migration/migrate.py` | Main orchestrator with --dry-run flag |
| `migration/__init__.py` | Python package marker |
| `migration/output/.gitkeep` | Output directory placeholder |

### Key Design Decisions

**UUID5 namespace:** Using `uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")` (the RFC 4122 DNS namespace). Every `ObjectId("507f1f77bcf86cd799439011")` deterministically maps to the same UUID on every run — migration is fully idempotent.

**Global id_map:** Built from ALL 20 collections before any transform runs. This means any FK in any collection (e.g., `journal_lines.account_id` pointing to an account) resolves correctly even if the reference crosses collection boundaries.

**Accounts two-pass:** `transform_account()` sets `parent_id = None` and stores `_mongo_parent_id` as a staging key. `migrate.py` writes `09a_accounts_first_pass.sql` (all accounts, parent_id = NULL) then `09b_accounts_parent_update.sql` (UPDATE statements for each account that had a parent). The `_mongo_parent_id` key is excluded from the INSERT column list.

**search_vector excluded everywhere:** Confirmed via Python AST analysis — `search_vector` does not appear as any dict key or list element in any transform function or column list. It only appears in comments.

**Payslip deduplication:** `deduplicate_payslips()` uses a dict keyed on `(employee_id, period_month, period_year)` with last-write-wins — matching the Supabase UNIQUE constraint.

**SQL escaping:** `escape()` in utils.py handles: NULL, booleans, numbers, arrays (PostgreSQL ARRAY[...] literal), dicts (jsonb), and strings (backslash escape, newline collapse, single-quote doubling). All in the correct order to prevent SQL injection from MongoDB string data.

**Enum coercion:** Invalid enum values from MongoDB are silently coerced to safe defaults rather than failing the entire migration: invoice status -> 'draft', quote status -> 'draft', payment method -> NULL, account type -> 'asset', employee status -> 'active', leave type -> 'other', leave status -> 'pending'.

### Output Files (written to migration/output/)

Files 02-21 in FK dependency order. File 01 (auth.users) is handled by load_users.py in plan 04-02.

```
02_profiles.sql
03_companies.sql
04_contacts.sql
05_pipeline_stages.sql
06_deals.sql
07_tasks.sql
08_notes.sql
09a_accounts_first_pass.sql      (all accounts, parent_id = NULL)
09b_accounts_parent_update.sql   (UPDATE statements for self-reference)
10_invoices.sql
11_invoice_items.sql
12_quotes.sql
13_payments.sql
14_journal_entries.sql
15_journal_lines.sql
16_departments.sql
17_employees.sql
18_leave_requests.sql
19_payslips.sql
20_google_tokens.sql
21_audit_logs.sql
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] escape() added to utils.py, not inline in migrate.py**

- **Found during:** Task 3 (writing migrate.py)
- **Issue:** The plan showed `escape()` defined as a local function inside `write_sql_file()`. This prevented transform tests from calling it directly and made backslash handling order-dependent bugs harder to catch.
- **Fix:** Moved `escape()` to `utils.py` as a top-level function. `migrate.py` imports it from there. Existing behavior is identical.
- **Files modified:** `migration/utils.py`, `migration/migrate.py`
- **Commit:** 956ff42

**2. [Rule 2 - Missing critical functionality] Enum validation added in transform functions**

- **Found during:** Task 2 (writing transform functions)
- **Issue:** MongoDB has no enum constraints. An invalid `invoice.status` value like `"partially_paid"` would produce a SQL INSERT that PostgreSQL rejects with a CHECK constraint violation, aborting the entire file.
- **Fix:** Added explicit enum validation with safe fallbacks in `transform_invoice`, `transform_quote`, `transform_payment`, `transform_account`, `transform_employee`, `transform_leave_request`. Invalid values silently coerce to the DEFAULT value for that column.
- **Files modified:** `migration/transform.py`
- **Commit:** 956ff42

## Self-Check

**Files:**
- `migration/requirements.txt` — FOUND
- `migration/utils.py` — FOUND
- `migration/extract.py` — FOUND
- `migration/transform.py` — FOUND
- `migration/migrate.py` — FOUND
- `migration/__init__.py` — FOUND

**Commits:**
- `956ff42` — feat(04-01): Python ETL script — FOUND

**search_vector in column lists:** NONE (verified via AST analysis)
**09a_accounts_first_pass.sql referenced in migrate.py:** YES (line 320)
**09b_accounts_parent_update.sql written by migrate.py:** YES (write_accounts_parent_update function)
**--dry-run flag in migrate.py:** YES (argparse, dry_run=True path skips all file writes)
**migration/output/ created by script:** YES (os.makedirs(OUTPUT_DIR, exist_ok=True))

## Self-Check: PASSED
