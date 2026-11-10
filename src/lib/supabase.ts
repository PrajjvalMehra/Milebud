import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const authStorage =
  typeof window === 'undefined'
    ? {
        getItem: async (_key: string) => null,
        setItem: async (_key: string, _value: string) => {},
        removeItem: async (_key: string) => {},
      }
    : AsyncStorage;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Supabase configuration is missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your .env file.',
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
