-- Timeline expansion:
-- - Enrich audit events with related keys for transport/contact/member timelines
-- - Emit domain-ish event types for assignment/assignee changes
-- - Add RPCs for transport/contact/member timelines (audit-only; schedule is via get_calendar_events)

create or replace function public.audit_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_entity_id uuid;
  v_event_type text;
  v_summary text;
  v_payload jsonb := '{}'::jsonb;
  v_related jsonb := '{}'::jsonb;
  v_name text;
  v_changes jsonb := '{}'::jsonb;
  v_table text := lower(tg_table_name);
  v_contact_ids jsonb := '[]'::jsonb;
begin
  if tg_op = 'DELETE' then
    v_org_id := old.org_id;
    v_entity_id := old.id;
    if to_jsonb(old) ? 'name' then
      v_name := old.name;
    end if;
  else
    v_org_id := new.org_id;
    v_entity_id := new.id;
    if to_jsonb(new) ? 'name' then
      v_name := new.name;
    end if;
  end if;

  -- Stable linkage for timelines/feeds (prefer related.* + indexes)
  if v_table = 'dogs' then
    v_related := v_related || jsonb_build_object('dog_id', v_entity_id::text);
  elsif v_table = 'transports' then
    v_related := v_related || jsonb_build_object('transport_id', v_entity_id::text);
    if tg_op = 'DELETE' then
      if old.dog_id is not null then
        v_related := v_related || jsonb_build_object('dog_id', old.dog_id::text);
      end if;
    else
      if new.dog_id is not null then
        v_related := v_related || jsonb_build_object('dog_id', new.dog_id::text);
      end if;
    end if;
  elsif v_table in ('medical_records', 'expenses', 'dog_photos') then
    if tg_op = 'DELETE' then
      if old.dog_id is not null then
        v_related := v_related || jsonb_build_object('dog_id', old.dog_id::text);
      end if;
    else
      if new.dog_id is not null then
        v_related := v_related || jsonb_build_object('dog_id', new.dog_id::text);
      end if;
    end if;
  elsif v_table = 'documents' then
    if tg_op = 'DELETE' then
      v_related := v_related || jsonb_build_object('entity_type', old.entity_type, 'entity_id', old.entity_id::text);
      if lower(old.entity_type) in ('dog', 'dogs') then
        v_related := v_related || jsonb_build_object('dog_id', old.entity_id::text);
      elsif lower(old.entity_type) in ('transport', 'transports') then
        v_related := v_related || jsonb_build_object('transport_id', old.entity_id::text);
      end if;
    else
      v_related := v_related || jsonb_build_object('entity_type', new.entity_type, 'entity_id', new.entity_id::text);
      if lower(new.entity_type) in ('dog', 'dogs') then
        v_related := v_related || jsonb_build_object('dog_id', new.entity_id::text);
      elsif lower(new.entity_type) in ('transport', 'transports') then
        v_related := v_related || jsonb_build_object('transport_id', new.entity_id::text);
      end if;
    end if;
  elsif v_table = 'org_contacts' then
    v_contact_ids := v_contact_ids || to_jsonb(v_entity_id::text);
  elsif v_table = 'memberships' then
    v_related := v_related || jsonb_build_object('membership_id', v_entity_id::text);
  end if;

  -- Default fallback: stable but generic
  v_event_type := v_table || '_' || lower(tg_op);
  if v_name is not null then
    v_summary := format('%s %s %s', initcap(tg_table_name), v_name, lower(tg_op));
  else
    v_summary := format('%s %s', initcap(tg_table_name), lower(tg_op));
  end if;

  -- Domain-ish overrides for the noisiest tables
  if v_table = 'dogs' then
    if tg_op = 'INSERT' then
      v_event_type := 'dog.created';
      v_summary := format('Dog %s created', coalesce(new.name, ''));
      v_payload := jsonb_build_object('stage', new.stage, 'location', new.location);
    elsif tg_op = 'UPDATE' then
      if old.deleted_at is null and new.deleted_at is not null then
        v_event_type := 'dog.archived';
        v_summary := format('Dog %s archived', coalesce(new.name, ''));
        v_payload := jsonb_build_object('deleted_at', new.deleted_at);
      elsif old.deleted_at is not null and new.deleted_at is null then
        v_event_type := 'dog.restored';
        v_summary := format('Dog %s restored', coalesce(new.name, ''));
        v_payload := jsonb_build_object('deleted_at', null);
      elsif old.stage is distinct from new.stage then
        v_event_type := 'dog.stage_changed';
        v_summary := format('Dog %s moved from %s to %s', coalesce(new.name, ''), coalesce(old.stage, ''), coalesce(new.stage, ''));
        v_payload := jsonb_build_object('from', old.stage, 'to', new.stage);
      elsif old.foster_contact_id is distinct from new.foster_contact_id
         or old.responsible_contact_id is distinct from new.responsible_contact_id then
        if old.foster_contact_id is distinct from new.foster_contact_id then
          v_changes := v_changes || jsonb_build_object('foster_contact_id', jsonb_build_object('from', old.foster_contact_id, 'to', new.foster_contact_id));
          if old.foster_contact_id is not null then v_contact_ids := v_contact_ids || to_jsonb(old.foster_contact_id::text); end if;
          if new.foster_contact_id is not null then v_contact_ids := v_contact_ids || to_jsonb(new.foster_contact_id::text); end if;
        end if;
        if old.responsible_contact_id is distinct from new.responsible_contact_id then
          v_changes := v_changes || jsonb_build_object('responsible_contact_id', jsonb_build_object('from', old.responsible_contact_id, 'to', new.responsible_contact_id));
          if old.responsible_contact_id is not null then v_contact_ids := v_contact_ids || to_jsonb(old.responsible_contact_id::text); end if;
          if new.responsible_contact_id is not null then v_contact_ids := v_contact_ids || to_jsonb(new.responsible_contact_id::text); end if;
        end if;

        v_event_type := 'dog.assignment_changed';
        v_summary := format('Dog %s assignment changed', coalesce(new.name, ''));
        v_payload := jsonb_build_object('changes', v_changes);
      else
        if old.name is distinct from new.name then
          v_changes := v_changes || jsonb_build_object('name', jsonb_build_object('from', old.name, 'to', new.name));
        end if;
        if old.location is distinct from new.location then
          v_changes := v_changes || jsonb_build_object('location', jsonb_build_object('from', old.location, 'to', new.location));
        end if;
        if old.description is distinct from new.description then
          v_changes := v_changes || jsonb_build_object('description', jsonb_build_object('from', old.description, 'to', new.description));
        end if;
        if old.budget_limit is distinct from new.budget_limit then
          v_changes := v_changes || jsonb_build_object('budget_limit', jsonb_build_object('from', old.budget_limit, 'to', new.budget_limit));
        end if;

        v_event_type := 'dog.updated';
        v_summary := format('Dog %s updated', coalesce(new.name, ''));
        v_payload := case when v_changes = '{}'::jsonb then '{}'::jsonb else jsonb_build_object('changes', v_changes) end;
      end if;
    elsif tg_op = 'DELETE' then
      v_event_type := 'dog.deleted';
      v_summary := format('Dog %s deleted', coalesce(old.name, ''));
      v_payload := '{}'::jsonb;
    end if;
  elsif v_table = 'transports' then
    if tg_op = 'INSERT' then
      v_event_type := 'transport.created';
      v_summary := 'Transport created';
      v_payload := jsonb_build_object('status', new.status, 'from_location', new.from_location, 'to_location', new.to_location);
      if new.assigned_contact_id is not null then v_contact_ids := v_contact_ids || to_jsonb(new.assigned_contact_id::text); end if;
    elsif tg_op = 'UPDATE' then
      if old.deleted_at is null and new.deleted_at is not null then
        v_event_type := 'transport.archived';
        v_summary := 'Transport archived';
        v_payload := jsonb_build_object('deleted_at', new.deleted_at);
      elsif old.deleted_at is not null and new.deleted_at is null then
        v_event_type := 'transport.restored';
        v_summary := 'Transport restored';
        v_payload := jsonb_build_object('deleted_at', null);
      elsif old.status is distinct from new.status then
        v_event_type := 'transport.status_changed';
        v_summary := format('Transport status changed from %s to %s', coalesce(old.status, ''), coalesce(new.status, ''));
        v_payload := jsonb_build_object('from', old.status, 'to', new.status);
      elsif old.assigned_contact_id is distinct from new.assigned_contact_id then
        v_event_type := 'transport.assignee_changed';
        v_summary := 'Transport assignee changed';
        v_payload := jsonb_build_object('from', old.assigned_contact_id, 'to', new.assigned_contact_id);
        if old.assigned_contact_id is not null then v_contact_ids := v_contact_ids || to_jsonb(old.assigned_contact_id::text); end if;
        if new.assigned_contact_id is not null then v_contact_ids := v_contact_ids || to_jsonb(new.assigned_contact_id::text); end if;
      else
        if old.from_location is distinct from new.from_location then
          v_changes := v_changes || jsonb_build_object('from_location', jsonb_build_object('from', old.from_location, 'to', new.from_location));
        end if;
        if old.to_location is distinct from new.to_location then
          v_changes := v_changes || jsonb_build_object('to_location', jsonb_build_object('from', old.to_location, 'to', new.to_location));
        end if;
        if old.window_start is distinct from new.window_start then
          v_changes := v_changes || jsonb_build_object('window_start', jsonb_build_object('from', old.window_start, 'to', new.window_start));
        end if;
        if old.window_end is distinct from new.window_end then
          v_changes := v_changes || jsonb_build_object('window_end', jsonb_build_object('from', old.window_end, 'to', new.window_end));
        end if;

        v_event_type := 'transport.updated';
        v_summary := 'Transport updated';
        v_payload := case when v_changes = '{}'::jsonb then '{}'::jsonb else jsonb_build_object('changes', v_changes) end;
      end if;

      if new.assigned_contact_id is not null then v_contact_ids := v_contact_ids || to_jsonb(new.assigned_contact_id::text); end if;
    elsif tg_op = 'DELETE' then
      v_event_type := 'transport.deleted';
      v_summary := 'Transport deleted';
      v_payload := '{}'::jsonb;
      if old.assigned_contact_id is not null then v_contact_ids := v_contact_ids || to_jsonb(old.assigned_contact_id::text); end if;
    end if;
  elsif v_table = 'documents' then
    if tg_op = 'INSERT' then
      v_event_type := 'document.uploaded';
      v_summary := format('Document %s uploaded', coalesce(new.filename, ''));
      v_payload := jsonb_build_object('filename', new.filename, 'mime_type', new.mime_type);
    elsif tg_op = 'DELETE' then
      v_event_type := 'document.deleted';
      v_summary := format('Document %s deleted', coalesce(old.filename, ''));
      v_payload := jsonb_build_object('filename', old.filename, 'mime_type', old.mime_type);
    else
      v_event_type := 'document.updated';
      v_summary := format('Document %s updated', coalesce(new.filename, ''));
      v_payload := jsonb_build_object('filename', new.filename, 'mime_type', new.mime_type);
    end if;
  elsif v_table = 'dog_photos' then
    if tg_op = 'INSERT' then
      v_event_type := 'photo.uploaded';
      v_summary := 'Photo uploaded';
      v_payload := jsonb_build_object('caption', new.caption, 'is_primary', new.is_primary);
    elsif tg_op = 'DELETE' then
      v_event_type := 'photo.deleted';
      v_summary := 'Photo deleted';
      v_payload := '{}'::jsonb;
    else
      v_event_type := 'photo.updated';
      v_summary := 'Photo updated';
      v_payload := jsonb_build_object('caption', new.caption, 'is_primary', new.is_primary);
    end if;
  elsif v_table = 'memberships' then
    if tg_op = 'UPDATE' and old.roles is distinct from new.roles then
      v_event_type := 'membership.roles_changed';
      v_summary := 'Member roles changed';
      v_payload := jsonb_build_object('from', old.roles, 'to', new.roles);
    end if;
  end if;

  if v_contact_ids <> '[]'::jsonb then
    v_related := jsonb_set(v_related, '{contact_ids}', v_contact_ids, true);
  end if;

  perform public.log_activity_event(
    v_org_id,
    tg_table_name,
    v_entity_id,
    v_event_type,
    v_summary,
    v_payload,
    v_related
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- Indexes for fast timelines
create index if not exists activity_events_org_related_transport_created_idx
on public.activity_events (org_id, (related->>'transport_id'), created_at desc);

create index if not exists activity_events_org_actor_membership_created_idx
on public.activity_events (org_id, actor_membership_id, created_at desc);

create index if not exists activity_events_related_contact_ids_gin
on public.activity_events using gin ((related->'contact_ids'));

-- RPCs: audit-only timelines
drop function if exists public.get_transport_timeline(uuid, uuid, integer);
create or replace function public.get_transport_timeline(
  p_org_id uuid,
  p_transport_id uuid,
  p_limit integer default 200
) returns setof public.activity_events
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_limit integer := coalesce(p_limit, 200);
begin
  if p_org_id is null or p_transport_id is null then
    raise exception 'p_org_id and p_transport_id are required' using errcode = '22000';
  end if;

  if v_limit < 0 then v_limit := 0; end if;
  if v_limit > 500 then v_limit := 500; end if;

  if current_setting('request.jwt.claim.role', true) <> 'service_role'
     and not public.is_active_org_member(p_org_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  select ae.*
  from public.activity_events ae
  where ae.org_id = p_org_id
    and (
      ae.related->>'transport_id' = p_transport_id::text
      or (ae.entity_type in ('transports', 'transport') and ae.entity_id = p_transport_id)
    )
  order by ae.created_at desc
  limit v_limit;
end;
$$;
grant execute on function public.get_transport_timeline(uuid, uuid, integer) to authenticated;

drop function if exists public.get_contact_timeline(uuid, uuid, integer);
create or replace function public.get_contact_timeline(
  p_org_id uuid,
  p_contact_id uuid,
  p_limit integer default 200
) returns setof public.activity_events
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_limit integer := coalesce(p_limit, 200);
begin
  if p_org_id is null or p_contact_id is null then
    raise exception 'p_org_id and p_contact_id are required' using errcode = '22000';
  end if;

  if v_limit < 0 then v_limit := 0; end if;
  if v_limit > 500 then v_limit := 500; end if;

  if current_setting('request.jwt.claim.role', true) <> 'service_role'
     and not public.is_active_org_member(p_org_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  select ae.*
  from public.activity_events ae
  where ae.org_id = p_org_id
    and (
      (ae.entity_type = 'org_contacts' and ae.entity_id = p_contact_id)
      or (ae.related->'contact_ids') @> jsonb_build_array(p_contact_id::text)
    )
  order by ae.created_at desc
  limit v_limit;
end;
$$;
grant execute on function public.get_contact_timeline(uuid, uuid, integer) to authenticated;

drop function if exists public.get_member_activity(uuid, uuid, integer);
create or replace function public.get_member_activity(
  p_org_id uuid,
  p_membership_id uuid,
  p_limit integer default 200
) returns setof public.activity_events
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_limit integer := coalesce(p_limit, 200);
begin
  if p_org_id is null or p_membership_id is null then
    raise exception 'p_org_id and p_membership_id are required' using errcode = '22000';
  end if;

  if v_limit < 0 then v_limit := 0; end if;
  if v_limit > 500 then v_limit := 500; end if;

  if current_setting('request.jwt.claim.role', true) <> 'service_role'
     and not public.is_active_org_member(p_org_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  select ae.*
  from public.activity_events ae
  where ae.org_id = p_org_id
    and (
      ae.actor_membership_id = p_membership_id
      or (ae.entity_type = 'memberships' and ae.entity_id = p_membership_id)
      or ae.related->>'membership_id' = p_membership_id::text
    )
  order by ae.created_at desc
  limit v_limit;
end;
$$;
grant execute on function public.get_member_activity(uuid, uuid, integer) to authenticated;
