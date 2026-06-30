/**
 * KPSS Aşkı - Ana Kronometre Ekranı (Apple-minimalist)
 * v8: Daha temiz state, ERR-003 fix (buton debounce)
 */

import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Fonts, FontSize } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useTimerStore } from '../stores/timerStore';
import { useAuthStore } from '../stores/authStore';
import { useLeaderboardStore } from '../stores/leaderboardStore';
import { useRoomStore } from '../stores/roomStore';
import { TimerDisplay } from '../components/TimerDisplay';
import { MilestonePopup } from '../components/MilestonePopup';
import { StatTile } from '../components/StatTile';
import { AppleButton } from '../components/AppleButton';
import { SegmentedControl } from '../components/SegmentedControl';
import { AppleCard } from '../components/AppleCard';
import { formatDurationCompact, formatWithDays, getNextMilestone } from '../theme/milestones';

type ViewMode = 'weekly' | 'total';

export function MainScreen() {
  const status = useTimerStore((s) => s.status);
  const startTimer = useTimerStore((s) => s.startTimer);
  const pauseTimer = useTimerStore((s) => s.pauseTimer);
  const resumeTimer = useTimerStore((s) => s.resumeTimer);
  const stopAndSubmitTimer = useTimerStore((s) => s.stopAndSubmitTimer);
  const loadTimerState = useTimerStore((s) => s.loadTimerState);
  const weeklyStudySeconds = useTimerStore((s) => s.weeklyStudySeconds);
  const totalStudySeconds = useTimerStore((s) => s.totalStudySeconds);
  const getElapsedMs = useTimerStore((s) => s.getElapsedMs);
  const dismissMilestone = useTimerStore((s) => s.dismissMilestone);
  const lastMilestonePopup = useTimerStore((s) => s.lastMilestonePopup);
  const _isStarting = useTimerStore((s) => s._isStarting);

  const profile = useAuthStore((s) => s.profile);
  const fetchLeaderboard = useLeaderboardStore((s) => s.fetchLeaderboard);
  const rooms = useRoomStore((s) => s.rooms);

  const [viewMode, setViewMode] = React.useState<ViewMode>('weekly');

  const roomId = profile?.current_room_id;
  const roomName = rooms.find((r) => r.id === roomId)?.name || '';
  const leave = useRoomStore((s) => s.leave);

  useEffect(() => {
    loadTimerState();
    if (roomId) {
      fetchLeaderboard(roomId);
    }
  }, [roomId]);

  const handleLeaveRoom = useCallback(async () => {
    const userId = profile?.id;
    if (!userId) return;
    await leave(userId);
  }, [profile?.id, leave]);

  const handleMainButton = useCallback(async () => {
    if (status === 'idle') {
      await startTimer();
    } else if (status === 'running') {
      await pauseTimer();
    } else if (status === 'paused') {
      await resumeTimer();
    }
  }, [status, startTimer, pauseTimer, resumeTimer]);

  const handleStopAndSubmit = useCallback(async () => {
    await stopAndSubmitTimer();
  }, [stopAndSubmitTimer]);

  const elapsedSeconds = Math.floor(getElapsedMs() / 1000);
  const nextMilestone = getNextMilestone(weeklyStudySeconds / 3600);

  const segments = [
    { key: 'weekly' as ViewMode, label: '📅 Haftalık' },
    { key: 'total' as ViewMode, label: '📊 Toplam' },
  ];

  const isStartDisabled = status === 'idle' && _isStarting;
  const isPauseDisabled = status === 'running' && _isStarting;

  return (
    <SafeAreaView style={styles.container}>
      {/* Milestone Popup */}
      {lastMilestonePopup && <MilestonePopup />}

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.username}>@{profile?.username || '...'}</Text>
            {roomName ? (
              <>
                <Text style={styles.roomName}>🏠 {roomName}</Text>
                <AppleButton
                  title="Oda Değiştir"
                  onPress={handleLeaveRoom}
                  variant="secondary"
                  size="small"
                  style={styles.changeRoomButton}
                />
              </>
            ) : null}
          </View>
          <View style={styles.segmentWrapper}>
            <SegmentedControl
              segments={segments}
              selected={viewMode}
              onSelect={setViewMode}
            />
          </View>
        </View>

        {/* Kronometre */}
        <TimerDisplay />

        {/* İstatistik Kartları */}
        <View style={styles.statsRow}>
          <StatTile
            label="Bu Oturum"
            value={formatDurationCompact(elapsedSeconds)}
          />
          <StatTile
            label={viewMode === 'weekly' ? 'Haftalık' : 'Toplam'}
            value={
              viewMode === 'weekly'
                ? formatDurationCompact(weeklyStudySeconds)
                : formatWithDays(totalStudySeconds)
            }
            highlight
          />
        </View>

        {/* Sonraki Baraj */}
        {nextMilestone && (
          <AppleCard style={styles.nextMilestone} variant="grouped">
            <Text style={styles.nextMilestoneText}>
              {nextMilestone.icon} Sonraki baraj: {nextMilestone.title} ({nextMilestone.hours} saat)
            </Text>
          </AppleCard>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Kontrol Butonları */}
      <View style={styles.controlBar}>
        {(status === 'running' || status === 'paused') && (
          <AppleButton
            title="⏹ Çalışmayı Bitir"
            onPress={handleStopAndSubmit}
            variant="destructive"
            size="medium"
            style={styles.stopButton}
          />
        )}

        {status === 'idle' && (
          <AppleButton
            title="▶ Başlat"
            onPress={handleMainButton}
            variant="primary"
            size="large"
            style={styles.mainButton}
            disabled={isStartDisabled}
          />
        )}
        {status === 'running' && (
          <AppleButton
            title="⏸ Duraklat"
            onPress={handleMainButton}
            variant="secondary"
            size="large"
            style={styles.mainButton}
            disabled={isPauseDisabled}
          />
        )}
        {status === 'paused' && (
          <AppleButton
            title="▶ Devam"
            onPress={handleMainButton}
            variant="primary"
            size="large"
            style={styles.mainButton}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.systemBackground,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    alignItems: 'center',
  },
  bottomSpacer: {
    height: 100,
  },
  controlBar: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.xs,
    backgroundColor: Colors.systemBackground,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: Spacing.xxl,
  },
  headerLeft: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  username: {
    fontFamily: Fonts.display.bold,
    fontSize: FontSize.title3,
    color: Colors.label,
  },
  roomName: {
    fontFamily: Fonts.body.semibold,
    fontSize: FontSize.caption1,
    color: Colors.secondaryLabel,
    marginTop: 2,
  },
  changeRoomButton: {
    marginTop: Spacing.xs,
  },
  segmentWrapper: {
    maxWidth: 200,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xxl,
    width: '100%',
  },
  nextMilestone: {
    marginTop: Spacing.lg,
    width: '100%',
  },
  nextMilestoneText: {
    fontFamily: Fonts.body.semibold,
    fontSize: FontSize.subhead,
    color: Colors.systemOrange,
    textAlign: 'center',
  },
  stopButton: {
    marginBottom: Spacing.xs,
  },
  mainButton: {
    width: '100%',
  },
});
