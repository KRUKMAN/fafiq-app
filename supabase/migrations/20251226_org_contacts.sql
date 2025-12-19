-- org_contacts: operational directory of people/homes that may or may not be app users.
-- Roles for authorization remain on memberships.roles[]; contacts.roles is for operational tagging/UI
-- and is kept in sync for linked users.

create extension if not exists citext;
create extension if not exists pgcrypto;

create table if not exists public.org_contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,

  kind text not null, -- person | home (MVP: text)
  display_name text not null,

  email citext,
  phone text,

  roles text[] not null default '{}'::text[],

  linked_user_id uuid references auth.users(id) on delete set null,
  linked_membership_id uuid references public.memberships(id) on delete set null,

  address jsonb not null default '{}'::jsonb,
  extra_fields jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_membership_id uuid references public.memberships(id),
  updated_by_membership_id uuid references public.memberships(id),

  unique (org_id, linked_user_id),
  unique (org_id, email)
);

create index if not exists org_contacts_org_id_idx on public.org_contacts(org_id);
create index if not exists org_contacts_roles_gin on public.org_contacts using gin(roles);
create index if not exists org_contacts_linked_user_idx on public.org_contacts(linked_user_id);

alter table public.org_contacts enable row level security;

-- Baseline policies: org members can CRUD within org.
drop policy if exists "org members can read org_contacts" on public.org_contacts;
drop policy if exists "org members can insert org_contacts" on public.org_contacts;
drop policy if exists "org members can update org_contacts" on public.org_contacts;
drop policy if exists "org members can delete org_contacts" on public.org_contacts;

create policy "org members can read org_contacts"
on public.org_contacts
for select
using (public.is_active_org_member(org_id));

create policy "org members can insert org_contacts"
on public.org_contacts
for insert
with check (public.is_active_org_member(org_id));

create policy "org members can update org_contacts"
on public.org_contacts
for update
using (public.is_active_org_member(org_id))
with check (public.is_active_org_member(org_id));

create policy "org members can delete org_contacts"
on public.org_contacts
for delete
using (public.is_active_org_member(org_id));

-- updated_at trigger
drop trigger if exists set_updated_at_org_contacts on public.org_contacts;
create trigger set_updated_at_org_contacts
before update on public.org_contacts
for each row execute function public.set_updated_at();

-- audit trigger (activity_events)
drop trigger if exists audit_org_contacts on public.org_contacts;
create trigger audit_org_contacts
after insert or update or delete on public.org_contacts
for each row execute function public.audit_activity();

-- Add "contact assignment" columns to core tables (keep membership FKs; add contact FKs)
alter table public.dogs
  add column if not exists responsible_contact_id uuid references public.org_contacts(id) on delete set null,
  add column if not exists foster_contact_id uuid references public.org_contacts(id) on delete set null;

alter table public.transports
  add column if not exists assigned_contact_id uuid references public.org_contacts(id) on delete set null;

-- Backfill contacts for existing memberships (service role / migration context)
insert into public.org_contacts (
  org_id,
  kind,
  display_name,
  email,
  roles,
  linked_user_id,
  linked_membership_id,
  address,
  extra_fields,
  created_by_membership_id,
  updated_by_membership_id
)
select
  m.org_id,
  'person',
  coalesce(p.full_name, split_part(u.email, '@', 1), 'User'),
  u.email,
  m.roles,
  m.user_id,
  m.id,
  '{}'::jsonb,
  '{}'::jsonb,
  m.id,
  m.id
from public.memberships m
left join public.profiles p on p.user_id = m.user_id
left join auth.users u on u.id = m.user_id
on conflict (org_id, linked_user_id) do update set
  linked_membership_id = excluded.linked_membership_id,
  roles = excluded.roles,
  display_name = excluded.display_name,
  email = excluded.email,
  updated_at = now();

-- Sync: membership changes -> contact upsert (linked users)
create or replace function public.sync_org_contact_from_membership()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email citext;
  v_full_name text;
begin
  select email into v_email from auth.users where id = new.user_id limit 1;
  select full_name into v_full_name from public.profiles where user_id = new.user_id limit 1;

  insert into public.org_contacts (
    org_id,
    kind,
    display_name,
    email,
    roles,
    linked_user_id,
    linked_membership_id,
    created_by_membership_id,
    updated_by_membership_id
  )
  values (
    new.org_id,
    'person',
    coalesce(v_full_name, split_part(v_email::text, '@', 1), 'User'),
    v_email,
    coalesce(new.roles, '{}'::text[]),
    new.user_id,
    new.id,
    new.id,
    new.id
  )
  on conflict (org_id, linked_user_id) do update set
    linked_membership_id = excluded.linked_membership_id,
    roles = excluded.roles,
    display_name = excluded.display_name,
    email = excluded.email,
    updated_by_membership_id = excluded.updated_by_membership_id,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_org_contact_from_membership on public.memberships;
create trigger sync_org_contact_from_membership
after insert or update of roles, active on public.memberships
for each row execute function public.sync_org_contact_from_membership();

-- Sync: profile name changes -> update all linked contacts display_name
create or replace function public.sync_org_contact_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.org_contacts
  set display_name = coalesce(new.full_name, display_name),
      updated_at = now()
  where linked_user_id = new.user_id;

  return new;
end;
$$;

drop trigger if exists sync_org_contact_from_profile on public.profiles;
create trigger sync_org_contact_from_profile
after insert or update of full_name on public.profiles
for each row execute function public.sync_org_contact_from_profile();

-- RPC: link a pre-created contact (by email) to the current user in an org.
drop function if exists public.link_my_contact_in_org(uuid);
create or replace function public.link_my_contact_in_org(p_org_id uuid)
returns table (
  contact_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_email citext;
  v_membership_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if not public.is_active_org_member(p_org_id) then
    raise exception 'Not a member of org' using errcode = '42501';
  end if;

  v_email := lower(coalesce((auth.jwt() ->> 'email')::text, ''))::citext;
  if v_email is null or v_email = '' then
    status := 'no_email';
    contact_id := null;
    return next;
    return;
  end if;

  select id into v_membership_id
  from public.memberships
  where org_id = p_org_id and user_id = v_user_id and active = true
  limit 1;

  if v_membership_id is null then
    raise exception 'No active membership' using errcode = '42501';
  end if;

  update public.org_contacts c
  set linked_user_id = v_user_id,
      linked_membership_id = v_membership_id,
      roles = (select roles from public.memberships where id = v_membership_id),
      updated_at = now()
  where c.org_id = p_org_id
    and c.linked_user_id is null
    and lower(c.email) = lower(v_email)
  returning c.id into contact_id;

  if contact_id is null then
    status := 'no_match';
  else
    status := 'linked';
  end if;
  return next;
end;
$$;

revoke all on function public.link_my_contact_in_org(uuid) from public;
grant execute on function public.link_my_contact_in_org(uuid) to authenticated;
grant execute on function public.link_my_contact_in_org(uuid) to service_role;

-- RPC: admin link contact to a user (and ensure membership exists).
drop function if exists public.admin_link_contact_to_user(uuid, uuid, uuid);
create or replace function public.admin_link_contact_to_user(
  p_org_id uuid,
  p_contact_id uuid,
  p_user_id uuid
)
returns table (
  contact_id uuid,
  membership_id uuid
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_membership_id uuid;
  v_contact_roles text[];
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role'
     and not public.has_role(p_org_id, 'admin') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select roles into v_contact_roles
  from public.org_contacts
  where id = p_contact_id and org_id = p_org_id
  limit 1;

  if v_contact_roles is null then
    raise exception 'Contact not found' using errcode = 'PGRST116';
  end if;

  insert into public.memberships (org_id, user_id, roles, active)
  values (p_org_id, p_user_id, coalesce(v_contact_roles, '{}'::text[]), true)
  on conflict (org_id, user_id) do update
    set roles = excluded.roles,
        active = true
  returning id into v_membership_id;

  update public.org_contacts
  set linked_user_id = p_user_id,
      linked_membership_id = v_membership_id,
      roles = (select roles from public.memberships where id = v_membership_id),
      updated_at = now()
  where id = p_contact_id and org_id = p_org_id;

  contact_id := p_contact_id;
  membership_id := v_membership_id;
  return next;
end;
$$;

revoke all on function public.admin_link_contact_to_user(uuid, uuid, uuid) from public;
grant execute on function public.admin_link_contact_to_user(uuid, uuid, uuid) to authenticated;
grant execute on function public.admin_link_contact_to_user(uuid, uuid, uuid) to service_role;

