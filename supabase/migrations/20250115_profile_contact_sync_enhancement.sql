-- Profile-to-Contact Sync Enhancement
-- Date: 2025-01-15
-- Purpose: Sync avatar_url and phone from profiles to org_contacts, and create audit events

-- Step 1: Add phone column to profiles (if not exists)
-- Note: phone may already exist in auth.users, but we store it in profiles for easier sync
alter table public.profiles
  add column if not exists phone text;

-- Step 2: Enhanced sync trigger that syncs full_name, avatar_url, and phone
create or replace function public.sync_org_contact_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Update all linked contacts for this user across all orgs
  update public.org_contacts
  set 
    display_name = coalesce(new.full_name, display_name),
    avatar_url = coalesce(new.avatar_url, avatar_url),
    phone = coalesce(new.phone, phone),
    updated_at = now()
  where linked_user_id = new.user_id;

  -- Trigger audit events for profile changes that affect org_contacts
  -- This creates an audit event in each org where the user is a member
  perform public.log_activity_event(
    oc.org_id,
    'org_contact',
    oc.id,
    'contact.profile_synced',
    format('Contact %s profile synced', oc.display_name),
    jsonb_build_object(
      'full_name', new.full_name,
      'avatar_url', new.avatar_url,
      'phone', new.phone
    ),
    jsonb_build_object('contact_id', oc.id::text)
  )
  from public.org_contacts oc
  where oc.linked_user_id = new.user_id;

  return new;
end;
$$;

-- Step 3: Update trigger to fire on avatar_url and phone changes
drop trigger if exists sync_org_contact_from_profile on public.profiles;
create trigger sync_org_contact_from_profile
after insert or update of full_name, avatar_url, phone on public.profiles
for each row execute function public.sync_org_contact_from_profile();

