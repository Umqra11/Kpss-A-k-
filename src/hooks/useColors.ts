/**
 * KPSS Aşkı - Dinamik Renk Hook'u
 * Sistem renk moduna göre light/dark paleti döndürür
 */

import { useColorScheme } from 'react-native';
import { ColorsLight, ColorsDark, type ColorPalette } from '../theme/colors';
import { useColorSchemeStore } from '../stores/colorSchemeStore';

export function useColors() {
  const systemScheme = useColorScheme();
  const userPreference = useColorSchemeStore((s) => s.colorScheme);

  const effectiveScheme =
    userPreference === 'system' ? systemScheme : userPreference;

  return effectiveScheme === 'dark' ? ColorsDark : ColorsLight;
}
