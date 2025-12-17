# Database Schema (Draft)

This schema is a **draft baseline** aligned to `Fafik_System_Context.md` (authoritative). It enforces:

- **Modular monolith, SaaS-ready**: `org_id` tenant scoping on *all business tables*.
- **Membership-based authorization**: no global role on `profiles`; roles live on `memberships.roles[]`.
- **Single source of truth per dog**: one canonical `dogs` row; all related records reference `dogs.id`.
- **Customization without schema forks**: tenant-specific fields live in `jsonb` (`extra_fields`), not per-tenant tables.

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

### `orgs` (tenants)

```sql
create table public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug citext unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

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

  budget_limit numeric(12,2),

  extra_fields jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
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

  window_start timestamptz,
  window_end timestamptz,
  notes text,

  extra_fields jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_membership_id uuid references public.memberships(id),
  updated_by_membership_id uuid references public.memberships(id)
);

create index transports_org_id_idx on public.transports(org_id);
create index transports_org_status_idx on public.transports(org_id, status);
```

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

## Notes / Explicitly Deferred (per System Context)
- Public portals, cross-NGO pooling, heavy automation engines: **not in MVP**.
- Offline sync, notifications: **not in MVP**.
