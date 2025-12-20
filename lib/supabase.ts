import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { Database } from '@/database.types';
import { logger } from '@/lib/logger';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let supabase: SupabaseClient<Database> | null = null;

if (!supabaseUrl || !supabaseAnonKey) {
  logger.warn('Supabase env vars are missing; running in mock mode', {
    missingUrl: !supabaseUrl,
    missingAnonKey: !supabaseAnonKey,
  });
} else {
  supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
}

export { supabase };
