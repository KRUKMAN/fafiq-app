-- GDPR foundations: allow users to download their data and request a soft delete/anonymization.

create extension if not exists pgcrypto;

-- Download my data: returns profile, memberships, and linked contacts as JSONB.
drop function if exists public.download_my_data();
create or replace function public.download_my_data()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile jsonb;
  v_memberships jsonb;
  v_contacts jsonb;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select to_jsonb(p) into v_profile
  from public.profiles p
  where p.user_id = v_user_id;

  select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb) into v_memberships
  from public.memberships m
  where m.user_id = v_user_id;

  select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) into v_contacts
  from public.org_contacts c
  where c.linked_user_id = v_user_id;

  return jsonb_build_object(
    'profile', v_profile,
    'memberships', v_memberships,
    'contacts', v_contacts
  );
end;
$$;

revoke all on function public.download_my_data() from public;
grant execute on function public.download_my_data() to authenticated;
grant execute on function public.download_my_data() to service_role;

-- Soft delete / anonymize the current user.
-- This preserves referential integrity while scrubbing PII.
drop function if exists public.delete_my_account();
create or replace function public.delete_my_account()
returns table (status text)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_placeholder_email citext;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  v_placeholder_email := concat('deleted+', v_user_id::text, '@example.invalid')::citext;

  -- Scrub profile
  update public.profiles
  set full_name = 'Deleted user',
      avatar_url = null,
      updated_at = now()
  where user_id = v_user_id;

  -- Deactivate memberships and remove roles
  update public.memberships
  set active = false,
      roles = '{}'::text[],
      updated_at = now()
  where user_id = v_user_id;

  -- Anonymize linked contacts
  update public.org_contacts
  set display_name = 'Deleted user',
      email = null,
      roles = '{}'::text[],
      linked_user_id = null,
      linked_membership_id = null,
      updated_at = now()
  where linked_user_id = v_user_id;

  -- Scrub auth.users email/meta (service role can update this)
  update auth.users
  set email = v_placeholder_email,
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      phone = null,
      phone_confirmed_at = null,
      raw_user_meta_data = '{}'::jsonb,
      updated_at = now()
  where id = v_user_id;

  status := 'deleted';
  return next;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.delete_my_account() to service_role;


