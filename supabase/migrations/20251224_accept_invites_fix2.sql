-- Harden accept_org_invites_for_current_user to avoid org_id ambiguity (fully qualified columns)

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
  rec record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select email into v_email from auth.users where id = v_user_id limit 1;

  for rec in
    select oi.id as invite_id, oi.org_id as invite_org_id, oi.roles as invite_roles
    from public.org_invites oi
    where lower(oi.email) = lower(v_email)
      and oi.status = 'pending'
  loop
    insert into public.memberships (org_id, user_id, roles, active)
    values (rec.invite_org_id, v_user_id, coalesce(rec.invite_roles, '{}'::text[]), true)
    on conflict (org_id, user_id) do update
      set roles = excluded.roles,
          active = true
    returning id into membership_id;

    update public.org_invites
    set status = 'accepted',
        accepted_user_id = v_user_id,
        accepted_at = now()
    where id = rec.invite_id;

    status := 'accepted';
    invite_id := rec.invite_id;
    org_id := rec.invite_org_id;
    return next;
  end loop;
end;
$$;

revoke all on function public.accept_org_invites_for_current_user() from public;
grant execute on function public.accept_org_invites_for_current_user() to authenticated;
grant execute on function public.accept_org_invites_for_current_user() to service_role;
