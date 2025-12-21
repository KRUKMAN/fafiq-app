-- Generic notes table + RLS + audit + backfill from dog_notes.

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  entity_type text not null check (lower(entity_type) in ('dog', 'transport', 'contact')),
  entity_id uuid not null,
  body text not null,
  created_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id),
  created_by_membership_id uuid references public.memberships(id)
);

create index if not exists notes_org_id_idx on public.notes(org_id);
create index if not exists notes_entity_idx on public.notes(org_id, entity_type, entity_id, created_at desc);

alter table public.notes enable row level security;

create or replace function public.is_entity_in_org(
  p_org_id uuid,
  p_entity_type text,
  p_entity_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case lower(p_entity_type)
    when 'dog' then exists (
      select 1 from public.dogs d where d.id = p_entity_id and d.org_id = p_org_id
    )
    when 'transport' then exists (
      select 1 from public.transports t where t.id = p_entity_id and t.org_id = p_org_id
    )
    when 'contact' then exists (
      select 1 from public.org_contacts c where c.id = p_entity_id and c.org_id = p_org_id
    )
    else false
  end;
$$;

create or replace function public.set_note_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membership_id uuid;
begin
  if new.created_by_user_id is null then
    new.created_by_user_id := auth.uid();
  end if;

  if new.created_by_membership_id is null then
    select id into v_membership_id
    from public.memberships
    where org_id = new.org_id
      and user_id = auth.uid()
      and active = true
    limit 1;
    new.created_by_membership_id := v_membership_id;
  end if;

  return new;
end;
$$;

drop trigger if exists set_note_actor on public.notes;
create trigger set_note_actor
before insert on public.notes
for each row execute function public.set_note_actor();

drop policy if exists "org members can read notes" on public.notes;
drop policy if exists "org members can insert notes" on public.notes;
drop policy if exists "admins or creators can delete notes" on public.notes;

create policy "org members can read notes"
on public.notes
for select
using (
  public.is_active_org_member(org_id)
  and public.is_entity_in_org(org_id, entity_type, entity_id)
);

create policy "org members can insert notes"
on public.notes
for insert
with check (
  public.is_active_org_member(org_id)
  and public.is_entity_in_org(org_id, entity_type, entity_id)
);

create policy "admins or creators can delete notes"
on public.notes
for delete
using (
  public.has_role(org_id, 'admin')
  or created_by_user_id = auth.uid()
  or created_by_membership_id in (
    select id
    from public.memberships
    where org_id = notes.org_id
      and user_id = auth.uid()
      and active = true
  )
);

create or replace function public.audit_note()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_related jsonb := '{}'::jsonb;
  v_event_type text;
  v_summary text;
  v_body text;
begin
  if tg_op = 'DELETE' then
    v_body := old.body;
  else
    v_body := new.body;
  end if;

  if tg_op = 'INSERT' then
    v_event_type := 'note.added';
    v_summary := 'Note added';
  else
    v_event_type := 'note.deleted';
    v_summary := 'Note deleted';
  end if;

  if lower(coalesce(new.entity_type, old.entity_type)) = 'dog' then
    v_related := v_related || jsonb_build_object('dog_id', coalesce(new.entity_id, old.entity_id)::text);
  elsif lower(coalesce(new.entity_type, old.entity_type)) = 'transport' then
    v_related := v_related || jsonb_build_object('transport_id', coalesce(new.entity_id, old.entity_id)::text);
  elsif lower(coalesce(new.entity_type, old.entity_type)) = 'contact' then
    v_related := v_related || jsonb_build_object('contact_ids', jsonb_build_array(coalesce(new.entity_id, old.entity_id)::text));
  end if;

  perform public.log_activity_event(
    coalesce(new.org_id, old.org_id),
    'notes',
    coalesce(new.id, old.id),
    v_event_type,
    v_summary,
    jsonb_build_object('body', v_body, 'entity_type', coalesce(new.entity_type, old.entity_type)),
    v_related
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists audit_notes on public.notes;
create trigger audit_notes
after insert or delete on public.notes
for each row execute function public.audit_note();

-- Backfill dog_notes if present.
insert into public.notes (
  id,
  org_id,
  entity_type,
  entity_id,
  body,
  created_at,
  created_by_user_id,
  created_by_membership_id
)
select
  dn.id,
  dn.org_id,
  'dog',
  dn.dog_id,
  dn.body,
  dn.created_at,
  dn.created_by_user_id,
  dn.created_by_membership_id
from public.dog_notes dn
on conflict (id) do nothing;

drop trigger if exists audit_dog_notes on public.dog_notes;
drop table if exists public.dog_notes;
