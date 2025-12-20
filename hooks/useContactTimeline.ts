import { useQuery } from '@tanstack/react-query';

import { fetchContactTimeline } from '@/lib/data/activityEvents';
import { ActivityEvent } from '@/schemas/activityEvent';

export const useContactTimeline = (orgId?: string, contactId?: string, limit = 200) =>
  useQuery<ActivityEvent[]>({
    queryKey: ['contact-timeline', orgId ?? '', contactId ?? '', limit],
    queryFn: () => fetchContactTimeline(orgId!, contactId!, limit),
    staleTime: 1000 * 60 * 5,
    enabled: Boolean(orgId && contactId),
  });
