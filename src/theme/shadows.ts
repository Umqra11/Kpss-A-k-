/**
 * KPSS Aşkı - Apple Minimalist Shadow Sistemi
 */
import { Platform } from 'react-native';

export const Shadows = {
    card: Platform.select({
        ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
        },
        android: {
            elevation: 2,
        },
        default: {},
    }),
    elevated: Platform.select({
        ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
        },
        android: {
            elevation: 4,
        },
        default: {},
    }),
    button: Platform.select({
        ios: {
            shadowColor: '#007AFF',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
        },
        android: {
            elevation: 4,
        },
        default: {},
    }),
};