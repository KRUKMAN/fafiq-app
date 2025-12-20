import type { PostgrestError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/database.types';

export type ActivityEventRow = Database['public']['Tables']['activity_events']['Row'];

export type GetDogTimelineArgs = {
  p_org_id: string;
  p_dog_id: string;
  p_limit?: number;
};

export type GetTransportTimelineArgs = {
  p_org_id: string;
  p_transport_id: string;
  p_limit?: number;
};

export type GetContactTimelineArgs = {
  p_org_id: string;
  p_contact_id: string;
  p_limit?: number;
};

export type GetMemberActivityArgs = {
  p_org_id: string;
  p_membership_id: string;
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

export const rpcGetTransportTimeline = async (
  args: GetTransportTimelineArgs
): Promise<{ data: ActivityEventRow[] | null; error: PostgrestError | null }> => {
  if (!supabase) {
    throw new Error('Supabase client not configured');
  }
  return (supabase as any).rpc('get_transport_timeline', args);
};

export const rpcGetContactTimeline = async (
  args: GetContactTimelineArgs
): Promise<{ data: ActivityEventRow[] | null; error: PostgrestError | null }> => {
  if (!supabase) {
    throw new Error('Supabase client not configured');
  }
  return (supabase as any).rpc('get_contact_timeline', args);
};

export const rpcGetMemberActivity = async (
  args: GetMemberActivityArgs
): Promise<{ data: ActivityEventRow[] | null; error: PostgrestError | null }> => {
  if (!supabase) {
    throw new Error('Supabase client not configured');
  }
  return (supabase as any).rpc('get_member_activity', args);
};
