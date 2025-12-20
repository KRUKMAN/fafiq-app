import { useQuery } from '@tanstack/react-query';

import { fetchTransportTimeline } from '@/lib/data/activityEvents';
import { ActivityEvent } from '@/schemas/activityEvent';

export const useTransportTimeline = (orgId?: string, transportId?: string) =>
  useQuery<ActivityEvent[]>({
    queryKey: ['transport-timeline', orgId ?? '', transportId ?? ''],
    queryFn: () => fetchTransportTimeline(orgId!, transportId!),
    staleTime: 1000 * 60 * 5,
    enabled: Boolean(orgId && transportId),
  });

