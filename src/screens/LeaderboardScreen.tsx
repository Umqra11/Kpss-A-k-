/**
 * KPSS Aşkı - Leaderboard Ekranı (Apple-minimalist)
 * Haftalık / Tüm Zamanlar + Aktif Kullanıcılar
 */

import React, { useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    SafeAreaView,
    ActivityIndicator,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Fonts, FontSize } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { SegmentedControl } from '../components/SegmentedControl';
import { UserListItem } from '../components/UserListItem';
import { PulseBadge } from '../components/PulseBadge';
import { useLeaderboardStore } from '../stores/leaderboardStore';
import { useAuthStore } from '../stores/authStore';
import { LeaderboardEntry, LeaderboardMode } from '../types';
import { formatDurationCompact, formatWithDays } from '../theme/milestones';

export function LeaderboardScreen() {
    const mode = useLeaderboardStore((s) => s.mode);
    const setMode = useLeaderboardStore((s) => s.setMode);
    const weeklyEntries = useLeaderboardStore((s) => s.weeklyEntries);
    const totalEntries = useLeaderboardStore((s) => s.totalEntries);
    const activeUsers = useLeaderboardStore((s) => s.activeUsers);
    const isLoading = useLeaderboardStore((s) => s.isLoading);
    const fetchLeaderboard = useLeaderboardStore((s) => s.fetchLeaderboard);
    const fetchActiveUsers = useLeaderboardStore((s) => s.fetchActiveUsers);
    const subscribeToLeaderboard = useLeaderboardStore((s) => s.subscribeToLeaderboard);
    const subscribeToActiveUsers = useLeaderboardStore((s) => s.subscribeToActiveUsers);

    const userId = useAuthStore((s) => s.user?.id);

    const entries = mode === 'weekly' ? weeklyEntries : totalEntries;

    useEffect(() => {
        fetchLeaderboard();
        fetchActiveUsers();
        const unsub1 = subscribeToLeaderboard();
        const unsub2 = subscribeToActiveUsers();
        return () => {
            unsub1();
            unsub2();
        };
    }, [mode]);

    const segments = [
        { key: 'weekly' as LeaderboardMode, label: '🏆 Haftalık' },
        { key: 'total' as LeaderboardMode, label: '📊 Tüm Zamanlar' },
    ];

    const renderItem = ({ item }: { item: LeaderboardEntry }) => {
        const isMe = item.user_id === userId;
        return (
            <UserListItem
                username={item.username}
                studySeconds={item.study_seconds}
                rank={item.rank}
                isMe={isMe}
                isActive={item.is_active}
                activeIndicator={item.is_active ? <PulseBadge size={8} /> : undefined}
            />
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
            {/* Segmented Control */}
            <View style={styles.tabContainer}>
                <SegmentedControl
                    segments={segments}
                    selected={mode}
                    onSelect={setMode}
                />
            </View>

            {/* Aktif Kullanıcılar Bölümü */}
            {activeUsers.length > 0 && (
                <View style={styles.activeSection}>
                    <Text style={styles.sectionTitle}>🟢 Şu An Çalışanlar</Text>
                    {activeUsers.slice(0, 5).map((user) => (
                        <UserListItem
                            key={user.user_id}
                            username={user.username}
                            studySeconds={user.study_seconds}
                            rank={0}
                            isMe={user.user_id === userId}
                            isActive={true}
                            activeIndicator={<PulseBadge size={8} />}
                        />
                    ))}
                </View>
            )}

            {/* Leaderboard Listesi */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.systemBlue} />
                </View>
            ) : (
                <FlatList
                    data={entries}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.user_id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={renderEmpty}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        entries.length > 0 ? (
                            <Text style={styles.sectionTitle}>🏆 Sıralama</Text>
                        ) : null
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.systemBackground,
    },
    tabContainer: {
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.sm,
    },
    activeSection: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.sm,
    },
    sectionTitle: {
        fontFamily: Fonts.body.bold,
        fontSize: FontSize.headline,
        color: Colors.label,
        marginBottom: Spacing.sm,
        paddingHorizontal: Spacing.xl,
    },
    listContent: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: 40,
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
        fontFamily: Fonts.body.regular,
        fontSize: FontSize.body,
        color: Colors.secondaryLabel,
        textAlign: 'center',
        lineHeight: 24,
    },
});