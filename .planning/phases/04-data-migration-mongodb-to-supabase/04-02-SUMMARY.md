---
phase: "04"
plan: "04-02"
subsystem: data-migration
tags: [migration, supabase-auth, psycopg2, bcrypt, user-import, etl]
dependency_graph:
  requires: [04-01]
  provides: [migration/load_users.py, migration/load_data.py]
  affects: [auth.users, auth.identities, public.*]
tech_stack:
  added: []
  patterns: [supabase-admin-api, psycopg2-direct-connection, exponential-backoff, sql-fallback]
key_files:
  created:
    - migration/load_users.py
    - migration/load_data.py
  modified: []
decisions:
  - "verify_hash_saved() queries auth.users.encrypted_password directly via psycopg2 — Admin API get_user does not expose this field"
  - "SQL fallback deletes hash-less API row before INSERT to avoid unique constraint violation"
  - "load_data.py aborts on first file failure — previously loaded files are safe to re-run due to ON CONFLICT DO NOTHING"
  - "SUPABASE_DB_DSN falls back to SUPABASE_DB_URL env var for compatibility with existing .env.migration naming"
metrics:
  duration_minutes: 12
  completed_date: "2026-03-26"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 4 Plan 02: User Migration + Data Load Summary

**One-liner:** Supabase Auth user import with bcrypt hash verification (issue #1678 guard) and sorted SQL file loader with per-file transaction rollback and --dry-run flag.

## What Was Built

### migration/load_users.py

Imports all MongoDB users into Supabase Auth preserving original bcrypt hashes so no password resets are required. Key behaviors:

- Calls `supabase.auth.admin.create_user()` with `password_hash` parameter (maps MongoDB `password` field, not `password_hash`)
- `normalize_bcrypt_prefix()` converts any `$2y$` hashes to `$2b$` for Go's `crypto/bcrypt` compatibility
- After each API call, `verify_hash_saved()` queries `auth.users.encrypted_password` directly via psycopg2 to detect GitHub issue #1678 (hash not persisted by GoTrue)
- If hash is missing: deletes the hash-less API row, then `import_user_via_sql_fallback()` does direct INSERT into both `auth.users` and `auth.identities` with all required GoTrue fields (`instance_id`, `aud`, `role`, `confirmation_token`, `recovery_token`, `email_change_token_new`, `email_change`)
- 100ms delay between each user (`time.sleep(0.1)`) — conservative 10 users/sec rate limit
- Exponential backoff (1s, 2s, 4s) on HTTP 429
- Idempotent: "already registered" / "already exists" errors are skipped, not raised
- `--test-one` flag imports only the first user for manual hash verification before bulk run
- Writes `migration/user_id_map.json` mapping MongoDB ObjectId strings to Supabase UUIDs

### migration/load_data.py

Executes all `migration/output/*.sql` files against Supabase PostgreSQL via the `postgres` superuser connection (bypasses RLS). Key behaviors:

- `sorted(glob.glob("migration/output/*.sql"))` — alphabetic sort preserves numeric FK prefix order (`02_profiles.sql` ... `21_audit_logs.sql`)
- Each file executes in its own transaction: commit on success, rollback + abort on error
- Uses `SUPABASE_DB_DSN` (direct port 5432 connection), not the PostgREST/pooler
- `--dry-run` flag validates SQL files exist and lists them without executing
- IPv6 fallback note: if direct connection fails, use Session Pooler DSN from Supabase Dashboard > Settings > Database
- Complete 9-step run order documented in module docstring
- Aborts on first file failure; previously loaded files are re-run safe (ON CONFLICT DO NOTHING)

## Run Order

```
1. pip install -r migration/requirements.txt
2. cp migration/.env.migration.example migration/.env.migration
3. # Edit: MONGO_URI, SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_DB_DSN
4. python migration/migrate.py                    # extract + transform -> SQL files
5. python migration/load_users.py --test-one      # import 1 user, verify hash saved
6. # Manually verify login with test user's original password
7. python migration/load_users.py                 # import all users
8. python migration/load_data.py                  # load all SQL files
9. python migration/validate.py                   # count parity + FK integrity
```

## Deviations from Plan

**1. [Rule 2 - Missing functionality] Accept SUPABASE_DB_URL as fallback env var**
- **Found during:** Task 1 (load_users.py)
- **Issue:** The plan references `SUPABASE_DB_DSN` but the `.env.migration.example` built in 04-01 uses `SUPABASE_DB_URL` as the variable name
- **Fix:** Both `get_conn()` and `verify_hash_saved()` try `SUPABASE_DB_DSN` first, then fall back to `SUPABASE_DB_URL` — compatible with either naming convention
- **Files modified:** migration/load_users.py, migration/load_data.py

None of the other plan content deviated — all acceptance criteria met exactly as specified.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| migration/load_users.py | FOUND |
| migration/load_data.py | FOUND |
| 04-02-SUMMARY.md | FOUND |
| commit add13b7 | FOUND |
