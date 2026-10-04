-- SOMOS AGENDA — SOMOS CORE FOUNDATION v0.1
-- Supabase / PostgreSQL
begin;

create extension if not exists pgcrypto;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'business_member_role') then
    create type public.business_member_role as enum ('owner','admin','staff','viewer');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  locale text not null default 'es-CL',
  timezone text not null default 'America/Santiago',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  legal_name text,
  tax_id text,
  email text,
  phone text,
  description text,
  logo_url text,
  website_url text,
  country_code text not null default 'CL',
  currency_code text not null default 'CLP',
  timezone text not null default 'America/Santiago',
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint businesses_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table if not exists public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.business_member_role not null default 'staff',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_members_unique_member unique (business_id, user_id)
);

create index if not exists idx_business_members_user on public.business_members(user_id);
create index if not exists idx_business_members_business on public.business_members(business_id);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_business_created on public.audit_logs(business_id, created_at desc);
create index if not exists idx_audit_logs_actor_created on public.audit_logs(actor_user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists businesses_set_updated_at on public.businesses;
create trigger businesses_set_updated_at before update on public.businesses
for each row execute function public.set_updated_at();

drop trigger if exists business_members_set_updated_at on public.business_members;
create trigger business_members_set_updated_at before update on public.business_members
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_business_member(p_business_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.business_members
    where business_id = p_business_id and user_id = auth.uid() and active = true
  );
$$;

create or replace function public.is_business_admin(p_business_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.business_members
    where business_id = p_business_id and user_id = auth.uid()
      and active = true and role in ('owner','admin')
  );
$$;

create or replace function public.is_business_owner(p_business_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.business_members
    where business_id = p_business_id and user_id = auth.uid()
      and active = true and role = 'owner'
  );
$$;

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists businesses_select_member on public.businesses;
create policy businesses_select_member on public.businesses for select to authenticated
using (public.is_business_member(id));

drop policy if exists businesses_insert_creator on public.businesses;
create policy businesses_insert_creator on public.businesses for insert to authenticated
with check (created_by = auth.uid());

drop policy if exists businesses_update_admin on public.businesses;
create policy businesses_update_admin on public.businesses for update to authenticated
using (public.is_business_admin(id)) with check (public.is_business_admin(id));

drop policy if exists businesses_delete_owner on public.businesses;
create policy businesses_delete_owner on public.businesses for delete to authenticated
using (public.is_business_owner(id));

drop policy if exists members_select_same_business on public.business_members;
create policy members_select_same_business on public.business_members for select to authenticated
using (public.is_business_member(business_id));

drop policy if exists members_insert_admin on public.business_members;
create policy members_insert_admin on public.business_members for insert to authenticated
with check (public.is_business_admin(business_id));

drop policy if exists members_update_admin on public.business_members;
create policy members_update_admin on public.business_members for update to authenticated
using (public.is_business_admin(business_id)) with check (public.is_business_admin(business_id));

drop policy if exists members_delete_admin on public.business_members;
create policy members_delete_admin on public.business_members for delete to authenticated
using (public.is_business_admin(business_id));

drop policy if exists audit_select_member on public.audit_logs;
create policy audit_select_member on public.audit_logs for select to authenticated
using (business_id is not null and public.is_business_member(business_id));

drop policy if exists audit_insert_member on public.audit_logs;
create policy audit_insert_member on public.audit_logs for insert to authenticated
with check (actor_user_id = auth.uid() and
  (business_id is null or public.is_business_member(business_id)));

create or replace function public.create_business(
  p_name text, p_slug text, p_legal_name text default null,
  p_email text default null, p_phone text default null
)
returns public.businesses
language plpgsql security invoker set search_path = public as $$
declare v_business public.businesses;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if nullif(trim(p_name),'') is null then raise exception 'BUSINESS_NAME_REQUIRED'; end if;
  if nullif(trim(p_slug),'') is null then raise exception 'BUSINESS_SLUG_REQUIRED'; end if;

  insert into public.businesses(name,slug,legal_name,email,phone,created_by)
  values (trim(p_name),lower(trim(p_slug)),nullif(trim(p_legal_name),''),
          nullif(trim(p_email),''),nullif(trim(p_phone),''),auth.uid())
  returning * into v_business;

  insert into public.business_members(business_id,user_id,role)
  values (v_business.id,auth.uid(),'owner');

  insert into public.audit_logs(business_id,actor_user_id,action,entity_type,entity_id,metadata)
  values (v_business.id,auth.uid(),'business.created','business',v_business.id,
          jsonb_build_object('name',v_business.name));

  return v_business;
end;
$$;

grant execute on function public.create_business(text,text,text,text,text) to authenticated;

commit;
