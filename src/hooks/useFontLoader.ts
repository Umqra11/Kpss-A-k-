/**
 * KPSS Aşkı - Font Yükleme Hook'u
 *
 * Font dosyalarını expo-font ile yükler.
 * Font dosyaları assets/fonts/ altında bulunmazsa sistem fontuna fallback yapar.
 *
 * Kullanılan fontlar:
 * - ClashDisplay: Bold, Semibold, Medium, Regular
 * - Satoshi: Bold, Medium, Regular, Light
 */

import { useEffect, useState } from 'react';
import * as Font from 'expo-font';
import { Platform } from 'react-native';

const FONT_CONFIG: Record<string, Font.FontDisplay> = {
  'ClashDisplay-Bold': Font.FontDisplay.FALLBACK,
  'ClashDisplay-Semibold': Font.FontDisplay.FALLBACK,
  'ClashDisplay-Medium': Font.FontDisplay.FALLBACK,
  'ClashDisplay-Regular': Font.FontDisplay.FALLBACK,
  'Satoshi-Bold': Font.FontDisplay.FALLBACK,
  'Satoshi-Medium': Font.FontDisplay.FALLBACK,
  'Satoshi-Regular': Font.FontDisplay.FALLBACK,
  'Satoshi-Light': Font.FontDisplay.FALLBACK,
};

export function useFontLoader() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [fontError, setFontError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadFonts() {
      try {
        // Web'de ve Expo Go'da fontları yükle
        // assets/fonts/ altındaki dosyaları dene
        // Dosya yoksa sistem fontuna fallback yap (hata yok)
        if (Platform.OS === 'web') {
          // Font dosyalarının varlığını kontrol etmeden yüklemeyi dene
          // Hata alınırsa sistem fontu kullanılır
          try {
            await Font.loadAsync({
              'ClashDisplay-Bold': require('../assets/fonts/ClashDisplay-Bold.otf'),
              'ClashDisplay-Semibold': require('../assets/fonts/ClashDisplay-Semibold.otf'),
              'ClashDisplay-Medium': require('../assets/fonts/ClashDisplay-Medium.otf'),
              'ClashDisplay-Regular': require('../assets/fonts/ClashDisplay-Regular.otf'),
              'Satoshi-Bold': require('../assets/fonts/Satoshi-Bold.otf'),
              'Satoshi-Medium': require('../assets/fonts/Satoshi-Medium.otf'),
              'Satoshi-Regular': require('../assets/fonts/Satoshi-Regular.otf'),
              'Satoshi-Light': require('../assets/fonts/Satoshi-Light.otf'),
            });
          } catch (fontLoadError) {
            // Font dosyaları bulunamadı — sistem fontu kullanılacak
            console.warn('[FontLoader] Font dosyaları bulunamadı, sistem fontu kullanılacak:', fontLoadError);
          }
        } else {
          // Native platformlarda da dene, hata alınırsa sistem fontu
          try {
            await Font.loadAsync(FONT_CONFIG);
          } catch (e) {
            console.warn('[FontLoader] Native font yükleme hatası:', e);
          }
        }

        if (mounted) {
          setFontsLoaded(true);
        }
      } catch (err) {
        console.warn('[FontLoader] Kritik hata:', err);
        if (mounted) {
          setFontError(err instanceof Error ? err : new Error('Font yüklenemedi'));
          setFontsLoaded(true); // Yine de devam et, sistem fontu kullanılsın
        }
      }
    }

    loadFonts();

    return () => {
      mounted = false;
    };
  }, []);

  return { fontsLoaded, fontError };
}
