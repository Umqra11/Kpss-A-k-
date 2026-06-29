/**
 * KPSS Aşkı - Apple Minimalist Renk Paleti
 * iOS Human Interface Guidelines Semantic Color System
 */

export const Colors = {
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

export type ColorKey = keyof typeof Colors;