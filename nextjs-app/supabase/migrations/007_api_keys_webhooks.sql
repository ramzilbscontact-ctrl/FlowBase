-- =============================================================
-- 007_api_keys_webhooks.sql — Public API infrastructure
-- API key management + webhook dispatch tables
-- =============================================================

-- 1. api_keys — bearer token auth for public REST API
create table if not exists public.api_keys (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  key_hash    text not null,               -- SHA-256 hash of the full key
  key_prefix  text not null,               -- first 8 chars for display (e.g. "fb_live_a1b2c3d4")
  permissions jsonb not null default '{"contacts":"rw","deals":"rw","invoices":"rw","tasks":"rw"}'::jsonb,
  created_at  timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at  timestamptz
);

create index idx_api_keys_key_hash on public.api_keys(key_hash);
create index idx_api_keys_user_id on public.api_keys(user_id);

-- 2. webhooks — outbound event delivery
create table if not exists public.webhooks (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  url              text not null,
  events           text[] not null default '{}',    -- e.g. {'contact.created', 'deal.updated'}
  secret           text not null,                    -- HMAC-SHA256 signing secret
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  last_triggered_at timestamptz,
  failure_count    integer not null default 0
);

create index idx_webhooks_user_id on public.webhooks(user_id);
create index idx_webhooks_active on public.webhooks(active) where active = true;

-- RLS policies
alter table public.api_keys enable row level security;
alter table public.webhooks enable row level security;

create policy "Users can manage their own API keys"
  on public.api_keys for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can manage their own webhooks"
  on public.webhooks for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
