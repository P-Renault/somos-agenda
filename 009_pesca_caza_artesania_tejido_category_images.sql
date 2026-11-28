-- Agenda YA 6.0 · Categorías Pesca y Caza / Artesanía y Tejido + portadas
-- Compatible con el esquema de businesses (name, slug, description) y services
-- (name, description) de esta versión. Ejecutar una vez después de 004 y 007.

begin;

alter table public.business_public_profiles
  add column if not exists cover_url text;

insert into public.business_categories (slug, name, active)
values
  ('pesca-caza', 'Pesca y Caza', true),
  ('artesania-tejido', 'Artesanía y Tejido', true)
on conflict (slug) do update
set name = excluded.name,
    active = true;

-- Asignar una portada SVG estable a las dos categorías nuevas.
-- Las demás categorías siguen usando el fallback de imagen ya implementado
-- en explorer.js y public-profile.js.
create or replace function public.set_business_category_cover()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_slug text;
  v_index integer;
  v_needs_cover boolean := false;
begin
  if new.category_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    v_needs_cover := true;
  else
    v_needs_cover := old.category_id is distinct from new.category_id
      or nullif(btrim(new.cover_url), '') is null;
  end if;

  if not v_needs_cover then
    return new;
  end if;

  select slug into v_slug
  from public.business_categories
  where id = new.category_id and active = true
  limit 1;

  if v_slug not in ('pesca-caza','artesania-tejido') then
    return new;
  end if;

  v_index := 1 + (
    get_byte(
      decode(substr(md5(coalesce(new.business_id::text,'') || ':' || v_slug),1,2),'hex'),
      0
    ) % 8
  );

  new.cover_url := 'assets/category-covers/' || v_slug || '-' ||
                   lpad(v_index::text,2,'0') || '.svg';
  return new;
end;
$$;

drop trigger if exists trg_business_category_cover on public.business_public_profiles;
create trigger trg_business_category_cover
before insert or update
on public.business_public_profiles
for each row execute function public.set_business_category_cover();

-- Backfill de negocios existentes:
-- analiza nombre/descripcion del negocio, perfil público y servicios registrados.
-- Los perfiles nuevos se completan cuando el usuario selecciona su categoría;
-- el trigger les asigna la imagen de esa categoría automáticamente.
with service_terms as (
  select
    s.business_id,
    string_agg(coalesce(s.name,'') || ' ' || coalesce(s.description,''), ' ') as services_text
  from public.services s
  group by s.business_id
),
business_terms as (
  select
    b.id as business_id,
    b.name as display_name,
    lower(
      coalesce(b.name,'') || ' ' ||
      coalesce(b.description,'') || ' ' ||
      coalesce(pp.display_name,'') || ' ' ||
      coalesce(pp.description,'') || ' ' ||
      coalesce(st.services_text,'')
    ) as terms
  from public.businesses b
  left join public.business_public_profiles pp on pp.business_id = b.id
  left join service_terms st on st.business_id = b.id
),
matched_businesses as (
  select
    business_id,
    display_name,
    case
      when terms ~ '(pesca|pescad|caza|cazador|excursion|excursión|guia|guía|outdoor|pesca deportiva)'
        then 'pesca-caza'
      when terms ~ '(artesani|artesanía|tejid|crochet|bordad|manualidad|lana|telar)'
        then 'artesania-tejido'
      else null
    end as category_slug
  from business_terms
),
resolved as (
  select mb.business_id, mb.display_name, c.id as category_id
  from matched_businesses mb
  join public.business_categories c on c.slug = mb.category_slug
  where mb.category_slug is not null
)
insert into public.business_public_profiles
  (business_id, display_name, category_id, public_enabled)
select business_id, display_name, category_id, false
from resolved
on conflict (business_id) do update
set category_id = excluded.category_id,
    display_name = coalesce(public.business_public_profiles.display_name, excluded.display_name);

-- Reparar rutas de portada antiguas o incorrectas generadas para estas
-- categorías. Solo reemplaza rutas internas de category-covers; conserva
-- imágenes manuales externas o personalizadas.
update public.business_public_profiles pp
set cover_url = null
from public.business_categories c
where c.id = pp.category_id
  and c.slug in ('pesca-caza','artesania-tejido')
  and pp.cover_url like 'assets/category-covers/%'
  and pp.cover_url !~ '^assets/category-covers/(pesca-caza|artesania-tejido)-[0-9]{2}\\.svg$';

-- Completar portadas de perfiles existentes sin portada.
-- El trigger calcula la imagen; no modifica public_enabled.
update public.business_public_profiles pp
set cover_url = null
from public.business_categories c
where c.id = pp.category_id
  and c.slug in ('pesca-caza','artesania-tejido')
  and nullif(btrim(pp.cover_url),'') is null;

commit;
