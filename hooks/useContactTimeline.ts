import { useQuery } from '@tanstack/react-query';

import { fetchContactTimeline } from '@/lib/data/activityEvents';
import { ActivityEvent } from '@/schemas/activityEvent';

export const useContactTimeline = (orgId?: string, contactId?: string) =>
  useQuery<ActivityEvent[]>({
    queryKey: ['contact-timeline', orgId ?? '', contactId ?? ''],
    queryFn: () => fetchContactTimeline(orgId!, contactId!),
    staleTime: 1000 * 60 * 5,
    enabled: Boolean(orgId && contactId),
  });

