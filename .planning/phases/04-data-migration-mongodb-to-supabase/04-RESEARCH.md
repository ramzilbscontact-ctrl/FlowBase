# Phase 4: Data Migration (MongoDB → Supabase) - Research

**Researched:** 2026-03-25
**Domain:** ETL migration — MongoDB Atlas → Supabase PostgreSQL + Auth
**Confidence:** MEDIUM-HIGH (core APIs verified; bcrypt hash import confirmed via official docs; SQL injection pattern verified via community; rate limits not formally documented)

---

## Summary

This phase moves all production data from MongoDB Atlas (`erp_radiance`) to Supabase PostgreSQL. The migration covers 19 MongoDB collections, user account migration preserving bcrypt hashes (no password resets), FK ordering for relational integrity, and post-migration validation.

The standard approach is a Python ETL script: pymongo reads every collection, a transform layer converts ObjectId strings to deterministic UUID5 values (building an in-memory lookup table), and psycopg2 inserts data directly into Supabase's PostgreSQL using the `postgres` superuser connection string, which bypasses RLS completely. Users are migrated via the Supabase Admin API `createUser` with the `password_hash` parameter (documented as supported for bcrypt and Argon2 since at least the Auth0 migration guide).

The zero-downtime strategy is operational: the old Render stack stays live, the new Next.js/Supabase stack runs in parallel, and the DNS/traffic cut-over happens only after validation passes.

**Primary recommendation:** Use a single Python ETL script (`migrate.py`) that does extract → transform → load in FK-dependency order, with user migration as the mandatory first step. Connect to Supabase PostgreSQL via the direct `postgres` superuser DSN (port 5432) to bypass RLS during the load phase.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FR-07-1 | Migration script: export all MongoDB collections to JSON | pymongo `find({})` on each collection; mongoexport as CLI alternative |
| FR-07-2 | Schema mapping: MongoDB documents → PostgreSQL rows with correct types | ObjectId→UUID5 lookup table; date/datetime type coercion; nested doc flattening |
| FR-07-3 | User migration: existing bcrypt hashes → Supabase Auth (keep hashes, no re-registration) | `supabase.auth.admin.createUser({ password_hash })` confirmed in official Auth0 migration guide |
| FR-07-4 | Data validation: post-migration integrity checks (record counts, FK integrity) | SQL COUNT queries + FK violation scan provided below |
| FR-07-5 | Zero-downtime strategy: new app runs alongside old until verified | Old Render deployment stays live; feature flag / DNS cut-over pattern |
| FR-07-6 | Rollback plan: old Render deployment stays live until new app is verified stable | No destructive actions on MongoDB until sign-off; Render stays running |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pymongo | 4.x | Read from MongoDB Atlas | Native driver, handles ObjectId/datetime natively |
| psycopg2-binary | 2.9.x | Write to Supabase PostgreSQL | Industry standard; `execute_values` for bulk insert |
| supabase (Python SDK) | 2.x | Admin API for user import | Only way to call `auth.admin.create_user` with `password_hash` |
| python-dotenv | 1.x | Load MONGO_URI, Supabase DSN from env | Keeps secrets out of script |
| uuid (stdlib) | 3.x | UUID5 deterministic ID generation | No extra dependency |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tqdm | 4.x | Progress bars for long collections | Useful for employees, journal_lines |
| python-dateutil | 2.x | Parse ISO date strings robustly | When MongoDB stores dates as strings |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| psycopg2 direct | supabase-py for all inserts | supabase-py goes through PostgREST which enforces RLS; direct psycopg2 bypasses it — use psycopg2 for data, supabase-py only for auth admin calls |
| UUID5 deterministic | Random UUID4 per document | UUID4 breaks idempotency; re-running the migration creates duplicate UUID mappings. UUID5 means re-runs are safe |
| Python ETL script | Airbyte/Fivetran | Overkill for a one-time migration of a small dataset; Python script is simpler, auditable, version-controlled |

**Installation:**
```bash
pip install pymongo psycopg2-binary supabase python-dotenv tqdm python-dateutil
```

---

## Architecture Patterns

### Recommended Project Structure
```
migration/
├── migrate.py           # Main ETL orchestrator — run this
├── extract.py           # pymongo connection + collection dump
├── transform.py         # ObjectId→UUID, type coercion, FK rewrite
├── load_users.py        # Supabase Admin API user import (runs first)
├── load_data.py         # psycopg2 bulk inserts in FK order
├── validate.py          # Post-migration count + FK integrity checks
├── id_map.json          # Persisted ObjectId→UUID lookup table (generated)
├── .env.migration       # MONGO_URI, SUPABASE_URL, SUPABASE_SERVICE_KEY, DB_DSN
└── requirements.txt
```

### Pattern 1: Deterministic UUID5 Lookup Table

**What:** Every MongoDB ObjectId is converted to a UUID5 using a project-specific namespace UUID and the ObjectId hex string as the name. The mapping is built once and reused for all FK rewrites.

**When to use:** All FK references (owner_id, contact_id, company_id, etc.) must reference the same UUID that was assigned to the pointed-to document.

**Example:**
```python
# Source: uuid stdlib + UUID5 idempotency pattern (shimul.dev/en/blog/uuid5_idempotency/)
import uuid

# Fixed namespace for this project — never change after first run
RADIANCE_NAMESPACE = uuid.UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")

def oid_to_uuid(object_id_str: str) -> str:
    """Convert MongoDB ObjectId hex string to deterministic UUID5."""
    return str(uuid.uuid5(RADIANCE_NAMESPACE, object_id_str))

# Build the full lookup table from a collection export
def build_id_map(collection_docs: list) -> dict:
    """Returns {objectid_str: uuid_str} for every document."""
    return {str(doc["_id"]): oid_to_uuid(str(doc["_id"])) for doc in collection_docs}
```

Key property: calling `oid_to_uuid` with the same ObjectId string always returns the same UUID. Re-running the migration is safe and idempotent.

### Pattern 2: FK-Safe Bulk Insert with psycopg2

**What:** Use `psycopg2.extras.execute_values` for bulk inserts. Insert tables in strict FK dependency order so no child row references a parent that doesn't exist yet.

**When to use:** Every table insert in the data load phase.

**Example:**
```python
# Source: psycopg2 fast execution helpers docs
from psycopg2.extras import execute_values

def bulk_insert(conn, table: str, rows: list[dict], columns: list[str]):
    """Insert rows as a batch. 10x faster than executemany."""
    if not rows:
        return
    values = [[row.get(col) for col in columns] for row in rows]
    sql = f"INSERT INTO {table} ({', '.join(columns)}) VALUES %s ON CONFLICT DO NOTHING"
    with conn.cursor() as cur:
        execute_values(cur, sql, values, page_size=500)
    conn.commit()
```

`ON CONFLICT DO NOTHING` makes re-runs safe if the script is interrupted and restarted.

### Pattern 3: RLS Bypass via Direct Postgres Connection

**What:** Connect to Supabase PostgreSQL using the `postgres` superuser DSN (not the anon/service_role API). The `postgres` role has `BYPASSRLS` privilege, so all inserts succeed regardless of RLS policies.

**When to use:** Every psycopg2 connection in the migration script.

**Example:**
```python
# Source: Supabase connecting-to-postgres docs + community confirmation
import psycopg2

# Direct connection — postgres superuser bypasses RLS
# Find in: Supabase Dashboard → Project Settings → Database → Connection string (Direct)
# Format: postgresql://postgres:[DB-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
conn = psycopg2.connect(os.environ["SUPABASE_DB_DSN"])

# Optionally be explicit:
# cur.execute("SET LOCAL role = postgres")
```

NOTE: Use the direct connection string (port 5432), not the connection pooler (port 6543). The pooler runs in transaction mode and does not support `SET LOCAL role`.

IPv6 note: Supabase direct connections use IPv6 by default. If your local machine lacks IPv6, use the Session Pooler (port 5432 on pooler host) with `SET LOCAL role = postgres` after connecting, or enable the IPv4 add-on in Supabase dashboard.

### Pattern 4: Supabase Admin User Import

**What:** Call `supabase.auth.admin.create_user()` with `password_hash` to import existing bcrypt hashes without requiring password resets.

**When to use:** The user import step, which must run before all other table inserts (because every table has `owner_id UUID REFERENCES auth.users(id)`).

**Example:**
```python
# Source: Supabase official Auth0 migration guide
# https://supabase.com/docs/guides/platform/migrating-to-supabase/auth0
from supabase import create_client, Client

supabase: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"]  # service_role key required for admin API
)

def import_user(mongo_user: dict, new_uuid: str) -> str:
    """Import one user. Returns the Supabase auth.users UUID."""
    result = supabase.auth.admin.create_user({
        "id": new_uuid,                           # deterministic UUID5 from ObjectId
        "email": mongo_user["email"],
        "password_hash": mongo_user["password"],  # field name in Mongo model is 'password'
        "email_confirm": True,                    # treat all existing users as verified
        "user_metadata": {
            "first_name": mongo_user.get("first_name", ""),
            "last_name": mongo_user.get("last_name", ""),
            "role": mongo_user.get("role", "viewer"),
        }
    })
    if result.user is None:
        raise RuntimeError(f"Failed to create user {mongo_user['email']}: {result}")
    return result.user.id
```

After importing each user, also insert a row into `public.profiles` using the same UUID.

### Anti-Patterns to Avoid

- **Using supabase-py PostgREST client for data inserts:** PostgREST enforces RLS even with the service_role key in some configurations. Use direct psycopg2 instead.
- **Using `executemany()` in a loop:** psycopg2 docs warn this is not faster than a single-row loop. Use `execute_values`.
- **Inserting child tables before parents:** PostgreSQL will reject the FK constraint. Strictly follow the insert order listed below.
- **Using `$2y$` bcrypt prefix without normalizing:** GoTrue (the Supabase auth engine) is written in Go and uses the Go `crypto/bcrypt` package. Go's bcrypt only handles `$2a$` and `$2b$` prefixes. Python's `bcrypt.gensalt()` generates `$2b$` hashes by default — this is compatible. If any legacy hashes have `$2y$` prefix (PHP origin), normalize them: `hash.replace("$2y$", "$2b$", 1)` before passing to the API.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bcrypt hash verification at import | Custom Go/Python bcrypt check | Supabase Admin API `password_hash` param | GoTrue handles the hash storage correctly; hand-rolled SQL insert into auth.users with wrong fields causes failed logins |
| Bulk insert loop | `for doc in docs: cur.execute(INSERT ...)` | `execute_values` with `page_size=500` | 10x performance difference; single-row loops with commit per row will time out on large collections |
| UUID generation per run | `uuid4()` at runtime | `uuid5(NAMESPACE, oid)` | UUID4 breaks idempotency; re-runs create orphaned duplicates |
| FK integrity check | Manual count comparisons | SQL `NOT EXISTS` subquery (provided below) | PostgreSQL can check FK integrity natively in one query |

---

## FK Dependency Insert Order

Insert tables in this exact order. Every table indented under another depends on it.

```
1.  auth.users (via Supabase Admin API — create_user)
2.  public.profiles                     → references auth.users
3.  public.companies                    → references auth.users (owner_id)
4.  public.contacts                     → references auth.users, companies
5.  public.pipeline_stages              → references auth.users
6.  public.deals                        → references auth.users, contacts, companies, pipeline_stages
7.  public.tasks                        → references auth.users, contacts, deals
8.  public.notes                        → references auth.users, contacts, companies, deals
9.  public.accounts                     → references auth.users; self-reference parent_id (handle below)
10. public.invoices                     → references auth.users, contacts, companies
11. public.invoice_items                → references invoices
12. public.quotes                       → references auth.users, contacts, invoices (converted_to_invoice_id)
13. public.payments                     → references auth.users, invoices
14. public.journal_entries              → references auth.users, invoices, payments
15. public.journal_lines                → references journal_entries, accounts
16. public.departments                  → references auth.users
17. public.employees                    → references auth.users, departments
18. public.leave_requests               → references auth.users, employees
19. public.payslips                     → references auth.users, employees
20. public.google_tokens                → references auth.users
21. public.audit_logs                   → references auth.users (nullable)
```

**Self-referencing accounts table:** Insert all accounts first with `parent_id = NULL`, then run a second UPDATE pass to set `parent_id` values using the ID map. This avoids FK violations on the first pass.

```sql
-- Second pass: restore parent_id after all accounts inserted
UPDATE public.accounts SET parent_id = $new_parent_uuid WHERE id = $account_uuid;
```

---

## Common Pitfalls

### Pitfall 1: `password_hash` parameter bug in older SDK versions
**What goes wrong:** GitHub issue #1678 (supabase/auth, July 2024) reported that `password_hash` was not being saved in certain SDK versions.
**Why it happens:** The bug was in the GoTrue server-side handling of the `password_hash` field in `AdminUserParams`.
**How to avoid:** After creating each user, verify the user exists and can sign in by calling `supabase.auth.admin.get_user(uid)` and checking that `encrypted_password` is non-empty (requires direct DB query). If the hash is not saved, the fallback is a direct SQL INSERT into `auth.users` (see Pitfall 2 workaround).
**Warning signs:** User is created (no error), but `result.user.email_confirmed_at` is null, or login with original password fails.

### Pitfall 2: Direct SQL insert into auth.users misses required fields
**What goes wrong:** Inserting into `auth.users` directly without all required fields (especially `instance_id`, `aud`, `role`, `confirmation_token`, `recovery_token`) causes the row to be accepted but login fails silently.
**Why it happens:** GoTrue's login handler checks multiple fields; NULL token columns cause assertion failures in some GoTrue versions.
**How to avoid:** If using direct SQL as a fallback, include ALL required fields:
```sql
INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, last_sign_in_at,
    confirmation_token, recovery_token,
    email_change_token_new, email_change
) VALUES (
    $uuid,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', $email,
    $bcrypt_hash, NOW(),
    '{"provider":"email","providers":["email"]}', '{}',
    $created_at, $updated_at, $last_login,
    '', '', '', ''
);
-- Also insert into auth.identities:
INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (
    $uuid,  -- same as user id for email provider
    $uuid,
    jsonb_build_object('sub', $uuid::text, 'email', $email),
    'email',
    NOW(), $created_at, NOW()
);
```
**Warning signs:** User row exists in `auth.users` but `supabase.auth.sign_in_with_password` returns "Invalid login credentials."

### Pitfall 3: IPv6 connection failures with psycopg2
**What goes wrong:** psycopg2 fails to connect to `db.[ref].supabase.co:5432` from a machine without IPv6.
**Why it happens:** Supabase direct connections resolve to an IPv6 address by default.
**How to avoid:** Use the Session Pooler connection string instead (different host, port 5432 in session mode) or enable the IPv4 add-on in the Supabase dashboard. Check: `Settings → Database → Connection string → Session pooler`.

### Pitfall 4: owner_id mapping for shared/system records
**What goes wrong:** Some MongoDB documents may have been created by a system process and have no `owner_id`, or the owner user no longer exists.
**Why it happens:** MongoDB has no FK enforcement; orphaned references are possible.
**How to avoid:** Before migration, run a MongoDB aggregation to find all unique `created_by` / `owner` values that don't exist in the `users` collection. Decide on a fallback: either assign to an admin user's UUID or skip the record.

### Pitfall 5: tsvector generated columns break manual INSERT
**What goes wrong:** The schema uses `tsvector GENERATED ALWAYS AS (...) STORED` columns. Trying to include `search_vector` in an INSERT statement raises a PostgreSQL error.
**Why it happens:** Generated columns cannot be set by the client.
**How to avoid:** Exclude `search_vector` from all INSERT column lists. PostgreSQL generates it automatically.

### Pitfall 6: payslips unique constraint
**What goes wrong:** `payslips` has `UNIQUE (employee_id, period_month, period_year)`. If MongoDB had duplicate payslip records (data quality issue), the insert fails.
**Why it happens:** MongoDB has no unique constraints.
**How to avoid:** Before inserting payslips, deduplicate in Python: keep only the last record per `(employee_id, period_month, period_year)` combination.

### Pitfall 7: `$2y$` bcrypt prefix from PHP/other systems
**What goes wrong:** If any user passwords were ever set by a non-Python system using the `$2y$` prefix, GoTrue (Go's bcrypt) will reject them.
**Why it happens:** Go's `crypto/bcrypt` package only handles `$2a$` and `$2b$` prefixes.
**How to avoid:** Normalize before import:
```python
def normalize_bcrypt_prefix(hash_str: str) -> str:
    if hash_str.startswith("$2y$"):
        return "$2b$" + hash_str[4:]
    return hash_str
```
The Radiance ERP Python bcrypt library generates `$2b$` hashes by default, so this is likely not an issue, but add the check anyway.

---

## Code Examples

### Complete transform.py skeleton
```python
# Source: pymongo docs + uuid stdlib + project schema analysis
import uuid
from datetime import datetime, timezone
from bson import ObjectId

RADIANCE_NAMESPACE = uuid.UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")

def oid_to_uuid(oid) -> str:
    """Accepts ObjectId or string."""
    return str(uuid.uuid5(RADIANCE_NAMESPACE, str(oid)))

def to_ts(val) -> str | None:
    """Convert MongoDB datetime or ISO string to PostgreSQL timestamptz."""
    if val is None:
        return None
    if isinstance(val, datetime):
        if val.tzinfo is None:
            val = val.replace(tzinfo=timezone.utc)
        return val.isoformat()
    if isinstance(val, str):
        return val  # psycopg2 will parse ISO strings
    return None

def transform_user(doc: dict, id_map: dict) -> dict:
    uid = id_map[str(doc["_id"])]
    return {
        "id": uid,
        "full_name": f"{doc.get('first_name', '')} {doc.get('last_name', '')}".strip(),
        "role": doc.get("role", "user"),
        "failed_login_attempts": doc.get("failed_login_attempts", 0),
        "locked_until": to_ts(doc.get("locked_until")),
        "created_at": to_ts(doc.get("created_at")),
        "updated_at": to_ts(doc.get("updated_at")),
    }

def transform_company(doc: dict, id_map: dict) -> dict:
    return {
        "id": id_map[str(doc["_id"])],
        "owner_id": id_map.get(str(doc.get("owner_id") or doc.get("created_by")), None),
        "name": doc.get("name", ""),
        "industry": doc.get("industry"),
        "website": doc.get("website"),
        "address": doc.get("address"),
        "created_at": to_ts(doc.get("created_at")),
        "updated_at": to_ts(doc.get("updated_at")),
        "deleted_at": to_ts(doc.get("deleted_at")),
    }
```

### Validation queries (post-migration)
```sql
-- Source: standard PostgreSQL FK integrity + count verification pattern

-- 1. Record count comparison (run against both DBs and compare numbers)
SELECT
  'profiles' AS tbl, COUNT(*) FROM public.profiles UNION ALL
  SELECT 'companies', COUNT(*) FROM public.companies UNION ALL
  SELECT 'contacts', COUNT(*) FROM public.contacts UNION ALL
  SELECT 'deals', COUNT(*) FROM public.deals UNION ALL
  SELECT 'tasks', COUNT(*) FROM public.tasks UNION ALL
  SELECT 'notes', COUNT(*) FROM public.notes UNION ALL
  SELECT 'invoices', COUNT(*) FROM public.invoices UNION ALL
  SELECT 'invoice_items', COUNT(*) FROM public.invoice_items UNION ALL
  SELECT 'quotes', COUNT(*) FROM public.quotes UNION ALL
  SELECT 'payments', COUNT(*) FROM public.payments UNION ALL
  SELECT 'accounts', COUNT(*) FROM public.accounts UNION ALL
  SELECT 'journal_entries', COUNT(*) FROM public.journal_entries UNION ALL
  SELECT 'journal_lines', COUNT(*) FROM public.journal_lines UNION ALL
  SELECT 'departments', COUNT(*) FROM public.departments UNION ALL
  SELECT 'employees', COUNT(*) FROM public.employees UNION ALL
  SELECT 'leave_requests', COUNT(*) FROM public.leave_requests UNION ALL
  SELECT 'payslips', COUNT(*) FROM public.payslips UNION ALL
  SELECT 'audit_logs', COUNT(*) FROM public.audit_logs
ORDER BY tbl;

-- 2. Orphaned owner_id check (should return 0 rows for each table)
SELECT 'companies orphaned' AS check, COUNT(*)
FROM public.companies c
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = c.owner_id);

SELECT 'contacts orphaned', COUNT(*)
FROM public.contacts c
WHERE c.company_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.companies co WHERE co.id = c.company_id);

-- 3. Invoice item totals sanity (line items should sum to invoice subtotal)
SELECT i.id, i.invoice_number, i.subtotal,
       SUM(ii.total) AS items_total,
       ABS(i.subtotal - SUM(ii.total)) AS discrepancy
FROM public.invoices i
JOIN public.invoice_items ii ON ii.invoice_id = i.id
GROUP BY i.id, i.invoice_number, i.subtotal
HAVING ABS(i.subtotal - SUM(ii.total)) > 0.01;

-- 4. Double-entry journal balance check (debits must equal credits per entry)
SELECT je.id, SUM(jl.debit) AS total_debit, SUM(jl.credit) AS total_credit
FROM public.journal_entries je
JOIN public.journal_lines jl ON jl.journal_entry_id = je.id
GROUP BY je.id
HAVING ABS(SUM(jl.debit) - SUM(jl.credit)) > 0.01;

-- 5. auth.users vs profiles count match
SELECT
  (SELECT COUNT(*) FROM auth.users) AS auth_user_count,
  (SELECT COUNT(*) FROM public.profiles) AS profiles_count;
```

### Supabase Admin API rate limit workaround
```python
# No batch endpoint exists — must loop with delay on 429
import time

def import_users_with_backoff(users: list, supabase_client):
    results = {}
    for user in users:
        for attempt in range(3):
            try:
                result = supabase_client.auth.admin.create_user({...})
                results[str(user["_id"])] = result.user.id
                time.sleep(0.1)  # conservative: 10 users/sec = well under any limit
                break
            except Exception as e:
                if "429" in str(e):
                    time.sleep(2 ** attempt)
                else:
                    raise
    return results
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct SQL INSERT into auth.users | Admin API `createUser` with `password_hash` | GoTrue v2+ | Admin API handles identity creation automatically |
| executemany() loop | `execute_values` batch | psycopg2 2.7+ | 10x insert performance |
| Random UUID4 per ObjectId | UUID5 with project namespace | Data migration best practice (2022+) | Idempotent re-runs, no orphans |

**Deprecated/outdated:**
- PostgreSQL `crypt()` function for password storage: wrong approach for Supabase. GoTrue uses bcrypt via Go's `crypto/bcrypt`, not the pgcrypto `crypt()` function. Do not use `crypt('password', gen_salt('bf'))` for anything in this migration.

---

## Open Questions

1. **`password_hash` bug status (GitHub issue #1678)**
   - What we know: Issue was open as of August 2024; Supabase team asked for a support ticket
   - What's unclear: Whether it was fixed in a subsequent GoTrue release
   - Recommendation: Test user import with one user first, immediately attempt sign-in with original password, before running the full batch. If the hash is not saved, use the direct SQL INSERT fallback into `auth.users` + `auth.identities` instead.

2. **Admin API rate limit for create_user**
   - What we know: General management API limit is ~120 req/min; no documented limit specifically for admin user creation
   - What's unclear: Whether user import counts against the same bucket
   - Recommendation: Use 100ms delay between user creates (10/sec). For a typical small ERP with <100 users, the entire user import takes under 15 seconds.

3. **MongoDB field name mismatch: `password` vs `password_hash`**
   - What we know: The MongoDB `User` model (`models.py`) stores the bcrypt hash in field `password` (not `password_hash`). The `manage_users.py` script confirms: `doc['password'] = hash_password(...)`.
   - What's unclear: Nothing — this is confirmed.
   - Recommendation: In the transform step, map `mongo_user["password"]` (not `"password_hash"`) to the `password_hash` parameter of the Admin API call.

4. **IPv6 availability on migration machine**
   - What we know: Supabase direct connections (port 5432) default to IPv6
   - What's unclear: Whether the machine running the migration script has IPv6
   - Recommendation: Test with `psql "postgresql://postgres:...@db.[ref].supabase.co:5432/postgres"` first. If it fails, switch to the Session Pooler connection string.

5. **audit_logs schema mismatch**
   - What we know: MongoDB `AuditLog` has fields `method`, `path`, `status_code`, `user_agent`, `request_body`, `duration_ms` — none of which exist in the Supabase `audit_logs` table (which has `action`, `resource`, `resource_id`, `metadata`, `ip_address`)
   - What's unclear: Whether historical audit logs are worth migrating given the schema gap
   - Recommendation: Map best-effort: `action = method + " " + path`, `resource = path`, `metadata = jsonb of all original fields`, `ip_address = ip_address`. Or skip audit_log migration entirely and start fresh — audit logs are compliance records, not business data.

---

## Sources

### Primary (HIGH confidence)
- Supabase official Auth0 migration guide — confirms `password_hash` parameter in `admin.createUser`: https://supabase.com/docs/guides/platform/migrating-to-supabase/auth0
- Supabase password security docs — confirms bcrypt and Argon2 hash support: https://supabase.com/docs/guides/auth/password-security
- psycopg2 fast execution helpers — `execute_values` performance: https://www.psycopg.org/docs/extras.html
- Project schema file `001_schema.sql` — FK relationships, table definitions (read directly)
- Project `models.py` — confirms field name is `password` not `password_hash`, `$2b$` format

### Secondary (MEDIUM confidence)
- GitHub discussion #5248 (supabase/supabase) — full field list for direct `auth.users` INSERT
- shimul.dev UUID5 idempotency pattern — deterministic ID generation for migration
- Supabase connecting-to-postgres docs — direct DSN format and IPv6 note: https://supabase.com/docs/guides/database/connecting-to-postgres

### Tertiary (LOW confidence — needs validation)
- GitHub issue #1678 (supabase/auth) — `password_hash` bug report from July 2024; resolution status unknown
- Rate limit behavior for admin user creation endpoint — not formally documented, inferred from general API limits

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — pymongo, psycopg2, supabase-py are all established, well-documented choices
- User import with password_hash: MEDIUM — confirmed in official docs but a 2024 bug report exists; test first
- FK insert order: HIGH — derived directly from reading the schema SQL file
- Validation SQL: HIGH — standard PostgreSQL patterns
- Rate limits: LOW — not formally documented for the admin user creation endpoint

**Research date:** 2026-03-25
**Valid until:** 2026-06-25 (stable domain; Supabase GoTrue API changes slowly)
