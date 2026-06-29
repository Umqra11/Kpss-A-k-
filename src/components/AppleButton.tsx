import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors } from '../theme/colors';
import { Fonts, FontSize } from '../theme/typography';
import { Spacing, Radius } from '../theme/spacing';

interface AppleButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'destructive' | 'secondary' | 'ghost';
    size?: 'large' | 'medium' | 'small';
    disabled?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

export function AppleButton({
    title, onPress, variant = 'primary', size = 'large', disabled = false, style, textStyle
}: AppleButtonProps) {
    return (
        <TouchableOpacity
            style={[
                styles.base,
                styles[size],
                variant === 'primary' && styles.primary,
                variant === 'destructive' && styles.destructive,
                variant === 'secondary' && styles.secondary,
                variant === 'ghost' && styles.ghost,
                disabled && styles.disabled,
                style,
            ]}
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.7}
        >
            <Text style={[
                styles.text,
                styles[`${size}Text`],
                variant === 'primary' && styles.primaryText,
                variant === 'destructive' && styles.destructiveText,
                variant === 'secondary' && styles.secondaryText,
                variant === 'ghost' && styles.ghostText,
                disabled && styles.disabledText,
                textStyle,
            ]}>
                {title}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    base: {
        borderRadius: Radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    large: { height: 50, paddingHorizontal: Spacing.xl },
    medium: { height: 40, paddingHorizontal: Spacing.lg },
    small: { height: 32, paddingHorizontal: Spacing.md },
    primary: { backgroundColor: Colors.systemBlue },
    destructive: { backgroundColor: Colors.systemRed },
    secondary: { backgroundColor: Colors.systemGray5 },
    ghost: { backgroundColor: 'transparent' },
    disabled: { opacity: 0.4 },
    text: { fontFamily: Fonts.body.bold, letterSpacing: -0.2 },
    largeText: { fontSize: FontSize.headline },
    mediumText: { fontSize: FontSize.subhead },
    smallText: { fontSize: FontSize.footnote },
    primaryText: { color: '#FFFFFF' },
    destructiveText: { color: '#FFFFFF' },
    secondaryText: { color: Colors.label },
    ghostText: { color: Colors.systemBlue },
    disabledText: { opacity: 0.5 },
});