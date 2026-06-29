/**
 * KPSS Aşkı - Kronometre Gösterimi
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Colors } from '../theme/colors';
import { Fonts, FontSize } from '../theme/typography';
import { useTimerStore } from '../stores/timerStore';
import { formatDuration } from '../theme/milestones';

export function TimerDisplay() {
    const getElapsedMs = useTimerStore((s) => s.getElapsedMs);
    const status = useTimerStore((s) => s.status);
    const [display, setDisplay] = useState('00:00:00');
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const frameRef = useRef<number | null>(null);

    // Animasyonlu pulse efekti (running iken)
    useEffect(() => {
        if (status === 'running') {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.02,
                        duration: 1000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        } else {
            pulseAnim.setValue(1);
        }
    }, [status, pulseAnim]);

    // 100ms'de bir ekranı güncelle (pürüzsüz kronometre)
    useEffect(() => {
        function updateDisplay() {
            const ms = getElapsedMs();
            const totalSeconds = Math.floor(ms / 1000);
            setDisplay(formatDuration(totalSeconds));
            frameRef.current = requestAnimationFrame(updateDisplay);
        }

        if (status === 'running') {
            frameRef.current = requestAnimationFrame(updateDisplay);
        } else {
            const ms = getElapsedMs();
            const totalSeconds = Math.floor(ms / 1000);
            setDisplay(formatDuration(totalSeconds));
        }

        return () => {
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
            }
        };
    }, [status, getElapsedMs]);

    const isActive = status === 'running';

    return (
        <View style={styles.container}>
            <Animated.Text
                style={[
                    styles.timer,
                    {
                        color: isActive ? Colors.primaryLight : Colors.textPrimary,
                        transform: [{ scale: pulseAnim }],
                    },
                ]}
            >
                {display}
            </Animated.Text>
            <Text style={styles.label}>
                saat : dakika : saniye
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    timer: {
        fontFamily: 'ClashDisplay-Bold',
        fontSize: 58,
        letterSpacing: 4,
        fontVariant: ['tabular-nums'],
        textShadowColor: 'rgba(124, 58, 237, 0.3)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 20,
    },
    label: {
        fontFamily: 'Satoshi-Regular',
        fontSize: FontSize.xs,
        color: Colors.textMuted,
        marginTop: 8,
        letterSpacing: 6,
        textTransform: 'uppercase',
    },
});