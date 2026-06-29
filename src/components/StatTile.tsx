import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { Fonts, FontSize } from '../theme/typography';
import { Spacing, Radius } from '../theme/spacing';

interface StatTileProps {
    label: string;
    value: string;
    icon?: string;
    highlight?: boolean;
}

export function StatTile({ label, value, icon, highlight = false }: StatTileProps) {
    return (
        <View style={[styles.container, highlight && styles.highlight]}>
            {icon && <Text style={styles.icon}>{icon}</Text>}
            <Text style={[styles.value, highlight && styles.valueHighlight]}>
                {value}
            </Text>
            <Text style={styles.label}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.systemGroupedBackground,
        borderRadius: Radius.lg,
        padding: Spacing.md,
        alignItems: 'center',
    },
    highlight: {
        backgroundColor: Colors.systemBlue + '10',
        borderWidth: 1,
        borderColor: Colors.systemBlue + '30',
    },
    icon: { fontSize: 24, marginBottom: Spacing.xs },
    value: {
        fontFamily: Fonts.display.bold,
        fontSize: FontSize.title2,
        color: Colors.label,
        marginBottom: 4,
    },
    valueHighlight: { color: Colors.systemBlue },
    label: {
        fontFamily: Fonts.body.regular,
        fontSize: FontSize.caption1,
        color: Colors.secondaryLabel,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});