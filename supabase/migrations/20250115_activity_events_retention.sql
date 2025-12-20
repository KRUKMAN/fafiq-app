-- Activity Events Retention Policy
-- Date: 2025-01-15
-- Purpose: Implement cleanup/archive functions for old activity_events

-- Option 1: Manual cleanup function (can be called via cron job or scheduled task)
create or replace function public.cleanup_old_activity_events(retention_days integer default 365)
returns table (
  deleted_count bigint,
  cutoff_date timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cutoff timestamptz;
  v_deleted bigint;
begin
  v_cutoff := now() - (retention_days || ' days')::interval;
  
  -- Delete events older than retention_days
  with deleted as (
    delete from public.activity_events
    where created_at < v_cutoff
    returning id
  )
  select count(*) into v_deleted from deleted;
  
  return query select v_deleted, v_cutoff;
end;
$$;

-- Grant execute to service_role (for cron jobs)
grant execute on function public.cleanup_old_activity_events(integer) to service_role;

-- Option 2: Archive to separate table (for compliance/analytics)
create table if not exists public.activity_events_archive (
  like public.activity_events including all
);

-- Create index on archive table for querying
create index if not exists activity_events_archive_org_created_idx 
  on public.activity_events_archive(org_id, created_at desc);
create index if not exists activity_events_archive_entity_idx 
  on public.activity_events_archive(org_id, entity_type, entity_id, created_at desc);

-- Archive function (moves events to archive table, then deletes from main table)
create or replace function public.archive_old_activity_events(retention_days integer default 365)
returns table (
  archived_count bigint,
  cutoff_date timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cutoff timestamptz;
  v_archived bigint;
begin
  v_cutoff := now() - (retention_days || ' days')::interval;
  
  -- Move events to archive
  with archived as (
    insert into public.activity_events_archive
    select * from public.activity_events
    where created_at < v_cutoff
    returning id
  )
  select count(*) into v_archived from archived;
  
  -- Delete from main table
  delete from public.activity_events
  where created_at < v_cutoff;
  
  return query select v_archived, v_cutoff;
end;
$$;

grant execute on function public.archive_old_activity_events(integer) to service_role;

-- Note: pg_cron scheduling requires pg_cron extension to be enabled in Supabase
-- To schedule automatic cleanup, uncomment and adjust the schedule:
/*
select cron.schedule(
  'cleanup-old-activity-events',
  '0 2 * * *', -- Run daily at 2 AM UTC
  $$
    select public.cleanup_old_activity_events(365);
  $$
);
*/

