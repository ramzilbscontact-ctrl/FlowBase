# Radiance ERP — Migration Runbook

MongoDB Atlas → Supabase PostgreSQL

**Project:** Radiance ERP
**Migration path:** MongoDB Atlas (`erp_radiance`) → Supabase PostgreSQL (`zjhmcyvrziwwkdcylktj`)
**New frontend:** Next.js 16 on Vercel
**Old frontend:** React + Vite on Render (`erpro-dz-frontend`) — stays live until cutover is confirmed

---

## Prerequisites

Before you begin, confirm every item below is ready:

1. **Python 3.11+** — `python3 --version`
2. **MongoDB Atlas network access** — whitelist `0.0.0.0/0` in Atlas Network Access on migration day (Render IPs are dynamic)
3. **Supabase schema applied** — migrations `001_schema.sql` through `004_indexes.sql` must have been executed against the project (`zjhmcyvrziwwkdcylktj`)
4. **`postgres` superuser password** — from Supabase Dashboard → Settings → Database → Connection string (Direct). Format: `postgresql://postgres:[PASSWORD]@db.zjhmcyvrziwwkdcylktj.supabase.co:5432/postgres`
5. **`SUPABASE_SERVICE_ROLE_KEY`** — from Supabase Dashboard → Settings → API → `service_role` key (secret, never expose to client)
6. **Next.js app deployed on Vercel** — the new stack must be deployed and reachable before you perform the cutover step

---

## Setup

```bash
cd migration/
pip install -r requirements.txt
cp .env.migration.example .env.migration
```

Edit `.env.migration` and fill in all four values:

```env
MONGO_URI=mongodb+srv://[USER]:[PASSWORD]@[CLUSTER].mongodb.net/?retryWrites=true&w=majority
SUPABASE_URL=https://zjhmcyvrziwwkdcylktj.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...   # service_role key
SUPABASE_DB_DSN=postgresql://postgres:[PASSWORD]@db.zjhmcyvrziwwkdcylktj.supabase.co:5432/postgres
```

> **IPv6 note:** If your machine cannot reach the direct DSN (connection refused or SSL error), replace `SUPABASE_DB_DSN` with the Session Pooler connection string found at Supabase Dashboard → Settings → Database → Session pooler. The session pooler also uses port 5432 in session mode and is IPv4-reachable.

---

## Step 1 — Extract + Transform (generates SQL files)

```bash
python migration/migrate.py
```

**What it does:** Reads all 20 MongoDB collections from `erp_radiance`, converts ObjectIds to deterministic UUIDs (UUID5 with RFC 4122 DNS namespace), applies field transforms, and writes one numbered `.sql` file per table into `migration/output/`.

**Expected output:**
```
Connecting to MongoDB...
Extracting 20 collections...
Writing SQL files to migration/output/...
  [OK] 02_profiles.sql       (N rows)
  ...
  [OK] 21_audit_logs.sql     (N rows)
Done. 21 files written.
```

**Verify:**
```bash
ls migration/output/*.sql | wc -l   # should print 21
```

---

## Step 2 — Test user import (one user)

```bash
python migration/load_users.py --test-one
```

**What it does:** Imports the first MongoDB user into Supabase Auth via the Admin API with the bcrypt hash preserved. Verifies the hash was actually saved (detects Supabase issue #1678). Writes `migration/user_id_map.json` with 1 entry.

**Expected output:**
```
[1/1] Imported user@example.com
user_id_map.json written (1 entry)
--test-one complete.
NEXT: manually verify login on the Supabase project with the test user's original password.
```

**MANDATORY manual check:** Log in to the Next.js app at your Vercel URL using the test user's original email and password. If login succeeds, the bcrypt hash was saved correctly. Proceed to Step 3.

If login fails (password rejected): the hash-saving bug is active on your GoTrue version. The script automatically uses a direct SQL fallback for all subsequent users — check for `[FALLBACK-SQL]` lines in the output.

---

## Step 3 — Import all users

```bash
python migration/load_users.py
```

**What it does:** Imports all MongoDB users into Supabase Auth. For each user: calls Admin API, verifies the hash, falls back to direct SQL INSERT if the hash was not saved. Idempotent — already-imported users are skipped safely. Rate-limited to ~10 users/second with exponential backoff on HTTP 429.

**Expected output:**
```
[1/N] Imported user1@example.com
[2/N] Imported user2@example.com
...
All N users imported.
NEXT: run python migration/load_data.py
```

`migration/user_id_map.json` updated with all user entries.

---

## Step 4 — Load SQL data files

```bash
python migration/load_data.py
```

**What it does:** Connects to Supabase PostgreSQL via the `postgres` superuser (bypasses RLS). Executes each `.sql` file in numeric order (FK dependency order). Each file uses `ON CONFLICT DO NOTHING` so re-runs are safe. Aborts on the first failure.

**Expected output:**
```
Found 21 SQL files to execute (in order):
  02_profiles.sql
  ...
  21_audit_logs.sql

Executing SQL files...
  [OK] 02_profiles.sql
  ...
  [OK] 21_audit_logs.sql

Done. 21/21 SQL files loaded successfully.
NEXT: run python migration/validate.py
```

If a file fails, check the error. Common causes:

- **FK violation:** `load_users.py` did not complete. `auth.users` must exist before `02_profiles.sql` can load. Re-run `load_users.py`, then re-run `load_data.py`.
- **Unique constraint on payslips:** Duplicate payslips in MongoDB. The `deduplicate_payslips()` function in `transform.py` handles this during extraction — if it still fails, inspect the generated `migration/output/18_payslips.sql` for duplicate `(employee_id, period_start, period_end)` rows.

---

## Step 5 — Validate

```bash
python migration/validate.py
```

**What it does:** Runs four categories of checks:

1. **Count parity** — compares MongoDB collection count vs Supabase row count for all 20 tables
2. **FK integrity** — 10 `NOT EXISTS` queries confirming 0 orphan rows
3. **Financial sanity** — invoice item totals, journal debit/credit balance, auth.users vs profiles parity
4. **Spot-checks** — 10 random records per table confirmed present in Supabase via `id_map.json`

Writes `migration/validation_report.json`. Exits with code 0 on full pass, code 1 if any check fails.

**Expected final line:**
```
=== Validation PASSED ===
Report written to migration/validation_report.json
```

If count mismatches exist: a MongoDB collection may have received writes between Step 1 and now. Re-run `migrate.py` and `load_data.py` (idempotent via `ON CONFLICT DO NOTHING`) and re-run validation.

---

## Step 6 — Cutover

Only proceed after Step 5 shows `PASS`.

1. Update Vercel environment variables to production values (see `nextjs-app/.env.production.example`)
2. Trigger a Vercel redeploy from the Vercel Dashboard or `vercel deploy --prod`
3. Smoke test on the production Vercel URL:
   - Log in with 3 existing user accounts
   - View contacts list (verify data loaded)
   - View invoices list (verify data loaded)
   - Create a new contact (verify writes work)
4. Update DNS CNAME to point `app.yourdomain.com` → Vercel deployment URL (if applicable)
5. Announce to users that the new system is live

---

## Rollback Plan

The old Render deployment (`erpro-dz-api` + `erpro-dz-frontend`) **stays live throughout this process**. Do not decommission Render until 2 weeks after cutover is confirmed stable.

If the Supabase migration has issues after cutover:

1. Revert DNS CNAME back to `erpro-dz-frontend.onrender.com` — users return to the old system immediately
2. MongoDB data is untouched — all migration scripts are **read-only** against MongoDB Atlas
3. Investigate issues using `migration/validation_report.json`
4. Fix, re-run Steps 1–5, and retry cutover

**Zero data loss guarantee:** The migration scripts never write to MongoDB. MongoDB Atlas is the source of truth until cutover is confirmed stable for 2 weeks.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `psycopg2.OperationalError: could not connect to server` | IPv6 not available on your machine | Use Session Pooler DSN from Supabase Dashboard → Settings → Database → Session pooler (different host, port 5432) |
| Login with original password fails after import | bcrypt hash not saved (Supabase issue #1678) | Check Step 2 output for `[FALLBACK-SQL]` — the script auto-falls back; if not present, re-run `load_users.py` |
| `FK violation` on `load_data.py` | `load_users.py` did not complete; `auth.users` rows missing | Re-run `load_users.py` (idempotent), then re-run `load_data.py` |
| `unique constraint violated` on payslips | Duplicate `(employee_id, period_start, period_end)` in MongoDB | Deduplication is handled in `transform.py`; inspect `migration/output/18_payslips.sql` for remaining duplicates |
| Count mismatch in `validate.py` | MongoDB collection updated after `migrate.py` ran | Re-run `migrate.py` + `load_data.py` (idempotent via `ON CONFLICT DO NOTHING`), then re-run `validate.py` |

---

## .env.migration Reference

| Variable | Where to find it | Required |
|----------|-----------------|----------|
| `MONGO_URI` | Render env vars → `MONGO_URI` (MongoDB Atlas SRV string) | Yes |
| `SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL | Yes |
| `SUPABASE_SERVICE_KEY` | Supabase Dashboard → Settings → API → `service_role` secret | Yes |
| `SUPABASE_DB_DSN` | Supabase Dashboard → Settings → Database → Direct connection string | Yes |

---

## File Reference

| File | Purpose |
|------|---------|
| `migration/migrate.py` | Extract from MongoDB, transform, write SQL files to `migration/output/` |
| `migration/extract.py` | MongoDB connection + collection readers |
| `migration/transform.py` | ObjectId → UUID, field mapping, enum coercion |
| `migration/utils.py` | `build_id_map`, `normalize_bcrypt_prefix`, `to_ts`, `escape` |
| `migration/load_users.py` | Import users into Supabase Auth with bcrypt hash preservation |
| `migration/load_data.py` | Execute SQL files into Supabase PostgreSQL (postgres superuser) |
| `migration/validate.py` | Count parity + FK integrity + financial sanity + spot-checks |
| `migration/output/` | Generated SQL files (gitignored — regenerate with `migrate.py`) |
| `migration/id_map.json` | ObjectId → UUID mapping for all 20 collections (gitignored) |
| `migration/user_id_map.json` | MongoDB user OID → Supabase auth.users UUID (gitignored) |
| `migration/validation_report.json` | Full validation results (gitignored) |
