/**
 * KPSS Aşkı - Font Yükleme Hook'u
 * System font fallback ile çalışır
 */

import { useEffect, useState } from 'react';

export function useFontLoader() {
    const [fontsLoaded, setFontsLoaded] = useState(false);
    const [fontError, setFontError] = useState<Error | null>(null);

    useEffect(() => {
        // Font dosyaları assets/fonts/ altına eklendiğinde
        // expo-font ile yüklenecek. Şimdilik sistem fontlarına
        // fallback yapıyoruz.
        const timer = setTimeout(() => {
            setFontsLoaded(true);
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    return { fontsLoaded, fontError };
}