-- =============================================================
-- 003_functions.sql — SECURITY DEFINER functions & triggers
-- Apply AFTER 002_rls.sql
-- =============================================================

-- ─── 1. handle_new_user — auto-creates profile on signup ─────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
exception when others then
  -- Non-critique : log mais ne bloque pas le signup
  raise warning 'handle_new_user failed: %', sqlerrm;
  return new;
end;
$$;

-- Trigger sur auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── 2. record_failed_login — incrémente les tentatives ──────
-- Appelé avec la clé anon AVANT auth → contourne RLS via SECURITY DEFINER
create or replace function public.record_failed_login(user_email text)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = user_email;
  if found then
    update public.profiles
    set
      failed_login_attempts = failed_login_attempts + 1,
      locked_until = case
        when failed_login_attempts + 1 >= 5
        then now() + interval '15 minutes'
        else locked_until
      end
    where id = v_user_id;
  end if;
end;
$$;

-- ─── 3. check_login_allowed — vérifie si le compte est verrouillé ──
-- Retourne true si la connexion est autorisée, false si verrouillé
create or replace function public.check_login_allowed(user_email text)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
declare
  v_user_id     uuid;
  v_locked_until timestamptz;
begin
  select u.id, p.locked_until
  into v_user_id, v_locked_until
  from auth.users u
  join public.profiles p on p.id = u.id
  where u.email = user_email;

  if not found then
    return true; -- Email inconnu : autoriser (ne pas révéler l'existence)
  end if;

  if v_locked_until is not null and v_locked_until > now() then
    return false; -- Compte verrouillé
  end if;

  return true;
end;
$$;

-- ─── 4. reset_failed_login — réinitialise après connexion réussie ──
create or replace function public.reset_failed_login(user_email text)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = user_email;
  if found then
    update public.profiles
    set failed_login_attempts = 0, locked_until = null
    where id = v_user_id;
  end if;
end;
$$;
