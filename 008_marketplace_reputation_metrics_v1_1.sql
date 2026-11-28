-- AGENDA YA · MÉTRICAS DE REPUTACIÓN DEL MARKETPLACE
-- Agrega el total de reservas completadas a la búsqueda pública.
-- La valoración se muestra únicamente cuando la consulta existente entrega datos reales.

begin;

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
      (select count(*) from public.bookings bk where bk.business_id=b.id and bk.status='completed') as completed_service_count,
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

revoke all on function public.search_public_businesses(text,text,text,integer,integer) from public;
grant execute on function public.search_public_businesses(text,text,text,integer,integer) to anon,authenticated;

commit;
