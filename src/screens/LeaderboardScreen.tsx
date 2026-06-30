/**
 * KPSS Aşkı - Leaderboard Ekranı (Apple-minimalist)
 * v8: ERR-002 fix (subscription cleanup), mode switch state koruma
 */

import React, { useEffect, useRef } from 'react';
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
import { AppleButton } from '../components/AppleButton';
import { AppleCard } from '../components/AppleCard';
import { useLeaderboardStore } from '../stores/leaderboardStore';
import { useAuthStore } from '../stores/authStore';
import { useRoomStore } from '../stores/roomStore';
import type { LeaderboardEntry, LeaderboardMode } from '../types';
import { formatDurationCompact } from '../theme/milestones';

export function LeaderboardScreen() {
  const mode = useLeaderboardStore((s) => s.mode);
  const setMode = useLeaderboardStore((s) => s.setMode);
  const weeklyEntries = useLeaderboardStore((s) => s.weeklyEntries);
  const totalEntries = useLeaderboardStore((s) => s.totalEntries);
  const activeUsers = useLeaderboardStore((s) => s.activeUsers);
  const isLoading = useLeaderboardStore((s) => s.isLoading);
  const weeklyHasMore = useLeaderboardStore((s) => s.weeklyHasMore);
  const totalHasMore = useLeaderboardStore((s) => s.totalHasMore);
  const hasMore = mode === 'weekly' ? weeklyHasMore : totalHasMore;
  const currentUserEntry = useLeaderboardStore((s) => s.currentUserEntry);
  const nearbyAbove = useLeaderboardStore((s) => s.nearbyAbove);
  const nearbyBelow = useLeaderboardStore((s) => s.nearbyBelow);
  const fetchLeaderboard = useLeaderboardStore((s) => s.fetchLeaderboard);
  const fetchActiveUsers = useLeaderboardStore((s) => s.fetchActiveUsers);
  const subscribeToLeaderboard = useLeaderboardStore((s) => s.subscribeToLeaderboard);
  const subscribeToActiveUsers = useLeaderboardStore((s) => s.subscribeToActiveUsers);
  const loadNextPage = useLeaderboardStore((s) => s.loadNextPage);

  const userId = useAuthStore((s) => s.user?.id);
  const profile = useAuthStore((s) => s.profile);
  const rooms = useRoomStore((s) => s.rooms);
  const roomId = profile?.current_room_id;
  const roomName = rooms.find((r) => r.id === roomId)?.name || '';
  const entries = mode === 'weekly' ? weeklyEntries : totalEntries;

  // Subscription cleanup ref'i
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;

    (async () => {
      if (cancelled) return;

      fetchLeaderboard(roomId);
      fetchActiveUsers(roomId);
      const unsub1 = subscribeToLeaderboard(roomId);
      const unsub2 = subscribeToActiveUsers(roomId);

      // Cleanup ref'ini güncelle
      cleanupRef.current = () => {
        unsub1();
        unsub2();
      };
    })();

    return () => {
      cancelled = true;
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [mode, roomId]);

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

  const isUserInList = entries.some((e) => e.user_id === userId);

  return (
    <SafeAreaView style={styles.container}>
      {/* Oda başlığı */}
      {roomName ? (
        <View style={styles.roomHeader}>
          <Text style={styles.roomTitle}>🏠 {roomName}</Text>
        </View>
      ) : null}

      {/* Segmented Control */}
      <View style={styles.tabContainer}>
        <SegmentedControl
          segments={segments}
          selected={mode}
          onSelect={setMode}
        />
      </View>

      {/* Aktif Kullanıcılar */}
      {activeUsers.length > 0 && (
        <View style={styles.activeSection}>
          <Text style={styles.sectionTitle}>🟢 Şu An Bu Odada Çalışanlar</Text>
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
      {isLoading && entries.length === 0 ? (
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
              <Text style={styles.sectionTitle}>🏆 Oda Sıralaması</Text>
            ) : null
          }
          ListFooterComponent={
            <View style={styles.footerContainer}>
              {/* Daha Fazla Göster */}
              {hasMore && (
                <AppleButton
                  title={isLoading ? 'Yükleniyor...' : 'Daha Fazla Göster'}
                  onPress={() => roomId && loadNextPage(roomId)}
                  variant="secondary"
                  size="medium"
                  disabled={isLoading}
                  style={styles.loadMoreButton}
                />
              )}

              {/* Senin Sıralaman — listede yoksan */}
              {currentUserEntry && !isUserInList && (
                <AppleCard style={styles.myRankCard} variant="grouped">
                  <Text style={styles.myRankTitle}>📍 Senin Sıralaman</Text>

                  {nearbyAbove && (
                    <UserListItem
                      username={nearbyAbove.username}
                      studySeconds={nearbyAbove.study_seconds}
                      rank={nearbyAbove.rank}
                      isMe={false}
                      isActive={nearbyAbove.is_active}
                      prefix="⬆️ "
                    />
                  )}

                  <UserListItem
                    username={currentUserEntry.username}
                    studySeconds={currentUserEntry.study_seconds}
                    rank={currentUserEntry.rank}
                    isMe={true}
                    isActive={currentUserEntry.is_active}
                    prefix="👤 "
                    activeIndicator={
                      currentUserEntry.is_active ? <PulseBadge size={8} /> : undefined
                    }
                  />

                  {nearbyBelow && (
                    <UserListItem
                      username={nearbyBelow.username}
                      studySeconds={nearbyBelow.study_seconds}
                      rank={nearbyBelow.rank}
                      isMe={false}
                      isActive={nearbyBelow.is_active}
                      prefix="⬇️ "
                    />
                  )}
                </AppleCard>
              )}

              {/* Senin Sıralaman — listedeysen */}
              {currentUserEntry && isUserInList && (
                <AppleCard style={styles.myRankCard} variant="grouped">
                  <Text style={styles.myRankTitle}>
                    📍 Sıralaman: #{currentUserEntry.rank}
                  </Text>
                  <Text style={styles.myRankSubtitle}>
                    {mode === 'weekly' ? 'Haftalık' : 'Toplam'}:{' '}
                    {formatDurationCompact(currentUserEntry.study_seconds)}
                  </Text>
                </AppleCard>
              )}
            </View>
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
  roomHeader: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
    alignItems: 'center',
  },
  roomTitle: {
    fontFamily: Fonts.display.bold,
    fontSize: FontSize.title2,
    color: Colors.label,
  },
  tabContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
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
  footerContainer: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  loadMoreButton: {
    width: '100%',
  },
  myRankCard: {
    gap: Spacing.sm,
  },
  myRankTitle: {
    fontFamily: Fonts.body.bold,
    fontSize: FontSize.headline,
    color: Colors.systemBlue,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  myRankSubtitle: {
    fontFamily: Fonts.body.regular,
    fontSize: FontSize.subhead,
    color: Colors.secondaryLabel,
    textAlign: 'center',
  },
});
