-- Allow invited users to accept their own invites (RLS fix for accept_org_invites_for_current_user)
-- This adds select/update policies scoped by invite email matching the auth JWT email.

-- Guard: table exists
do $$
begin
  if not exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'org_invites') then
    raise notice 'org_invites table not found; skipping policy install.';
    return;
  end if;
end;
$$;

-- Policies for invite acceptance by the invited user (email match)
drop policy if exists "invited user can read own invite" on public.org_invites;
drop policy if exists "invited user can accept own invite" on public.org_invites;

create policy "invited user can read own invite"
on public.org_invites
for select
using (lower(email) = lower(coalesce((auth.jwt() ->> 'email')::text, '')));

create policy "invited user can accept own invite"
on public.org_invites
for update
using (lower(email) = lower(coalesce((auth.jwt() ->> 'email')::text, '')))
with check (lower(email) = lower(coalesce((auth.jwt() ->> 'email')::text, '')));
