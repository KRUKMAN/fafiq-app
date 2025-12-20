import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { fetchDocumentsForEntity } from '@/lib/data/documents';

export const useDocuments = (orgId?: string, entityType?: string, entityId?: string) =>
  useQuery({
    queryKey: ['documents', orgId ?? '', entityType ?? '', entityId ?? ''],
    queryFn: () => fetchDocumentsForEntity(orgId!, entityType!, entityId!),
    enabled: Boolean(supabase && orgId && entityType && entityId),
    staleTime: 1000 * 30,
  });
