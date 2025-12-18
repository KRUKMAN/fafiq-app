import { useQuery } from '@tanstack/react-query';

import { fetchDogs } from '@/lib/data/dogs';
import { Dog } from '@/schemas/dog';

type UseDogsFilters = {
  stage?: string;
  search?: string;
  location?: string;
  responsible?: string;
  hasAlerts?: boolean;
  updatedAfter?: string;
  updatedBefore?: string;
};

export const useDogs = (orgId?: string, filters?: UseDogsFilters) =>
  useQuery<Dog[]>({
    queryKey: [
      'dogs',
      orgId ?? '',
      filters?.stage ?? '',
      filters?.search ?? '',
      filters?.location ?? '',
      filters?.responsible ?? '',
      filters?.hasAlerts ?? false,
      filters?.updatedAfter ?? '',
      filters?.updatedBefore ?? '',
    ],
    queryFn: () => fetchDogs(orgId!, filters),
    staleTime: 1000 * 60 * 5,
    enabled: Boolean(orgId),
  });
