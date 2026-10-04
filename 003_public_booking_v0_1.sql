-- SOMOS AGENDA · PUBLIC BOOKING V0.1
-- Lectura pública controlada + creación pública de reservas.
-- No expone tablas directamente a anon. Toda la operación pasa por RPC.

begin;

create or replace function public.get_public_booking_context(
  p_slug text,
  p_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses;
  v_result jsonb;
begin
  if nullif(btrim(p_slug), '') is null then
    raise exception 'PUBLIC_SLUG_REQUIRED';
  end if;

  select *
    into v_business
  from public.businesses
  where slug = lower(btrim(p_slug))
    and active = true
  limit 1;

  if not found then
    raise exception 'BUSINESS_NOT_FOUND';
  end if;

  v_result := jsonb_build_object(
    'business',
      jsonb_build_object(
        'id', v_business.id,
        'name', v_business.name,
        'slug', v_business.slug,
        'email', v_business.email,
        'phone', v_business.phone
      ),
    'services',
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', s.id,
            'name', s.name,
            'description', s.description,
            'duration_minutes', s.duration_minutes,
            'price', s.price
          )
          order by s.name
        )
        from public.services s
        where s.business_id = v_business.id
          and s.active = true
      ), '[]'::jsonb),
    'professionals',
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'first_name', p.first_name,
            'last_name', p.last_name,
            'bio', p.bio,
            'schedules',
              coalesce((
                select jsonb_agg(
                  jsonb_build_object(
                    'day_of_week', ps.day_of_week,
                    'start_time', ps.start_time,
                    'end_time', ps.end_time
                  )
                  order by ps.start_time
                )
                from public.professional_schedules ps
                where ps.business_id = v_business.id
                  and ps.professional_id = p.id
                  and ps.day_of_week = extract(isodow from p_date)::integer
                  and ps.active = true
              ), '[]'::jsonb),
            'availability',
              coalesce((
                select jsonb_agg(
                  jsonb_build_object(
                    'id', pa.id,
                    'start_time', pa.start_time,
                    'end_time', pa.end_time,
                    'status', pa.status,
                    'note', pa.note
                  )
                  order by pa.start_time
                )
                from public.professional_availability pa
                where pa.business_id = v_business.id
                  and pa.professional_id = p.id
                  and pa.availability_date = p_date
                  and pa.active = true
              ), '[]'::jsonb),
            'bookings',
              coalesce((
                select jsonb_agg(
                  jsonb_build_object(
                    'start_time', b.start_time,
                    'end_time', b.end_time,
                    'status', b.status
                  )
                  order by b.start_time
                )
                from public.bookings b
                where b.business_id = v_business.id
                  and b.professional_id = p.id
                  and b.booking_date = p_date
                  and b.status <> 'cancelled'
              ), '[]'::jsonb)
          )
          order by p.first_name, p.last_name
        )
        from public.professionals p
        where p.business_id = v_business.id
          and p.active = true
      ), '[]'::jsonb),
    'date', p_date
  );

  return v_result;
end;
$$;

create or replace function public.create_public_booking(
  p_slug text,
  p_client_first_name text,
  p_client_last_name text,
  p_client_email text,
  p_client_phone text,
  p_service_id uuid,
  p_professional_id uuid,
  p_booking_date date,
  p_start_time time,
  p_end_time time,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses;
  v_service public.services;
  v_professional public.professionals;
  v_owner uuid;
  v_client public.clients;
  v_booking public.bookings;
  v_day integer;
  v_schedule_ok boolean := false;
  v_exception_exists boolean := false;
  v_exception_ok boolean := false;
  v_overlap boolean := false;
begin
  if nullif(btrim(p_slug), '') is null then
    raise exception 'PUBLIC_SLUG_REQUIRED';
  end if;

  if nullif(btrim(p_client_first_name), '') is null
     or nullif(btrim(p_client_last_name), '') is null then
    raise exception 'CLIENT_NAME_REQUIRED';
  end if;

  if nullif(btrim(p_client_email), '') is null
     and nullif(btrim(p_client_phone), '') is null then
    raise exception 'CLIENT_CONTACT_REQUIRED';
  end if;

  if p_booking_date is null or p_start_time is null or p_end_time is null then
    raise exception 'BOOKING_TIME_REQUIRED';
  end if;

  if p_start_time >= p_end_time then
    raise exception 'INVALID_BOOKING_TIME';
  end if;

  select *
    into v_business
  from public.businesses
  where slug = lower(btrim(p_slug))
    and active = true
  limit 1;

  if not found then
    raise exception 'BUSINESS_NOT_FOUND';
  end if;

  v_owner := v_business.created_by;
  v_day := extract(isodow from p_booking_date)::integer;

  select *
    into v_service
  from public.services
  where id = p_service_id
    and business_id = v_business.id
    and active = true;

  if not found then
    raise exception 'SERVICE_NOT_AVAILABLE';
  end if;

  select *
    into v_professional
  from public.professionals
  where id = p_professional_id
    and business_id = v_business.id
    and active = true;

  if not found then
    raise exception 'PROFESSIONAL_NOT_AVAILABLE';
  end if;

  if p_end_time - p_start_time <> make_interval(mins => v_service.duration_minutes)::interval then
    raise exception 'BOOKING_DURATION_INVALID';
  end if;

  select exists(
    select 1
    from public.professional_schedules ps
    where ps.business_id = v_business.id
      and ps.professional_id = v_professional.id
      and ps.day_of_week = v_day
      and ps.active = true
      and p_start_time >= ps.start_time
      and p_end_time <= ps.end_time
  ) into v_schedule_ok;

  select exists(
    select 1
    from public.professional_availability pa
    where pa.business_id = v_business.id
      and pa.professional_id = v_professional.id
      and pa.availability_date = p_booking_date
      and pa.active = true
  ) into v_exception_exists;

  if v_exception_exists then
    select exists(
      select 1
      from public.professional_availability pa
      where pa.business_id = v_business.id
        and pa.professional_id = v_professional.id
        and pa.availability_date = p_booking_date
        and pa.active = true
        and pa.status = 'available'
        and p_start_time >= pa.start_time
        and p_end_time <= pa.end_time
    ) and not exists(
      select 1
      from public.professional_availability pa
      where pa.business_id = v_business.id
        and pa.professional_id = v_professional.id
        and pa.availability_date = p_booking_date
        and pa.active = true
        and pa.status = 'blocked'
        and p_start_time < pa.end_time
        and p_end_time > pa.start_time
    ) into v_exception_ok;

    if not v_exception_ok then
      raise exception 'OUTSIDE_AVAILABILITY';
    end if;
  elsif not v_schedule_ok then
    raise exception 'OUTSIDE_SCHEDULE';
  end if;

  select exists(
    select 1
    from public.bookings b
    where b.business_id = v_business.id
      and b.professional_id = v_professional.id
      and b.booking_date = p_booking_date
      and b.status <> 'cancelled'
      and p_start_time < b.end_time
      and p_end_time > b.start_time
  ) into v_overlap;

  if v_overlap then
    raise exception 'BOOKING_OVERLAP';
  end if;

  select *
    into v_client
  from public.clients c
  where c.business_id = v_business.id
    and c.active = true
    and (
      (nullif(btrim(p_client_email), '') is not null and lower(c.email) = lower(btrim(p_client_email)))
      or
      (nullif(btrim(p_client_phone), '') is not null and c.phone = btrim(p_client_phone))
    )
  order by c.created_at
  limit 1;

  if not found then
    insert into public.clients (
      business_id,
      first_name,
      last_name,
      email,
      phone,
      notes,
      active,
      created_by
    )
    values (
      v_business.id,
      btrim(p_client_first_name),
      btrim(p_client_last_name),
      nullif(lower(btrim(p_client_email)), ''),
      nullif(btrim(p_client_phone), ''),
      nullif(btrim(p_notes), ''),
      true,
      v_owner
    )
    returning * into v_client;
  end if;

  insert into public.bookings (
    business_id,
    client_id,
    service_id,
    professional_id,
    booking_date,
    start_time,
    end_time,
    status,
    notes,
    created_by
  )
  values (
    v_business.id,
    v_client.id,
    v_service.id,
    v_professional.id,
    p_booking_date,
    p_start_time,
    p_end_time,
    'pending',
    nullif(btrim(p_notes), ''),
    v_owner
  )
  returning * into v_booking;

  return jsonb_build_object(
    'booking_id', v_booking.id,
    'business_name', v_business.name,
    'client_name', v_client.first_name || ' ' || v_client.last_name,
    'service_name', v_service.name,
    'professional_name', v_professional.first_name || ' ' || v_professional.last_name,
    'booking_date', v_booking.booking_date,
    'start_time', v_booking.start_time,
    'end_time', v_booking.end_time,
    'status', v_booking.status
  );
end;
$$;

revoke all on function public.get_public_booking_context(text,date) from public;
revoke all on function public.create_public_booking(text,text,text,text,text,uuid,uuid,date,time,time,text) from public;

grant execute on function public.get_public_booking_context(text,date) to anon, authenticated;
grant execute on function public.create_public_booking(text,text,text,text,text,uuid,uuid,date,time,time,text) to anon, authenticated;

commit;

-- Verificación
select routine_name
from information_schema.routines
where routine_schema='public'
  and routine_name in ('get_public_booking_context','create_public_booking')
order by routine_name;
