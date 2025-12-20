# Database Schema (Draft)

This schema is a **draft baseline** aligned to `Fafik_System_Context.md` (authoritative). It enforces:

- **Modular monolith, SaaS-ready**: `org_id` tenant scoping on *all business tables*.
- **Membership-based authorization**: no global role on `profiles`; roles live on `memberships.roles[]`.
- **Single source of truth per dog**: one canonical `dogs` row; all related records reference `dogs.id`.
- **Customization without schema forks**: tenant-specific fields live in `jsonb` (`extra_fields` and `orgs.settings`), not per-tenant tables.

> Naming note: the authoritative context uses `org_id` everywhere. Any existing `tenant_id` usage in code should be migrated to `org_id`.

## Extensions / Defaults

```sql
create extension if not exists pgcrypto;
create extension if not exists citext;
```

Common columns:
- `id uuid primary key default gen_random_uuid()`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
Soft delete:
- For operational tables where recovery is valuable, a nullable `deleted_at timestamptz` is used (implemented for `dogs`, `transports`, `org_contacts`).

## Identity & Tenancy

### `profiles` (personal info; no role)

```sql
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `orgs` (tenants + settings)

The System Context requires NGO-configurable stages/statuses without schema forks. Store these defaults in
`orgs.settings` (JSONB) so the app can populate dropdowns without hard-coding.

```sql
create table public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug citext unique,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Recommended `orgs.settings` shape (example):

```json
{
  "dog_stages": ["Intake", "In Foster", "Medical", "Transport", "Adopted"],
  "transport_statuses": ["Requested", "Scheduled", "In Progress", "Done", "Canceled"]
}
```

Seeding rule (MVP):
- On org creation (migration, trigger, or service), seed sensible defaults into `orgs.settings`.

### `memberships` (join table; roles per org)

```sql
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  roles text[] not null default '{}'::text[],
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create index memberships_org_id_idx on public.memberships(org_id);
create index memberships_user_id_idx on public.memberships(user_id);
create index memberships_roles_gin on public.memberships using gin(roles);
```

> Roles are MVP-limited to: `admin`, `volunteer`, `foster`, `transport`. See `docs/roles.md`.

## Core Domain

### `dogs` (single source of truth)

```sql
create table public.dogs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,

  name text not null,
  stage text not null, -- NGO-configurable (stored as text in MVP)

  location text,
  description text,

  medical_notes text,
  behavioral_notes text,

  responsible_membership_id uuid references public.memberships(id),
  foster_membership_id uuid references public.memberships(id),

  -- Optional: assignments to offline contacts (pre-user fosters/responsibles)
  responsible_contact_id uuid references public.org_contacts(id),
  foster_contact_id uuid references public.org_contacts(id),

  budget_limit numeric(12,2),

  extra_fields jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by_membership_id uuid references public.memberships(id),
  updated_by_membership_id uuid references public.memberships(id)
);

create index dogs_org_id_idx on public.dogs(org_id);
create index dogs_org_stage_idx on public.dogs(org_id, stage);
```

Rationale:
- `stage` is text to keep MVP simple while still supporting NGO customization.
- Canonical assignments use membership FKs (supports “assignment changes” audit events).
- `extra_fields` is the extensibility outlet (no schema forks).

### `transports` (task, not a person)

```sql
create table public.transports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,

  dog_id uuid references public.dogs(id) on delete set null,

  from_location text,
  to_location text,

  status text not null, -- NGO-configurable / workflow-driven
  assigned_membership_id uuid references public.memberships(id),
  assigned_contact_id uuid references public.org_contacts(id),

  window_start timestamptz,
  window_end timestamptz,
  notes text,

  extra_fields jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by_membership_id uuid references public.memberships(id),
  updated_by_membership_id uuid references public.memberships(id)
);

create index transports_org_id_idx on public.transports(org_id);
create index transports_org_status_idx on public.transports(org_id, status);
```

### `tasks` (actionable checklists, separate from calendar slots)

```sql
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,

  title text not null,
  description text,

  status text not null default 'todo' check (status in ('todo','in_progress','done','canceled')),
  priority text default 'normal',
  due_at timestamptz,

  link_type text,
  link_id uuid,
  assigned_membership_id uuid references public.memberships(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_org_id_idx on public.tasks(org_id);
create index tasks_org_status_idx on public.tasks(org_id, status);
create index tasks_org_due_at_idx on public.tasks(org_id, due_at);
create index tasks_org_assigned_membership_idx on public.tasks(org_id, assigned_membership_id);
```

Notes:
- Tasks are distinct from calendar slots; `get_calendar_events` aggregates tasks by projecting `due_at` (or `created_at` fallback) into a visual time window.
- Workflow automation triggers on `dogs` were removed; task creation is explicit in application code or future automation modules.
- RLS uses `is_active_org_member(org_id)` for read/write; deletes follow the same org membership rule.

### `medical_records` (structured medical timeline)

```sql
create table public.medical_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  dog_id uuid not null references public.dogs(id) on delete cascade,

  record_type text not null, -- exam, vaccine, surgery, etc.
  occurred_on date,
  description text,
  cost numeric(12,2),

  extra_fields jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_membership_id uuid references public.memberships(id),
  updated_by_membership_id uuid references public.memberships(id)
);

create index medical_records_org_id_idx on public.medical_records(org_id);
create index medical_records_dog_id_idx on public.medical_records(dog_id);
```

### `expenses` (budget tracking)

```sql
create table public.expenses (
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

create index expenses_org_id_idx on public.expenses(org_id);
create index expenses_dog_id_idx on public.expenses(dog_id);
```

## Files & Media

### `dog_photos` (references storage objects)

```sql
create table public.dog_photos (
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

create index dog_photos_org_id_idx on public.dog_photos(org_id);
create index dog_photos_dog_id_idx on public.dog_photos(dog_id);
```

### `documents` (generic attachments)

```sql
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,

  entity_type text not null, -- dog, transport, org, etc.
  entity_id uuid not null,

  storage_bucket text not null default 'documents',
  storage_path text not null,
  filename text,
  mime_type text,
  description text,

  created_at timestamptz not null default now(),
  created_by_membership_id uuid references public.memberships(id)
);

create index documents_org_id_idx on public.documents(org_id);
create index documents_entity_idx on public.documents(org_id, entity_type, entity_id);
```

## Activity / Audit (Required)

### `activity_events` (append-only, tenant-scoped)

```sql
create table public.activity_events (
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

create index activity_events_org_created_idx on public.activity_events(org_id, created_at desc);
create index activity_events_entity_idx on public.activity_events(org_id, entity_type, entity_id, created_at desc);
```

Feed linkage (recommended):
- Triggers/RPCs should populate `related.dog_id` (UUID string) for events relevant to a dog timeline.
- For performance, an expression index on `related->>'dog_id'` can be added.

Atomicity rule (MVP):
- Do not rely on the client to do “write row then insert activity event” as two separate requests.
- Require atomic write + audit event via Postgres triggers for simple CRUD and/or Supabase RPCs (stored procedures) for complex mutations (e.g., assign foster, stage transition).

## Notes / Explicitly Deferred (per System Context)
- Public portals, cross-NGO pooling, heavy automation engines: **not in MVP**.
- Offline sync, notifications: **not in MVP**.

## Contacts (People & Homes)

Contacts are operational directory records that may or may not be app users. Authorization remains membership-based.

```sql
create table public.org_contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,

  kind text not null, -- person | home (MVP)
  display_name text not null,

  email citext,
  phone text,
  roles text[] not null default '{}'::text[], -- same vocabulary as memberships.roles[]

  linked_user_id uuid references auth.users(id) on delete set null,
  linked_membership_id uuid references public.memberships(id) on delete set null,

  address jsonb not null default '{}'::jsonb,
  extra_fields jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by_membership_id uuid references public.memberships(id),
  updated_by_membership_id uuid references public.memberships(id),

  unique (org_id, linked_user_id),
  unique (org_id, email)
);
```

## Notes on current DB vs app usage

- Soft delete is enforced in RLS read policies for `dogs`, `transports`, and `org_contacts` (admins can still read deleted rows for recovery).
- `documents` table exists with RLS + audit trigger, and the app creates `documents` rows after uploads (list/open/delete is wired).

## Schema Verification

After applying migrations in Supabase, run `supabase/verify_full.sql` in the Supabase SQL Editor to confirm:
- all expected tables exist,
- no required columns are missing (the `missing_columns` output should be empty),
- RLS/policies/triggers/RPCs exist,
- sensitive views (e.g. `org_member_contacts`) are not exposed to `anon`/`authenticated`.
