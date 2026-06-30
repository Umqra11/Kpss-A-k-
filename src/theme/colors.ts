/**
 * KPSS Aşkı - Apple Minimalist Renk Paleti
 * iOS Human Interface Guidelines Semantic Color System
 * v8: Dark mode eklendi
 */

export const ColorsLight = {
  // Sistem Arka Planları
  systemBackground: '#FFFFFF',
  systemGroupedBackground: '#F2F2F7',

  // iOS Semantic Colors
  systemBlue: '#007AFF',
  systemGreen: '#34C759',
  systemRed: '#FF3B30',
  systemOrange: '#FF9500',
  systemYellow: '#FFCC00',
  systemPurple: '#AF52DE',
  systemPink: '#FF2D55',
  systemTeal: '#5AC8FA',
  systemIndigo: '#5856D6',

  // Metin Renkleri (UILabel color scale)
  label: '#000000',
  secondaryLabel: '#3C3C4399',
  tertiaryLabel: '#3C3C434D',
  quaternaryLabel: '#3C3C432E',

  // Gri Skala (systemGray 1-6)
  systemGray: '#8E8E93',
  systemGray2: '#AEAEB2',
  systemGray3: '#C7C7CC',
  systemGray4: '#D1D1D6',
  systemGray5: '#E5E5EA',
  systemGray6: '#F2F2F7',

  // Dolgu ve Ayraçlar
  separator: '#E5E5EA',
  opaqueSeparator: '#C6C6C8',
  fill: '#78788033',
  secondaryFill: '#78788028',
  tertiaryFill: '#7676801E',
  quaternaryFill: '#74748014',

  // Leaderboard
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',

  // Durum
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#007AFF',

  // UI Elements
  border: '#E5E5EA',
  overlay: 'rgba(0, 0, 0, 0.4)',
  cardShadow: 'rgba(0, 0, 0, 0.04)',
} as const;

export const ColorsDark = {
  systemBackground: '#000000',
  systemGroupedBackground: '#1C1C1E',

  systemBlue: '#0A84FF',
  systemGreen: '#30D158',
  systemRed: '#FF453A',
  systemOrange: '#FF9F0A',
  systemYellow: '#FFD60A',
  systemPurple: '#BF5AF2',
  systemPink: '#FF375F',
  systemTeal: '#64D2FF',
  systemIndigo: '#5E5CE6',

  label: '#FFFFFF',
  secondaryLabel: '#EBEBF599',
  tertiaryLabel: '#EBEBF54D',
  quaternaryLabel: '#EBEBF52E',

  systemGray: '#8E8E93',
  systemGray2: '#636366',
  systemGray3: '#48484A',
  systemGray4: '#3A3A3C',
  systemGray5: '#2C2C2E',
  systemGray6: '#1C1C1E',

  separator: '#38383A',
  opaqueSeparator: '#38383A',
  fill: '#7878805C',
  secondaryFill: '#78788047',
  tertiaryFill: '#7676803A',
  quaternaryFill: '#7474802E',

  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',

  success: '#30D158',
  warning: '#FF9F0A',
  error: '#FF453A',
  info: '#0A84FF',

  border: '#38383A',
  overlay: 'rgba(0, 0, 0, 0.6)',
  cardShadow: 'rgba(0, 0, 0, 0.2)',
} as const;

export type ColorPalette = typeof ColorsLight;
export type ColorKey = keyof typeof ColorsLight;

// Default export (light mode) — use useColors() hook for dynamic
export const Colors = ColorsLight;
