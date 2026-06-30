/**
 * KPSS Aşkı - Leaderboard Store'u
 * v8: ERR-002 fix (RealtimeManager), sayfalama state ayrıştırması
 */

import { create } from 'zustand';
import { fetchRoomLeaderboard, fetchRoomActiveUsers, fetchUserRankAndNearby } from '../services/roomService';
import { realtimeManager } from '../services/RealtimeManager';
import type { LeaderboardEntry, LeaderboardMode } from '../types';

interface LeaderboardState {
  mode: LeaderboardMode;
  weeklyEntries: LeaderboardEntry[];
  totalEntries: LeaderboardEntry[];
  activeUsers: LeaderboardEntry[];
  currentUserWeeklyRank: number | null;
  currentUserTotalRank: number | null;
  isLoading: boolean;
  error: string | null;

  // Sayfalama — weekly ve total için AYRI
  weeklyPage: number;
  totalPage: number;
  weeklyHasMore: boolean;
  totalHasMore: boolean;
  pageSize: number;
  totalCount: number;

  // Kullanıcı sıralaması ve yakın rakipler
  currentUserEntry: LeaderboardEntry | null;
  nearbyAbove: LeaderboardEntry | null;
  nearbyBelow: LeaderboardEntry | null;

  setMode: (mode: LeaderboardMode) => void;
  fetchLeaderboard: (roomId: string) => Promise<void>;
  subscribeToLeaderboard: (roomId: string) => () => void;
  fetchActiveUsers: (roomId: string) => Promise<void>;
  subscribeToActiveUsers: (roomId: string) => () => void;
  loadNextPage: (roomId: string) => Promise<void>;
  fetchCurrentUserRank: (roomId: string, userId: string) => Promise<void>;
}

export const useLeaderboardStore = create<LeaderboardState>((set, get) => ({
  mode: 'weekly',
  weeklyEntries: [],
  totalEntries: [],
  activeUsers: [],
  currentUserWeeklyRank: null,
  currentUserTotalRank: null,
  isLoading: false,
  error: null,

  weeklyPage: 0,
  totalPage: 0,
  weeklyHasMore: false,
  totalHasMore: false,
  pageSize: 25,
  totalCount: 0,

  currentUserEntry: null,
  nearbyAbove: null,
  nearbyBelow: null,

  setMode: (mode) => set({ mode }),

  fetchLeaderboard: async (roomId: string) => {
    set({ isLoading: true, error: null });

    try {
      const mode = get().mode;
      const pageSize = get().pageSize;

      const result = await fetchRoomLeaderboard(roomId, mode, 0, pageSize);

      const entries = result.entries;
      const totalCount = result.totalCount;
      const hasMore = pageSize < totalCount;

      // Sadece aktif mode'u güncelle, diğer mode'un entries'ini KORU
      if (mode === 'weekly') {
        set({
          weeklyEntries: entries,
          weeklyHasMore: hasMore,
          weeklyPage: 0,
          totalCount,
        });
      } else {
        set({
          totalEntries: entries,
          totalHasMore: hasMore,
          totalPage: 0,
          totalCount,
        });
      }

      // Kullanıcının sıralamasını ve yakın rakipleri çek
      const { useAuthStore } = await import('./authStore');
      const userId = useAuthStore.getState().user?.id;
      if (userId) {
        await get().fetchCurrentUserRank(roomId, userId);
      }

      set({ isLoading: false });
    } catch (err: any) {
      set({
        error: err.message || 'Leaderboard yüklenemedi',
        isLoading: false,
      });
    }
  },

  subscribeToLeaderboard: (roomId: string) => {
    // ERR-002 fix: RealtimeManager ile memory-leak'siz subscription
    const unsub1 = realtimeManager.subscribe(
      `leaderboard-weekly-${roomId}`,
      {
        table: 'room_members',
        event: '*',
        filter: `room_id=eq.${roomId}`,
      },
      () => {
        get().fetchLeaderboard(roomId);
      }
    );

    const unsub2 = realtimeManager.subscribe(
      `leaderboard-total-${roomId}`,
      {
        table: 'room_members',
        event: '*',
        filter: `room_id=eq.${roomId}`,
      },
      () => {
        get().fetchLeaderboard(roomId);
      }
    );

    return () => {
      unsub1();
      unsub2();
    };
  },

  fetchActiveUsers: async (roomId: string) => {
    try {
      const activeUsers = await fetchRoomActiveUsers(roomId);
      set({ activeUsers });
    } catch {
      // Sessiz
    }
  },

  subscribeToActiveUsers: (roomId: string) => {
    const unsub = realtimeManager.subscribe(
      `active-users-${roomId}`,
      {
        table: 'profiles',
        event: '*',
        filter: `current_room_id=eq.${roomId}`,
      },
      () => {
        get().fetchActiveUsers(roomId);
      }
    );

    return () => {
      unsub();
    };
  },

  loadNextPage: async (roomId: string) => {
    const {
      mode,
      pageSize,
      totalCount,
      weeklyEntries,
      totalEntries,
      weeklyPage,
      totalPage,
    } = get();

    const currentPage = mode === 'weekly' ? weeklyPage : totalPage;
    const nextPage = currentPage + 1;

    if (nextPage * pageSize >= totalCount) return;

    set({ isLoading: true });

    try {
      const result = await fetchRoomLeaderboard(roomId, mode, nextPage, pageSize);
      const hasMore = (nextPage + 1) * pageSize < result.totalCount;

      if (mode === 'weekly') {
        set({
          weeklyEntries: [...weeklyEntries, ...result.entries],
          weeklyHasMore: hasMore,
          weeklyPage: nextPage,
          totalCount: result.totalCount,
        });
      } else {
        set({
          totalEntries: [...totalEntries, ...result.entries],
          totalHasMore: hasMore,
          totalPage: nextPage,
          totalCount: result.totalCount,
        });
      }

      set({ isLoading: false });
    } catch (err: any) {
      set({
        error: err.message || 'Sonraki sayfa yüklenemedi',
        isLoading: false,
      });
    }
  },

  fetchCurrentUserRank: async (roomId: string, userId: string) => {
    try {
      const mode = get().mode;
      const result = await fetchUserRankAndNearby(roomId, userId, mode);

      set({
        currentUserEntry: result.userEntry,
        nearbyAbove: result.aboveEntry,
        nearbyBelow: result.belowEntry,
        currentUserWeeklyRank:
          mode === 'weekly' ? (result.userEntry?.rank ?? null) : get().currentUserWeeklyRank,
        currentUserTotalRank:
          mode === 'total' ? (result.userEntry?.rank ?? null) : get().currentUserTotalRank,
      });
    } catch {
      // Sessiz
    }
  },
}));
