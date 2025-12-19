import { supabase } from '@/lib/supabase';

export const downloadMyData = async (): Promise<Record<string, unknown>> => {
  if (!supabase) {
    throw new Error('Supabase not configured; data export requires Supabase env.');
  }

  const { data, error } = await supabase.rpc('download_my_data');
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? {}) as Record<string, unknown>;
};

export const deleteMyAccount = async (): Promise<void> => {
  if (!supabase) {
    throw new Error('Supabase not configured; account deletion requires Supabase env.');
  }

  const { error } = await supabase.rpc('delete_my_account');
  if (error) {
    throw new Error(error.message);
  }
};

