import { useQuery } from '@tanstack/react-query';

import { fetchActivityEvents } from '@/lib/data/activityEvents';
import { ActivityEvent } from '@/schemas/activityEvent';

export const useDogTimeline = (orgId?: string, dogId?: string) =>
  useQuery<ActivityEvent[]>({
    queryKey: ['dog-timeline', orgId ?? '', dogId ?? ''],
    queryFn: () => fetchActivityEvents(orgId!, 'dog', dogId!),
    staleTime: 1000 * 60 * 5,
    enabled: Boolean(orgId && dogId),
  });
