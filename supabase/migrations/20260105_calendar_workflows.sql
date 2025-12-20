-- Calendar workflows: tables, reminders, automation, and unified calendar RPC
-- References: docs/calendar_workflows_plan.md

-- Drop legacy RPC signature
drop function if exists public.get_calendar_events(uuid, date, date);

-- Calendar artifacts table (manual + workflow events)
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  type text not null default 'general',
  status text,
  location text,
  link_type text not null default 'none',
  link_id uuid,
  is_editable boolean not null default true,
  visibility text not null default 'org',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by_membership_id uuid references public.memberships(id),
  updated_by_membership_id uuid references public.memberships(id),
  check (end_at > start_at)
);

create index if not exists calendar_events_org_start_idx on public.calendar_events(org_id, start_at);
create index if not exists calendar_events_org_type_idx on public.calendar_events(org_id, type);
create index if not exists calendar_events_org_link_idx on public.calendar_events(org_id, link_type, link_id);

-- Calendar reminders drive deterministic notification scheduling
create table if not exists public.calendar_reminders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  type text not null default 'local',
  offset_minutes integer not null default 60,
  deterministic_key text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_membership_id uuid references public.memberships(id),
  updated_by_membership_id uuid references public.memberships(id),
  check (offset_minutes >= 0)
);

create index if not exists calendar_reminders_org_idx on public.calendar_reminders(org_id);
create index if not exists calendar_reminders_event_idx on public.calendar_reminders(event_id);
create unique index if not exists calendar_reminders_deterministic_idx on public.calendar_reminders(org_id, deterministic_key);

-- Triggers: keep updated_at fresh
drop trigger if exists set_updated_at_calendar_events on public.calendar_events;
create trigger set_updated_at_calendar_events
before update on public.calendar_events
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_calendar_reminders on public.calendar_reminders;
create trigger set_updated_at_calendar_reminders
before update on public.calendar_reminders
for each row execute function public.set_updated_at();

-- RLS enablement
alter table public.calendar_events enable row level security;
alter table public.calendar_reminders enable row level security;

-- Policies: calendar_events
drop policy if exists "org members can read calendar_events" on public.calendar_events;
drop policy if exists "org members can insert calendar_events" on public.calendar_events;
drop policy if exists "org members can update calendar_events" on public.calendar_events;
drop policy if exists "admins can delete calendar_events" on public.calendar_events;

create policy "org members can read calendar_events"
on public.calendar_events
for select
using (public.is_active_org_member(org_id) and deleted_at is null);

create policy "org members can insert calendar_events"
on public.calendar_events
for insert
with check (public.is_active_org_member(org_id));

create policy "org members can update calendar_events"
on public.calendar_events
for update
using (public.is_active_org_member(org_id))
with check (public.is_active_org_member(org_id));

create policy "admins can delete calendar_events"
on public.calendar_events
for delete
using (public.has_role(org_id, 'admin'));

-- Policies: calendar_reminders
drop policy if exists "org members can read calendar_reminders" on public.calendar_reminders;
drop policy if exists "org members can insert calendar_reminders" on public.calendar_reminders;
drop policy if exists "org members can update calendar_reminders" on public.calendar_reminders;
drop policy if exists "admins can delete calendar_reminders" on public.calendar_reminders;

create policy "org members can read calendar_reminders"
on public.calendar_reminders
for select
using (public.is_active_org_member(org_id));

create policy "org members can insert calendar_reminders"
on public.calendar_reminders
for insert
with check (public.is_active_org_member(org_id));

create policy "org members can update calendar_reminders"
on public.calendar_reminders
for update
using (public.is_active_org_member(org_id))
with check (public.is_active_org_member(org_id));

create policy "admins can delete calendar_reminders"
on public.calendar_reminders
for delete
using (public.has_role(org_id, 'admin'));

-- Audit triggers
drop trigger if exists audit_calendar_events on public.calendar_events;
create trigger audit_calendar_events
after insert or update or delete on public.calendar_events
for each row execute function public.audit_activity();

drop trigger if exists audit_calendar_reminders on public.calendar_reminders;
create trigger audit_calendar_reminders
after insert or update or delete on public.calendar_reminders
for each row execute function public.audit_activity();

-- Central automation: stage-driven workflow artifacts (keep logic here)
create or replace function public.handle_calendar_workflows()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
  v_event_id uuid;
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_title text;
  v_det_key text;
  v_payload jsonb;
  v_old_stage text := coalesce(old.stage, null);
  v_new_stage text := coalesce(new.stage, null);
begin
  -- Resolve actor membership for audit metadata
  select id into v_member_id
  from public.memberships
  where org_id = new.org_id
    and user_id = auth.uid()
    and active = true
  limit 1;

  -- On stage change to In Foster, create/update a system task check-in event
  if lower(coalesce(v_new_stage, '')) = 'in foster' and (tg_op = 'INSERT' or v_old_stage is distinct from v_new_stage) then
    v_start_at := coalesce(new.updated_at, now()) + interval '3 days';
    v_end_at := v_start_at + interval '1 hour';
    v_title := coalesce('Check-in: ' || nullif(new.name, ''), 'Foster check-in');
    v_payload := jsonb_build_object(
      'kind', 'foster_checkin',
      'dog_id', new.id,
      'dog_name', new.name,
      'stage', new.stage
    );

    select id into v_event_id
    from public.calendar_events
    where org_id = new.org_id
      and link_type = 'dog'
      and link_id = new.id
      and type = 'system_task'
      and meta ->> 'kind' = 'foster_checkin'
      and deleted_at is null
    limit 1;

    if v_event_id is null then
      insert into public.calendar_events (
        org_id,
        title,
        start_at,
        end_at,
        type,
        status,
        location,
        link_type,
        link_id,
        is_editable,
        visibility,
        meta,
        created_by_membership_id,
        updated_by_membership_id
      )
      values (
        new.org_id,
        v_title,
        v_start_at,
        v_end_at,
        'system_task',
        'scheduled',
        coalesce(new.location, ''),
        'dog',
        new.id,
        false,
        'org',
        v_payload,
        v_member_id,
        v_member_id
      )
      returning id into v_event_id;
    else
      update public.calendar_events
      set
        title = v_title,
        start_at = v_start_at,
        end_at = v_end_at,
        status = 'scheduled',
        location = coalesce(new.location, ''),
        meta = v_payload,
        updated_by_membership_id = v_member_id,
        updated_at = now(),
        deleted_at = null
      where id = v_event_id;
    end if;

    v_det_key := concat_ws('_', 'foster-checkin', new.id::text, to_char(v_start_at, 'YYYYMMDD'));

    insert into public.calendar_reminders (
      org_id,
      event_id,
      type,
      offset_minutes,
      deterministic_key,
      payload,
      created_by_membership_id,
      updated_by_membership_id
    )
    values (
      new.org_id,
      v_event_id,
      'local',
      60,
      v_det_key,
      v_payload,
      v_member_id,
      v_member_id
    )
    on conflict (org_id, deterministic_key) do update
      set event_id = excluded.event_id,
          offset_minutes = excluded.offset_minutes,
          payload = excluded.payload,
          updated_by_membership_id = excluded.updated_by_membership_id,
          updated_at = now();
  end if;

  -- If leaving In Foster, retire any open foster check-in artifacts
  if tg_op = 'UPDATE' and lower(coalesce(v_old_stage, '')) = 'in foster' and lower(coalesce(v_new_stage, '')) <> 'in foster' then
    update public.calendar_events
    set deleted_at = now(), updated_by_membership_id = v_member_id
    where org_id = new.org_id
      and link_type = 'dog'
      and link_id = new.id
      and type = 'system_task'
      and meta ->> 'kind' = 'foster_checkin'
      and deleted_at is null;

    delete from public.calendar_reminders
    where org_id = new.org_id
      and deterministic_key like concat('foster-checkin_', new.id::text, '%');
  end if;

  return new;
end;
$$;

drop trigger if exists handle_calendar_workflows on public.dogs;
create trigger handle_calendar_workflows
after insert or update on public.dogs
for each row execute function public.handle_calendar_workflows();

-- Aggregator RPC: unified calendar projection with reminders and filters
drop function if exists public.get_calendar_events(uuid, timestamptz, timestamptz, text[], uuid, uuid, text, text, text);

create or replace function public.get_calendar_events(
  p_org_id uuid,
  p_start timestamptz default now(),
  p_end timestamptz default (now() + interval '30 days'),
  p_source_types text[] default null,
  p_dog_id uuid default null,
  p_contact_id uuid default null,
  p_stage text default null,
  p_visibility text default null,
  p_search text default null
) returns table (
  event_id text,
  org_id uuid,
  source_type text,
  source_id uuid,
  title text,
  start_at timestamptz,
  end_at timestamptz,
  location text,
  status text,
  link_type text,
  link_id uuid,
  visibility text,
  meta jsonb,
  reminders jsonb
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_quarantine_days int;
  v_start timestamptz := coalesce(p_start, now());
  v_end timestamptz := coalesce(p_end, (now() + interval '30 days'));
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
  with dog_context as (
    select
      d.id,
      d.org_id,
      d.name,
      d.stage,
      d.location,
      d.foster_contact_id,
      d.responsible_contact_id
    from public.dogs d
    where d.org_id = p_org_id
      and d.deleted_at is null
  ), reminder_lookup as (
    select
      cr.event_id,
      jsonb_agg(
        jsonb_build_object(
          'id', cr.id,
          'type', coalesce(cr.type, 'local'),
          'offset_minutes', coalesce(cr.offset_minutes, 0),
          'scheduled_at', ce.start_at - make_interval(mins => coalesce(cr.offset_minutes, 0)),
          'deterministic_key', coalesce(cr.deterministic_key, concat('reminder_', cr.id)),
          'payload', coalesce(cr.payload, '{}'::jsonb)
        )
        order by coalesce(cr.offset_minutes, 0) desc
      ) as reminders
    from public.calendar_reminders cr
    join public.calendar_events ce on ce.id = cr.event_id
    where ce.org_id = p_org_id
      and ce.deleted_at is null
    group by cr.event_id, ce.start_at
  ), manual_events as (
    select
      concat('cal_', ce.id::text) as event_id,
      ce.org_id,
      case
        when ce.type = 'quarantine_artifact' then 'quarantine'
        when ce.type in ('general', 'system_task', 'finance', 'external') then ce.type
        else ce.type
      end as source_type,
      ce.id as source_id,
      ce.title,
      ce.start_at,
      ce.end_at,
      ce.location,
      coalesce(ce.status, 'scheduled') as status,
      ce.link_type,
      ce.link_id,
      ce.visibility,
      coalesce(ce.meta, '{}'::jsonb) as meta,
      coalesce(rl.reminders, jsonb_build_array(
        jsonb_build_object(
          'id', gen_random_uuid(),
          'type', 'local',
          'offset_minutes', 60,
          'scheduled_at', ce.start_at - interval '60 minutes',
          'deterministic_key', concat('cal_', ce.id::text, '_60'),
          'payload', '{}'::jsonb
        )
      )) as reminders
    from public.calendar_events ce
    left join reminder_lookup rl on rl.event_id = ce.id
    where ce.org_id = p_org_id
      and ce.deleted_at is null
      and ce.end_at >= v_start
      and ce.start_at <= v_end
  ), transports as (
    select
      concat('trans_', t.id::text) as event_id,
      t.org_id,
      'transport'::text as source_type,
      t.id as source_id,
      concat_ws(
        ' ',
        'Transport:',
        nullif(t.from_location, ''),
        case when t.to_location is not null then '-> ' || t.to_location else null end
      ) as title,
      coalesce(t.window_start, t.window_end, t.created_at) as start_at,
      coalesce(t.window_end, coalesce(t.window_start, t.created_at) + interval '1 hour') as end_at,
      coalesce(t.from_location, '') as location,
      t.status as status,
      'transport'::text as link_type,
      t.id as link_id,
      'org'::text as visibility,
      jsonb_build_object(
        'dog_id', t.dog_id,
        'from', t.from_location,
        'to', t.to_location,
        'assigned_contact_id', t.assigned_contact_id,
        'assigned_membership_id', t.assigned_membership_id
      ) as meta,
      jsonb_build_array(
        jsonb_build_object(
          'id', concat('reminder_', t.id::text, '_transport'),
          'type', 'local',
          'offset_minutes', 60,
          'scheduled_at', coalesce(t.window_start, t.window_end, t.created_at) - interval '60 minutes',
          'deterministic_key', concat('transport_', t.id::text, '_60'),
          'payload', jsonb_build_object('dog_id', t.dog_id, 'status', t.status)
        )
      ) as reminders
    from public.transports t
    where t.org_id = p_org_id
      and t.deleted_at is null
      and coalesce(t.window_end, coalesce(t.window_start, t.created_at)) >= v_start
      and coalesce(t.window_start, t.window_end, t.created_at) <= v_end
  ), medical as (
    select
      concat('med_', mr.id::text) as event_id,
      mr.org_id,
      'medical'::text as source_type,
      mr.id as source_id,
      coalesce('Medical: ' || nullif(mr.record_type, ''), 'Medical event') as title,
      coalesce(mr.occurred_on::timestamptz, mr.created_at) as start_at,
      coalesce(mr.occurred_on::timestamptz, mr.created_at) + interval '1 hour' as end_at,
      null::text as location,
      null::text as status,
      'dog'::text as link_type,
      mr.dog_id as link_id,
      'org'::text as visibility,
      jsonb_build_object(
        'dog_id', mr.dog_id,
        'record_type', mr.record_type,
        'occurred_on', mr.occurred_on
      ) as meta,
      jsonb_build_array(
        jsonb_build_object(
          'id', concat('reminder_', mr.id::text, '_medical'),
          'type', 'local',
          'offset_minutes', 60,
          'scheduled_at', coalesce(mr.occurred_on::timestamptz, mr.created_at) - interval '60 minutes',
          'deterministic_key', concat('medical_', mr.id::text, '_60'),
          'payload', jsonb_build_object('record_type', mr.record_type, 'dog_id', mr.dog_id)
        )
      ) as reminders
    from public.medical_records mr
    where mr.org_id = p_org_id
      and (
        (mr.occurred_on is not null and mr.occurred_on::timestamptz + interval '1 hour' >= v_start and mr.occurred_on::timestamptz <= v_end)
        or (mr.occurred_on is null and mr.created_at between v_start and v_end)
      )
  ), quarantines as (
    select
      concat('quar_', d.id::text) as event_id,
      d.org_id,
      'quarantine'::text as source_type,
      d.id as source_id,
      'Quarantine: ' || coalesce(d.name, 'Dog') as title,
      coalesce((d.extra_fields ->> 'quarantine_start')::date, d.created_at::date)::timestamptz as start_at,
      (
        coalesce((d.extra_fields ->> 'quarantine_start')::date, d.created_at::date)::timestamptz
        + make_interval(days => v_quarantine_days)
      ) as end_at,
      coalesce(d.location, '') as location,
      d.stage as status,
      'dog'::text as link_type,
      d.id as link_id,
      'org'::text as visibility,
      jsonb_build_object(
        'dog_id', d.id,
        'stage', d.stage,
        'quarantine_days', v_quarantine_days
      ) as meta,
      jsonb_build_array(
        jsonb_build_object(
          'id', concat('reminder_', d.id::text, '_quarantine'),
          'type', 'local',
          'offset_minutes', 0,
          'scheduled_at', coalesce((d.extra_fields ->> 'quarantine_start')::date, d.created_at::date)::timestamptz,
          'deterministic_key', concat('quarantine_', d.id::text, '_start'),
          'payload', jsonb_build_object('stage', d.stage)
        )
      ) as reminders
    from public.dogs d
    where d.org_id = p_org_id
      and d.deleted_at is null
      and (
        coalesce((d.extra_fields ->> 'quarantine_start')::date, d.created_at::date)::timestamptz <= v_end
        and (
          coalesce((d.extra_fields ->> 'quarantine_start')::date, d.created_at::date)::timestamptz
          + make_interval(days => v_quarantine_days)
        ) >= v_start
      )
  ), combined as (
    select * from manual_events
    union all
    select * from transports
    union all
    select * from medical
    union all
    select * from quarantines
  )
  select
    c.event_id,
    c.org_id,
    c.source_type,
    c.source_id,
    c.title,
    c.start_at,
    c.end_at,
    c.location,
    c.status,
    c.link_type,
    c.link_id,
    c.visibility,
    coalesce(c.meta, '{}'::jsonb) as meta,
    coalesce(c.reminders, '[]'::jsonb) as reminders
  from combined c
  left join dog_context dc on dc.id = c.link_id and c.link_type = 'dog'
  where (p_source_types is null or c.source_type = any (p_source_types))
    and (
      p_dog_id is null
      or (c.link_type = 'dog' and c.link_id = p_dog_id)
      or (c.meta ? 'dog_id' and (c.meta ->> 'dog_id')::uuid = p_dog_id)
    )
    and (
      p_contact_id is null
      or (c.meta ? 'assigned_contact_id' and (c.meta ->> 'assigned_contact_id')::uuid = p_contact_id)
      or (c.meta ? 'foster_contact_id' and (c.meta ->> 'foster_contact_id')::uuid = p_contact_id)
      or (c.meta ? 'responsible_contact_id' and (c.meta ->> 'responsible_contact_id')::uuid = p_contact_id)
    )
    and (
      p_stage is null
      or (dc.stage is not null and lower(dc.stage) = lower(p_stage))
      or (c.meta ? 'stage' and lower(c.meta ->> 'stage') = lower(p_stage))
    )
    and (p_visibility is null or coalesce(c.visibility, 'org') = p_visibility)
    and (
      p_search is null
      or p_search = ''
      or lower(c.title) like '%' || lower(p_search) || '%'
      or lower(coalesce(c.location, '')) like '%' || lower(p_search) || '%'
    )
  order by c.start_at;
end;
$$;
