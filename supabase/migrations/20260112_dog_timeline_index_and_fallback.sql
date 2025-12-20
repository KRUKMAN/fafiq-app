-- Performance: dog timeline should primarily filter by related.dog_id (indexed), with fallback for legacy events.

create index if not exists activity_events_org_related_dog_created_idx
on public.activity_events (org_id, (related->>'dog_id'), created_at desc);

create or replace function public.get_dog_timeline(
  p_org_id uuid,
  p_dog_id uuid,
  p_limit integer default 200
) returns setof public.activity_events
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_limit integer := coalesce(p_limit, 200);
begin
  if p_org_id is null or p_dog_id is null then
    raise exception 'p_org_id and p_dog_id are required' using errcode = '22000';
  end if;

  if v_limit < 0 then
    v_limit := 0;
  end if;
  if v_limit > 500 then
    v_limit := 500;
  end if;

  if current_setting('request.jwt.claim.role', true) <> 'service_role'
     and not public.is_active_org_member(p_org_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  select ae.*
  from public.activity_events ae
  where ae.org_id = p_org_id
    and (
      -- Fast path (new contract)
      ae.related->>'dog_id' = p_dog_id::text

      -- Backward-compatible fallback for older events where related wasn't populated yet
      or (
        (ae.entity_type in ('dogs', 'dog') and ae.entity_id = p_dog_id)
        or (
          ae.entity_type in ('transports', 'dog_photos', 'medical_records', 'expenses')
          and (
            (ae.payload->'new'->>'dog_id')::uuid = p_dog_id
            or (ae.payload->'after'->>'dog_id')::uuid = p_dog_id
            or (ae.payload->'before'->>'dog_id')::uuid = p_dog_id
            or (ae.payload->'old'->>'dog_id')::uuid = p_dog_id
          )
        )
        or (
          ae.entity_type = 'documents'
          and (
            ((ae.payload->'new'->>'entity_type') in ('dog', 'dogs') and (ae.payload->'new'->>'entity_id')::uuid = p_dog_id)
            or ((ae.payload->'after'->>'entity_type') in ('dog', 'dogs') and (ae.payload->'after'->>'entity_id')::uuid = p_dog_id)
            or ((ae.payload->'before'->>'entity_type') in ('dog', 'dogs') and (ae.payload->'before'->>'entity_id')::uuid = p_dog_id)
            or ((ae.payload->'old'->>'entity_type') in ('dog', 'dogs') and (ae.payload->'old'->>'entity_id')::uuid = p_dog_id)
          )
        )
      )
    )
  order by ae.created_at desc
  limit v_limit;
end;
$$;

