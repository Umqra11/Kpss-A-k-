import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { Fonts, FontSize } from '../theme/typography';
import { Spacing, Radius } from '../theme/spacing';

interface Segment<T extends string> {
    key: T;
    label: string;
}

interface SegmentedControlProps<T extends string> {
    segments: Segment<T>[];
    selected: T;
    onSelect: (key: T) => void;
}

export function SegmentedControl<T extends string>({ segments, selected, onSelect }: SegmentedControlProps<T>) {
    return (
        <View style={styles.container}>
            {segments.map((segment) => {
                const isSelected = segment.key === selected;
                return (
                    <TouchableOpacity
                        key={segment.key}
                        style={[styles.segment, isSelected && styles.segmentSelected]}
                        onPress={() => onSelect(segment.key)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.label, isSelected && styles.labelSelected]}>
                            {segment.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: Colors.systemGray5,
        borderRadius: Radius.md,
        padding: 2,
    },
    segment: {
        flex: 1,
        paddingVertical: Spacing.xs,
        alignItems: 'center',
        borderRadius: Radius.md - 2,
    },
    segmentSelected: {
        backgroundColor: Colors.systemBackground,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    label: {
        fontFamily: Fonts.body.regular,
        fontSize: FontSize.subhead,
        color: Colors.secondaryLabel,
    },
    labelSelected: {
        fontFamily: Fonts.body.bold,
        color: Colors.label,
    },
});