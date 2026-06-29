import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../theme/colors';
import { Spacing, Radius } from '../theme/spacing';
import { Shadows } from '../theme/shadows';

interface AppleCardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    variant?: 'plain' | 'elevated' | 'grouped';
}

export function AppleCard({ children, style, variant = 'plain' }: AppleCardProps) {
    return (
        <View style={[
            styles.base,
            variant === 'elevated' && styles.elevated,
            variant === 'grouped' && styles.grouped,
            style,
        ]}>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    base: {
        backgroundColor: Colors.systemBackground,
        borderRadius: Radius.lg,
        padding: Spacing.md,
    },
    elevated: {
        ...Shadows.card,
    },
    grouped: {
        backgroundColor: Colors.systemGroupedBackground,
    },
});