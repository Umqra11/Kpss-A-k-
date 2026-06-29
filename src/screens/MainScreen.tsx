/**
 * KPSS Aşkı - Ana Kronometre Ekranı
 */

import React, { useCallback, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ScrollView,
} from 'react-native';
import { Colors } from '../theme/colors';
import { FontSize } from '../theme/typography';
import { useTimerStore } from '../stores/timerStore';
import { useAuthStore } from '../stores/authStore';
import { useLeaderboardStore } from '../stores/leaderboardStore';
import { TimerDisplay } from '../components/TimerDisplay';
import { MilestonePopup } from '../components/MilestonePopup';
import { formatDurationCompact, formatWithDays, getNextMilestone } from '../theme/milestones';

export function MainScreen() {
    const status = useTimerStore((s) => s.status);
    const startTimer = useTimerStore((s) => s.startTimer);
    const pauseTimer = useTimerStore((s) => s.pauseTimer);
    const resumeTimer = useTimerStore((s) => s.resumeTimer);
    const resetTimer = useTimerStore((s) => s.resetTimer);
    const loadTimerState = useTimerStore((s) => s.loadTimerState);
    const weeklyStudySeconds = useTimerStore((s) => s.weeklyStudySeconds);
    const totalStudySeconds = useTimerStore((s) => s.totalStudySeconds);
    const getElapsedMs = useTimerStore((s) => s.getElapsedMs);
    const dismissMilestone = useTimerStore((s) => s.dismissMilestone);
    const lastMilestonePopup = useTimerStore((s) => s.lastMilestonePopup);

    const profile = useAuthStore((s) => s.profile);
    const fetchLeaderboard = useLeaderboardStore((s) => s.fetchLeaderboard);

    const [showTotal, setShowTotal] = React.useState(false);

    useEffect(() => {
        loadTimerState();
        fetchLeaderboard();
    }, []);

    const handleMainButton = useCallback(async () => {
        if (status === 'idle') {
            await startTimer();
        } else if (status === 'running') {
            await pauseTimer();
        } else if (status === 'paused') {
            await resumeTimer();
        }
    }, [status, startTimer, pauseTimer, resumeTimer]);

    const handleReset = useCallback(async () => {
        if (status !== 'idle') {
            await resetTimer();
        }
    }, [status, resetTimer]);

    const elapsedSeconds = Math.floor(getElapsedMs() / 1000);
    const nextMilestone = getNextMilestone(weeklyStudySeconds / 3600);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.username}>@{profile?.username || '...'}</Text>
                    <TouchableOpacity
                        style={styles.modeToggle}
                        onPress={() => setShowTotal(!showTotal)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.modeToggleText}>
                            {showTotal ? '📊 Toplam' : '📅 Haftalık'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Kronometre */}
                <TimerDisplay />

                {/* İstatistik Kartları */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Bu Oturum</Text>
                        <Text style={styles.statValue}>
                            {formatDurationCompact(elapsedSeconds)}
                        </Text>
                    </View>
                    <View style={[styles.statCard, styles.statCardHighlight]}>
                        <Text style={styles.statLabel}>
                            {showTotal ? 'Toplam' : 'Haftalık'}
                        </Text>
                        <Text style={[styles.statValue, styles.statValueHighlight]}>
                            {showTotal
                                ? formatWithDays(totalStudySeconds)
                                : formatDurationCompact(weeklyStudySeconds)}
                        </Text>
                    </View>
                </View>

                {/* Sonraki Baraj */}
                {nextMilestone && (
                    <View style={styles.nextMilestone}>
                        <Text style={styles.nextMilestoneText}>
                            {nextMilestone.icon} Sonraki baraj: {nextMilestone.title} ({nextMilestone.hours} saat)
                        </Text>
                    </View>
                )}

                {/* Kontrol Butonları */}
                <View style={styles.controlRow}>
                    {status !== 'idle' && (
                        <TouchableOpacity
                            style={styles.resetButton}
                            onPress={handleReset}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.resetButtonText}>🔄 Sıfırla</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[
                            styles.mainButton,
                            status === 'running' && styles.mainButtonActive,
                            status === 'paused' && styles.mainButtonPaused,
                        ]}
                        onPress={handleMainButton}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.mainButtonText}>
                            {status === 'idle' && '▶ BAŞLAT'}
                            {status === 'running' && '⏸ DURAKLAT'}
                            {status === 'paused' && '▶ DEVAM'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Milestone Popup */}
            {lastMilestonePopup && <MilestonePopup />}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundSecondary,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 40,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: 32,
    },
    username: {
        fontFamily: 'Satoshi-Bold',
        fontSize: FontSize.lg,
        color: Colors.primaryLight,
    },
    modeToggle: {
        backgroundColor: Colors.surface,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    modeToggleText: {
        fontFamily: 'Satoshi-Medium',
        fontSize: FontSize.sm,
        color: Colors.textPrimary,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 32,
        width: '100%',
    },
    statCard: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    statCardHighlight: {
        borderColor: Colors.primary,
        backgroundColor: Colors.surfaceLight,
    },
    statLabel: {
        fontFamily: 'Satoshi-Regular',
        fontSize: FontSize.xs,
        color: Colors.textMuted,
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    statValue: {
        fontFamily: 'ClashDisplay-Bold',
        fontSize: FontSize.xl,
        color: Colors.textPrimary,
    },
    statValueHighlight: {
        color: Colors.secondary,
    },
    nextMilestone: {
        marginTop: 20,
        backgroundColor: Colors.surface,
        borderRadius: 12,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: Colors.secondaryDark,
    },
    nextMilestoneText: {
        fontFamily: 'Satoshi-Medium',
        fontSize: FontSize.sm,
        color: Colors.secondaryLight,
        textAlign: 'center',
    },
    controlRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginTop: 40,
    },
    resetButton: {
        backgroundColor: Colors.surface,
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    resetButtonText: {
        fontFamily: 'Satoshi-Bold',
        fontSize: FontSize.base,
        color: Colors.textSecondary,
    },
    mainButton: {
        flex: 1,
        backgroundColor: Colors.accent,
        paddingVertical: 20,
        borderRadius: 24,
        alignItems: 'center',
        shadowColor: Colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
        minWidth: 160,
    },
    mainButtonActive: {
        backgroundColor: Colors.secondary,
        shadowColor: Colors.secondary,
    },
    mainButtonPaused: {
        backgroundColor: Colors.primary,
        shadowColor: Colors.primary,
    },
    mainButtonText: {
        fontFamily: 'ClashDisplay-Bold',
        fontSize: FontSize.lg,
        color: Colors.textPrimary,
        letterSpacing: 2,
    },
});