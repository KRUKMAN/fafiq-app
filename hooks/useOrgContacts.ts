import { useQuery } from '@tanstack/react-query';

import { fetchOrgContacts } from '@/lib/data/contacts';

export const useOrgContacts = (orgId?: string) =>
  useQuery({
    queryKey: ['org-contacts', orgId ?? ''],
    queryFn: () => fetchOrgContacts(orgId!),
    enabled: Boolean(orgId),
    staleTime: 1000 * 60 * 5,
  });

