import { useQuery } from '@tanstack/react-query';

import { fetchDogById } from '@/lib/data/dogs';
import { Dog } from '@/schemas/dog';

export const useDog = (tenantId: string, dogId: string) =>
  useQuery<Dog>({
    queryKey: ['dog', tenantId, dogId],
    queryFn: () => fetchDogById(tenantId, dogId),
    staleTime: 1000 * 60 * 5,
  });
