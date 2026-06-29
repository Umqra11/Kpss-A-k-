/**
 * KPSS Aşkı - Milestone Popup (Apple-minimalist)
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';
import { Colors } from '../theme/colors';
import { Fonts, FontSize } from '../theme/typography';
import { Spacing, Radius } from '../theme/spacing';
import { useTimerStore } from '../stores/timerStore';

export function MilestonePopup() {
    const lastMilestonePopup = useTimerStore((s) => s.lastMilestonePopup);
    const dismissMilestone = useTimerStore((s) => s.dismissMilestone);

    const scale = useSharedValue(0);
    const overlayOpacity = useSharedValue(0);

    useEffect(() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 120 });
        overlayOpacity.value = withTiming(1, { duration: 300 });
    }, []);

    const handleDismiss = () => {
        scale.value = withSpring(0, { damping: 15, stiffness: 150 }, () => {
            runOnJS(dismissMilestone)();
        });
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const overlayStyle = useAnimatedStyle(() => ({
        opacity: overlayOpacity.value,
    }));

    if (!lastMilestonePopup) return null;

    return (
        <View style={styles.wrapper}>
            <Animated.View style={[styles.overlay, overlayStyle]}>
                <TouchableWithoutFeedback onPress={handleDismiss}>
                    <View style={styles.overlayTouchable} />
                </TouchableWithoutFeedback>
            </Animated.View>
            <Animated.View style={[styles.card, animatedStyle]}>
                <Text style={styles.icon}>{lastMilestonePopup.icon}</Text>
                <Text style={styles.title}>{lastMilestonePopup.title}</Text>
                <Text style={styles.message}>{lastMilestonePopup.message}</Text>
                <TouchableWithoutFeedback onPress={handleDismiss}>
                    <View style={styles.button}>
                        <Text style={styles.buttonText}>Harika!</Text>
                    </View>
                </TouchableWithoutFeedback>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    overlayTouchable: {
        flex: 1,
    },
    card: {
        backgroundColor: Colors.systemBackground,
        borderRadius: Radius.xl,
        padding: Spacing.xxl,
        marginHorizontal: Spacing.xl,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 32,
        elevation: 8,
        maxWidth: 320,
        width: '100%',
    },
    icon: {
        fontSize: 56,
        marginBottom: Spacing.md,
    },
    title: {
        fontFamily: Fonts.display.bold,
        fontSize: FontSize.title3,
        color: Colors.label,
        textAlign: 'center',
        marginBottom: Spacing.xs,
    },
    message: {
        fontFamily: Fonts.body.regular,
        fontSize: FontSize.body,
        color: Colors.secondaryLabel,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: Spacing.xl,
    },
    button: {
        backgroundColor: Colors.systemBlue,
        borderRadius: Radius.lg,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.xxl,
    },
    buttonText: {
        fontFamily: Fonts.body.bold,
        fontSize: FontSize.headline,
        color: '#FFFFFF',
    },
});