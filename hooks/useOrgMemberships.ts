import { useQuery } from '@tanstack/react-query';

import { fetchOrgMemberships } from '@/lib/data/memberships';

export const useOrgMemberships = (orgId?: string) =>
  useQuery({
    queryKey: ['org-memberships', orgId ?? ''],
    queryFn: () => fetchOrgMemberships(orgId!),
    enabled: Boolean(orgId),
    staleTime: 1000 * 60 * 5,
  });
