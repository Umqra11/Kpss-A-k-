import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
    cancelAnimation,
} from 'react-native-reanimated';
import { Colors } from '../theme/colors';

interface PulseBadgeProps {
    size?: number;
    color?: string;
}

export function PulseBadge({ size = 10, color = Colors.systemGreen }: PulseBadgeProps) {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0.6);

    useEffect(() => {
        scale.value = withRepeat(
            withTiming(1.8, { duration: 1500, easing: Easing.out(Easing.ease) }),
            -1,
            true
        );
        opacity.value = withRepeat(
            withTiming(0, { duration: 1500, easing: Easing.out(Easing.ease) }),
            -1,
            true
        );

        return () => {
            cancelAnimation(scale);
            cancelAnimation(opacity);
        };
    }, []);

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    return (
        <View style={[styles.container, { width: size * 2.5, height: size * 2.5 }]}>
            <Animated.View style={[
                styles.pulse,
                {
                    width: size * 2,
                    height: size * 2,
                    borderRadius: size,
                    backgroundColor: color,
                },
                pulseStyle,
            ]} />
            <View style={[
                styles.dot,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: color,
                },
            ]} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    pulse: {
        position: 'absolute',
    },
    dot: {
        position: 'absolute',
    },
});