import { useQuery } from '@tanstack/react-query';

import { fetchDogs } from '@/lib/data/dogs';
import { Dog } from '@/schemas/dog';

type UseDogsFilters = {
  status?: string;
  search?: string;
};

export const useDogs = (orgId?: string, filters?: UseDogsFilters) =>
  useQuery<Dog[]>({
    queryKey: ['dogs', orgId ?? '', filters?.status ?? '', filters?.search ?? ''],
    queryFn: () => fetchDogs(orgId!, filters),
    staleTime: 1000 * 60 * 5,
    enabled: Boolean(orgId),
  });
