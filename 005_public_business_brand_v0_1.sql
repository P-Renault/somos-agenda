-- Agenda Ya · Public Business Brand v0.1
-- Exposes only the minimum public brand data needed by the marketplace profile.
-- Does not expose private business/member data.

create or replace function public.get_public_business_brand(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses%rowtype;
begin
  select * into v_business
  from public.businesses
  where slug = lower(trim(p_slug))
    and active = true
  limit 1;

  if not found then
    raise exception 'BUSINESS_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'id', v_business.id,
    'name', v_business.name,
    'slug', v_business.slug,
    'logo_url', v_business.logo_url
  );
end;
$$;

grant execute on function public.get_public_business_brand(text) to anon, authenticated;
