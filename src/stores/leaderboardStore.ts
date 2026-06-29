/**
 * KPSS Aşkı - Leaderboard Store'u
 * Gerçek zamanlı Supabase subscription ile anlık sıralama
 * v3: Oda bazlı leaderboard - her oda kendi sıralamasına sahip
 */

import { create } from 'zustand';
import { supabase, getCurrentWeekStart, fetchRoomLeaderboard, fetchRoomActiveUsers } from '../services/supabase';
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

    setMode: (mode: LeaderboardMode) => void;
    fetchLeaderboard: (roomId: string) => Promise<void>;
    subscribeToLeaderboard: (roomId: string) => () => void;
    fetchActiveUsers: (roomId: string) => Promise<void>;
    subscribeToActiveUsers: (roomId: string) => () => void;
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

    setMode: (mode) => set({ mode }),

    fetchLeaderboard: async (roomId: string) => {
        set({ isLoading: true, error: null });

        try {
            // Haftalık leaderboard (oda bazlı)
            const weeklyEntries = await fetchRoomLeaderboard(roomId, 'weekly');

            // Toplam leaderboard (oda bazlı)
            const totalEntries = await fetchRoomLeaderboard(roomId, 'total');

            // Kullanıcının kendi sıralamasını bul
            const { useAuthStore } = await import('./authStore');
            const userId = useAuthStore.getState().user?.id;

            let userWeeklyRank = null;
            let userTotalRank = null;

            if (userId) {
                const weeklyRank = weeklyEntries.findIndex((e) => e.user_id === userId);
                userWeeklyRank = weeklyRank >= 0 ? weeklyRank + 1 : null;

                const totalRank = totalEntries.findIndex((e) => e.user_id === userId);
                userTotalRank = totalRank >= 0 ? totalRank + 1 : null;
            }

            set({
                weeklyEntries,
                totalEntries,
                currentUserWeeklyRank: userWeeklyRank,
                currentUserTotalRank: userTotalRank,
                isLoading: false,
            });
        } catch (err: any) {
            set({
                error: err.message || 'Leaderboard yüklenemedi',
                isLoading: false,
            });
        }
    },

    subscribeToLeaderboard: (roomId: string) => {
        // Oda bazlı profiles değişikliklerini dinle
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
}));