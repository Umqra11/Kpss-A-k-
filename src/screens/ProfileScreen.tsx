/**
 * KPSS Aşkı - Profil & İstatistik Ekranı
 */

import React from 'react';
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
import { useAuthStore } from '../stores/authStore';
import { useTimerStore } from '../stores/timerStore';
import { formatDurationCompact, formatWithDays, MILESTONES } from '../theme/milestones';

export function ProfileScreen() {
    const profile = useAuthStore((s) => s.profile);
    const logout = useAuthStore((s) => s.logout);
    const weeklyStudySeconds = useTimerStore((s) => s.weeklyStudySeconds);
    const totalStudySeconds = useTimerStore((s) => s.totalStudySeconds);
    const milestonesEarnedThisWeek = useTimerStore((s) => s.milestonesEarnedThisWeek);

    const totalHours = Math.floor((profile?.total_study_seconds || 0) / 3600);
    const weeklyHours = Math.floor(weeklyStudySeconds / 3600);
    const previousWeekly = profile?.previous_weekly_study_seconds || 0;
    const previousWeeklyHours = Math.floor(previousWeekly / 3600);

    // Kazanılan rozetler
    const earnedMilestones = MILESTONES.filter((m) =>
        milestonesEarnedThisWeek.includes(m.hours)
    ).reverse().slice(0, 5);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
                {/* Profil Kartı */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarEmoji}>👤</Text>
                    </View>
                    <Text style={styles.username}>@{profile?.username || '...'}</Text>
                    <Text style={styles.joinedText}>
                        Katılım: {profile?.created_at
                            ? new Date(profile.created_at).toLocaleDateString('tr-TR')
                            : '...'}
                    </Text>
                </View>

                {/* İstatistik Kartları */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statIcon}>📅</Text>
                        <Text style={styles.statValue}>
                            {weeklyHours > 24
                                ? formatWithDays(weeklyStudySeconds)
                                : formatDurationCompact(weeklyStudySeconds)}
                        </Text>
                        <Text style={styles.statLabel}>Bu Hafta</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statIcon}>📊</Text>
                        <Text style={styles.statValue}>
                            {formatWithDays(totalStudySeconds)}
                        </Text>
                        <Text style={styles.statLabel}>Toplam</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statIcon}>📈</Text>
                        <Text style={styles.statValue}>
                            {previousWeeklyHours > 24
                                ? formatWithDays(previousWeekly)
                                : formatDurationCompact(previousWeekly)}
                        </Text>
                        <Text style={styles.statLabel}>Geçen Hafta</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statIcon}>⭐</Text>
                        <Text style={styles.statValue}>
                            {milestonesEarnedThisWeek.length}
                        </Text>
                        <Text style={styles.statLabel}>Rozet</Text>
                    </View>
                </View>

                {/* Rozetler */}
                <View style={styles.badgesSection}>
                    <Text style={styles.sectionTitle}>🏅 Bu Hafta Kazanılan Rozetler</Text>
                    {earnedMilestones.length > 0 ? (
                        <View style={styles.badgesRow}>
                            {earnedMilestones.map((m) => (
                                <View key={m.hours} style={styles.badgeItem}>
                                    <Text style={styles.badgeIcon}>{m.icon}</Text>
                                    <Text style={styles.badgeName}>{m.title}</Text>
                                    <Text style={styles.badgeHours}>{m.hours} saat</Text>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <Text style={styles.noBadges}>
                            Henüz rozet kazanmadın.{'\n'}Çalışmaya başla!
                        </Text>
                    )}
                </View>

                {/* Çıkış Butonu */}
                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={logout}
                    activeOpacity={0.7}
                >
                    <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundSecondary,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 40,
    },
    profileCard: {
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    avatarCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.primaryDark,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: Colors.primaryLight,
    },
    avatarEmoji: {
        fontSize: 36,
    },
    username: {
        fontFamily: 'ClashDisplay-Bold',
        fontSize: FontSize.xl,
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    joinedText: {
        fontFamily: 'Satoshi-Regular',
        fontSize: FontSize.sm,
        color: Colors.textMuted,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 24,
    },
    statCard: {
        width: '47%',
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    statIcon: {
        fontSize: 24,
        marginBottom: 8,
    },
    statValue: {
        fontFamily: 'ClashDisplay-Bold',
        fontSize: FontSize.xl,
        color: Colors.secondary,
        marginBottom: 4,
    },
    statLabel: {
        fontFamily: 'Satoshi-Regular',
        fontSize: FontSize.xs,
        color: Colors.textMuted,
        textTransform: 'uppercase',
    },
    badgesSection: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontFamily: 'ClashDisplay-Medium',
        fontSize: FontSize.md,
        color: Colors.textPrimary,
        marginBottom: 16,
    },
    badgesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    badgeItem: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        minWidth: 80,
    },
    badgeIcon: {
        fontSize: 28,
        marginBottom: 4,
    },
    badgeName: {
        fontFamily: 'Satoshi-Medium',
        fontSize: FontSize.xs,
        color: Colors.textPrimary,
        textAlign: 'center',
    },
    badgeHours: {
        fontFamily: 'Satoshi-Regular',
        fontSize: 10,
        color: Colors.textMuted,
        marginTop: 2,
    },
    noBadges: {
        fontFamily: 'Satoshi-Regular',
        fontSize: FontSize.sm,
        color: Colors.textMuted,
        textAlign: 'center',
        paddingVertical: 20,
        lineHeight: 22,
    },
    logoutButton: {
        backgroundColor: Colors.error,
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        opacity: 0.8,
    },
    logoutButtonText: {
        fontFamily: 'Satoshi-Bold',
        fontSize: FontSize.md,
        color: Colors.textPrimary,
    },
});