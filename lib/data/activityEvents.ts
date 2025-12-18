import { activityEventSchema, ActivityEvent } from '@/schemas/activityEvent';
import { getMockActivityEventsByEntity } from '@/lib/mocks/activityEvents';

export const fetchActivityEvents = async (
  orgId: string,
  entityType: string,
  entityId: string
): Promise<ActivityEvent[]> => {
  const events = await getMockActivityEventsByEntity(orgId, entityType, entityId);
  return events.map((event) => activityEventSchema.parse(event));
};
