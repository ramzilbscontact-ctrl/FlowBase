#!/usr/bin/env python3
"""
load_data.py — Execute all SQL output files into Supabase PostgreSQL.

Connects via postgres superuser DSN (port 5432) which has BYPASSRLS privilege.
Runs files in numeric filename order (FK dependency order, matching the prefixes
written by migrate.py: 02_profiles.sql ... 21_audit_logs.sql).

Full run order:
  1. pip install -r migration/requirements.txt
  2. cp migration/.env.migration.example migration/.env.migration
  3. # Edit migration/.env.migration — fill in MONGO_URI, SUPABASE_URL,
  #    SUPABASE_SERVICE_KEY, SUPABASE_DB_DSN
  4. python migration/migrate.py            # extracts + transforms -> writes SQL files
  5. python migration/load_users.py --test-one  # imports 1 user + verifies hash saved
  6. # Manually test login on Next.js app with the test user's original password
  7. python migration/load_users.py         # imports all users
  8. python migration/load_data.py          # loads all SQL files  <-- THIS SCRIPT
  9. python migration/validate.py           # count parity + FK integrity

Prerequisites:
  1. load_users.py must have completed successfully
     (auth.users is referenced by every public.* table)
  2. migration/output/*.sql files must exist (from migrate.py)

Usage:
  cd /path/to/project/   (project root)
  python migration/load_data.py           # execute all SQL files
  python migration/load_data.py --dry-run # validate files exist without executing

Connection note:
  Uses the direct postgres superuser connection string (port 5432), NOT the
  Supabase pooler (port 6543). The postgres role has BYPASSRLS privilege, so
  all inserts succeed regardless of RLS policies.

IPv6 note:
  Supabase direct connections (db.[ref].supabase.co:5432) resolve to IPv6 by
  default. If your machine lacks IPv6, set SUPABASE_DB_DSN to the Session Pooler
  connection string instead (different host, still port 5432 in session mode).
  Find it at: Supabase Dashboard > Settings > Database > Session pooler.
"""

import os
import glob
import argparse
import psycopg2
from dotenv import load_dotenv

load_dotenv("migration/.env.migration")

OUTPUT_DIR = "migration/output"


def get_conn():
    """
    Direct postgres superuser connection — bypasses RLS.

    Use port 5432 (direct connection), NOT port 6543 (pooler/transaction mode).
    The transaction-mode pooler (6543) does not support SET LOCAL role and can
    cause issues with multi-statement transactions.

    If connection fails with IPv6 error:
      Set SUPABASE_DB_DSN to the Session Pooler connection string.
      Location: Supabase Dashboard > Settings > Database > Session pooler.
      The session pooler host is different from the direct host but also uses
      port 5432 and supports full session-mode semantics.
    """
    dsn = os.environ.get("SUPABASE_DB_DSN") or os.environ.get("SUPABASE_DB_URL")
    if not dsn:
        raise RuntimeError(
            "SUPABASE_DB_DSN must be set in migration/.env.migration\n"
            "Format: postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
        )
    return psycopg2.connect(dsn)


def execute_sql_file(conn, filepath: str):
    """Read and execute one .sql file in a single transaction.

    On success: commits and prints [OK] filename.
    On error: rolls back and re-raises so the caller can abort the run.
    Each file is independent — a failure in one file does not affect
    previously committed files.
    """
    with open(filepath) as f:
        sql = f.read()

    filename = os.path.basename(filepath)
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
        print(f"  [OK] {filename}")
    except Exception as e:
        conn.rollback()
        print(f"  [FAIL] {filename}: {e}")
        raise


def main():
    parser = argparse.ArgumentParser(
        description="Execute all migration/output/*.sql files into Supabase PostgreSQL."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate that SQL files exist and list them without executing.",
    )
    args = parser.parse_args()

    print("=== load_data.py ===")

    # sorted() on filenames preserves the numeric FK order:
    # 02_profiles.sql < 03_companies.sql < ... < 21_audit_logs.sql
    sql_files = sorted(glob.glob(os.path.join(OUTPUT_DIR, "*.sql")))

    if not sql_files:
        print(f"ERROR: No .sql files found in {OUTPUT_DIR}/")
        print("Run python migration/migrate.py first.")
        raise SystemExit(1)

    print(f"Found {len(sql_files)} SQL files to execute (in order):")
    for f in sql_files:
        print(f"  {os.path.basename(f)}")

    if args.dry_run:
        print(f"\n--dry-run: {len(sql_files)} files validated. No SQL executed.")
        print("Re-run without --dry-run to execute.")
        return

    print(f"\nConnecting to Supabase PostgreSQL (direct postgres superuser)...")
    conn = get_conn()
    print("  Connected.")

    print(f"\nExecuting SQL files...")
    loaded = 0
    failed = 0

    for filepath in sql_files:
        try:
            execute_sql_file(conn, filepath)
            loaded += 1
        except Exception:
            failed += 1
            conn.close()
            print(f"\nAborted after {loaded} successful file(s). Fix the error and re-run.")
            print("Previously loaded files used ON CONFLICT DO NOTHING — re-runs are safe.")
            raise SystemExit(1)

    conn.close()
    print(f"\nDone. {loaded}/{loaded + failed} SQL files loaded successfully.")
    print("NEXT: run python migration/validate.py")


if __name__ == "__main__":
    main()
