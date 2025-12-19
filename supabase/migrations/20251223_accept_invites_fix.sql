-- Fix ambiguity in accept_org_invites_for_current_user (org_id column/variable)

create or replace function public.accept_org_invites_for_current_user()
returns table (
  org_id uuid,
  invite_id uuid,
  membership_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_email citext;
  v_membership_id uuid;
  v_invite_id uuid;
  v_org_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select email into v_email from auth.users where id = v_user_id limit 1;

  for v_invite_id, v_org_id in
    select id, org_id
    from public.org_invites
    where lower(email) = lower(v_email)
      and status = 'pending'
  loop
    insert into public.memberships (org_id, user_id, roles, active)
    select v_org_id, v_user_id, roles, true
    from public.org_invites
    where id = v_invite_id
    on conflict (org_id, user_id) do update
      set roles = excluded.roles,
          active = true
    returning id into v_membership_id;

    update public.org_invites
    set status = 'accepted',
        accepted_user_id = v_user_id,
        accepted_at = now()
    where id = v_invite_id;

    status := 'accepted';
    invite_id := v_invite_id;
    membership_id := v_membership_id;
    org_id := v_org_id;
    return next;
  end loop;
end;
$$;

revoke all on function public.accept_org_invites_for_current_user() from public;
grant execute on function public.accept_org_invites_for_current_user() to authenticated;
grant execute on function public.accept_org_invites_for_current_user() to service_role;
