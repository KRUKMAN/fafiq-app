-- Supabase verification checklist for this repo's expected schema.
-- Paste into Supabase SQL Editor and run as service_role (default in dashboard).

-- 1) Core object existence
select
  to_regclass('public.org_contacts') is not null as org_contacts_table_exists,
  to_regclass('public.orgs') is not null as orgs_table_exists,
  to_regclass('public.memberships') is not null as memberships_table_exists,
  to_regclass('public.dogs') is not null as dogs_table_exists,
  to_regclass('public.transports') is not null as transports_table_exists;

-- 2) org_contacts columns (spot-check)
select column_name, data_type, udt_name, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'org_contacts'
order by ordinal_position;

-- 3) Added contact assignment columns exist
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('dogs','transports')
  and column_name in ('responsible_contact_id','foster_contact_id','assigned_contact_id')
order by table_name, column_name;

-- 4) RLS enabled on org_contacts
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('org_contacts');

-- 5) Policies on org_contacts
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'org_contacts'
order by policyname;

-- 6) Triggers on org_contacts (updated_at + audit)
select tgname, pg_get_triggerdef(t.oid) as trigger_def
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'org_contacts' and not t.tgisinternal
order by tgname;

-- 7) Sync triggers on memberships/profiles (contact alignment)
select c.relname as table_name, t.tgname, pg_get_triggerdef(t.oid) as trigger_def
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('memberships','profiles')
  and t.tgname in ('sync_org_contact_from_membership','sync_org_contact_from_profile')
order by c.relname, t.tgname;

-- 8) Required RPCs exist
select
  to_regprocedure('public.link_my_contact_in_org(uuid)') is not null as has_link_my_contact_in_org,
  to_regprocedure('public.admin_link_contact_to_user(uuid, uuid, uuid)') is not null as has_admin_link_contact_to_user,
  to_regprocedure('public.accept_org_invites_for_current_user()') is not null as has_accept_invites_rpc;

-- 9) RPC grants (should include authenticated)
select routine_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in ('link_my_contact_in_org','admin_link_contact_to_user','accept_org_invites_for_current_user')
order by routine_name, grantee;

-- 10) org_member_contacts exposure check (should NOT grant select to authenticated/anon)
select grantee, privilege_type
from information_schema.table_privileges
where table_schema = 'public' and table_name = 'org_member_contacts'
order by grantee, privilege_type;

-- 11) org_member_contacts security options (should include security_invoker/security_barrier in reloptions after hardening)
select c.relname, c.reloptions
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'org_member_contacts';

-- 12) Quick data sanity (counts)
select
  (select count(*) from public.org_contacts) as org_contacts_count,
  (select count(*) from public.memberships) as memberships_count;
