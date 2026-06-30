/**
 * KPSS Aşkı - Supabase Client
 * v8: Tip güvenli, storage fallback'li
 *
 * Not: Supabase JS v2 generic typing'i karmaşık olduğu için
 * servis katmanında elle tip ataması yapılır.
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from '../types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://bhawilumayixgxmqoeod.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_L3oWBw19pDcYL4ap3b3PEQ__RvLVRoU';

// Brave / gizlilik odaklı tarayıcılar için in-memory fallback storage
function createSafeStorage() {
  const memoryMap = new Map<string, string>();
  let localStorageAvailable = false;

  try {
    const testKey = '__kpss_storage_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    localStorageAvailable = true;
  } catch {
    localStorageAvailable = false;
  }

  return {
    getItem: async (key: string): Promise<string | null> => {
      try {
        if (localStorageAvailable) {
          return await AsyncStorage.getItem(key);
        }
      } catch {
        // fall through
      }
      return memoryMap.get(key) ?? null;
    },
    setItem: async (key: string, value: string): Promise<void> => {
      try {
        if (localStorageAvailable) {
          await AsyncStorage.setItem(key, value);
          return;
        }
      } catch {
        // fall through
      }
      memoryMap.set(key, value);
    },
    removeItem: async (key: string): Promise<void> => {
      try {
        if (localStorageAvailable) {
          await AsyncStorage.removeItem(key);
          return;
        }
      } catch {
        // fall through
      }
      memoryMap.delete(key);
    },
  };
}

// Supabase client — servis katmanı tipleri ayrıca import edilir
export const supabase: any = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: createSafeStorage() as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
