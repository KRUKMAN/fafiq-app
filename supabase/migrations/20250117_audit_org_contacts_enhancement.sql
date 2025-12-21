-- Audit Enhancement for org_contacts
-- Date: 2025-01-15
-- Purpose: Add explicit column change tracking for org_contacts in audit_activity() function

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
        v_payload := '{}'::jsonb;
      elsif old.stage is distinct from new.stage then
        v_event_type := 'dog.stage_changed';
        v_summary := format('Dog %s stage changed', coalesce(new.name, ''));
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
      v_summary := format('Transport created');
      v_payload := jsonb_build_object('status', new.status, 'from_location', new.from_location, 'to_location', new.to_location);
    elsif tg_op = 'UPDATE' then
      if old.status is distinct from new.status then
        v_event_type := 'transport.status_changed';
        v_summary := format('Transport status changed');
        v_payload := jsonb_build_object('from', old.status, 'to', new.status);
      else
        v_changes := '{}'::jsonb;
        if old.from_location is distinct from new.from_location then
          v_changes := v_changes || jsonb_build_object('from_location', jsonb_build_object('from', old.from_location, 'to', new.from_location));
        end if;
        if old.to_location is distinct from new.to_location then
          v_changes := v_changes || jsonb_build_object('to_location', jsonb_build_object('from', old.to_location, 'to', new.to_location));
        end if;
        if old.assigned_contact_id is distinct from new.assigned_contact_id then
          v_changes := v_changes || jsonb_build_object('assigned_contact_id', jsonb_build_object('from', old.assigned_contact_id, 'to', new.assigned_contact_id));
        end if;
        if old.assigned_membership_id is distinct from new.assigned_membership_id then
          v_changes := v_changes || jsonb_build_object('assigned_membership_id', jsonb_build_object('from', old.assigned_membership_id, 'to', new.assigned_membership_id));
        end if;

        v_event_type := 'transport.updated';
        v_summary := format('Transport updated');
        v_payload := case when v_changes = '{}'::jsonb then '{}'::jsonb else jsonb_build_object('changes', v_changes) end;
      end if;
    elsif tg_op = 'DELETE' then
      v_event_type := 'transport.deleted';
      v_summary := format('Transport deleted');
      v_payload := '{}'::jsonb;
    end if;
  elsif v_table = 'org_contacts' then
    if tg_op = 'INSERT' then
      v_event_type := 'contact.created';
      v_summary := format('Contact %s created', coalesce(new.display_name, ''));
      v_payload := jsonb_build_object('display_name', new.display_name, 'email', new.email, 'kind', new.kind);
    elsif tg_op = 'UPDATE' then
      v_changes := '{}'::jsonb;
      if old.display_name is distinct from new.display_name then
        v_changes := v_changes || jsonb_build_object('display_name', jsonb_build_object('from', old.display_name, 'to', new.display_name));
      end if;
      if old.email is distinct from new.email then
        v_changes := v_changes || jsonb_build_object('email', jsonb_build_object('from', old.email, 'to', new.email));
      end if;
      if old.phone is distinct from new.phone then
        v_changes := v_changes || jsonb_build_object('phone', jsonb_build_object('from', old.phone, 'to', new.phone));
      end if;
      if old.avatar_url is distinct from new.avatar_url then
        v_changes := v_changes || jsonb_build_object('avatar_url', jsonb_build_object('from', old.avatar_url, 'to', new.avatar_url));
      end if;
      if old.roles is distinct from new.roles then
        v_changes := v_changes || jsonb_build_object('roles', jsonb_build_object('from', old.roles, 'to', new.roles));
      end if;
      if old.linked_user_id is distinct from new.linked_user_id then
        v_changes := v_changes || jsonb_build_object('linked_user_id', jsonb_build_object('from', old.linked_user_id, 'to', new.linked_user_id));
      end if;

      v_event_type := 'contact.updated';
      v_summary := format('Contact %s updated', coalesce(new.display_name, ''));
      v_payload := case when v_changes = '{}'::jsonb then '{}'::jsonb else jsonb_build_object('changes', v_changes) end;
    elsif tg_op = 'DELETE' then
      v_event_type := 'contact.deleted';
      v_summary := format('Contact %s deleted', coalesce(old.display_name, ''));
      v_payload := '{}'::jsonb;
    end if;
  elsif v_table = 'medical_records' then
    if tg_op = 'INSERT' then
      v_event_type := 'medical.created';
      v_summary := format('Medical record created');
      v_payload := jsonb_build_object('record_type', new.record_type, 'occurred_on', new.occurred_on);
    elsif tg_op = 'DELETE' then
      v_event_type := 'medical.deleted';
      v_summary := format('Medical record deleted');
      v_payload := '{}'::jsonb;
    else
      v_event_type := 'medical.updated';
      v_summary := format('Medical record updated');
      v_payload := '{}'::jsonb;
    end if;
  elsif v_table = 'expenses' then
    if tg_op = 'INSERT' then
      v_event_type := 'expense.created';
      v_summary := format('Expense created');
      v_payload := jsonb_build_object('amount', new.amount, 'category', new.category);
    elsif tg_op = 'DELETE' then
      v_event_type := 'expense.deleted';
      v_summary := format('Expense deleted');
      v_payload := '{}'::jsonb;
    else
      v_event_type := 'expense.updated';
      v_summary := format('Expense updated');
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

