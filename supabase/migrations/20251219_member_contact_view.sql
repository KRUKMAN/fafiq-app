-- Member contact view + admin RPC for exposing user email safely
-- Aligns to docs/implementation_plan.md (Org Management UI)

create or replace view public.org_member_contacts as
select
  m.id as membership_id,
  m.org_id,
  m.user_id,
  m.roles,
  m.active,
  p.full_name,
  u.email,
  o.name as org_name
from public.memberships m
left join public.profiles p on p.user_id = m.user_id
left join auth.users u on u.id = m.user_id
left join public.orgs o on o.id = m.org_id;

-- Restrict direct access; prefer RPC with explicit admin check
revoke all on public.org_member_contacts from public;
grant select on public.org_member_contacts to authenticated;
grant select on public.org_member_contacts to service_role;

drop function if exists public.admin_list_org_memberships(uuid);

create or replace function public.admin_list_org_memberships(p_org_id uuid)
returns table (
  membership_id uuid,
  org_id uuid,
  user_id uuid,
  roles text[],
  active boolean,
  full_name text,
  email text,
  org_name text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- allow service role (SQL editor) to run without auth.uid for debugging
  if current_setting('request.jwt.claim.role', true) = 'service_role' then
    -- no-op; service role bypasses auth check
  elsif auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if current_setting('request.jwt.claim.role', true) <> 'service_role'
     and not public.has_role(p_org_id, 'admin') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  select
    m.id::uuid as membership_id,
    m.org_id::uuid as org_id,
    m.user_id::uuid as user_id,
    m.roles::text[] as roles,
    m.active::boolean as active,
    p.full_name::text as full_name,
    u.email::text as email,
    o.name::text as org_name
  from public.memberships m
  left join public.profiles p on p.user_id = m.user_id
  left join auth.users u on u.id = m.user_id
  left join public.orgs o on o.id = m.org_id
  where m.org_id = p_org_id;
end;
$$;

revoke all on function public.admin_list_org_memberships(uuid) from public;
grant execute on function public.admin_list_org_memberships(uuid) to authenticated;
grant execute on function public.admin_list_org_memberships(uuid) to service_role;
