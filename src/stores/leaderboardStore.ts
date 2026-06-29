/**
 * KPSS Aşkı - Leaderboard Store'u
 * Gerçek zamanlı Supabase subscription ile anlık sıralama
 * v3: Oda bazlı leaderboard - her oda kendi sıralamasına sahip
 * v4: Sayfalama (25'er) + kullanıcı sıralaması ve yakın rakipler
 */

import { create } from 'zustand';
import { supabase, fetchRoomLeaderboard, fetchRoomActiveUsers, fetchUserRankAndNearby } from '../services/supabase';
import { LeaderboardEntry, LeaderboardMode } from '../types';

interface LeaderboardState {
    mode: LeaderboardMode;
    weeklyEntries: LeaderboardEntry[];
    totalEntries: LeaderboardEntry[];
    activeUsers: LeaderboardEntry[];
    currentUserWeeklyRank: number | null;
    currentUserTotalRank: number | null;
    isLoading: boolean;
    error: string | null;

    // Sayfalama state'leri
    currentPage: number;
    pageSize: number;
    hasMore: boolean;
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

    // Sayfalama
    currentPage: 0,
    pageSize: 25,
    hasMore: false,
    totalCount: 0,

    // Kullanıcı sıralaması
    currentUserEntry: null,
    nearbyAbove: null,
    nearbyBelow: null,

    setMode: (mode) => set({ mode }),

    fetchLeaderboard: async (roomId: string) => {
        set({ isLoading: true, error: null, currentPage: 0 });

        try {
            const mode = get().mode;
            const pageSize = get().pageSize;

            // Sayfa 0'ı çek
            const result = await fetchRoomLeaderboard(roomId, mode, 0, pageSize);

            const entries = result.entries;
            const totalCount = result.totalCount;
            const hasMore = pageSize < totalCount;

            if (mode === 'weekly') {
                set({
                    weeklyEntries: entries,
                    totalEntries: [],
                    totalCount,
                    hasMore,
                    currentPage: 0,
                });
            } else {
                set({
                    totalEntries: entries,
                    weeklyEntries: [],
                    totalCount,
                    hasMore,
                    currentPage: 0,
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
        const weeklyChannel = supabase
            .channel(`weekly-leaderboard-room-${roomId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'profiles',
                    filter: `current_room_id=eq.${roomId}`,
                },
                () => {
                    get().fetchLeaderboard(roomId);
                }
            )
            .subscribe();

        const totalChannel = supabase
            .channel(`total-leaderboard-room-${roomId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'profiles',
                    filter: `current_room_id=eq.${roomId}`,
                },
                () => {
                    get().fetchLeaderboard(roomId);
                }
            )
            .subscribe();

        return () => {
            weeklyChannel.unsubscribe();
            totalChannel.unsubscribe();
        };
    },

    fetchActiveUsers: async (roomId: string) => {
        try {
            const activeUsers = await fetchRoomActiveUsers(roomId);
            set({ activeUsers });
        } catch (err) {
            // Sessiz
        }
    },

    subscribeToActiveUsers: (roomId: string) => {
        const channel = supabase
            .channel(`active-users-room-${roomId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'profiles',
                    filter: `current_room_id=eq.${roomId}`,
                },
                () => {
                    get().fetchActiveUsers(roomId);
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    },

    loadNextPage: async (roomId: string) => {
        const { currentPage, pageSize, totalCount, mode, weeklyEntries, totalEntries } = get();
        const nextPage = currentPage + 1;

        if (nextPage * pageSize >= totalCount) return;

        set({ isLoading: true });

        try {
            const result = await fetchRoomLeaderboard(roomId, mode, nextPage, pageSize);
            const hasMore = (nextPage + 1) * pageSize < result.totalCount;

            if (mode === 'weekly') {
                set({
                    weeklyEntries: [...weeklyEntries, ...result.entries],
                    hasMore,
                    currentPage: nextPage,
                    totalCount: result.totalCount,
                });
            } else {
                set({
                    totalEntries: [...totalEntries, ...result.entries],
                    hasMore,
                    currentPage: nextPage,
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
                currentUserWeeklyRank: mode === 'weekly' ? (result.userEntry?.rank ?? null) : get().currentUserWeeklyRank,
                currentUserTotalRank: mode === 'total' ? (result.userEntry?.rank ?? null) : get().currentUserTotalRank,
            });
        } catch (err) {
            // Sessiz
        }
    },
}));