/**
 * KPSS Aşkı - Tarih/Zaman Yardımcı Fonksiyonları
 */

// Hafta başlangıcı (Salı 00:00)
export function getCurrentWeekStart(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilTuesday = dayOfWeek >= 2 ? dayOfWeek - 2 : dayOfWeek + 5;
  const tuesday = new Date(now);
  tuesday.setDate(now.getDate() - daysUntilTuesday);
  tuesday.setHours(0, 0, 0, 0);
  return tuesday.toISOString().split('T')[0];
}

// Bugünün tarihi (YYYY-MM-DD)
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// Geçmiş hafta başlangıçlarını getir (son 8 hafta)
export function getPastWeekStarts(): { weekStart: string; label: string }[] {
  const weeks: { weekStart: string; label: string }[] = [];
  const now = new Date();
  const currentWeekStart = getCurrentWeekStart();

  for (let i = 1; i <= 8; i++) {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - i * 7);
    const ws = d.toISOString().split('T')[0];
    const startDate = new Date(ws);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    const startStr = startDate.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
    });
    const endStr = endDate.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
    });

    weeks.push({
      weekStart: ws,
      label: `${startStr} - ${endStr}`,
    });
  }

  return weeks;
}

// Slug oluştur (Türkçe karakter desteği)
export function slugify(name: string): string {
  const turkishChars: Record<string, string> = {
    ı: 'i',
    İ: 'i',
    ğ: 'g',
    Ğ: 'g',
    ü: 'u',
    Ü: 'u',
    ş: 's',
    Ş: 's',
    ö: 'o',
    Ö: 'o',
    ç: 'c',
    Ç: 'c',
  };
  return name
    .toLowerCase()
    .replace(/[ıİğĞüÜşŞöÖçÇ]/g, (char) => turkishChars[char] || char)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

// Geçerli zaman (mock'lanabilir)
export function getNow(): number {
  return Date.now();
}
