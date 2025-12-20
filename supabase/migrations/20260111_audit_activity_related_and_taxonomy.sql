-- Improve audit events:
-- - populate activity_events.related with stable linkages (e.g., related.dog_id)
-- - emit more human-readable / domain-ish event_type + summary for the noisiest tables
-- - mark service_role generated events as related.system = true

create or replace function public.log_activity_event(
  p_org_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_event_type text,
  p_summary text,
  p_payload jsonb default '{}'::jsonb,
  p_related jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_membership_id uuid;
  v_related jsonb := coalesce(p_related, '{}'::jsonb);
begin
  select id into v_actor_membership_id
  from public.memberships
  where org_id = p_org_id
    and user_id = auth.uid()
    and active = true
  limit 1;

  if current_setting('request.jwt.claim.role', true) = 'service_role' then
    v_related := jsonb_set(v_related, '{system}', to_jsonb(true), true);
  end if;

  insert into public.activity_events (
    org_id,
    actor_user_id,
    actor_membership_id,
    entity_type,
    entity_id,
    event_type,
    summary,
    payload,
    related
  )
  values (
    p_org_id,
    auth.uid(),
    v_actor_membership_id,
    p_entity_type,
    p_entity_id,
    p_event_type,
    p_summary,
    coalesce(p_payload, '{}'::jsonb),
    v_related
  );
end;
$$;

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

  -- change builders (whitelisted, to avoid dumping large/sensitive blobs)
  v_changes jsonb := '{}'::jsonb;
  v_table text := lower(tg_table_name);
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

  -- Stable linkage for timelines/feeds
  if v_table = 'dogs' then
    v_related := v_related || jsonb_build_object('dog_id', v_entity_id::text);
  elsif v_table in ('transports', 'medical_records', 'expenses', 'dog_photos') then
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
      end if;
    else
      v_related := v_related || jsonb_build_object('entity_type', new.entity_type, 'entity_id', new.entity_id::text);
      if lower(new.entity_type) in ('dog', 'dogs') then
        v_related := v_related || jsonb_build_object('dog_id', new.entity_id::text);
      end if;
    end if;
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
      v_payload := jsonb_build_object(
        'stage', new.stage,
        'location', new.location
      );
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
      else
        -- whitelisted diffs
        if old.name is distinct from new.name then
          v_changes := v_changes || jsonb_build_object('name', jsonb_build_object('from', old.name, 'to', new.name));
        end if;
        if old.location is distinct from new.location then
          v_changes := v_changes || jsonb_build_object('location', jsonb_build_object('from', old.location, 'to', new.location));
        end if;
        if old.description is distinct from new.description then
          v_changes := v_changes || jsonb_build_object('description', jsonb_build_object('from', old.description, 'to', new.description));
        end if;
        if old.foster_contact_id is distinct from new.foster_contact_id then
          v_changes := v_changes || jsonb_build_object('foster_contact_id', jsonb_build_object('from', old.foster_contact_id, 'to', new.foster_contact_id));
        end if;
        if old.responsible_contact_id is distinct from new.responsible_contact_id then
          v_changes := v_changes || jsonb_build_object('responsible_contact_id', jsonb_build_object('from', old.responsible_contact_id, 'to', new.responsible_contact_id));
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
      else
        if old.from_location is distinct from new.from_location then
          v_changes := v_changes || jsonb_build_object('from_location', jsonb_build_object('from', old.from_location, 'to', new.from_location));
        end if;
        if old.to_location is distinct from new.to_location then
          v_changes := v_changes || jsonb_build_object('to_location', jsonb_build_object('from', old.to_location, 'to', new.to_location));
        end if;
        if old.assigned_contact_id is distinct from new.assigned_contact_id then
          v_changes := v_changes || jsonb_build_object('assigned_contact_id', jsonb_build_object('from', old.assigned_contact_id, 'to', new.assigned_contact_id));
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
    elsif tg_op = 'DELETE' then
      v_event_type := 'transport.deleted';
      v_summary := 'Transport deleted';
      v_payload := '{}'::jsonb;
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

