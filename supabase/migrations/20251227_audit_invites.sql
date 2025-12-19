-- Add audit trigger for org_invites to log invite events in activity_events

drop trigger if exists audit_org_invites on public.org_invites;

create trigger audit_org_invites
after insert or update or delete on public.org_invites
for each row execute function public.audit_activity();

-- Verify all audit triggers exist (informational query - run manually to check)
-- SELECT tgname, tgrelid::regclass
-- FROM pg_trigger
-- WHERE tgfoid = 'public.audit_activity'::regproc;

