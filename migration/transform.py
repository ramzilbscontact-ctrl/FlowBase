"""
transform.py — Radiance ERP MongoDB → Supabase row transformers.

One function per Supabase table (19 total — auth.users is handled separately
by load_users.py via the Supabase Admin API in plan 04-02).

Every function signature: transform_X(doc: dict, id_map: dict) -> dict

Rules enforced here:
- search_vector is NEVER included in any output dict (it is a PostgreSQL
  generated column; including it in an INSERT raises an error).
- All FK fields go through resolve_fk() from utils.py.
- All datetime fields go through to_ts() or to_date() from utils.py.
- Missing optional fields default to None (becomes NULL in SQL).
"""
from migration.utils import oid_to_uuid, resolve_fk, to_ts, to_date, normalize_bcrypt_prefix


# ---------------------------------------------------------------------------
# 1. profiles (maps from users collection — auth.users row created separately)
# ---------------------------------------------------------------------------

def transform_profile(doc: dict, id_map: dict) -> dict:
    """Produce a public.profiles row from a MongoDB users document.

    auth.users is created separately via the Supabase Admin API (plan 04-02).
    This function only produces the public.profiles companion row.
    """
    uid = id_map[str(doc["_id"])]
    first = doc.get("first_name", "") or ""
    last = doc.get("last_name", "") or ""
    full_name = f"{first} {last}".strip() or None
    return {
        "id": uid,
        "full_name": full_name,
        "avatar_url": doc.get("avatar_url"),
        "role": doc.get("role", "user"),
        "failed_login_attempts": doc.get("failed_login_attempts", 0),
        "locked_until": to_ts(doc.get("locked_until")),
        "created_at": to_ts(doc.get("created_at")),
        "updated_at": to_ts(doc.get("updated_at")),
        # search_vector: EXCLUDED — generated column
    }


# ---------------------------------------------------------------------------
# 2. companies
# ---------------------------------------------------------------------------

def transform_company(doc: dict, id_map: dict) -> dict:
    return {
        "id": id_map[str(doc["_id"])],
        "owner_id": resolve_fk(id_map, doc.get("owner_id") or doc.get("created_by")),
        "name": doc.get("name", ""),
        "industry": doc.get("industry"),
        "website": doc.get("website"),
        "address": doc.get("address"),
        # search_vector: EXCLUDED — generated column
        "created_at": to_ts(doc.get("created_at")),
        "updated_at": to_ts(doc.get("updated_at")),
        "deleted_at": to_ts(doc.get("deleted_at")),
    }


# ---------------------------------------------------------------------------
# 3. contacts
# ---------------------------------------------------------------------------

def transform_contact(doc: dict, id_map: dict) -> dict:
    return {
        "id": id_map[str(doc["_id"])],
        "owner_id": resolve_fk(id_map, doc.get("owner_id") or doc.get("created_by")),
        "first_name": doc.get("first_name"),
        "last_name": doc.get("last_name"),
        "email": doc.get("email"),
        "phone": doc.get("phone"),
        "company_id": resolve_fk(id_map, doc.get("company_id")),
        "company_name": doc.get("company_name"),
        "tags": doc.get("tags") or [],
        "notes": doc.get("notes"),
        # search_vector: EXCLUDED — generated column
        "created_at": to_ts(doc.get("created_at")),
        "updated_at": to_ts(doc.get("updated_at")),
        "deleted_at": to_ts(doc.get("deleted_at")),
    }


# ---------------------------------------------------------------------------
# 4. pipeline_stages
# ---------------------------------------------------------------------------

def transform_pipeline_stage(doc: dict, id_map: dict) -> dict:
    return {
        "id": id_map[str(doc["_id"])],
        "owner_id": resolve_fk(id_map, doc.get("owner_id") or doc.get("created_by")),
        "name": doc.get("name", ""),
        "position": doc.get("position") if doc.get("position") is not None else doc.get("order", 0),
        "created_at": to_ts(doc.get("created_at")),
    }


# ---------------------------------------------------------------------------
# 5. deals
# ---------------------------------------------------------------------------

def transform_deal(doc: dict, id_map: dict) -> dict:
    return {
        "id": id_map[str(doc["_id"])],
        "owner_id": resolve_fk(id_map, doc.get("owner_id") or doc.get("created_by")),
        "title": doc.get("title") or doc.get("name", ""),
        "value": doc.get("value", 0),
        "stage_id": resolve_fk(id_map, doc.get("stage_id") or doc.get("pipeline_stage")),
        "contact_id": resolve_fk(id_map, doc.get("contact_id")),
        "company_id": resolve_fk(id_map, doc.get("company_id")),
        "assigned_to": resolve_fk(id_map, doc.get("assigned_to")),
        "closed_at": to_ts(doc.get("closed_at")),
        # search_vector: EXCLUDED — generated column
        "created_at": to_ts(doc.get("created_at")),
        "updated_at": to_ts(doc.get("updated_at")),
        "deleted_at": to_ts(doc.get("deleted_at")),
    }


# ---------------------------------------------------------------------------
# 6. tasks
# ---------------------------------------------------------------------------

def transform_task(doc: dict, id_map: dict) -> dict:
    return {
        "id": id_map[str(doc["_id"])],
        "owner_id": resolve_fk(id_map, doc.get("owner_id") or doc.get("created_by")),
        "title": doc.get("title", ""),
        "description": doc.get("description"),
        "due_date": to_ts(doc.get("due_date")),
        "completed": doc.get("completed", False),
        "completed_at": to_ts(doc.get("completed_at")),
        "contact_id": resolve_fk(id_map, doc.get("contact_id")),
        "deal_id": resolve_fk(id_map, doc.get("deal_id")),
        "assigned_to": resolve_fk(id_map, doc.get("assigned_to")),
        "created_at": to_ts(doc.get("created_at")),
        "updated_at": to_ts(doc.get("updated_at")),
        "deleted_at": to_ts(doc.get("deleted_at")),
    }


# ---------------------------------------------------------------------------
# 7. notes
# ---------------------------------------------------------------------------

def transform_note(doc: dict, id_map: dict) -> dict:
    return {
        "id": id_map[str(doc["_id"])],
        "owner_id": resolve_fk(id_map, doc.get("owner_id") or doc.get("created_by")),
        "content": doc.get("content", ""),
        "contact_id": resolve_fk(id_map, doc.get("contact_id")),
        "company_id": resolve_fk(id_map, doc.get("company_id")),
        "deal_id": resolve_fk(id_map, doc.get("deal_id")),
        "created_at": to_ts(doc.get("created_at")),
        "updated_at": to_ts(doc.get("updated_at")),
        "deleted_at": to_ts(doc.get("deleted_at")),
    }


# ---------------------------------------------------------------------------
# 8. invoices
# ---------------------------------------------------------------------------

def transform_invoice(doc: dict, id_map: dict) -> dict:
    # invoice_number fallback: MongoDB field may be named 'number' or 'invoice_number'
    invoice_number = (
        doc.get("invoice_number")
        or doc.get("number")
        or str(doc["_id"])
    )
    # status must be one of: 'draft','sent','paid','overdue','cancelled'
    valid_invoice_statuses = {"draft", "sent", "paid", "overdue", "cancelled"}
    status = doc.get("status", "draft")
    if status not in valid_invoice_statuses:
        status = "draft"
    return {
        "id": id_map[str(doc["_id"])],
        "owner_id": resolve_fk(id_map, doc.get("owner_id") or doc.get("created_by")),
        "invoice_number": invoice_number,
        "contact_id": resolve_fk(id_map, doc.get("contact_id")),
        "company_id": resolve_fk(id_map, doc.get("company_id")),
        "status": status,
        "issue_date": to_date(doc.get("issue_date") or doc.get("created_at")),
        "due_date": to_date(doc.get("due_date")),
        "subtotal": doc.get("subtotal", 0),
        "tax_rate": doc.get("tax_rate", 0),
        "tax_amount": doc.get("tax_amount", 0),
        "total": doc.get("total", 0),
        "amount_paid": doc.get("amount_paid", 0),
        "notes": doc.get("notes"),
        "stripe_payment_intent_id": doc.get("stripe_payment_intent_id"),
        "created_at": to_ts(doc.get("created_at")),
        "updated_at": to_ts(doc.get("updated_at")),
        "deleted_at": to_ts(doc.get("deleted_at")),
    }


# ---------------------------------------------------------------------------
# 9. invoice_items (child of invoices)
# ---------------------------------------------------------------------------

def transform_invoice_item(doc: dict, id_map: dict) -> dict:
    return {
        "id": id_map[str(doc["_id"])],
        "invoice_id": resolve_fk(id_map, doc.get("invoice_id")),
        "description": doc.get("description", ""),
        "quantity": doc.get("quantity", 1),
        "unit_price": doc.get("unit_price", 0),
        "total": doc.get("total", 0),
    }


# ---------------------------------------------------------------------------
# 10. quotes
# ---------------------------------------------------------------------------

def transform_quote(doc: dict, id_map: dict) -> dict:
    # quote_number fallback: MongoDB field may be named 'number' or 'quote_number'
    quote_number = (
        doc.get("quote_number")
        or doc.get("number")
        or str(doc["_id"])
    )
    # status must be one of: 'draft','sent','accepted','rejected'
    valid_quote_statuses = {"draft", "sent", "accepted", "rejected"}
    status = doc.get("status", "draft")
    if status not in valid_quote_statuses:
        status = "draft"
    return {
        "id": id_map[str(doc["_id"])],
        "owner_id": resolve_fk(id_map, doc.get("owner_id") or doc.get("created_by")),
        "quote_number": quote_number,
        "contact_id": resolve_fk(id_map, doc.get("contact_id")),
        "status": status,
        "valid_until": to_date(doc.get("valid_until")),
        "subtotal": doc.get("subtotal", 0),
        "tax_rate": doc.get("tax_rate", 0),
        "total": doc.get("total", 0),
        "converted_to_invoice_id": resolve_fk(id_map, doc.get("converted_to_invoice_id")),
        "created_at": to_ts(doc.get("created_at")),
        "updated_at": to_ts(doc.get("updated_at")),
        "deleted_at": to_ts(doc.get("deleted_at")),
    }


# ---------------------------------------------------------------------------
# 11. payments
# ---------------------------------------------------------------------------

def transform_payment(doc: dict, id_map: dict) -> dict:
    # method must be one of: 'stripe','bank_transfer','cash','check' or NULL
    valid_methods = {"stripe", "bank_transfer", "cash", "check"}
    method = doc.get("method")
    if method not in valid_methods:
        method = None
    return {
        "id": id_map[str(doc["_id"])],
        "owner_id": resolve_fk(id_map, doc.get("owner_id") or doc.get("created_by")),
        "invoice_id": resolve_fk(id_map, doc.get("invoice_id")),
        "amount": doc.get("amount", 0),
        "method": method,
        "paid_at": to_ts(doc.get("paid_at") or doc.get("created_at")),
        "reference": doc.get("reference"),
        "created_at": to_ts(doc.get("created_at")),
    }


# ---------------------------------------------------------------------------
# 12. accounts (Comptabilite — self-referencing)
# NOTE: parent_id is set to None on first pass.
# migrate.py writes a second UPDATE pass to restore parent_id values.
# The _mongo_parent_id key is a staging field used by migrate.py only —
# it must NOT be included in the INSERT column list.
# ---------------------------------------------------------------------------

def transform_account(doc: dict, id_map: dict) -> dict:
    # type must be one of: 'asset','liability','equity','income','expense'
    valid_types = {"asset", "liability", "equity", "income", "expense"}
    account_type = doc.get("type", "asset")
    if account_type not in valid_types:
        account_type = "asset"
    return {
        "id": id_map[str(doc["_id"])],
        "owner_id": resolve_fk(id_map, doc.get("owner_id") or doc.get("created_by")),
        "code": doc.get("code", ""),
        "name": doc.get("name", ""),
        "type": account_type,
        # parent_id: NULL on first pass — second UPDATE restores the self-reference
        "parent_id": None,
        # _mongo_parent_id is a staging-only field used by migrate.py to write
        # 09b_accounts_parent_update.sql. Excluded from SQL INSERT column list.
        "_mongo_parent_id": str(doc["parent_id"]) if doc.get("parent_id") else None,
        "created_at": to_ts(doc.get("created_at")),
        "updated_at": to_ts(doc.get("updated_at")),
    }


# ---------------------------------------------------------------------------
# 13. journal_entries
# ---------------------------------------------------------------------------

def transform_journal_entry(doc: dict, id_map: dict) -> dict:
    return {
        "id": id_map[str(doc["_id"])],
        "owner_id": resolve_fk(id_map, doc.get("owner_id") or doc.get("created_by")),
        "date": to_date(doc.get("date") or doc.get("created_at")),
        "description": doc.get("description"),
        "invoice_id": resolve_fk(id_map, doc.get("invoice_id")),
        "payment_id": resolve_fk(id_map, doc.get("payment_id")),
        "created_at": to_ts(doc.get("created_at")),
    }


# ---------------------------------------------------------------------------
# 14. journal_lines (child of journal_entries)
# ---------------------------------------------------------------------------

def transform_journal_line(doc: dict, id_map: dict) -> dict:
    return {
        "id": id_map[str(doc["_id"])],
        "journal_entry_id": resolve_fk(id_map, doc.get("journal_entry_id")),
        "account_id": resolve_fk(id_map, doc.get("account_id")),
        "debit": doc.get("debit", 0),
        "credit": doc.get("credit", 0),
        "description": doc.get("description"),
    }


# ---------------------------------------------------------------------------
# 15. departments
# ---------------------------------------------------------------------------

def transform_department(doc: dict, id_map: dict) -> dict:
    return {
        "id": id_map[str(doc["_id"])],
        "owner_id": resolve_fk(id_map, doc.get("owner_id") or doc.get("created_by")),
        "name": doc.get("name", ""),
        "created_at": to_ts(doc.get("created_at")),
        "updated_at": to_ts(doc.get("updated_at")),
        "deleted_at": to_ts(doc.get("deleted_at")),
    }


# ---------------------------------------------------------------------------
# 16. employees
# ---------------------------------------------------------------------------

def transform_employee(doc: dict, id_map: dict) -> dict:
    # full_name: prefer explicit field, fall back to first+last concatenation
    first = doc.get("first_name", "") or ""
    last = doc.get("last_name", "") or ""
    full_name = (
        doc.get("full_name")
        or f"{first} {last}".strip()
        or "Unknown"
    )
    # status must be one of: 'active','inactive'
    valid_statuses = {"active", "inactive"}
    status = doc.get("status", "active")
    if status not in valid_statuses:
        status = "active"
    return {
        "id": id_map[str(doc["_id"])],
        "owner_id": resolve_fk(id_map, doc.get("owner_id") or doc.get("created_by")),
        "full_name": full_name,
        "email": doc.get("email"),
        "job_title": doc.get("job_title") or doc.get("position"),
        "department_id": resolve_fk(id_map, doc.get("department_id")),
        "base_salary": doc.get("base_salary", 0),
        "start_date": to_date(doc.get("start_date") or doc.get("hire_date")),
        "status": status,
        "created_at": to_ts(doc.get("created_at")),
        "updated_at": to_ts(doc.get("updated_at")),
        "deleted_at": to_ts(doc.get("deleted_at")),
    }


# ---------------------------------------------------------------------------
# 17. leave_requests
# ---------------------------------------------------------------------------

def transform_leave_request(doc: dict, id_map: dict) -> dict:
    # type must be one of: 'annual','sick','unpaid','other' or NULL
    valid_types = {"annual", "sick", "unpaid", "other"}
    leave_type = doc.get("type", "other")
    if leave_type not in valid_types:
        leave_type = "other"
    # status must be one of: 'pending','approved','rejected'
    valid_statuses = {"pending", "approved", "rejected"}
    status = doc.get("status", "pending")
    if status not in valid_statuses:
        status = "pending"
    return {
        "id": id_map[str(doc["_id"])],
        "owner_id": resolve_fk(id_map, doc.get("owner_id") or doc.get("created_by")),
        "employee_id": resolve_fk(id_map, doc.get("employee_id")),
        "type": leave_type,
        "start_date": to_date(doc.get("start_date")),
        "end_date": to_date(doc.get("end_date")),
        "status": status,
        "approved_by": resolve_fk(id_map, doc.get("approved_by")),
        "notes": doc.get("notes"),
        "created_at": to_ts(doc.get("created_at")),
        "updated_at": to_ts(doc.get("updated_at")),
    }


# ---------------------------------------------------------------------------
# 18. payslips
# ---------------------------------------------------------------------------

def transform_payslip(doc: dict, id_map: dict) -> dict:
    return {
        "id": id_map[str(doc["_id"])],
        "owner_id": resolve_fk(id_map, doc.get("owner_id") or doc.get("created_by")),
        "employee_id": resolve_fk(id_map, doc.get("employee_id")),
        "period_month": doc.get("period_month") or doc.get("month"),
        "period_year": doc.get("period_year") or doc.get("year"),
        "gross_salary": doc.get("gross_salary", 0),
        "cnas_deduction": doc.get("cnas_deduction", 0),
        "irg_deduction": doc.get("irg_deduction", 0),
        "net_salary": doc.get("net_salary", 0),
        "generated_at": to_ts(doc.get("generated_at") or doc.get("created_at")),
    }


# ---------------------------------------------------------------------------
# 19. google_tokens
# ---------------------------------------------------------------------------

def transform_google_token(doc: dict, id_map: dict) -> dict:
    return {
        "id": id_map[str(doc["_id"])],
        "user_id": resolve_fk(id_map, doc.get("user_id")),
        "access_token": doc.get("access_token", ""),
        "refresh_token": doc.get("refresh_token"),
        "expires_at": to_ts(doc.get("expires_at")),
        "scopes": doc.get("scopes") or [],
        "created_at": to_ts(doc.get("created_at")),
        "updated_at": to_ts(doc.get("updated_at")),
    }


# ---------------------------------------------------------------------------
# 20. audit_logs
# NOTE: MongoDB AuditLog schema differs significantly from Supabase audit_logs.
# MongoDB has: method, path, status_code, user_agent, request_body, duration_ms
# Supabase has: action, resource, resource_id, metadata, ip_address
# Best-effort mapping: action = "METHOD /path", resource = path,
# metadata = jsonb of all original fields.
# ---------------------------------------------------------------------------

def transform_audit_log(doc: dict, id_map: dict) -> dict:
    method = doc.get("method", "")
    path = doc.get("path", "")
    action = f"{method} {path}".strip() or doc.get("action", "UNKNOWN")
    resource = path or doc.get("resource", "UNKNOWN")
    metadata = {
        "status_code": doc.get("status_code"),
        "user_agent": doc.get("user_agent"),
        "request_body": doc.get("request_body"),
        "duration_ms": doc.get("duration_ms"),
        "user_email": doc.get("user_email"),
    }
    # user_id in MongoDB AuditLog is stored as a string (user_id = StringField),
    # not an ObjectId. Attempt to resolve; if not found in id_map, leave as NULL.
    user_id = doc.get("user_id")
    resolved_user_id = id_map.get(str(user_id)) if user_id else None
    return {
        "id": id_map[str(doc["_id"])],
        "user_id": resolved_user_id,
        "action": action,
        "resource": resource,
        "resource_id": doc.get("resource_id"),
        "metadata": metadata,
        "ip_address": doc.get("ip_address"),
        "created_at": to_ts(doc.get("timestamp") or doc.get("created_at")),
    }


# ---------------------------------------------------------------------------
# Deduplication helper for payslips
# ---------------------------------------------------------------------------

def deduplicate_payslips(rows: list) -> list:
    """Deduplicate payslip rows on (employee_id, period_month, period_year).

    Supabase has UNIQUE (employee_id, period_month, period_year) on the
    payslips table. MongoDB has no such constraint, so duplicates are possible.

    Strategy: keep the last occurrence per unique key (last write wins).
    This preserves the most recently generated payslip for each period.
    """
    seen = {}
    for row in rows:
        key = (row.get("employee_id"), row.get("period_month"), row.get("period_year"))
        seen[key] = row  # last write wins
    result = list(seen.values())
    original_count = len(rows)
    deduped_count = len(result)
    if original_count != deduped_count:
        print(f"  [DEDUP] payslips: {original_count} -> {deduped_count} rows "
              f"({original_count - deduped_count} duplicates removed)")
    return result
