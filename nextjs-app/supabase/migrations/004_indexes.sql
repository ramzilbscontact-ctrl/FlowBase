-- =============================================================
-- 004_indexes.sql — Performance indexes
-- Apply AFTER 003_functions.sql
-- =============================================================

-- ─── GIN full-text search indexes ────────────────────────────
create index if not exists contacts_search_idx  on public.contacts  using gin (search_vector);
create index if not exists companies_search_idx on public.companies using gin (search_vector);
create index if not exists deals_search_idx     on public.deals     using gin (search_vector);

-- ─── owner_id indexes (accélère l'évaluation des policies RLS) ──
create index if not exists contacts_owner_idx   on public.contacts   (owner_id);
create index if not exists deals_owner_idx      on public.deals      (owner_id);
create index if not exists invoices_owner_idx   on public.invoices   (owner_id);
create index if not exists employees_owner_idx  on public.employees  (owner_id);

-- ─── Partial indexes (filtre soft-delete) ────────────────────
create index if not exists contacts_active_idx  on public.contacts  (owner_id) where deleted_at is null;
create index if not exists deals_active_idx     on public.deals     (owner_id) where deleted_at is null;
create index if not exists invoices_active_idx  on public.invoices  (owner_id) where deleted_at is null;

-- ─── FK indexes (performance des jointures) ──────────────────
create index if not exists contacts_company_id_idx      on public.contacts       (company_id);
create index if not exists deals_stage_id_idx           on public.deals          (stage_id);
create index if not exists deals_contact_id_idx         on public.deals          (contact_id);
create index if not exists invoice_items_invoice_id_idx on public.invoice_items  (invoice_id);
create index if not exists journal_lines_entry_id_idx   on public.journal_lines  (journal_entry_id);
create index if not exists employees_dept_idx           on public.employees      (department_id);

-- ─── audit_logs time-series ──────────────────────────────────
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_user_id_idx    on public.audit_logs (user_id);
