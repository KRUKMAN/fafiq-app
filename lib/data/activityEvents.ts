import { supabase } from '@/lib/supabase';
import { activityEventSchema, ActivityEvent } from '@/schemas/activityEvent';
import { getMockActivityEventsByEntity } from '@/lib/mocks/activityEvents';

export const fetchActivityEvents = async (
  orgId: string,
  entityType: string,
  entityId: string
): Promise<ActivityEvent[]> => {
  if (!supabase) {
    const events = await getMockActivityEventsByEntity(orgId, entityType, entityId);
    return events.map((event) => activityEventSchema.parse(event));
  }

  const { data, error } = await supabase
    .from('activity_events')
    .select('*')
    .eq('org_id', orgId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch activity events: ${error.message}`);
  }

  return (data ?? []).map((event) =>
    activityEventSchema.parse({
      ...event,
      payload: event.payload ?? {},
      related: event.related ?? {},
    })
  );
};
