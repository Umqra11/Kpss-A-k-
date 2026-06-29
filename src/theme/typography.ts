/**
 * KPSS Aşkı - Tipografi Sistemi
 * Clash Display (display) + Satoshi (body)
 */

export const Fonts = {
    display: {
        bold: 'ClashDisplay-Bold',
        semibold: 'ClashDisplay-Semibold',
        medium: 'ClashDisplay-Medium',
        regular: 'ClashDisplay-Regular',
    },
    body: {
        bold: 'Satoshi-Bold',
        semibold: 'Satoshi-Medium',
        regular: 'Satoshi-Regular',
        light: 'Satoshi-Light',
    },
} as const;

export const FontSize = {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 32,
    '3xl': 40,
    '4xl': 52,
    '5xl': 68,
    '6xl': 84,
} as const;

export const LineHeight = {
    tight: 1.1,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.75,
} as const;

export type FontFamily = keyof typeof Fonts;