import { useQuery } from '@tanstack/react-query';

import { fetchMemberActivity } from '@/lib/data/activityEvents';
import { ActivityEvent } from '@/schemas/activityEvent';

export const useMemberActivity = (orgId?: string, membershipId?: string, limit = 200) =>
  useQuery<ActivityEvent[]>({
    queryKey: ['member-activity', orgId ?? '', membershipId ?? '', limit],
    queryFn: () => fetchMemberActivity(orgId!, membershipId!, limit),
    staleTime: 1000 * 60 * 5,
    enabled: Boolean(orgId && membershipId),
  });
