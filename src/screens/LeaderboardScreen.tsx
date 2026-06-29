/**
 * KPSS Aşkı - Leaderboard Ekranı
 * Haftalık / Tüm Zamanlar sekmeli liderlik tablosu
 */

import React, { useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ActivityIndicator,
} from 'react-native';
import { Colors } from '../theme/colors';
import { FontSize } from '../theme/typography';
import { useLeaderboardStore } from '../stores/leaderboardStore';
import { useAuthStore } from '../stores/authStore';
import { LeaderboardEntry, LeaderboardMode } from '../types';
import { formatDurationCompact, formatWithDays } from '../theme/milestones';

function getRankEmoji(rank: number): string {
    switch (rank) {
        case 1: return '🥇';
        case 2: return '🥈';
        case 3: return '🥉';
        default: return `#${rank}`;
    }
}

function getRankStyle(rank: number) {
    if (rank === 1) return { backgroundColor: 'rgba(255, 215, 0, 0.15)', borderColor: Colors.gold };
    if (rank === 2) return { backgroundColor: 'rgba(192, 192, 192, 0.1)', borderColor: Colors.silver };
    if (rank === 3) return { backgroundColor: 'rgba(205, 127, 50, 0.1)', borderColor: Colors.bronze };
    return {};
}

export function LeaderboardScreen() {
    const mode = useLeaderboardStore((s) => s.mode);
    const setMode = useLeaderboardStore((s) => s.setMode);
    const weeklyEntries = useLeaderboardStore((s) => s.weeklyEntries);
    const totalEntries = useLeaderboardStore((s) => s.totalEntries);
    const isLoading = useLeaderboardStore((s) => s.isLoading);
    const fetchLeaderboard = useLeaderboardStore((s) => s.fetchLeaderboard);
    const subscribeToLeaderboard = useLeaderboardStore((s) => s.subscribeToLeaderboard);

    const userId = useAuthStore((s) => s.user?.id);

    const entries = mode === 'weekly' ? weeklyEntries : totalEntries;

    useEffect(() => {
        fetchLeaderboard();
        const unsubscribe = subscribeToLeaderboard();
        return unsubscribe;
    }, [mode]);

    const renderItem = ({ item }: { item: LeaderboardEntry }) => {
        const isMe = item.user_id === userId;
        const rankStyle = getRankStyle(item.rank);

        return (
            <View
                style={[
                    styles.entryCard,
                    rankStyle,
                    isMe && styles.entryCardMe,
                ]}
            >
                <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>
                        {getRankEmoji(item.rank)}
                    </Text>
                </View>
                <View style={styles.userInfo}>
                    <Text style={[styles.username, isMe && styles.usernameMe]}>
                        {item.username}
                        {isMe && ' (Sen)'}
                    </Text>
                </View>
                <View style={styles.timeInfo}>
                    <Text style={[styles.timeText, isMe && styles.timeTextMe]}>
                        {mode === 'weekly'
                            ? formatDurationCompact(item.study_seconds)
                            : formatWithDays(item.study_seconds)}
                    </Text>
                </View>
            </View>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🕐</Text>
            <Text style={styles.emptyText}>
                Henüz çalışma verisi yok.{'\n'}İlk çalışmayı başlat!
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Tab Switch */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, mode === 'weekly' && styles.tabActive]}
                    onPress={() => setMode('weekly')}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.tabText, mode === 'weekly' && styles.tabTextActive]}>
                        🏆 Haftalık
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, mode === 'total' && styles.tabActive]}
                    onPress={() => setMode('total')}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.tabText, mode === 'total' && styles.tabTextActive]}>
                        📊 Tüm Zamanlar
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Liste */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={entries}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.user_id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={renderEmpty}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundSecondary,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 12,
        gap: 8,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 16,
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    tabActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primaryLight,
    },
    tabText: {
        fontFamily: 'Satoshi-Bold',
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
    },
    tabTextActive: {
        color: Colors.textPrimary,
    },
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    entryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    entryCardMe: {
        borderColor: Colors.primary,
        backgroundColor: Colors.surfaceLight,
    },
    rankBadge: {
        width: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankText: {
        fontSize: FontSize.xl,
    },
    userInfo: {
        flex: 1,
        marginLeft: 12,
    },
    username: {
        fontFamily: 'Satoshi-Bold',
        fontSize: FontSize.base,
        color: Colors.textPrimary,
    },
    usernameMe: {
        color: Colors.primaryLight,
    },
    timeInfo: {
        alignItems: 'flex-end',
    },
    timeText: {
        fontFamily: 'ClashDisplay-Bold',
        fontSize: FontSize.md,
        color: Colors.secondary,
    },
    timeTextMe: {
        color: Colors.secondaryLight,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyText: {
        fontFamily: 'Satoshi-Regular',
        fontSize: FontSize.md,
        color: Colors.textMuted,
        textAlign: 'center',
        lineHeight: 24,
    },
});