-- Harden org_member_contacts view: remove authenticated exposure and ensure invoker context

drop view if exists public.org_member_contacts;

create or replace view public.org_member_contacts
with (security_invoker = true, security_barrier = true) as
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

-- Lock down access; app should use admin_list_org_memberships RPC instead.
revoke all on public.org_member_contacts from public;
revoke all on public.org_member_contacts from authenticated;
revoke all on public.org_member_contacts from anon;
grant select on public.org_member_contacts to service_role;
