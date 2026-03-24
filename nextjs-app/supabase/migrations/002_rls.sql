-- =============================================================
-- 002_rls.sql — Row Level Security policies
-- Apply AFTER 001_schema.sql
-- =============================================================

-- ─── Enable RLS on ALL tables ────────────────────────────────
alter table public.profiles        enable row level security;
alter table public.companies       enable row level security;
alter table public.contacts        enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.deals           enable row level security;
alter table public.tasks           enable row level security;
alter table public.notes           enable row level security;
alter table public.invoices        enable row level security;
alter table public.invoice_items   enable row level security;
alter table public.quotes          enable row level security;
alter table public.payments        enable row level security;
alter table public.accounts        enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines   enable row level security;
alter table public.departments     enable row level security;
alter table public.employees       enable row level security;
alter table public.leave_requests  enable row level security;
alter table public.payslips        enable row level security;
alter table public.google_tokens   enable row level security;
alter table public.audit_logs      enable row level security;

-- ─── profiles ────────────────────────────────────────────────
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  );

create policy "profiles_update" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ─── companies ───────────────────────────────────────────────
create policy "companies_select" on public.companies
  for select to authenticated
  using (
    deleted_at is null
    and (
      owner_id = (select auth.uid())
      or (select role from public.profiles where id = (select auth.uid())) = 'admin'
    )
  );

create policy "companies_insert" on public.companies
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "companies_update" on public.companies
  for update to authenticated
  using (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  )
  with check (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  );

-- ─── contacts ────────────────────────────────────────────────
create policy "contacts_select" on public.contacts
  for select to authenticated
  using (
    deleted_at is null
    and (
      owner_id = (select auth.uid())
      or (select role from public.profiles where id = (select auth.uid())) = 'admin'
    )
  );

create policy "contacts_insert" on public.contacts
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "contacts_update" on public.contacts
  for update to authenticated
  using (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  )
  with check (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  );

-- ─── pipeline_stages ─────────────────────────────────────────
create policy "pipeline_stages_select" on public.pipeline_stages
  for select to authenticated
  using (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  );

create policy "pipeline_stages_insert" on public.pipeline_stages
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "pipeline_stages_update" on public.pipeline_stages
  for update to authenticated
  using (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  )
  with check (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  );

-- ─── deals ───────────────────────────────────────────────────
create policy "deals_select" on public.deals
  for select to authenticated
  using (
    deleted_at is null
    and (
      owner_id = (select auth.uid())
      or (select role from public.profiles where id = (select auth.uid())) = 'admin'
    )
  );

create policy "deals_insert" on public.deals
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "deals_update" on public.deals
  for update to authenticated
  using (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  )
  with check (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  );

-- ─── tasks ───────────────────────────────────────────────────
create policy "tasks_select" on public.tasks
  for select to authenticated
  using (
    deleted_at is null
    and (
      owner_id = (select auth.uid())
      or (select role from public.profiles where id = (select auth.uid())) = 'admin'
    )
  );

create policy "tasks_insert" on public.tasks
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "tasks_update" on public.tasks
  for update to authenticated
  using (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  )
  with check (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  );

-- ─── notes ───────────────────────────────────────────────────
create policy "notes_select" on public.notes
  for select to authenticated
  using (
    deleted_at is null
    and (
      owner_id = (select auth.uid())
      or (select role from public.profiles where id = (select auth.uid())) = 'admin'
    )
  );

create policy "notes_insert" on public.notes
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "notes_update" on public.notes
  for update to authenticated
  using (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  )
  with check (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  );

-- ─── invoices ────────────────────────────────────────────────
create policy "invoices_select" on public.invoices
  for select to authenticated
  using (
    deleted_at is null
    and (
      owner_id = (select auth.uid())
      or (select role from public.profiles where id = (select auth.uid())) = 'admin'
    )
  );

create policy "invoices_insert" on public.invoices
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "invoices_update" on public.invoices
  for update to authenticated
  using (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  )
  with check (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  );

-- ─── invoice_items (hérite du parent) ────────────────────────
create policy "invoice_items_select" on public.invoice_items
  for select to authenticated
  using (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_items.invoice_id
        and (
          invoices.owner_id = (select auth.uid())
          or (select role from public.profiles where id = (select auth.uid())) = 'admin'
        )
    )
  );

create policy "invoice_items_insert" on public.invoice_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_items.invoice_id
        and invoices.owner_id = (select auth.uid())
    )
  );

create policy "invoice_items_update" on public.invoice_items
  for update to authenticated
  using (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_items.invoice_id
        and (
          invoices.owner_id = (select auth.uid())
          or (select role from public.profiles where id = (select auth.uid())) = 'admin'
        )
    )
  );

-- ─── quotes ──────────────────────────────────────────────────
create policy "quotes_select" on public.quotes
  for select to authenticated
  using (
    deleted_at is null
    and (
      owner_id = (select auth.uid())
      or (select role from public.profiles where id = (select auth.uid())) = 'admin'
    )
  );

create policy "quotes_insert" on public.quotes
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "quotes_update" on public.quotes
  for update to authenticated
  using (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  )
  with check (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  );

-- ─── payments ────────────────────────────────────────────────
create policy "payments_select" on public.payments
  for select to authenticated
  using (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  );

create policy "payments_insert" on public.payments
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

-- ─── accounts ────────────────────────────────────────────────
create policy "accounts_select" on public.accounts
  for select to authenticated
  using (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  );

create policy "accounts_insert" on public.accounts
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "accounts_update" on public.accounts
  for update to authenticated
  using (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  )
  with check (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  );

-- ─── journal_entries ─────────────────────────────────────────
create policy "journal_entries_select" on public.journal_entries
  for select to authenticated
  using (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  );

create policy "journal_entries_insert" on public.journal_entries
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

-- ─── journal_lines (hérite du parent) ────────────────────────
create policy "journal_lines_select" on public.journal_lines
  for select to authenticated
  using (
    exists (
      select 1 from public.journal_entries
      where journal_entries.id = journal_lines.journal_entry_id
        and (
          journal_entries.owner_id = (select auth.uid())
          or (select role from public.profiles where id = (select auth.uid())) = 'admin'
        )
    )
  );

create policy "journal_lines_insert" on public.journal_lines
  for insert to authenticated
  with check (
    exists (
      select 1 from public.journal_entries
      where journal_entries.id = journal_lines.journal_entry_id
        and journal_entries.owner_id = (select auth.uid())
    )
  );

-- ─── departments ─────────────────────────────────────────────
create policy "departments_select" on public.departments
  for select to authenticated
  using (
    deleted_at is null
    and (
      owner_id = (select auth.uid())
      or (select role from public.profiles where id = (select auth.uid())) = 'admin'
    )
  );

create policy "departments_insert" on public.departments
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "departments_update" on public.departments
  for update to authenticated
  using (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  )
  with check (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  );

-- ─── employees ───────────────────────────────────────────────
create policy "employees_select" on public.employees
  for select to authenticated
  using (
    deleted_at is null
    and (
      owner_id = (select auth.uid())
      or (select role from public.profiles where id = (select auth.uid())) = 'admin'
    )
  );

create policy "employees_insert" on public.employees
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "employees_update" on public.employees
  for update to authenticated
  using (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  )
  with check (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  );

-- ─── leave_requests ──────────────────────────────────────────
create policy "leave_requests_select" on public.leave_requests
  for select to authenticated
  using (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  );

create policy "leave_requests_insert" on public.leave_requests
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "leave_requests_update" on public.leave_requests
  for update to authenticated
  using (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  )
  with check (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  );

-- ─── payslips ────────────────────────────────────────────────
create policy "payslips_select" on public.payslips
  for select to authenticated
  using (
    owner_id = (select auth.uid())
    or (select role from public.profiles where id = (select auth.uid())) = 'admin'
  );

create policy "payslips_insert" on public.payslips
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

-- ─── google_tokens ───────────────────────────────────────────
create policy "google_tokens_select" on public.google_tokens
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "google_tokens_insert" on public.google_tokens
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "google_tokens_update" on public.google_tokens
  for update to authenticated
  using (user_id = (select auth.uid()));

-- ─── audit_logs (lecture admin seulement, insert via service role) ──
create policy "audit_logs_select" on public.audit_logs
  for select to authenticated
  using (
    (select role from public.profiles where id = (select auth.uid())) = 'admin'
  );
