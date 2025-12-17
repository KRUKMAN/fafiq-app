# RLS (Row Level Security) — Draft Policies

This document implements the System Context rule:

> Users can only see rows where `org_id` matches their **active membership**.

In MVP, “active membership” means `memberships.active = true`. The *app* still needs a tenant-resolution strategy to pick which `org_id` to use in queries (see Gap Analysis / Implementation Plan).

## Principles
- RLS is enabled on **all business tables** (`org_id` everywhere).
- Policies are consistent and DRY via helper functions.
- Avoid relying on “frontend role logic” for security (System Context MUST NOT).

## Helper functions (recommended)

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

## Enable RLS

```sql
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
```

## Baseline policy pattern (org-scoped tables)

For each table that has `org_id`, apply:

```sql
create policy "org members can read"
on public.<table>
for select
using (public.is_active_org_member(org_id));

create policy "org members can insert"
on public.<table>
for insert
with check (public.is_active_org_member(org_id));

create policy "org members can update"
on public.<table>
for update
using (public.is_active_org_member(org_id))
with check (public.is_active_org_member(org_id));

create policy "org members can delete"
on public.<table>
for delete
using (public.is_active_org_member(org_id));
```

Role tightening (optional MVP hardening):
- Only admins can delete: `using (public.has_role(org_id, 'admin'))`.
- Only admins can edit org settings tables (if added later).

## Special cases

### `profiles`
- User can read/update their own profile.

```sql
create policy "users read own profile"
on public.profiles
for select
using (user_id = auth.uid());

create policy "users update own profile"
on public.profiles
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());
```

### `memberships`
- Users can read their own memberships.
- Only admins manage memberships (invite/remove, assign roles).

```sql
create policy "users read own memberships"
on public.memberships
for select
using (user_id = auth.uid());

create policy "admins manage memberships"
on public.memberships
for all
using (public.has_role(org_id, 'admin'))
with check (public.has_role(org_id, 'admin'));
```

### `orgs`
- Users can read orgs they belong to.

```sql
create policy "members read org"
on public.orgs
for select
using (public.is_active_org_member(id));
```

## Storage RLS (Supabase Storage)

### Bucket + path conventions (MVP)
- `dog-photos`: `{org_id}/dogs/{dog_id}/{uuid}.{ext}`
- `documents`: `{org_id}/{entity_type}/{entity_id}/{uuid}.{ext}`

### Enforcement approach
Use a combination of:
1) RLS on `dog_photos` / `documents` tables (authoritative references)
2) Storage object policies that require:
   - first path segment equals an org UUID
   - `is_active_org_member(<org_id from path>)`

Implementation detail depends on Supabase Storage policy capabilities in your project; the table-level RLS is non-negotiable.

## Activity logging RLS
- `activity_events` follows the baseline org-scoped pattern.
- Inserts must be permitted for org members (or stricter: only roles allowed to mutate).
- Table must remain **append-only** at application level (no UPDATE/DELETE in app flows).
