-- Audit integrity hardening: make activity_events client read-only (append-only via triggers / security definer code)

-- Clients must not be able to forge audit entries.
revoke insert, update, delete on table public.activity_events from anon, authenticated;

drop policy if exists "org members can insert activity_events" on public.activity_events;

-- Prevent direct invocation of the low-level audit insert helper.
revoke all on function public.log_activity_event(
  uuid,
  text,
  uuid,
  text,
  text,
  jsonb,
  jsonb
) from public;
