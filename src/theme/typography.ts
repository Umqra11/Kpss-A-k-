/**
 * KPSS Aşkı - Apple Minimalist Tipografi
 * iOS Dynamic Type Scale
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

// iOS Dynamic Type Scale
export const FontSize = {
    largeTitle: 34,
    title1: 28,
    title2: 22,
    title3: 20,
    headline: 17,
    body: 17,
    callout: 16,
    subhead: 15,
    footnote: 13,
    caption1: 12,
    caption2: 11,
} as const;

export const LineHeight = {
    tight: 1.1,
    snug: 1.25,
    normal: 1.35,
    relaxed: 1.5,
} as const;

export const FontWeight = {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
};

export type FontFamily = keyof typeof Fonts;