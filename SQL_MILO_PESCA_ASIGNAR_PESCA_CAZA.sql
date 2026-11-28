-- Agenda YA · Asignar categoría Pesca y Caza a Milo Pesca
-- Ejecutar después de 009_pesca_caza_artesania_tejido_category_images.sql.
-- Conserva el estado public_enabled si el perfil ya existe.

begin;

with category as (
  select id from public.business_categories
  where slug = 'pesca-caza' and active = true
  limit 1
),
milo as (
  select b.id, b.name
  from public.businesses b
  where lower(coalesce(b.name,'')) like '%milo pesca%'
     or lower(coalesce(b.slug,'')) like '%milo-pesca%'
  order by case when lower(coalesce(b.name,'')) = 'milo pesca' then 0 else 1 end
  limit 1
)
insert into public.business_public_profiles
  (business_id, display_name, category_id, cover_url, public_enabled)
select
  milo.id,
  milo.name,
  category.id,
  'assets/category-covers/pesca-caza-01.svg',
  false
from milo cross join category
on conflict (business_id) do update
set category_id = excluded.category_id,
    cover_url = excluded.cover_url,
    display_name = coalesce(public.business_public_profiles.display_name, excluded.display_name);

commit;

-- Verificación:
select b.name, c.name as category, pp.cover_url, pp.public_enabled
from public.businesses b
join public.business_public_profiles pp on pp.business_id=b.id
join public.business_categories c on c.id=pp.category_id
where lower(b.name) like '%milo pesca%' or lower(b.slug) like '%milo-pesca%';
