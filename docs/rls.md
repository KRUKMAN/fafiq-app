# RLS (Row Level Security)

This document summarizes the current RLS model. The source of truth is the applied migrations:
- `supabase/migrations/20251218_schema_rls_audit.sql`
- `supabase/migrations/20251221_storage_buckets.sql`
- `supabase/migrations/20251228_soft_delete.sql`

## Core rule
Users can only read/write rows where `org_id` matches an **active membership** (`memberships.active = true`).

## Helper functions (implemented)

```sql
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
```

## Table-level RLS (enabled)
- `orgs`, `profiles`, `memberships`
- `dogs`, `transports`, `medical_records`, `expenses`
- `dog_photos`, `documents`
- `activity_events`
- `org_contacts`

## Policy summary (current)

`profiles`
- Users can read/update their own row.

`orgs`
- Members can read orgs they belong to.
- Admins can update org settings.

`memberships`
- Users can read their own memberships.
- Admins can manage memberships.

Org-scoped business tables (examples: `dogs`, `transports`, `medical_records`, `expenses`, `dog_photos`, `documents`, `org_contacts`)
- Members can read/insert/update within their org.
- Deletes are admin-only in the current migrations.

`activity_events`
- Members can read within their org.
- Client writes are disabled; audit events are append-only via DB triggers / security-definer code paths.

## Soft delete (implemented)

`dogs`, `transports`, and `org_contacts` have `deleted_at`.
- Default read policies exclude soft-deleted rows (`deleted_at is null`).
- Admins have an additional read policy for deleted rows (recovery).

## Storage object policies (implemented)

Storage buckets are private and tenant-scoped by path prefix.

```sql
create or replace function public.org_id_from_storage_path(object_name text)
returns uuid
language sql
immutable
as $$
  select case
    when object_name is null then null
    when length(split_part(object_name, '/', 1)) = 36 then (split_part(object_name, '/', 1))::uuid
    else null
  end;
$$;

create policy "org members read dog-photos"
on storage.objects
for select
using (
  bucket_id = 'dog-photos'
  and public.is_active_org_member(public.org_id_from_storage_path(name))
);
```

This same pattern is applied for writes and for the `documents` bucket in the migrations.
