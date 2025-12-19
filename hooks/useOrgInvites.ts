import { useQuery } from '@tanstack/react-query';

import { fetchOrgInvites } from '@/lib/data/invites';

export const useOrgInvites = (orgId?: string) =>
  useQuery({
    queryKey: ['org-invites', orgId ?? ''],
    queryFn: () => fetchOrgInvites(orgId!),
    enabled: Boolean(orgId),
    staleTime: 1000 * 60 * 5,
  });
