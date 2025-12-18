-- FAFIQ / RescueOps schema + RLS + audit (aligned to docs/schema.md and docs/rls.md)
-- Date: 2025-12-18

-- Extensions
create extension if not exists pgcrypto;
create extension if not exists citext;

-- Utility: keep updated_at fresh on updates
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Utility: seed org settings defaults when none provided
create or replace function public.set_org_settings_defaults()
returns trigger
language plpgsql
as $$
begin
  if new.settings is null or new.settings = '{}'::jsonb then
    new.settings := jsonb_build_object(
      'dog_stages', jsonb_build_array('Intake', 'In Foster', 'Medical', 'Transport', 'Adopted'),
      'transport_statuses', jsonb_build_array('Requested', 'Scheduled', 'In Progress', 'Done', 'Canceled')
    );
  end if;
  return new;
end;
$$;

-- Tables
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug citext unique,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  roles text[] not null default '{}'::text[],
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create index if not exists memberships_org_id_idx on public.memberships(org_id);
create index if not exists memberships_user_id_idx on public.memberships(user_id);
create index if not exists memberships_roles_gin on public.memberships using gin(roles);

create table if not exists public.dogs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  stage text not null,
  location text,
  description text,
  medical_notes text,
  behavioral_notes text,
  responsible_membership_id uuid references public.memberships(id),
  foster_membership_id uuid references public.memberships(id),
  budget_limit numeric(12,2),
  extra_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_membership_id uuid references public.memberships(id),
  updated_by_membership_id uuid references public.memberships(id)
);

create index if not exists dogs_org_id_idx on public.dogs(org_id);
create index if not exists dogs_org_stage_idx on public.dogs(org_id, stage);

create table if not exists public.transports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  dog_id uuid references public.dogs(id) on delete set null,
  from_location text,
  to_location text,
  status text not null,
  assigned_membership_id uuid references public.memberships(id),
  window_start timestamptz,
  window_end timestamptz,
  notes text,
  extra_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_membership_id uuid references public.memberships(id),
  updated_by_membership_id uuid references public.memberships(id)
);

create index if not exists transports_org_id_idx on public.transports(org_id);
create index if not exists transports_org_status_idx on public.transports(org_id, status);

create table if not exists public.medical_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  dog_id uuid not null references public.dogs(id) on delete cascade,
  record_type text not null,
  occurred_on date,
  description text,
  cost numeric(12,2),
  extra_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_membership_id uuid references public.memberships(id),
  updated_by_membership_id uuid references public.memberships(id)
);

create index if not exists medical_records_org_id_idx on public.medical_records(org_id);
create index if not exists medical_records_dog_id_idx on public.medical_records(dog_id);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  dog_id uuid references public.dogs(id) on delete set null,
  category text not null,
  amount numeric(12,2) not null,
  incurred_on date not null,
  notes text,
  extra_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_membership_id uuid references public.memberships(id),
  updated_by_membership_id uuid references public.memberships(id)
);

create index if not exists expenses_org_id_idx on public.expenses(org_id);
create index if not exists expenses_dog_id_idx on public.expenses(dog_id);

create table if not exists public.dog_photos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  dog_id uuid not null references public.dogs(id) on delete cascade,
  storage_bucket text not null default 'dog-photos',
  storage_path text not null,
  caption text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  created_by_membership_id uuid references public.memberships(id)
);

create index if not exists dog_photos_org_id_idx on public.dog_photos(org_id);
create index if not exists dog_photos_dog_id_idx on public.dog_photos(dog_id);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  storage_bucket text not null default 'documents',
  storage_path text not null,
  filename text,
  mime_type text,
  description text,
  created_at timestamptz not null default now(),
  created_by_membership_id uuid references public.memberships(id)
);

create index if not exists documents_org_id_idx on public.documents(org_id);
create index if not exists documents_entity_idx on public.documents(org_id, entity_type, entity_id);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  created_at timestamptz not null default now(),
  actor_user_id uuid references auth.users(id),
  actor_membership_id uuid references public.memberships(id),
  entity_type text not null,
  entity_id uuid not null,
  event_type text not null,
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  related jsonb not null default '{}'::jsonb
);

create index if not exists activity_events_org_created_idx on public.activity_events(org_id, created_at desc);
create index if not exists activity_events_entity_idx on public.activity_events(org_id, entity_type, entity_id, created_at desc);

-- RLS helpers (after tables exist)
create or replace function public.is_active_org_member(target_org_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.memberships m
    where m.org_id = target_org_id
      and m.user_id = auth.uid()
      and m.active = true
  );
$$;

create or replace function public.has_role(target_org_id uuid, role text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.memberships m
    where m.org_id = target_org_id
      and m.user_id = auth.uid()
      and m.active = true
      and role = any(m.roles)
  );
$$;

-- Audit helper and trigger (after activity_events table exists)
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
begin
  select id into v_actor_membership_id
  from public.memberships
  where org_id = p_org_id
    and user_id = auth.uid()
    and active = true
  limit 1;

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
    coalesce(p_related, '{}'::jsonb)
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
  v_payload jsonb;
  v_name text;
begin
  if tg_op = 'DELETE' then
    v_org_id := old.org_id;
    v_entity_id := old.id;
    v_payload := jsonb_build_object('old', to_jsonb(old));
    if to_jsonb(old) ? 'name' then
      v_name := old.name;
    end if;
  else
    v_org_id := new.org_id;
    v_entity_id := new.id;
    if tg_op = 'UPDATE' then
      v_payload := jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new));
    else
      v_payload := jsonb_build_object('new', to_jsonb(new));
    end if;
    if to_jsonb(new) ? 'name' then
      v_name := new.name;
    end if;
  end if;

  v_event_type := lower(tg_table_name) || '_' || lower(tg_op);
  if v_name is not null then
    v_summary := format('%s %s %s', initcap(tg_table_name), v_name, lower(tg_op));
  else
    v_summary := format('%s %s', initcap(tg_table_name), lower(tg_op));
  end if;

  perform public.log_activity_event(
    v_org_id,
    tg_table_name,
    v_entity_id,
    v_event_type,
    v_summary,
    v_payload
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- Triggers: updated_at
drop trigger if exists set_updated_at_profiles on public.profiles;
drop trigger if exists set_updated_at_orgs on public.orgs;
drop trigger if exists set_updated_at_memberships on public.memberships;
drop trigger if exists set_updated_at_dogs on public.dogs;
drop trigger if exists set_updated_at_transports on public.transports;
drop trigger if exists set_updated_at_medical_records on public.medical_records;
drop trigger if exists set_updated_at_expenses on public.expenses;

create trigger set_updated_at_profiles
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_updated_at_orgs
before update on public.orgs
for each row execute function public.set_updated_at();

create trigger set_updated_at_memberships
before update on public.memberships
for each row execute function public.set_updated_at();

create trigger set_updated_at_dogs
before update on public.dogs
for each row execute function public.set_updated_at();

create trigger set_updated_at_transports
before update on public.transports
for each row execute function public.set_updated_at();

create trigger set_updated_at_medical_records
before update on public.medical_records
for each row execute function public.set_updated_at();

create trigger set_updated_at_expenses
before update on public.expenses
for each row execute function public.set_updated_at();

-- Trigger: org settings defaults
drop trigger if exists set_org_settings_defaults_trigger on public.orgs;
create trigger set_org_settings_defaults_trigger
before insert on public.orgs
for each row execute function public.set_org_settings_defaults();

-- RLS enablement
alter table public.orgs enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.dogs enable row level security;
alter table public.transports enable row level security;
alter table public.medical_records enable row level security;
alter table public.expenses enable row level security;
alter table public.dog_photos enable row level security;
alter table public.documents enable row level security;
alter table public.activity_events enable row level security;

-- Profiles
drop policy if exists "users read own profile" on public.profiles;
drop policy if exists "users update own profile" on public.profiles;

create policy "users read own profile"
on public.profiles
for select
using (user_id = auth.uid());

create policy "users update own profile"
on public.profiles
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Policies: orgs
drop policy if exists "members read org" on public.orgs;
drop policy if exists "admins manage org" on public.orgs;

create policy "members read org"
on public.orgs
for select
using (public.is_active_org_member(id));

create policy "admins manage org"
on public.orgs
for update
using (public.has_role(id, 'admin'))
with check (public.has_role(id, 'admin'));

-- Policies: memberships
drop policy if exists "users read own memberships" on public.memberships;
drop policy if exists "admins manage memberships" on public.memberships;

create policy "users read own memberships"
on public.memberships
for select
using (user_id = auth.uid());

create policy "admins manage memberships"
on public.memberships
for all
using (public.has_role(org_id, 'admin'))
with check (public.has_role(org_id, 'admin'));

-- Policies: dogs
drop policy if exists "org members can read dogs" on public.dogs;
drop policy if exists "org members can insert dogs" on public.dogs;
drop policy if exists "org members can update dogs" on public.dogs;
drop policy if exists "admins can delete dogs" on public.dogs;

create policy "org members can read dogs"
on public.dogs
for select
using (public.is_active_org_member(org_id));

create policy "org members can insert dogs"
on public.dogs
for insert
with check (public.is_active_org_member(org_id));

create policy "org members can update dogs"
on public.dogs
for update
using (public.is_active_org_member(org_id))
with check (public.is_active_org_member(org_id));

create policy "admins can delete dogs"
on public.dogs
for delete
using (public.has_role(org_id, 'admin'));

-- Policies: transports
drop policy if exists "org members can read transports" on public.transports;
drop policy if exists "org members can insert transports" on public.transports;
drop policy if exists "org members can update transports" on public.transports;
drop policy if exists "admins can delete transports" on public.transports;

create policy "org members can read transports"
on public.transports
for select
using (public.is_active_org_member(org_id));

create policy "org members can insert transports"
on public.transports
for insert
with check (public.is_active_org_member(org_id));

create policy "org members can update transports"
on public.transports
for update
using (public.is_active_org_member(org_id))
with check (public.is_active_org_member(org_id));

create policy "admins can delete transports"
on public.transports
for delete
using (public.has_role(org_id, 'admin'));

-- Policies: medical_records
drop policy if exists "org members can read medical_records" on public.medical_records;
drop policy if exists "org members can insert medical_records" on public.medical_records;
drop policy if exists "org members can update medical_records" on public.medical_records;
drop policy if exists "admins can delete medical_records" on public.medical_records;

create policy "org members can read medical_records"
on public.medical_records
for select
using (public.is_active_org_member(org_id));

create policy "org members can insert medical_records"
on public.medical_records
for insert
with check (public.is_active_org_member(org_id));

create policy "org members can update medical_records"
on public.medical_records
for update
using (public.is_active_org_member(org_id))
with check (public.is_active_org_member(org_id));

create policy "admins can delete medical_records"
on public.medical_records
for delete
using (public.has_role(org_id, 'admin'));

-- Policies: expenses
drop policy if exists "org members can read expenses" on public.expenses;
drop policy if exists "org members can insert expenses" on public.expenses;
drop policy if exists "org members can update expenses" on public.expenses;
drop policy if exists "admins can delete expenses" on public.expenses;

create policy "org members can read expenses"
on public.expenses
for select
using (public.is_active_org_member(org_id));

create policy "org members can insert expenses"
on public.expenses
for insert
with check (public.is_active_org_member(org_id));

create policy "org members can update expenses"
on public.expenses
for update
using (public.is_active_org_member(org_id))
with check (public.is_active_org_member(org_id));

create policy "admins can delete expenses"
on public.expenses
for delete
using (public.has_role(org_id, 'admin'));

-- Policies: dog_photos
drop policy if exists "org members can read dog_photos" on public.dog_photos;
drop policy if exists "org members can insert dog_photos" on public.dog_photos;
drop policy if exists "org members can update dog_photos" on public.dog_photos;
drop policy if exists "admins can delete dog_photos" on public.dog_photos;

create policy "org members can read dog_photos"
on public.dog_photos
for select
using (public.is_active_org_member(org_id));

create policy "org members can insert dog_photos"
on public.dog_photos
for insert
with check (public.is_active_org_member(org_id));

create policy "org members can update dog_photos"
on public.dog_photos
for update
using (public.is_active_org_member(org_id))
with check (public.is_active_org_member(org_id));

create policy "admins can delete dog_photos"
on public.dog_photos
for delete
using (public.has_role(org_id, 'admin'));

-- Policies: documents
drop policy if exists "org members can read documents" on public.documents;
drop policy if exists "org members can insert documents" on public.documents;
drop policy if exists "org members can update documents" on public.documents;
drop policy if exists "admins can delete documents" on public.documents;

create policy "org members can read documents"
on public.documents
for select
using (public.is_active_org_member(org_id));

create policy "org members can insert documents"
on public.documents
for insert
with check (public.is_active_org_member(org_id));

create policy "org members can update documents"
on public.documents
for update
using (public.is_active_org_member(org_id))
with check (public.is_active_org_member(org_id));

create policy "admins can delete documents"
on public.documents
for delete
using (public.has_role(org_id, 'admin'));

-- Policies: activity_events (append-only)
drop policy if exists "org members can read activity_events" on public.activity_events;
drop policy if exists "org members can insert activity_events" on public.activity_events;

create policy "org members can read activity_events"
on public.activity_events
for select
using (public.is_active_org_member(org_id));

create policy "org members can insert activity_events"
on public.activity_events
for insert
with check (public.is_active_org_member(org_id));

-- Audit triggers (all org-scoped tables)
drop trigger if exists audit_dogs on public.dogs;
drop trigger if exists audit_transports on public.transports;
drop trigger if exists audit_medical_records on public.medical_records;
drop trigger if exists audit_expenses on public.expenses;
drop trigger if exists audit_dog_photos on public.dog_photos;
drop trigger if exists audit_documents on public.documents;
drop trigger if exists audit_memberships on public.memberships;

create trigger audit_dogs
after insert or update or delete on public.dogs
for each row execute function public.audit_activity();

create trigger audit_transports
after insert or update or delete on public.transports
for each row execute function public.audit_activity();

create trigger audit_medical_records
after insert or update or delete on public.medical_records
for each row execute function public.audit_activity();

create trigger audit_expenses
after insert or update or delete on public.expenses
for each row execute function public.audit_activity();

create trigger audit_dog_photos
after insert or update or delete on public.dog_photos
for each row execute function public.audit_activity();

create trigger audit_documents
after insert or update or delete on public.documents
for each row execute function public.audit_activity();

create trigger audit_memberships
after insert or update or delete on public.memberships
for each row execute function public.audit_activity();
