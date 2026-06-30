/**
 * KPSS Aşkı - Renk Modu Store'u
 * v8: Dark mode desteği
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ColorScheme } from '../types';

const COLOR_SCHEME_KEY = '@kpss_aski_color_scheme';

interface ColorSchemeState {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => Promise<void>;
  loadColorScheme: () => Promise<void>;
}

export const useColorSchemeStore = create<ColorSchemeState>((set) => ({
  colorScheme: 'system',

  setColorScheme: async (scheme: ColorScheme) => {
    set({ colorScheme: scheme });
    try {
      await AsyncStorage.setItem(COLOR_SCHEME_KEY, scheme);
    } catch {
      // sessiz
    }
  },

  loadColorScheme: async () => {
    try {
      const stored = await AsyncStorage.getItem(COLOR_SCHEME_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        set({ colorScheme: stored });
      }
    } catch {
      // sessiz
    }
  },
}));
