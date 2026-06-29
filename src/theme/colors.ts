/**
 * KPSS Aşkı - Renk Paleti
 * "Midnight Violet × Warm Gold" teması
 */

export const Colors = {
    // Brand Colors
    primary: '#7C3AED',
    primaryLight: '#A78BFA',
    primaryDark: '#5B21B6',

    secondary: '#F59E0B',
    secondaryLight: '#FBBF24',
    secondaryDark: '#D97706',

    accent: '#10B981',
    accentLight: '#34D399',
    accentDark: '#059669',

    // Backgrounds
    background: '#09090F',
    backgroundSecondary: '#13132B',
    surface: '#1C1C3A',
    surfaceLight: '#25254A',

    // Text
    textPrimary: '#F8F7FF',
    textSecondary: '#A09CC5',
    textMuted: '#6B6894',

    // Leaderboard
    gold: '#FFD700',
    silver: '#C0C0C0',
    bronze: '#CD7F32',

    // Status
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',

    // UI Elements
    border: '#2A2A5A',
    overlay: 'rgba(9, 9, 15, 0.8)',
    cardShadow: 'rgba(124, 58, 237, 0.15)',

    // Button States
    buttonActive: '#8B5CF6',
    buttonInactive: '#3A3A6A',
    buttonDisabled: '#2A2A4A',
} as const;

export type ColorKey = keyof typeof Colors;