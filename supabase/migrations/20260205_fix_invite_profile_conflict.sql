-- Disambiguate profiles conflict target in admin_invite_member_by_email.

create or replace function public.admin_invite_member_by_email(
  p_org_id uuid,
  p_email text,
  p_roles text[] default '{}'::text[],
  p_full_name text default null
)
returns table (
  status text,
  membership_id uuid,
  invite_id uuid,
  user_id uuid,
  email text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email citext := lower(trim(p_email));
  v_roles text[] := coalesce(p_roles, '{}'::text[]);
  v_user_id uuid;
  v_membership_id uuid;
  v_invite_id uuid;
  v_invited_by uuid;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role'
     and not public.has_role(p_org_id, 'admin') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select id into v_invited_by
  from public.memberships m
  where m.org_id = p_org_id
    and m.user_id = auth.uid()
    and m.active = true
  limit 1;

  select u.id into v_user_id
  from auth.users u
  where lower(u.email) = v_email
  limit 1;

  if found and v_user_id is not null then
    insert into public.profiles (user_id, full_name)
    values (v_user_id, p_full_name)
    on conflict on constraint profiles_pkey do update
      set full_name = coalesce(excluded.full_name, profiles.full_name);

    insert into public.memberships (org_id, user_id, roles, active)
    values (p_org_id, v_user_id, v_roles, true)
    on conflict on constraint memberships_org_id_user_id_key do update
      set roles = excluded.roles, active = true
    returning id into v_membership_id;

    update public.org_invites
    set status = 'added_existing',
        accepted_user_id = v_user_id,
        accepted_at = now(),
        updated_at = now()
    where org_id = p_org_id and lower(email) = v_email;

    status := 'added_existing';
    membership_id := v_membership_id;
    invite_id := null;
    user_id := v_user_id;
    email := v_email::text;
    return next;
    return;
  end if;

  insert into public.org_invites (org_id, email, full_name, roles, status, invited_by_membership_id)
  values (p_org_id, v_email, p_full_name, v_roles, 'pending', v_invited_by)
  on conflict (org_id, email) do update
    set roles = excluded.roles,
        full_name = coalesce(excluded.full_name, org_invites.full_name),
        status = 'pending',
        invited_by_membership_id = coalesce(excluded.invited_by_membership_id, org_invites.invited_by_membership_id)
  returning id into v_invite_id;

  status := 'pending';
  membership_id := null;
  invite_id := v_invite_id;
  user_id := null;
  email := v_email::text;
  return next;
end;
$$;

revoke all on function public.admin_invite_member_by_email(uuid, text, text[], text) from public;
grant execute on function public.admin_invite_member_by_email(uuid, text, text[], text) to authenticated;
grant execute on function public.admin_invite_member_by_email(uuid, text, text[], text) to service_role;
