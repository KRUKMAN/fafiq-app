-- Add soft delete support via deleted_at timestamp columns
-- Records with deleted_at set are considered "soft deleted"

-- Add deleted_at to dogs
alter table public.dogs
  add column if not exists deleted_at timestamptz null;

create index if not exists dogs_deleted_at_idx on public.dogs(org_id, deleted_at);

-- Add deleted_at to transports
alter table public.transports
  add column if not exists deleted_at timestamptz null;

create index if not exists transports_deleted_at_idx on public.transports(org_id, deleted_at);

-- Add deleted_at to org_contacts
alter table public.org_contacts
  add column if not exists deleted_at timestamptz null;

create index if not exists org_contacts_deleted_at_idx on public.org_contacts(org_id, deleted_at);

-- Update RLS policies to exclude soft-deleted records by default (read policies)
-- Note: We keep allowing updates/deletes on soft-deleted records for admins to restore

-- Dogs: update read policy to exclude deleted
drop policy if exists "org members can read dogs" on public.dogs;
create policy "org members can read dogs"
on public.dogs
for select
using (public.is_active_org_member(org_id) and deleted_at is null);

-- Add policy for admins to view deleted dogs (for recovery)
drop policy if exists "admins can read deleted dogs" on public.dogs;
create policy "admins can read deleted dogs"
on public.dogs
for select
using (public.has_role(org_id, 'admin') and deleted_at is not null);

-- Transports: update read policy to exclude deleted
drop policy if exists "org members can read transports" on public.transports;
create policy "org members can read transports"
on public.transports
for select
using (public.is_active_org_member(org_id) and deleted_at is null);

-- Add policy for admins to view deleted transports (for recovery)
drop policy if exists "admins can read deleted transports" on public.transports;
create policy "admins can read deleted transports"
on public.transports
for select
using (public.has_role(org_id, 'admin') and deleted_at is not null);

-- org_contacts: update read policy to exclude deleted
drop policy if exists "org members can read org_contacts" on public.org_contacts;
create policy "org members can read org_contacts"
on public.org_contacts
for select
using (public.is_active_org_member(org_id) and deleted_at is null);

-- Add policy for admins to view deleted contacts (for recovery)
drop policy if exists "admins can read deleted org_contacts" on public.org_contacts;
create policy "admins can read deleted org_contacts"
on public.org_contacts
for select
using (public.has_role(org_id, 'admin') and deleted_at is not null);

