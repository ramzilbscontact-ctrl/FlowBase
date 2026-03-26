#!/usr/bin/env python3
"""
validate.py — Post-migration integrity checks.

Compares MongoDB counts vs Supabase counts for all 20 collections,
runs FK integrity queries, financial sanity checks, and spot-checks
10 random records per table.

Usage:
  cd /path/to/project/   (project root)
  python migration/validate.py

Output:
  migration/validation_report.json  — full results
  Exits with code 0 if all checks pass, 1 if any check fails.
"""

import os
import sys
import json
import random
import datetime
import psycopg2
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("migration/.env.migration")

# ---------------------------------------------------------------------------
# Collection name → Supabase public table name
# ---------------------------------------------------------------------------
COLLECTION_TABLE_MAP = {
    "users":            "profiles",          # auth.users handled separately
    "companies":        "companies",
    "contacts":         "contacts",
    "pipeline_stages":  "pipeline_stages",
    "deals":            "deals",
    "tasks":            "tasks",
    "notes":            "notes",
    "invoices":         "invoices",
    "invoice_items":    "invoice_items",
    "quotes":           "quotes",
    "payments":         "payments",
    "accounts":         "accounts",
    "journal_entries":  "journal_entries",
    "journal_lines":    "journal_lines",
    "departments":      "departments",
    "employees":        "employees",
    "leave_requests":   "leave_requests",
    "payslips":         "payslips",
    "google_tokens":    "google_tokens",
    "audit_logs":       "audit_logs",
}

# ---------------------------------------------------------------------------
# FK integrity — each query returns the COUNT of orphan rows (expect 0)
# ---------------------------------------------------------------------------
FK_INTEGRITY_QUERIES = [
    (
        "companies orphaned owner_id",
        """SELECT COUNT(*) FROM public.companies c
           WHERE NOT EXISTS (
               SELECT 1 FROM auth.users u WHERE u.id = c.owner_id
           )""",
    ),
    (
        "contacts orphaned owner_id",
        """SELECT COUNT(*) FROM public.contacts c
           WHERE NOT EXISTS (
               SELECT 1 FROM auth.users u WHERE u.id = c.owner_id
           )""",
    ),
    (
        "contacts orphaned company_id",
        """SELECT COUNT(*) FROM public.contacts c
           WHERE c.company_id IS NOT NULL
             AND NOT EXISTS (
                 SELECT 1 FROM public.companies co WHERE co.id = c.company_id
             )""",
    ),
    (
        "deals orphaned stage_id",
        """SELECT COUNT(*) FROM public.deals d
           WHERE d.stage_id IS NOT NULL
             AND NOT EXISTS (
                 SELECT 1 FROM public.pipeline_stages ps WHERE ps.id = d.stage_id
             )""",
    ),
    (
        "invoice_items orphaned invoice_id",
        """SELECT COUNT(*) FROM public.invoice_items ii
           WHERE NOT EXISTS (
               SELECT 1 FROM public.invoices i WHERE i.id = ii.invoice_id
           )""",
    ),
    (
        "journal_lines orphaned journal_entry_id",
        """SELECT COUNT(*) FROM public.journal_lines jl
           WHERE NOT EXISTS (
               SELECT 1 FROM public.journal_entries je WHERE je.id = jl.journal_entry_id
           )""",
    ),
    (
        "journal_lines orphaned account_id",
        """SELECT COUNT(*) FROM public.journal_lines jl
           WHERE NOT EXISTS (
               SELECT 1 FROM public.accounts a WHERE a.id = jl.account_id
           )""",
    ),
    (
        "employees orphaned department_id",
        """SELECT COUNT(*) FROM public.employees e
           WHERE e.department_id IS NOT NULL
             AND NOT EXISTS (
                 SELECT 1 FROM public.departments d WHERE d.id = e.department_id
             )""",
    ),
    (
        "leave_requests orphaned employee_id",
        """SELECT COUNT(*) FROM public.leave_requests lr
           WHERE NOT EXISTS (
               SELECT 1 FROM public.employees e WHERE e.id = lr.employee_id
           )""",
    ),
    (
        "payslips orphaned employee_id",
        """SELECT COUNT(*) FROM public.payslips p
           WHERE NOT EXISTS (
               SELECT 1 FROM public.employees e WHERE e.id = p.employee_id
           )""",
    ),
]

# ---------------------------------------------------------------------------
# Financial sanity — each query returns a single numeric value (expect 0)
# ---------------------------------------------------------------------------
FINANCIAL_SANITY_QUERIES = [
    (
        "invoice items total mismatch",
        """SELECT COUNT(*) FROM (
               SELECT i.id
               FROM public.invoices i
               LEFT JOIN public.invoice_items ii ON ii.invoice_id = i.id
               GROUP BY i.id, i.subtotal
               HAVING ABS(COALESCE(i.subtotal, 0) - COALESCE(SUM(ii.total), 0)) > 0.01
           ) AS mismatches""",
    ),
    (
        "journal entry debit/credit imbalance",
        """SELECT COUNT(*) FROM (
               SELECT je.id
               FROM public.journal_entries je
               JOIN public.journal_lines jl ON jl.journal_entry_id = je.id
               GROUP BY je.id
               HAVING ABS(
                   COALESCE(SUM(jl.debit_amount), 0) -
                   COALESCE(SUM(jl.credit_amount), 0)
               ) > 0.01
           ) AS imbalances""",
    ),
    (
        "auth.users vs profiles count mismatch",
        """SELECT ABS(
               (SELECT COUNT(*) FROM auth.users) -
               (SELECT COUNT(*) FROM public.profiles)
           ) AS diff""",
    ),
]


# ---------------------------------------------------------------------------
# 1. Count parity
# ---------------------------------------------------------------------------

def check_counts(mongo_db, pg_conn: psycopg2.extensions.connection) -> list:
    """
    For each collection/table pair, compare MongoDB count vs Supabase count.
    Returns a list of result dicts.
    """
    results = []
    for col, table in COLLECTION_TABLE_MAP.items():
        mongo_count = mongo_db[col].count_documents({})
        with pg_conn.cursor() as cur:
            cur.execute(f"SELECT COUNT(*) FROM public.{table}")
            pg_count = cur.fetchone()[0]

        delta = pg_count - mongo_count
        match = delta == 0
        status = "PASS" if match else "FAIL"
        print(f"  [{status}] {table:25s}  MongoDB={mongo_count:6d}  Supabase={pg_count:6d}  delta={delta:+d}")
        results.append({
            "table":     table,
            "mongodb":   mongo_count,
            "supabase":  pg_count,
            "delta":     delta,
            "passed":    match,
        })
    return results


# ---------------------------------------------------------------------------
# 2. FK integrity
# ---------------------------------------------------------------------------

def check_fk_integrity(pg_conn: psycopg2.extensions.connection) -> list:
    """
    Run each NOT EXISTS query; expect 0 orphan rows for every check.
    """
    results = []
    for name, query in FK_INTEGRITY_QUERIES:
        with pg_conn.cursor() as cur:
            cur.execute(query)
            orphan_count = cur.fetchone()[0]

        passed = orphan_count == 0
        status = "PASS" if passed else "FAIL"
        print(f"  [{status}] {name}: {orphan_count} orphan row(s)")
        results.append({
            "check":       name,
            "orphan_count": int(orphan_count),
            "passed":       passed,
        })
    return results


# ---------------------------------------------------------------------------
# 3. Financial sanity
# ---------------------------------------------------------------------------

def check_financial_sanity(pg_conn: psycopg2.extensions.connection) -> list:
    """
    Run each financial sanity query; expect value == 0 for every check.
    """
    results = []
    for name, query in FINANCIAL_SANITY_QUERIES:
        with pg_conn.cursor() as cur:
            cur.execute(query)
            value = cur.fetchone()[0]

        passed = int(value) == 0
        status = "PASS" if passed else "FAIL"
        print(f"  [{status}] {name}: {value}")
        results.append({
            "check":   name,
            "value":   int(value),
            "passed":  passed,
        })
    return results


# ---------------------------------------------------------------------------
# 4. Spot-checks
# ---------------------------------------------------------------------------

def spot_check_table(
    mongo_db,
    pg_conn: psycopg2.extensions.connection,
    col: str,
    table: str,
    id_map: dict,
    n: int = 10,
) -> list:
    """
    Pick n random MongoDB documents, look up their UUID in id_map, then confirm
    the corresponding Supabase row exists.

    Field-level value comparison is intentionally omitted because the schema
    transformation changes column names, types, and adds computed columns.
    Existence confirmation is sufficient as a spot-check.
    """
    docs = list(mongo_db[col].find({}))
    if not docs:
        print(f"  [INFO] {table}: empty collection — skipping spot-check")
        return [{"check": f"spot:{table}", "passed": True, "note": "empty collection"}]

    sample = random.sample(docs, min(n, len(docs)))
    results = []
    for doc in sample:
        oid_str = str(doc["_id"])
        uuid = id_map.get(oid_str)

        if not uuid:
            results.append({
                "check":  f"spot:{table}:{oid_str}",
                "passed": False,
                "reason": "oid not found in id_map",
            })
            print(f"    [MISS] {table}: ObjectId {oid_str} has no UUID mapping")
            continue

        # google_tokens uses user_id as PK, all other tables use id
        pk_col = "user_id" if table == "google_tokens" else "id"
        with pg_conn.cursor() as cur:
            cur.execute(
                f"SELECT 1 FROM public.{table} WHERE {pk_col} = %s", (uuid,)
            )
            found = cur.fetchone() is not None

        results.append({
            "check":  f"spot:{table}:{oid_str}",
            "uuid":   uuid,
            "passed": found,
        })
        if not found:
            print(f"    [MISS] {table}: UUID {uuid} not found in Supabase")

    passed = sum(1 for r in results if r["passed"])
    print(f"  [INFO] {table}: spot-check {passed}/{len(results)} rows found")
    return results


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("=== validate.py — Post-migration integrity check ===\n")

    # ------------------------------------------------------------------
    # Load id_map (ObjectId str → UUID str), produced by migrate.py
    # ------------------------------------------------------------------
    id_map_path = "migration/id_map.json"
    if not os.path.exists(id_map_path):
        print(f"ERROR: {id_map_path} not found.")
        print("Run python migration/migrate.py first to generate the id_map.")
        sys.exit(1)

    with open(id_map_path) as f:
        id_map = json.load(f)
    print(f"Loaded id_map: {len(id_map)} ObjectId → UUID mappings\n")

    # ------------------------------------------------------------------
    # Connect
    # ------------------------------------------------------------------
    mongo_uri = os.environ.get("MONGO_URI")
    if not mongo_uri:
        raise RuntimeError("MONGO_URI must be set in migration/.env.migration")

    db_dsn = os.environ.get("SUPABASE_DB_DSN") or os.environ.get("SUPABASE_DB_URL")
    if not db_dsn:
        raise RuntimeError(
            "SUPABASE_DB_DSN must be set in migration/.env.migration\n"
            "Format: postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
        )

    print("Connecting to MongoDB...")
    mongo_client = MongoClient(mongo_uri)
    mongo_db = mongo_client["erp_radiance"]

    print("Connecting to Supabase PostgreSQL...")
    pg_conn = psycopg2.connect(db_dsn)
    print("Connected.\n")

    all_passed = True

    # ------------------------------------------------------------------
    # 1. Record count parity
    # ------------------------------------------------------------------
    print("--- 1. Record count parity ---")
    count_results = check_counts(mongo_db, pg_conn)
    if any(not r["passed"] for r in count_results):
        all_passed = False

    # ------------------------------------------------------------------
    # 2. FK integrity
    # ------------------------------------------------------------------
    print("\n--- 2. FK integrity (expect 0 orphan rows each) ---")
    fk_results = check_fk_integrity(pg_conn)
    if any(not r["passed"] for r in fk_results):
        all_passed = False

    # ------------------------------------------------------------------
    # 3. Financial sanity
    # ------------------------------------------------------------------
    print("\n--- 3. Financial sanity ---")
    financial_results = check_financial_sanity(pg_conn)
    if any(not r["passed"] for r in financial_results):
        all_passed = False

    # ------------------------------------------------------------------
    # 4. Spot-checks
    # ------------------------------------------------------------------
    print("\n--- 4. Spot-checks (10 random rows per table) ---")
    spot_results = {}
    for col, table in COLLECTION_TABLE_MAP.items():
        checks = spot_check_table(mongo_db, pg_conn, col, table, id_map, n=10)
        spot_results[table] = checks
        if any(not r["passed"] for r in checks):
            all_passed = False

    # ------------------------------------------------------------------
    # Close connections
    # ------------------------------------------------------------------
    mongo_client.close()
    pg_conn.close()

    # ------------------------------------------------------------------
    # Build and write report
    # ------------------------------------------------------------------
    report = {
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "overall": "PASS" if all_passed else "FAIL",
        "summary": {
            "counts_failed":   sum(1 for r in count_results if not r["passed"]),
            "fk_violations":   sum(r.get("orphan_count", 0) for r in fk_results),
            "financial_issues": sum(r.get("value", 0) for r in financial_results),
            "spot_check_misses": sum(
                1
                for table_checks in spot_results.values()
                for r in table_checks
                if not r["passed"]
            ),
        },
        "count_checks":    count_results,
        "fk_integrity":    fk_results,
        "sanity_checks":   financial_results,
        "spot_checks":     spot_results,
    }

    report_path = "migration/validation_report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2, default=str)

    print(f"\n=== Validation {'PASSED' if all_passed else 'FAILED'} ===")
    print(f"Report written to {report_path}")

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
