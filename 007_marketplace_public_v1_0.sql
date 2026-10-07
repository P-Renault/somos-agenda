-- AGENDA YA · MARKETPLACE PÚBLICO V1.0
-- Extiende únicamente la capa pública. No modifica autenticación ni reservas.

begin;

alter table public.business_public_profiles
  add column if not exists cover_url text;

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
  select * into v_business
  from public.businesses
  where slug = lower(btrim(p_slug)) and active = true
  limit 1;

  if not found then raise exception 'BUSINESS_NOT_FOUND'; end if;

  select * into v_profile
  from public.business_public_profiles
  where business_id = v_business.id and public_enabled = true
  limit 1;

  if not found then raise exception 'PUBLIC_PROFILE_NOT_PUBLISHED'; end if;

  select * into v_category
  from public.business_categories
  where id = v_profile.category_id and active = true
  limit 1;

  return jsonb_build_object(
    'business', jsonb_build_object(
      'id', v_business.id,
      'name', coalesce(v_profile.display_name, v_business.name),
      'slug', v_business.slug,
      'email', v_business.email,
      'phone', coalesce(v_profile.phone, v_business.phone),
      'logo_url', v_business.logo_url
    ),
    'profile', jsonb_build_object(
      'description', v_profile.description,
      'address', v_profile.address,
      'comuna', v_profile.comuna,
      'city', v_profile.city,
      'phone', v_profile.phone,
      'whatsapp', v_profile.whatsapp,
      'cover_url', v_profile.cover_url,
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
  select count(*) into v_total
  from public.businesses b
  join public.business_public_profiles pp on pp.business_id=b.id
  left join public.business_categories c on c.id=pp.category_id
  where b.active=true and pp.public_enabled=true
    and (nullif(btrim(p_query),'') is null
      or lower(coalesce(pp.display_name,b.name)) like '%'||lower(btrim(p_query))||'%'
      or lower(coalesce(pp.description,'')) like '%'||lower(btrim(p_query))||'%'
      or lower(coalesce(c.name,'')) like '%'||lower(btrim(p_query))||'%')
    and (nullif(btrim(p_category_slug),'') is null or c.slug=lower(btrim(p_category_slug)))
    and (nullif(btrim(p_city),'') is null
      or lower(coalesce(pp.city,''))=lower(btrim(p_city))
      or lower(coalesce(pp.comuna,''))=lower(btrim(p_city)));

  select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb) into v_rows
  from (
    select
      b.id,
      b.slug,
      coalesce(pp.display_name,b.name) as name,
      pp.description,
      pp.comuna,
      pp.city,
      pp.whatsapp,
      pp.cover_url,
      b.logo_url,
      c.slug as category_slug,
      c.name as category_name,
      (select count(*) from public.services s where s.business_id=b.id and s.active=true) as service_count,
      (select count(*) from public.professionals p where p.business_id=b.id and p.active=true) as professional_count,
      (select min(s.duration_minutes) from public.services s where s.business_id=b.id and s.active=true) as min_duration_minutes,
      (select min(s.price) from public.services s where s.business_id=b.id and s.active=true and s.price is not null) as min_price,
      null::numeric as rating,
      0::integer as review_count
    from public.businesses b
    join public.business_public_profiles pp on pp.business_id=b.id
    left join public.business_categories c on c.id=pp.category_id
    where b.active=true and pp.public_enabled=true
      and (nullif(btrim(p_query),'') is null
        or lower(coalesce(pp.display_name,b.name)) like '%'||lower(btrim(p_query))||'%'
        or lower(coalesce(pp.description,'')) like '%'||lower(btrim(p_query))||'%'
        or lower(coalesce(c.name,'')) like '%'||lower(btrim(p_query))||'%')
      and (nullif(btrim(p_category_slug),'') is null or c.slug=lower(btrim(p_category_slug)))
      and (nullif(btrim(p_city),'') is null
        or lower(coalesce(pp.city,''))=lower(btrim(p_city))
        or lower(coalesce(pp.comuna,''))=lower(btrim(p_city)))
    order by name
    limit v_limit offset v_offset
  ) x;

  return jsonb_build_object('total',v_total,'items',v_rows);
end;
$$;

revoke all on function public.get_public_business_profile(text) from public;
revoke all on function public.search_public_businesses(text,text,text,integer,integer) from public;
grant execute on function public.get_public_business_profile(text) to anon,authenticated;
grant execute on function public.search_public_businesses(text,text,text,integer,integer) to anon,authenticated;

commit;
