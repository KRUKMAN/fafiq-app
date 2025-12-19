-- Org invites + email-based admin invite RPCs
create extension if not exists pgcrypto;

create table if not exists public.org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  email citext not null,
  full_name text,
  roles text[] not null default '{}'::text[],
  status text not null default 'pending', -- pending, accepted, added_existing
  token text not null default encode(extensions.gen_random_bytes(16), 'hex'),
  invited_by_membership_id uuid references public.memberships(id),
  accepted_user_id uuid references auth.users(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, email)
);

create index if not exists org_invites_org_id_idx on public.org_invites(org_id);
create index if not exists org_invites_email_idx on public.org_invites(lower(email));

alter table public.org_invites enable row level security;

drop policy if exists "admins manage org_invites" on public.org_invites;
drop policy if exists "admins read org_invites" on public.org_invites;

create policy "admins read org_invites"
on public.org_invites
for select
using (public.has_role(org_id, 'admin'));

create policy "admins manage org_invites"
on public.org_invites
for all
using (public.has_role(org_id, 'admin'))
with check (public.has_role(org_id, 'admin'));

drop trigger if exists set_updated_at_org_invites on public.org_invites;
create trigger set_updated_at_org_invites
before update on public.org_invites
for each row execute function public.set_updated_at();

create or replace function public.admin_invite_member_by_email(
  p_org_id uuid,
  p_email text,
  p_roles text[] default '{}'::text[],
  p_full_name text default null
)
returns table (
  status text,
  membership_id uuid,
  invite_id uuid,
  user_id uuid,
  email text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email citext := lower(trim(p_email));
  v_roles text[] := coalesce(p_roles, '{}'::text[]);
  v_user_id uuid;
  v_membership_id uuid;
  v_invite_id uuid;
  v_invited_by uuid;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role'
     and not public.has_role(p_org_id, 'admin') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select id into v_invited_by
  from public.memberships
  where org_id = p_org_id
    and user_id = auth.uid()
    and active = true
  limit 1;

  select id into v_user_id from auth.users where lower(email) = v_email limit 1;

  if found and v_user_id is not null then
    insert into public.profiles (user_id, full_name)
    values (v_user_id, p_full_name)
    on conflict (user_id) do update
      set full_name = coalesce(excluded.full_name, profiles.full_name);

    insert into public.memberships (org_id, user_id, roles, active)
    values (p_org_id, v_user_id, v_roles, true)
    on conflict (org_id, user_id) do update
      set roles = excluded.roles, active = true
    returning id into v_membership_id;

    update public.org_invites
    set status = 'added_existing',
        accepted_user_id = v_user_id,
        accepted_at = now(),
        updated_at = now()
    where org_id = p_org_id and lower(email) = v_email;

    status := 'added_existing';
    membership_id := v_membership_id;
    invite_id := null;
    user_id := v_user_id;
    email := v_email::text;
    return next;
    return;
  end if;

  insert into public.org_invites (org_id, email, full_name, roles, status, invited_by_membership_id)
  values (p_org_id, v_email, p_full_name, v_roles, 'pending', v_invited_by)
  on conflict (org_id, email) do update
    set roles = excluded.roles,
        full_name = coalesce(excluded.full_name, org_invites.full_name),
        status = 'pending',
        invited_by_membership_id = coalesce(excluded.invited_by_membership_id, org_invites.invited_by_membership_id)
  returning id into v_invite_id;

  status := 'pending';
  membership_id := null;
  invite_id := v_invite_id;
  user_id := null;
  email := v_email::text;
  return next;
end;
$$;

revoke all on function public.admin_invite_member_by_email(uuid, text, text[], text) from public;
grant execute on function public.admin_invite_member_by_email(uuid, text, text[], text) to authenticated;
grant execute on function public.admin_invite_member_by_email(uuid, text, text[], text) to service_role;

create or replace function public.accept_org_invites_for_current_user()
returns table (
  org_id uuid,
  invite_id uuid,
  membership_id uuid,
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
  v_invite_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select email into v_email from auth.users where id = v_user_id limit 1;

  for v_invite_id, org_id in
    select id, org_id
    from public.org_invites
    where lower(email) = lower(v_email)
      and status = 'pending'
  loop
    insert into public.memberships (org_id, user_id, roles, active)
    select org_id, v_user_id, roles, true
    from public.org_invites
    where id = v_invite_id
    on conflict (org_id, user_id) do update
      set roles = excluded.roles,
          active = true
    returning id into v_membership_id;

    update public.org_invites
    set status = 'accepted',
        accepted_user_id = v_user_id,
        accepted_at = now()
    where id = v_invite_id;

    status := 'accepted';
    invite_id := v_invite_id;
    membership_id := v_membership_id;
    return next;
  end loop;
end;
$$;

revoke all on function public.accept_org_invites_for_current_user() from public;
grant execute on function public.accept_org_invites_for_current_user() to authenticated;
grant execute on function public.accept_org_invites_for_current_user() to service_role;
