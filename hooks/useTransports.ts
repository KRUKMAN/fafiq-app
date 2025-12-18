import { useQuery } from '@tanstack/react-query';

import { fetchTransports } from '@/lib/data/transports';
import { Transport } from '@/schemas/transport';

export const useTransports = (orgId?: string) =>
  useQuery<Transport[]>({
    queryKey: ['transports', orgId ?? ''],
    queryFn: () => fetchTransports(orgId!),
    staleTime: 1000 * 60 * 5,
    enabled: Boolean(orgId),
  });
