import AsyncStorage from '@react-native-async-storage/async-storage';
import {createClient, type SupabaseClient} from '@supabase/supabase-js';

declare const process: {env?: Record<string, string | undefined>};

const supabaseUrl = (process.env?.EXPO_PUBLIC_SUPABASE_URL || '').trim();
const supabaseAnonKey = (process.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();

export const isRnSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabaseRn: SupabaseClient | null = isRnSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
