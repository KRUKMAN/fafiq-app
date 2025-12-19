-- Add audit logging to org_invites so invite lifecycle appears in activity_events.

create extension if not exists pgcrypto;

-- Safety: drop existing trigger if present.
drop trigger if exists audit_org_invites on public.org_invites;

create trigger audit_org_invites
after insert or update or delete on public.org_invites
for each row execute function public.audit_activity();


