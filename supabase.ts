
import { createClient } from '@supabase/supabase-js';

// Robust environment variable retrieval
const getEnv = (key: string, defaultValue: string) => {
  const win = window as any;
  const val = win.process?.env?.[key] || defaultValue;
  return val;
};

const supabaseUrl = getEnv('SUPABASE_URL', 'https://mwdewgcaculysfhpbzaf.supabase.co');
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', 'sb_publishable_AuDbk4dokgLK806pyAmAYg_BrB3HUe1');

// Debug log to ensure client initialization parameters are correct
console.log(`[Supabase Init] URL: ${supabaseUrl.substring(0, 15)}... Key: ${supabaseAnonKey.substring(0, 15)}...`);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
