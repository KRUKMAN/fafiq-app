import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { fetchNotesForEntity } from '@/lib/data/notes';

export const useNotes = (orgId?: string, entityType?: string, entityId?: string) =>
  useQuery({
    queryKey: ['notes', orgId ?? '', entityType ?? '', entityId ?? ''],
    queryFn: () => fetchNotesForEntity(orgId!, entityType!, entityId!),
    enabled: Boolean(supabase && orgId && entityType && entityId),
    staleTime: 1000 * 30,
  });
