-- Full sanity check: schema objects, columns, RLS/policies, triggers, RPCs, and exposure risks.
-- Paste into Supabase SQL Editor and run (service_role recommended so everything is visible).

-- 1) Expected tables exist
with expected_tables as (
  select unnest(array[
    'profiles',
    'orgs',
    'memberships',
    'org_invites',
    'org_contacts',
    'dogs',
    'transports',
    'medical_records',
    'expenses',
    'dog_photos',
    'documents',
    'activity_events'
  ]) as table_name
)
select
  e.table_name,
  to_regclass('public.' || e.table_name) is not null as exists
from expected_tables e
order by e.table_name;

-- 2) Column drift checks (missing/extra vs what the app/docs assume)
-- Add columns here if you extend the schema; extra DB columns are allowed but are reported for awareness.
with expected_columns as (
  select * from (values
    -- profiles
    ('profiles','user_id'),
    ('profiles','full_name'),
    ('profiles','avatar_url'),
    ('profiles','created_at'),
    ('profiles','updated_at'),

    -- orgs
    ('orgs','id'),
    ('orgs','name'),
    ('orgs','slug'),
    ('orgs','settings'),
    ('orgs','created_at'),
    ('orgs','updated_at'),

    -- memberships
    ('memberships','id'),
    ('memberships','org_id'),
    ('memberships','user_id'),
    ('memberships','roles'),
    ('memberships','active'),
    ('memberships','created_at'),
    ('memberships','updated_at'),

    -- org_invites
    ('org_invites','id'),
    ('org_invites','org_id'),
    ('org_invites','email'),
    ('org_invites','full_name'),
    ('org_invites','roles'),
    ('org_invites','status'),
    ('org_invites','token'),
    ('org_invites','invited_by_membership_id'),
    ('org_invites','accepted_user_id'),
    ('org_invites','accepted_at'),
    ('org_invites','created_at'),
    ('org_invites','updated_at'),

    -- org_contacts
    ('org_contacts','id'),
    ('org_contacts','org_id'),
    ('org_contacts','kind'),
    ('org_contacts','display_name'),
    ('org_contacts','email'),
    ('org_contacts','phone'),
    ('org_contacts','roles'),
    ('org_contacts','linked_user_id'),
    ('org_contacts','linked_membership_id'),
    ('org_contacts','address'),
    ('org_contacts','extra_fields'),
    ('org_contacts','created_at'),
    ('org_contacts','updated_at'),
    ('org_contacts','created_by_membership_id'),
    ('org_contacts','updated_by_membership_id'),

    -- dogs
    ('dogs','id'),
    ('dogs','org_id'),
    ('dogs','name'),
    ('dogs','stage'),
    ('dogs','location'),
    ('dogs','description'),
    ('dogs','medical_notes'),
    ('dogs','behavioral_notes'),
    ('dogs','responsible_membership_id'),
    ('dogs','foster_membership_id'),
    ('dogs','responsible_contact_id'),
    ('dogs','foster_contact_id'),
    ('dogs','budget_limit'),
    ('dogs','extra_fields'),
    ('dogs','created_at'),
    ('dogs','updated_at'),
    ('dogs','created_by_membership_id'),
    ('dogs','updated_by_membership_id'),

    -- transports
    ('transports','id'),
    ('transports','org_id'),
    ('transports','dog_id'),
    ('transports','from_location'),
    ('transports','to_location'),
    ('transports','status'),
    ('transports','assigned_membership_id'),
    ('transports','assigned_contact_id'),
    ('transports','window_start'),
    ('transports','window_end'),
    ('transports','notes'),
    ('transports','extra_fields'),
    ('transports','created_at'),
    ('transports','updated_at'),
    ('transports','created_by_membership_id'),
    ('transports','updated_by_membership_id'),

    -- medical_records
    ('medical_records','id'),
    ('medical_records','org_id'),
    ('medical_records','dog_id'),
    ('medical_records','record_type'),
    ('medical_records','occurred_on'),
    ('medical_records','description'),
    ('medical_records','cost'),
    ('medical_records','extra_fields'),
    ('medical_records','created_at'),
    ('medical_records','updated_at'),
    ('medical_records','created_by_membership_id'),
    ('medical_records','updated_by_membership_id'),

    -- expenses
    ('expenses','id'),
    ('expenses','org_id'),
    ('expenses','dog_id'),
    ('expenses','category'),
    ('expenses','amount'),
    ('expenses','incurred_on'),
    ('expenses','notes'),
    ('expenses','extra_fields'),
    ('expenses','created_at'),
    ('expenses','updated_at'),
    ('expenses','created_by_membership_id'),
    ('expenses','updated_by_membership_id'),

    -- dog_photos
    ('dog_photos','id'),
    ('dog_photos','org_id'),
    ('dog_photos','dog_id'),
    ('dog_photos','storage_bucket'),
    ('dog_photos','storage_path'),
    ('dog_photos','caption'),
    ('dog_photos','is_primary'),
    ('dog_photos','created_at'),
    ('dog_photos','created_by_membership_id'),

    -- documents
    ('documents','id'),
    ('documents','org_id'),
    ('documents','entity_type'),
    ('documents','entity_id'),
    ('documents','storage_bucket'),
    ('documents','storage_path'),
    ('documents','filename'),
    ('documents','mime_type'),
    ('documents','description'),
    ('documents','created_at'),
    ('documents','created_by_membership_id'),

    -- activity_events
    ('activity_events','id'),
    ('activity_events','org_id'),
    ('activity_events','created_at'),
    ('activity_events','actor_user_id'),
    ('activity_events','actor_membership_id'),
    ('activity_events','entity_type'),
    ('activity_events','entity_id'),
    ('activity_events','event_type'),
    ('activity_events','summary'),
    ('activity_events','payload'),
    ('activity_events','related')
  ) as t(table_name, column_name)
),
actual_columns as (
  select table_name, column_name
  from information_schema.columns
  where table_schema = 'public'
),
missing as (
  select e.table_name, e.column_name
  from expected_columns e
  left join actual_columns a using (table_name, column_name)
  where a.column_name is null
),
extra as (
  select a.table_name, a.column_name
  from actual_columns a
  left join expected_columns e using (table_name, column_name)
  where e.column_name is null
    and a.table_name in (select distinct table_name from expected_columns)
)
select 'missing_columns' as kind, table_name, column_name
from missing
union all
select 'extra_columns' as kind, table_name, column_name
from extra
order by kind, table_name, column_name;

-- 3) RLS enabled on all org-scoped business tables
with expected_rls as (
  select unnest(array[
    'orgs','profiles','memberships','org_invites','org_contacts',
    'dogs','transports','medical_records','expenses','dog_photos','documents','activity_events'
  ]) as table_name
)
select
  e.table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from expected_rls e
join pg_class c on c.relname = e.table_name
join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
order by e.table_name;

-- 4) Policies (count + list) for key tables
select tablename, count(*) as policy_count
from pg_policies
where schemaname = 'public'
  and tablename in (
    'orgs','profiles','memberships','org_invites','org_contacts',
    'dogs','transports','activity_events','documents','dog_photos'
  )
group by tablename
order by tablename;

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('org_contacts','dogs','transports','activity_events','org_invites')
order by tablename, policyname;

-- 5) Triggers (audit + updated_at + sync)
select c.relname as table_name, t.tgname
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and not t.tgisinternal
  and (
    t.tgname like 'audit_%' or
    t.tgname like 'set_updated_at_%' or
    t.tgname like 'sync_org_contact_%'
  )
order by c.relname, t.tgname;

-- 6) Required functions/RPCs exist
select
  to_regprocedure('public.is_active_org_member(uuid)') is not null as has_is_active_org_member,
  to_regprocedure('public.has_role(uuid, text)') is not null as has_has_role,
  to_regprocedure('public.log_activity_event(uuid, text, uuid, text, text, jsonb, jsonb)') is not null as has_log_activity_event,
  to_regprocedure('public.link_my_contact_in_org(uuid)') is not null as has_link_my_contact_in_org,
  to_regprocedure('public.admin_link_contact_to_user(uuid, uuid, uuid)') is not null as has_admin_link_contact_to_user,
  to_regprocedure('public.admin_invite_member_by_email(uuid, text, text[], text)') is not null as has_admin_invite_by_email,
  to_regprocedure('public.accept_org_invites_for_current_user()') is not null as has_accept_org_invites;

-- 7) Grants sanity for the sensitive view (should NOT include anon/authenticated)
select grantee, privilege_type
from information_schema.table_privileges
where table_schema = 'public' and table_name = 'org_member_contacts'
order by grantee, privilege_type;
