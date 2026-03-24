-- =============================================================
-- 001_schema.sql — Radiance ERP — Complete schema
-- Apply in Supabase Dashboard → SQL Editor
-- =============================================================

-- 1. profiles (references auth.users, no owner_id needed)
create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  full_name             text,
  avatar_url            text,
  role                  text not null default 'user' check (role in ('admin', 'manager', 'user')),
  failed_login_attempts integer not null default 0,
  locked_until          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- 2. companies (CRM)
create table if not exists public.companies (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id),
  name           text not null,
  industry       text,
  website        text,
  address        text,
  search_vector  tsvector generated always as (
    to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(industry, ''))
  ) stored,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

-- 3. contacts (CRM)
create table if not exists public.contacts (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id),
  first_name     text,
  last_name      text,
  email          text,
  phone          text,
  company_id     uuid references public.companies(id),
  company_name   text,
  tags           text[],
  notes          text,
  search_vector  tsvector generated always as (
    to_tsvector('simple',
      coalesce(first_name, '') || ' ' ||
      coalesce(last_name, '') || ' ' ||
      coalesce(email, '') || ' ' ||
      coalesce(company_name, '')
    )
  ) stored,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

-- 4. pipeline_stages (CRM)
create table if not exists public.pipeline_stages (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id),
  name       text not null,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);

-- 5. deals (CRM)
create table if not exists public.deals (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id),
  title          text not null,
  value          numeric(15,2) not null default 0,
  stage_id       uuid references public.pipeline_stages(id),
  contact_id     uuid references public.contacts(id),
  company_id     uuid references public.companies(id),
  assigned_to    uuid references auth.users(id),
  closed_at      timestamptz,
  search_vector  tsvector generated always as (
    to_tsvector('simple', coalesce(title, ''))
  ) stored,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

-- 6. tasks (CRM)
create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id),
  title        text not null,
  description  text,
  due_date     timestamptz,
  completed    boolean not null default false,
  completed_at timestamptz,
  contact_id   uuid references public.contacts(id),
  deal_id      uuid references public.deals(id),
  assigned_to  uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

-- 7. notes (CRM)
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id),
  content     text not null,
  contact_id  uuid references public.contacts(id),
  company_id  uuid references public.companies(id),
  deal_id     uuid references public.deals(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

-- 8. invoices (Facturation)
create table if not exists public.invoices (
  id                       uuid primary key default gen_random_uuid(),
  owner_id                 uuid not null references auth.users(id),
  invoice_number           text not null unique,
  contact_id               uuid references public.contacts(id),
  company_id               uuid references public.companies(id),
  status                   text not null default 'draft'
                             check (status in ('draft','sent','paid','overdue','cancelled')),
  issue_date               date not null default current_date,
  due_date                 date,
  subtotal                 numeric(15,2) not null default 0,
  tax_rate                 numeric(5,2) not null default 0,
  tax_amount               numeric(15,2) not null default 0,
  total                    numeric(15,2) not null default 0,
  amount_paid              numeric(15,2) not null default 0,
  notes                    text,
  stripe_payment_intent_id text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  deleted_at               timestamptz
);

-- 9. invoice_items (child of invoices)
create table if not exists public.invoice_items (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity    numeric(10,2) not null default 1,
  unit_price  numeric(15,2) not null default 0,
  total       numeric(15,2) not null default 0
);

-- 10. quotes (Facturation)
create table if not exists public.quotes (
  id                      uuid primary key default gen_random_uuid(),
  owner_id                uuid not null references auth.users(id),
  quote_number            text not null unique,
  contact_id              uuid references public.contacts(id),
  status                  text not null default 'draft'
                            check (status in ('draft','sent','accepted','rejected')),
  valid_until             date,
  subtotal                numeric(15,2) not null default 0,
  tax_rate                numeric(5,2) not null default 0,
  total                   numeric(15,2) not null default 0,
  converted_to_invoice_id uuid references public.invoices(id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  deleted_at              timestamptz
);

-- 11. payments (Facturation)
create table if not exists public.payments (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id),
  invoice_id uuid not null references public.invoices(id),
  amount     numeric(15,2) not null,
  method     text check (method in ('stripe','bank_transfer','cash','check')),
  paid_at    timestamptz not null default now(),
  reference  text,
  created_at timestamptz not null default now()
);

-- 12. accounts (Comptabilité — self-referencing)
create table if not exists public.accounts (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id),
  code       text not null,
  name       text not null,
  type       text not null check (type in ('asset','liability','equity','income','expense')),
  parent_id  uuid references public.accounts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, code)
);

-- 13. journal_entries (Comptabilité)
create table if not exists public.journal_entries (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id),
  date        date not null default current_date,
  description text,
  invoice_id  uuid references public.invoices(id),
  payment_id  uuid references public.payments(id),
  created_at  timestamptz not null default now()
);

-- 14. journal_lines (child of journal_entries)
create table if not exists public.journal_lines (
  id               uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  account_id       uuid not null references public.accounts(id),
  debit            numeric(15,2) not null default 0,
  credit           numeric(15,2) not null default 0,
  description      text
);

-- 15. departments (RH)
create table if not exists public.departments (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id),
  name       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 16. employees (RH)
create table if not exists public.employees (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id),
  full_name     text not null,
  email         text,
  job_title     text,
  department_id uuid references public.departments(id),
  base_salary   numeric(15,2) not null default 0,
  start_date    date,
  status        text not null default 'active' check (status in ('active','inactive')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

-- 17. leave_requests (RH)
create table if not exists public.leave_requests (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id),
  employee_id uuid not null references public.employees(id),
  type        text check (type in ('annual','sick','unpaid','other')),
  start_date  date not null,
  end_date    date not null,
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  approved_by uuid references auth.users(id),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 18. payslips (RH)
create table if not exists public.payslips (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id),
  employee_id     uuid not null references public.employees(id),
  period_month    integer not null check (period_month between 1 and 12),
  period_year     integer not null,
  gross_salary    numeric(15,2) not null,
  cnas_deduction  numeric(15,2) not null default 0,
  irg_deduction   numeric(15,2) not null default 0,
  net_salary      numeric(15,2) not null,
  generated_at    timestamptz not null default now(),
  unique (employee_id, period_month, period_year)
);

-- 19. google_tokens (cross-cutting)
create table if not exists public.google_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users(id) on delete cascade,
  access_token  text not null,
  refresh_token text,
  expires_at    timestamptz,
  scopes        text[],
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 20. audit_logs (cross-cutting)
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id),
  action      text not null,
  resource    text not null,
  resource_id text,
  metadata    jsonb,
  ip_address  text,
  created_at  timestamptz not null default now()
);
