import { useQuery } from '@tanstack/react-query';

import { fetchDogById } from '@/lib/data/dogs';
import { Dog } from '@/schemas/dog';

export const useDog = (orgId?: string, dogId?: string) =>
  useQuery<Dog>({
    queryKey: ['dog', orgId ?? '', dogId ?? ''],
    queryFn: () => fetchDogById(orgId!, dogId!),
    staleTime: 1000 * 60 * 5,
    enabled: Boolean(orgId && dogId),
  });
