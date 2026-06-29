/**
 * KPSS Aşkı - Motivasyon Popup Bileşeni
 */

import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Fonts, FontSize } from '../theme/typography';
import { useTimerStore } from '../stores/timerStore';

const { width } = Dimensions.get('window');

export function MilestonePopup() {
    const lastMilestonePopup = useTimerStore((s) => s.lastMilestonePopup);
    const dismissMilestone = useTimerStore((s) => s.dismissMilestone);

    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (lastMilestonePopup) {
            // Giriş animasyonu
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 6,
                    tension: 80,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();

            // 4 saniye sonra otomatik kapan
            const timeout = setTimeout(() => {
                handleDismiss();
            }, 4000);

            return () => clearTimeout(timeout);
        } else {
            scaleAnim.setValue(0);
            opacityAnim.setValue(0);
        }
    }, [lastMilestonePopup]);

    const handleDismiss = () => {
        Animated.parallel([
            Animated.timing(scaleAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            dismissMilestone();
        });
    };

    if (!lastMilestonePopup) return null;

    return (
        <View style={styles.overlay}>
            <TouchableOpacity style={styles.backdrop} onPress={handleDismiss} activeOpacity={1} />
            <Animated.View
                style={[
                    styles.popup,
                    {
                        transform: [{ scale: scaleAnim }],
                        opacity: opacityAnim,
                    },
                ]}
            >
                <Text style={styles.icon}>{lastMilestonePopup.icon}</Text>
                <Text style={styles.title}>{lastMilestonePopup.title}</Text>
                <Text style={styles.message}>{lastMilestonePopup.message}</Text>
                <TouchableOpacity
                    style={styles.button}
                    onPress={handleDismiss}
                    activeOpacity={0.7}
                >
                    <Text style={styles.buttonText}>🔥 Devam!</Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: Colors.overlay,
    },
    popup: {
        backgroundColor: Colors.surface,
        borderRadius: 24,
        padding: 32,
        width: width * 0.82,
        maxWidth: 360,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.primaryDark,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    icon: {
        fontSize: 64,
        marginBottom: 16,
    },
    title: {
        fontFamily: 'ClashDisplay-Bold',
        fontSize: FontSize['2xl'],
        color: Colors.textPrimary,
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontFamily: 'Satoshi-Regular',
        fontSize: FontSize.md,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 26,
        marginBottom: 24,
    },
    button: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 16,
        minWidth: 160,
        alignItems: 'center',
    },
    buttonText: {
        fontFamily: 'Satoshi-Bold',
        fontSize: FontSize.md,
        color: Colors.textPrimary,
    },
});