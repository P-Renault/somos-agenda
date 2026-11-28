-- Agenda YA 6.0 · Nuevas categorías y asignación automática de portadas
-- Ejecutar después de 004_agenda_ya_public_platform_v0_1.sql y 007_marketplace_public_v1_0.sql.

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

-- Selecciona una portada estable (1 de 8) según negocio y categoría.
-- Las categorías actuales usan sus JPG ya existentes; las nuevas usan SVG.
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

  if v_needs_cover then

    select slug into v_slug
    from public.business_categories
    where id = new.category_id and active = true
    limit 1;

    if v_slug is null then
      return new;
    end if;

    v_index := 1 + (get_byte(
      decode(substr(md5(coalesce(new.business_id::text,'') || ':' || v_slug),1,2),'hex'),
      0
    ) % 8);

    if v_slug in ('pesca-caza','artesania-tejido') then
      new.cover_url := 'assets/category-covers/' || v_slug || '-' || lpad(v_index::text,2,'0') || '.svg';
    else
      new.cover_url := 'assets/category-covers/' || v_slug || '-' || lpad(v_index::text,2,'0') || '.jpg';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_business_category_cover on public.business_public_profiles;
create trigger trg_business_category_cover
before insert or update
on public.business_public_profiles
for each row execute function public.set_business_category_cover();

-- Clasifica automáticamente negocios existentes cuando su nombre/tipo indica
-- pesca, caza, artesanía o tejido. No publica perfiles que estaban privados.
with matched_businesses as (
  select
    b.id as business_id,
    b.name as display_name,
    case
      when lower(coalesce(b.name,'') || ' ' || coalesce(b.business_type,'')) ~
        '(pesca|pescad|caza|cazador|excursion|excursión|guia|guía|outdoor)'
        then 'pesca-caza'
      when lower(coalesce(b.name,'') || ' ' || coalesce(b.business_type,'')) ~
        '(artesani|artesanía|tejid|crochet|bordad|manualidad|lana|telar)'
        then 'artesania-tejido'
      else null
    end as category_slug
  from public.businesses b
),
resolved as (
  select mb.business_id, mb.display_name, c.id as category_id
  from matched_businesses mb
  join public.business_categories c on c.slug=mb.category_slug
  where mb.category_slug is not null
)
insert into public.business_public_profiles (business_id, display_name, category_id, public_enabled)
select business_id, display_name, category_id, false
from resolved
on conflict (business_id) do update
set category_id = excluded.category_id,
    display_name = coalesce(public.business_public_profiles.display_name, excluded.display_name);

-- Asigna portada por categoría a perfiles existentes sin portada.
-- Los perfiles que ya tenían una portada manual se conservan.
update public.business_public_profiles
set cover_url = null
where category_id is not null
  and nullif(btrim(cover_url),'') is null;

commit;
