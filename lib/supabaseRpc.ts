import type { PostgrestError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/database.types';

export type ActivityEventRow = Database['public']['Tables']['activity_events']['Row'];

export type GetDogTimelineArgs = {
  p_org_id: string;
  p_dog_id: string;
  p_limit?: number;
};

export const rpcGetDogTimeline = async (
  args: GetDogTimelineArgs
): Promise<{ data: ActivityEventRow[] | null; error: PostgrestError | null }> => {
  if (!supabase) {
    throw new Error('Supabase client not configured');
  }

  // Database types may lag behind migrations; keep the cast contained to this file.
  return (supabase as any).rpc('get_dog_timeline', args);
};
