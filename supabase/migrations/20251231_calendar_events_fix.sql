-- Fix get_calendar_events: rename ambiguous id column to event_id
drop function if exists public.get_calendar_events(uuid, date, date);

create or replace function public.get_calendar_events(
  p_org_id uuid,
  p_start date default current_date,
  p_end date default (current_date + interval '30 days')::date
) returns table (
  event_id text,
  org_id uuid,
  type text,
  title text,
  start_at timestamptz,
  end_at timestamptz,
  dog_id uuid,
  transport_id uuid,
  medical_record_id uuid,
  status text,
  location text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_quarantine_days int;
  v_start date := coalesce(p_start, current_date);
  v_end date := coalesce(p_end, (current_date + interval '30 days')::date);
begin
  if v_start > v_end then
    raise exception 'p_start must be on or before p_end' using errcode = '22000';
  end if;

  if current_setting('request.jwt.claim.role', true) <> 'service_role'
     and not public.is_active_org_member(p_org_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select coalesce((settings ->> 'quarantine_days')::int, 14)
  into v_quarantine_days
  from public.orgs
  where id = p_org_id
  limit 1;

  if v_quarantine_days is null or v_quarantine_days <= 0 then
    v_quarantine_days := 14;
  end if;

  return query
  with org_quarantine_days as (
    select v_quarantine_days as quarantine_days
  ), medical as (
    select
      'med_' || mr.id as event_id,
      mr.org_id,
      'medical'::text as type,
      coalesce('Medical: ' || nullif(mr.record_type, ''), 'Medical event') as title,
      coalesce(mr.occurred_on::timestamptz, mr.created_at) as start_at,
      coalesce(mr.occurred_on::timestamptz, mr.created_at) + interval '1 hour' as end_at,
      mr.dog_id,
      null::uuid as transport_id,
      mr.id as medical_record_id,
      null::text as status,
      null::text as location
    from public.medical_records mr
    where mr.org_id = p_org_id
      and (
        (mr.occurred_on is not null and mr.occurred_on between v_start and v_end)
        or (mr.occurred_on is null and mr.created_at::date between v_start and v_end)
      )
  ), transports as (
    select
      'trans_' || t.id as event_id,
      t.org_id,
      'transport'::text as type,
      concat_ws(
        ' ',
        'Transport:',
        nullif(t.from_location, ''),
        case when t.to_location is not null then '-> ' || t.to_location else null end
      ) as title,
      coalesce(t.window_start, t.window_end, t.created_at) as start_at,
      coalesce(t.window_end, coalesce(t.window_start, t.created_at) + interval '1 hour') as end_at,
      t.dog_id,
      t.id as transport_id,
      null::uuid as medical_record_id,
      t.status as status,
      coalesce(t.from_location, '') as location
    from public.transports t
    where t.org_id = p_org_id
      and t.deleted_at is null
      and coalesce(t.window_start, t.window_end, t.created_at)::date between v_start and v_end
  ), quarantines as (
    select
      'quar_' || d.id as event_id,
      d.org_id,
      'quarantine'::text as type,
      'Quarantine: ' || coalesce(d.name, 'Dog') as title,
      coalesce((d.extra_fields ->> 'quarantine_start')::date, d.created_at::date)::timestamptz as start_at,
      (
        coalesce((d.extra_fields ->> 'quarantine_start')::date, d.created_at::date)::timestamptz
        + make_interval(days => (select quarantine_days from org_quarantine_days))
      ) as end_at,
      d.id as dog_id,
      null::uuid as transport_id,
      null::uuid as medical_record_id,
      null::text as status,
      coalesce(d.location, '') as location
    from public.dogs d
    where d.org_id = p_org_id
      and d.deleted_at is null
      and (
        coalesce((d.extra_fields ->> 'quarantine_start')::date, d.created_at::date) between v_start and v_end
        or (
          coalesce((d.extra_fields ->> 'quarantine_start')::date, d.created_at::date)
          + make_interval(days => (select quarantine_days from org_quarantine_days))
        ) between v_start and v_end
      )
  )
  select * from medical
  union all
  select * from transports
  union all
  select * from quarantines
  order by start_at;
end;
$$;

