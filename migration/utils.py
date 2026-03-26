"""
utils.py — Radiance ERP migration utilities.

Provides UUID5 deterministic ID conversion, FK resolution, type coercions,
and bcrypt hash normalization for the MongoDB → Supabase ETL pipeline.

CRITICAL: RADIANCE_NAMESPACE must never change after first run.
Changing it invalidates all previously generated UUIDs and breaks idempotency.
"""
import uuid
import json
from datetime import datetime, timezone

# Fixed namespace — NEVER change after first run.
# Using the DNS namespace UUID as a stable base, then deriving a project-specific UUID5.
# The value below is the standard DNS namespace from RFC 4122.
RADIANCE_NAMESPACE = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")


def oid_to_uuid(oid) -> str:
    """Convert MongoDB ObjectId or string to a deterministic UUID5.

    Uses a fixed project namespace so the same ObjectId always produces
    the same UUID across runs (idempotent migration).
    """
    return str(uuid.uuid5(RADIANCE_NAMESPACE, str(oid)))


def build_id_map(docs: list) -> dict:
    """Return {objectid_str: uuid_str} for every document in a collection.

    Used to build the global lookup table before any transforms run.
    Every FK reference in transform functions must go through resolve_fk()
    which uses this map.
    """
    return {str(doc["_id"]): oid_to_uuid(str(doc["_id"])) for doc in docs}


def escape(val) -> str:
    """Escape a Python value for safe inclusion in a SQL literal.

    Rules:
    - None          -> NULL
    - bool          -> TRUE / FALSE (must check before int, since bool is subclass of int)
    - int / float   -> numeric literal (no quotes)
    - list          -> PostgreSQL ARRAY['a','b',...] literal
    - dict          -> 'json'::jsonb literal
    - str           -> 'escaped_string' with single-quote doubling,
                       backslash escaping, and newline collapsing
    """
    if val is None:
        return "NULL"
    if isinstance(val, bool):
        return "TRUE" if val else "FALSE"
    if isinstance(val, (int, float)):
        return str(val)
    if isinstance(val, list):
        # PostgreSQL array literal: ARRAY['a','b']
        escaped_items = []
        for v in val:
            item = str(v).replace("\\", "\\\\").replace("\n", " ").replace("'", "''")
            escaped_items.append(f"'{item}'")
        return f"ARRAY[{', '.join(escaped_items)}]"
    if isinstance(val, dict):
        s = json.dumps(val, default=str)
        s = s.replace("\\", "\\\\").replace("\n", " ").replace("'", "''")
        return f"'{s}'::jsonb"
    # String path: backslash first, then collapse newlines, then double single-quotes
    s = str(val)
    s = s.replace("\\", "\\\\")
    s = s.replace("\n", " ")
    s = s.replace("'", "''")
    return f"'{s}'"


def to_ts(val) -> str | None:
    """Convert MongoDB datetime or ISO string to a PostgreSQL timestamptz string.

    Returns None if val is None or unrecognized — callers must handle NULL.
    """
    if val is None:
        return None
    if isinstance(val, datetime):
        if val.tzinfo is None:
            val = val.replace(tzinfo=timezone.utc)
        return val.isoformat()
    if isinstance(val, str):
        return val  # psycopg2 and PostgreSQL parse ISO strings
    return None


def to_date(val) -> str | None:
    """Convert MongoDB datetime or ISO string to a PostgreSQL date string (YYYY-MM-DD).

    Returns None if val is None or unrecognized.
    """
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.date().isoformat()
    if isinstance(val, str):
        return val[:10]  # slice YYYY-MM-DD from ISO string
    return None


def normalize_bcrypt_prefix(hash_str: str) -> str:
    """Normalize $2y$ bcrypt prefix to $2b$ for Go's crypto/bcrypt compatibility.

    GoTrue (Supabase auth engine, written in Go) only handles $2a$ and $2b$ prefixes.
    Python's bcrypt library generates $2b$ by default, so this is usually a no-op.
    However, if any passwords were ever set by a PHP or other system using $2y$,
    this normalization is required for successful login after migration.
    """
    if hash_str and hash_str.startswith("$2y$"):
        return "$2b$" + hash_str[4:]
    return hash_str


def resolve_fk(id_map: dict, oid) -> str | None:
    """Resolve a MongoDB ObjectId (or string) FK reference to a UUID string.

    Returns None if oid is None or not found in the map.
    FK columns that allow NULL in Supabase (references ... on delete set null, or
    nullable columns) will receive NULL safely. Non-nullable FK columns should
    be validated before loading.
    """
    if oid is None:
        return None
    return id_map.get(str(oid))
