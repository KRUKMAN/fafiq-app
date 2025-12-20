import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { STRINGS } from '@/constants/strings';
import { fetchOrgById } from '@/lib/data/orgs';
import { Org } from '@/schemas/org';

const readStringArray = (settings: Org['settings'] | undefined, key: string): string[] => {
  const value = settings ? (settings as any)[key] : undefined;
  return Array.isArray(value) ? value.filter((v) => typeof v === 'string') : [];
};

export const useOrgSettings = (orgId?: string) => {
  const query = useQuery({
    queryKey: ['org', orgId ?? ''],
    queryFn: () => fetchOrgById(orgId!),
    enabled: Boolean(orgId),
    staleTime: 1000 * 60 * 5,
  });

  const dogStages = useMemo(() => {
    const fromSettings = readStringArray(query.data?.settings, 'dog_stages');
    return fromSettings.length ? fromSettings : [...STRINGS.dogs.formStages];
  }, [query.data?.settings]);

  const transportStatuses = useMemo(() => {
    const fromSettings = readStringArray(query.data?.settings, 'transport_statuses');
    return fromSettings.length ? fromSettings : ['Requested', 'Scheduled', 'In Progress', 'Done', 'Canceled'];
  }, [query.data?.settings]);

  return {
    ...query,
    dogStages,
    transportStatuses,
  };
};

