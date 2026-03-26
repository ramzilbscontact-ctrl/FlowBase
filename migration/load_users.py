#!/usr/bin/env python3
"""
load_users.py — Import MongoDB users into Supabase Auth.

Run BEFORE any SQL files. This must complete first because auth.users is
referenced by every public.* table.

Full run order:
  1. pip install -r migration/requirements.txt
  2. cp migration/.env.migration.example migration/.env.migration
  3. # Edit migration/.env.migration — fill in MONGO_URI, SUPABASE_URL,
  #    SUPABASE_SERVICE_KEY, SUPABASE_DB_DSN
  4. python migration/migrate.py            # extracts + transforms -> writes SQL files
  5. python migration/load_users.py --test-one  # imports 1 user + verifies hash saved
  6. # Manually test login on Next.js app with the test user's original password
  7. python migration/load_users.py         # imports all users
  8. python migration/load_data.py          # loads all SQL files
  9. python migration/validate.py           # count parity + FK integrity

Usage:
  cd /path/to/project/   (project root)
  python migration/load_users.py [--test-one]

  --test-one  Import only the first user and verify login before bulk import.
              After --test-one, manually verify login on the Supabase project
              with the test user's original password before running full import.
"""

import os
import sys
import json
import time
import argparse
import psycopg2
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv("migration/.env.migration")

from migration.extract import extract_all, COLLECTIONS
from migration.utils import build_id_map, normalize_bcrypt_prefix, to_ts


def get_supabase_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in migration/.env.migration"
        )
    return create_client(url, key)


def import_user_via_api(supabase: Client, mongo_user: dict, new_uuid: str) -> str:
    """
    Import one user via Admin API. Returns the Supabase auth.users UUID.
    Raises RuntimeError if user creation fails.
    """
    raw_hash = mongo_user.get("password", "")
    password_hash = normalize_bcrypt_prefix(raw_hash)

    result = supabase.auth.admin.create_user({
        "id": new_uuid,
        "email": mongo_user["email"],
        "password_hash": password_hash,
        "email_confirm": True,      # all existing users are treated as verified
        "user_metadata": {
            "first_name": mongo_user.get("first_name", ""),
            "last_name": mongo_user.get("last_name", ""),
            "role": mongo_user.get("role", "user"),
        },
    })

    if result.user is None:
        raise RuntimeError(
            f"create_user returned None for {mongo_user['email']}: {result}"
        )
    return result.user.id


def verify_hash_saved(supabase: Client, uid: str, email: str) -> bool:
    """
    Verify the bcrypt hash was saved (checks for GitHub issue #1678).

    Uses a direct DB query because the Admin API get_user does not expose
    encrypted_password. Issue #1678 (supabase/auth, July 2024): password_hash
    parameter not always persisted by GoTrue — test with one user first.
    """
    dsn = os.environ.get("SUPABASE_DB_DSN") or os.environ.get("SUPABASE_DB_URL")
    if not dsn:
        raise RuntimeError(
            "SUPABASE_DB_DSN must be set in migration/.env.migration"
        )
    conn = psycopg2.connect(dsn)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT encrypted_password FROM auth.users WHERE id = %s", (uid,)
            )
            row = cur.fetchone()
            if not row or not row[0]:
                return False
            return True
    finally:
        conn.close()


def import_user_via_sql_fallback(conn, mongo_user: dict, new_uuid: str):
    """
    Fallback: direct SQL INSERT when Admin API does not save the hash.

    Includes all required GoTrue fields to avoid silent login failures.
    Reference: GitHub discussion #5248 (supabase/supabase) for required field list.

    Fields required by GoTrue's login handler:
      - instance_id: always the nil UUID for Supabase managed projects
      - aud: 'authenticated'
      - role: 'authenticated'
      - confirmation_token, recovery_token, email_change_token_new, email_change:
        must be empty string (not NULL) in some GoTrue versions
      - raw_app_meta_data: provider info required for email login routing
    """
    password_hash = normalize_bcrypt_prefix(mongo_user.get("password", ""))
    created_at = to_ts(mongo_user.get("created_at")) or datetime.now(timezone.utc).isoformat()
    updated_at = to_ts(mongo_user.get("updated_at")) or created_at

    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO auth.users (
                id, instance_id, aud, role, email,
                encrypted_password, email_confirmed_at,
                raw_app_meta_data, raw_user_meta_data,
                created_at, updated_at, last_sign_in_at,
                confirmation_token, recovery_token,
                email_change_token_new, email_change
            ) VALUES (
                %s,
                '00000000-0000-0000-0000-000000000000',
                'authenticated', 'authenticated', %s,
                %s, NOW(),
                '{"provider":"email","providers":["email"]}', '{}',
                %s, %s, %s,
                '', '', '', ''
            ) ON CONFLICT (id) DO NOTHING
        """, (
            new_uuid,
            mongo_user["email"],
            password_hash,
            created_at, updated_at, created_at,
        ))

        # auth.identities is required for email provider login.
        # provider_id for email provider = user's email address.
        cur.execute("""
            INSERT INTO auth.identities (
                id, user_id, identity_data, provider,
                last_sign_in_at, created_at, updated_at
            ) VALUES (
                %s, %s,
                jsonb_build_object('sub', %s::text, 'email', %s),
                'email',
                NOW(), %s, NOW()
            ) ON CONFLICT (id) DO NOTHING
        """, (
            new_uuid, new_uuid,
            new_uuid, mongo_user["email"],
            created_at,
        ))
    conn.commit()
    print(f"    [FALLBACK-SQL] {mongo_user['email']} inserted via direct SQL")


def import_users_with_backoff(supabase: Client, users: list, id_map: dict) -> dict:
    """
    Import all users into Supabase Auth. Returns {mongo_oid_str: supabase_uuid} map.

    Rate limiting: 100ms delay between calls (conservative 10 users/sec).
    Exponential backoff on HTTP 429 (rate limit exceeded).
    Idempotent: skips users that already exist in Supabase.
    Hash verification: after each API import, queries auth.users.encrypted_password
    directly to detect issue #1678. Falls back to direct SQL if hash is missing.
    """
    results = {}
    total = len(users)
    fallback_conn = None

    for i, user in enumerate(users):
        oid_str = str(user["_id"])
        new_uuid = id_map.get(oid_str)
        if not new_uuid:
            print(f"  [SKIP] No UUID mapping for user {oid_str} — skipping")
            continue
        email = user.get("email", f"unknown-{oid_str}@example.com")

        for attempt in range(3):
            try:
                import_user_via_api(supabase, user, new_uuid)
                time.sleep(0.1)  # 100ms — 10 users/sec, conservative rate limit

                # Verify hash was saved (issue #1678 guard)
                if not verify_hash_saved(supabase, new_uuid, email):
                    print(f"    [WARN] Hash not saved for {email} — using SQL fallback")
                    if fallback_conn is None:
                        dsn = os.environ.get("SUPABASE_DB_DSN") or os.environ.get("SUPABASE_DB_URL")
                        fallback_conn = psycopg2.connect(dsn)
                    # Delete the hash-less row first so fallback INSERT can proceed
                    supabase.auth.admin.delete_user(new_uuid)
                    import_user_via_sql_fallback(fallback_conn, user, new_uuid)

                results[oid_str] = new_uuid
                print(f"  [{i+1}/{total}] Imported {email}")
                break

            except Exception as e:
                err_str = str(e).lower()
                if "429" in str(e):
                    wait = 2 ** attempt
                    print(f"    [RATE LIMIT] Waiting {wait}s before retry...")
                    time.sleep(wait)
                elif "already registered" in err_str or "already exists" in err_str or "user already exists" in err_str:
                    # Idempotent: user already imported (safe to re-run)
                    results[oid_str] = new_uuid
                    print(f"  [{i+1}/{total}] SKIP {email} (already exists)")
                    break
                else:
                    print(f"  [ERROR] {email}: {e}")
                    raise
        else:
            print(f"  [FAILED] {email}: exceeded 3 attempts — aborting")
            raise RuntimeError(f"Failed to import user {email} after 3 attempts")

    if fallback_conn:
        fallback_conn.close()

    return results


def main():
    parser = argparse.ArgumentParser(
        description="Import MongoDB users into Supabase Auth with bcrypt hash preservation."
    )
    parser.add_argument(
        "--test-one",
        action="store_true",
        help="Import only the first user to verify hash saving before bulk import.",
    )
    args = parser.parse_args()

    print("=== load_users.py ===")
    print("Extracting users from MongoDB...")
    data = extract_all()
    users = data["users"]
    print(f"  Found {len(users)} users")

    # Build global id_map across all collections (mirrors what migrate.py does)
    id_map = {}
    for col in COLLECTIONS:
        id_map.update(build_id_map(data[col]))

    if args.test_one:
        users = users[:1]
        print(f"  --test-one: importing only 1 user for hash verification test")

    supabase = get_supabase_client()

    print(f"\nImporting {len(users)} user(s) into Supabase Auth...")
    user_id_map = import_users_with_backoff(supabase, users, id_map)

    output_path = "migration/user_id_map.json"
    with open(output_path, "w") as f:
        json.dump(user_id_map, f, indent=2)
    print(f"\n  user_id_map.json written ({len(user_id_map)} entries) -> {output_path}")

    if args.test_one:
        print("\n  --test-one complete.")
        print("  NEXT: manually verify login on the Supabase project with the test user's original password.")
        print("  If login succeeds, run: python migration/load_users.py (full import)")
    else:
        print(f"\n  All {len(user_id_map)} users imported.")
        print("  NEXT: run python migration/load_data.py")


if __name__ == "__main__":
    main()
