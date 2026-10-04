-- AGENDA YA · PUBLIC PLATFORM V0.1
-- Perfil público + categorías + explorer inicial.
-- Migración aditiva. No elimina ni modifica tablas existentes.

begin;

create table if not exists public.business_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.business_public_profiles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  display_name text,
  description text,
  category_id uuid references public.business_categories(id) on delete set null,
  address text,
  comuna text,
  city text,
  phone text,
  whatsapp text,
  public_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_business_categories_active
  on public.business_categories(active);

create index if not exists idx_public_profiles_business_id
  on public.business_public_profiles(business_id);

create index if not exists idx_public_profiles_category_id
  on public.business_public_profiles(category_id);

create index if not exists idx_public_profiles_city
  on public.business_public_profiles(city);

create or replace function public.set_public_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_business_public_profiles_updated_at
on public.business_public_profiles;

create trigger trg_business_public_profiles_updated_at
before update on public.business_public_profiles
for each row execute function public.set_public_profile_updated_at();

alter table public.business_categories enable row level security;
alter table public.business_public_profiles enable row level security;

drop policy if exists public_categories_select on public.business_categories;
create policy public_categories_select
on public.business_categories
for select
to anon, authenticated
using (active = true);

drop policy if exists public_profile_select_member on public.business_public_profiles;
create policy public_profile_select_member
on public.business_public_profiles
for select
to authenticated
using (is_business_member(business_id));

drop policy if exists public_profile_insert_admin on public.business_public_profiles;
create policy public_profile_insert_admin
on public.business_public_profiles
for insert
to authenticated
with check (
  is_business_admin(business_id)
);

drop policy if exists public_profile_update_admin on public.business_public_profiles;
create policy public_profile_update_admin
on public.business_public_profiles
for update
to authenticated
using (is_business_admin(business_id))
with check (is_business_admin(business_id));

drop policy if exists public_profile_delete_admin on public.business_public_profiles;
create policy public_profile_delete_admin
on public.business_public_profiles
for delete
to authenticated
using (is_business_admin(business_id));

grant select on public.business_categories to anon, authenticated;
grant select, insert, update, delete on public.business_public_profiles to authenticated;

insert into public.business_categories (slug,name)
values
  ('barberia','Barbería'),
  ('peluqueria','Peluquería'),
  ('estetica','Estética'),
  ('salud','Salud'),
  ('bienestar','Bienestar'),
  ('entrenamiento','Entrenamiento'),
  ('educacion','Educación'),
  ('servicios-profesionales','Servicios profesionales'),
  ('hogar','Hogar'),
  ('automotriz','Automotriz'),
  ('mascotas','Mascotas'),
  ('otros','Otros')
on conflict (slug) do update
set name=excluded.name, active=true;

create or replace function public.upsert_public_profile(
  p_business_id uuid,
  p_display_name text default null,
  p_description text default null,
  p_category_id uuid default null,
  p_address text default null,
  p_comuna text default null,
  p_city text default null,
  p_phone text default null,
  p_whatsapp text default null,
  p_public_enabled boolean default false
)
returns public.business_public_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.business_public_profiles;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not is_business_admin(p_business_id) then
    raise exception 'BUSINESS_ADMIN_REQUIRED';
  end if;

  insert into public.business_public_profiles (
    business_id, display_name, description, category_id,
    address, comuna, city, phone, whatsapp, public_enabled
  )
  values (
    p_business_id,
    nullif(btrim(p_display_name), ''),
    nullif(btrim(p_description), ''),
    p_category_id,
    nullif(btrim(p_address), ''),
    nullif(btrim(p_comuna), ''),
    nullif(btrim(p_city), ''),
    nullif(btrim(p_phone), ''),
    nullif(btrim(p_whatsapp), ''),
    coalesce(p_public_enabled,false)
  )
  on conflict (business_id) do update
  set display_name=excluded.display_name,
      description=excluded.description,
      category_id=excluded.category_id,
      address=excluded.address,
      comuna=excluded.comuna,
      city=excluded.city,
      phone=excluded.phone,
      whatsapp=excluded.whatsapp,
      public_enabled=excluded.public_enabled
  returning * into v_profile;

  return v_profile;
end;
$$;

create or replace function public.get_public_business_profile(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses;
  v_profile public.business_public_profiles;
  v_category public.business_categories;
begin
  select *
    into v_business
  from public.businesses
  where slug = lower(btrim(p_slug))
    and active = true
  limit 1;

  if not found then
    raise exception 'BUSINESS_NOT_FOUND';
  end if;

  select *
    into v_profile
  from public.business_public_profiles
  where business_id = v_business.id
    and public_enabled = true
  limit 1;

  if not found then
    raise exception 'PUBLIC_PROFILE_NOT_PUBLISHED';
  end if;

  select *
    into v_category
  from public.business_categories
  where id = v_profile.category_id
    and active = true
  limit 1;

  return jsonb_build_object(
    'business', jsonb_build_object(
      'id', v_business.id,
      'name', coalesce(v_profile.display_name, v_business.name),
      'slug', v_business.slug,
      'email', v_business.email,
      'phone', coalesce(v_profile.phone, v_business.phone)
    ),
    'profile', jsonb_build_object(
      'description', v_profile.description,
      'address', v_profile.address,
      'comuna', v_profile.comuna,
      'city', v_profile.city,
      'phone', v_profile.phone,
      'whatsapp', v_profile.whatsapp,
      'public_enabled', v_profile.public_enabled
    ),
    'category', case when v_category.id is null then null
      else jsonb_build_object('id',v_category.id,'slug',v_category.slug,'name',v_category.name) end,
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',s.id,'name',s.name,'description',s.description,
        'duration_minutes',s.duration_minutes,'price',s.price
      ) order by s.name)
      from public.services s
      where s.business_id=v_business.id and s.active=true
    ), '[]'::jsonb),
    'professionals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,'first_name',p.first_name,'last_name',p.last_name,'bio',p.bio
      ) order by p.first_name,p.last_name)
      from public.professionals p
      where p.business_id=v_business.id and p.active=true
    ), '[]'::jsonb),
    'schedules', coalesce((
      select jsonb_agg(jsonb_build_object(
        'professional_id',ps.professional_id,
        'day_of_week',ps.day_of_week,
        'start_time',ps.start_time,
        'end_time',ps.end_time
      ) order by ps.day_of_week,ps.start_time)
      from public.professional_schedules ps
      where ps.business_id=v_business.id and ps.active=true
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.search_public_businesses(
  p_query text default null,
  p_category_slug text default null,
  p_city text default null,
  p_limit integer default 24,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit,24),1),50);
  v_offset integer := greatest(coalesce(p_offset,0),0);
  v_rows jsonb;
  v_total integer;
begin
  select count(*)
    into v_total
  from public.businesses b
  join public.business_public_profiles pp on pp.business_id=b.id
  left join public.business_categories c on c.id=pp.category_id
  where b.active=true
    and pp.public_enabled=true
    and (
      nullif(btrim(p_query),'') is null
      or lower(coalesce(pp.display_name,b.name)) like '%'||lower(btrim(p_query))||'%'
      or lower(coalesce(pp.description,'')) like '%'||lower(btrim(p_query))||'%'
      or lower(coalesce(c.name,'')) like '%'||lower(btrim(p_query))||'%'
    )
    and (
      nullif(btrim(p_category_slug),'') is null
      or c.slug=lower(btrim(p_category_slug))
    )
    and (
      nullif(btrim(p_city),'') is null
      or lower(coalesce(pp.city,''))=lower(btrim(p_city))
      or lower(coalesce(pp.comuna,''))=lower(btrim(p_city))
    );

  select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
    into v_rows
  from (
    select
      b.id,
      b.slug,
      coalesce(pp.display_name,b.name) as name,
      pp.description,
      pp.comuna,
      pp.city,
      pp.whatsapp,
      c.slug as category_slug,
      c.name as category_name,
      (select count(*) from public.services s where s.business_id=b.id and s.active=true) as service_count,
      (select count(*) from public.professionals p where p.business_id=b.id and p.active=true) as professional_count
    from public.businesses b
    join public.business_public_profiles pp on pp.business_id=b.id
    left join public.business_categories c on c.id=pp.category_id
    where b.active=true
      and pp.public_enabled=true
      and (
        nullif(btrim(p_query),'') is null
        or lower(coalesce(pp.display_name,b.name)) like '%'||lower(btrim(p_query))||'%'
        or lower(coalesce(pp.description,'')) like '%'||lower(btrim(p_query))||'%'
        or lower(coalesce(c.name,'')) like '%'||lower(btrim(p_query))||'%'
      )
      and (
        nullif(btrim(p_category_slug),'') is null
        or c.slug=lower(btrim(p_category_slug))
      )
      and (
        nullif(btrim(p_city),'') is null
        or lower(coalesce(pp.city,''))=lower(btrim(p_city))
        or lower(coalesce(pp.comuna,''))=lower(btrim(p_city))
      )
    order by name
    limit v_limit offset v_offset
  ) x;

  return jsonb_build_object('total',v_total,'items',v_rows);
end;
$$;

revoke all on function public.upsert_public_profile(uuid,text,text,uuid,text,text,text,text,text,boolean) from public;
revoke all on function public.get_public_business_profile(text) from public;
revoke all on function public.search_public_businesses(text,text,text,integer,integer) from public;

grant execute on function public.upsert_public_profile(uuid,text,text,uuid,text,text,text,text,text,boolean) to authenticated;
grant execute on function public.get_public_business_profile(text) to anon,authenticated;
grant execute on function public.search_public_businesses(text,text,text,integer,integer) to anon,authenticated;

commit;

select table_name
from information_schema.tables
where table_schema='public'
and table_name in ('business_categories','business_public_profiles')
order by table_name;
