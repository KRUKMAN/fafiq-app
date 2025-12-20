import { useQuery } from '@tanstack/react-query';

import { fetchMemberActivity } from '@/lib/data/activityEvents';
import { ActivityEvent } from '@/schemas/activityEvent';

export const useMemberActivity = (orgId?: string, membershipId?: string) =>
  useQuery<ActivityEvent[]>({
    queryKey: ['member-activity', orgId ?? '', membershipId ?? ''],
    queryFn: () => fetchMemberActivity(orgId!, membershipId!),
    staleTime: 1000 * 60 * 5,
    enabled: Boolean(orgId && membershipId),
  });

