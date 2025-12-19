-- Storage buckets + policies for dog photos and documents (org-scoped)

insert into storage.buckets (id, name, public)
values ('dog-photos', 'dog-photos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

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

-- Dog photos policies
drop policy if exists "org members read dog-photos" on storage.objects;
drop policy if exists "org members write dog-photos" on storage.objects;

create policy "org members read dog-photos"
on storage.objects
for select
using (
  bucket_id = 'dog-photos'
  and public.is_active_org_member(public.org_id_from_storage_path(name))
);

create policy "org members write dog-photos"
on storage.objects
for insert
with check (
  bucket_id = 'dog-photos'
  and public.is_active_org_member(public.org_id_from_storage_path(name))
);

-- Documents policies
drop policy if exists "org members read documents" on storage.objects;
drop policy if exists "org members write documents" on storage.objects;

create policy "org members read documents"
on storage.objects
for select
using (
  bucket_id = 'documents'
  and public.is_active_org_member(public.org_id_from_storage_path(name))
);

create policy "org members write documents"
on storage.objects
for insert
with check (
  bucket_id = 'documents'
  and public.is_active_org_member(public.org_id_from_storage_path(name))
);
