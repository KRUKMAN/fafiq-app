import { useQuery } from '@tanstack/react-query';

import { fetchDogPhotos } from '@/lib/data/storage';

export const useDogPhotos = (orgId?: string, dogId?: string) =>
  useQuery({
    queryKey: ['dog-photos', orgId ?? '', dogId ?? ''],
    queryFn: () => fetchDogPhotos(orgId!, dogId!),
    enabled: Boolean(orgId && dogId),
    staleTime: 1000 * 60 * 5,
  });


