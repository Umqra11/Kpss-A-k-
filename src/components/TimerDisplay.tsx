import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { Fonts, FontSize } from '../theme/typography';
import { useTimerStore } from '../stores/timerStore';

export function TimerDisplay() {
    const getElapsedMs = useTimerStore((s) => s.getElapsedMs);
    const status = useTimerStore((s) => s.status);

    const [display, setDisplay] = useState('00:00:00');

    useEffect(() => {
        const interval = setInterval(() => {
            const ms = getElapsedMs();
            const totalSeconds = Math.floor(ms / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            const hh = hours.toString().padStart(2, '0');
            const mm = minutes.toString().padStart(2, '0');
            const ss = seconds.toString().padStart(2, '0');

            setDisplay(`${hh}:${mm}:${ss}`);
        }, 100);

        return () => clearInterval(interval);
    }, [getElapsedMs]);

    return (
        <View style={styles.container}>
            <Text style={styles.timer} numberOfLines={1} adjustsFontSizeToFit>
                {display}
            </Text>
            {status === 'paused' && (
                <Text style={styles.pausedLabel}>Duraklatıldı</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    timer: {
        fontFamily: Fonts.display.bold,
        fontSize: 72,
        color: Colors.label,
        letterSpacing: 2,
        fontVariant: ['tabular-nums'],
    },
    pausedLabel: {
        fontFamily: Fonts.body.bold,
        fontSize: FontSize.footnote,
        color: Colors.systemOrange,
        marginTop: 8,
    },
});