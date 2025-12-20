import { useQuery } from '@tanstack/react-query';

import { fetchDogTimeline } from '@/lib/data/activityEvents';
import { ActivityEvent } from '@/schemas/activityEvent';

export const useDogTimeline = (orgId?: string, dogId?: string, limit = 200) =>
  useQuery<ActivityEvent[]>({
    queryKey: ['dog-timeline', orgId ?? '', dogId ?? '', limit],
    queryFn: () => fetchDogTimeline(orgId!, dogId!, limit),
    staleTime: 1000 * 60 * 5,
    enabled: Boolean(orgId && dogId),
  });
