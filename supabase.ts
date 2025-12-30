
import { createClient } from '@supabase/supabase-js';

// Robust environment variable retrieval
const getEnv = (key: string, defaultValue: string) => {
  const win = window as any;
  const val = win.process?.env?.[key] || defaultValue;
  return val;
};

// Sync with the URL/Key provided in index.html to ensure connection to the correct DB instance
const supabaseUrl = getEnv('SUPABASE_URL', 'https://aoecvxqyrmegjhvegjqd.supabase.co');
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', 'sb_publishable_iYWbACp3rr7UuqSmbjpPPw_eMMyMmFG');

// Debug log with safety checks
const safeSub = (str: string, len: number) => (str && str.length >= len) ? str.substring(0, len) : 'invalid';
console.log(`[Supabase Init] URL: ${safeSub(supabaseUrl, 15)}... Key: ${safeSub(supabaseAnonKey, 15)}...`);

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
