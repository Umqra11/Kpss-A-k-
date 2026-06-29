/**
 * KPSS Aşkı - Leaderboard Store'u
 * Gerçek zamanlı Supabase subscription ile anlık sıralama
 * v2: Aktif kullanıcı takibi eklendi
 */

import { create } from 'zustand';
import { supabase, getCurrentWeekStart } from '../services/supabase';
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
    fetchLeaderboard: () => Promise<void>;
    subscribeToLeaderboard: () => () => void;
    fetchActiveUsers: () => Promise<void>;
    subscribeToActiveUsers: () => () => void;
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

    fetchLeaderboard: async () => {
        set({ isLoading: true, error: null });

        try {
            const weekStart = getCurrentWeekStart();

            // Haftalık leaderboard (is_active ve last_active_at dahil)
            const { data: weeklyData, error: weeklyError } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, weekly_study_seconds, is_active, last_active_at')
                .gt('weekly_study_seconds', 0)
                .order('weekly_study_seconds', { ascending: false })
                .limit(50);

            if (weeklyError) throw weeklyError;

            const weeklyEntries: LeaderboardEntry[] = (weeklyData || []).map(
                (entry: any, index: number) => ({
                    user_id: entry.id,
                    username: entry.username,
                    avatar_url: entry.avatar_url,
                    study_seconds: entry.weekly_study_seconds,
                    rank: index + 1,
                    is_active: entry.is_active ?? false,
                    last_active_at: entry.last_active_at ?? null,
                })
            );

            // Toplam leaderboard (is_active ve last_active_at dahil)
            const { data: totalData, error: totalError } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, total_study_seconds, is_active, last_active_at')
                .gt('total_study_seconds', 0)
                .order('total_study_seconds', { ascending: false })
                .limit(50);

            if (totalError) throw totalError;

            const totalEntries: LeaderboardEntry[] = (totalData || []).map(
                (entry: any, index: number) => ({
                    user_id: entry.id,
                    username: entry.username,
                    avatar_url: entry.avatar_url,
                    study_seconds: entry.total_study_seconds,
                    rank: index + 1,
                    is_active: entry.is_active ?? false,
                    last_active_at: entry.last_active_at ?? null,
                })
            );

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

    subscribeToLeaderboard: () => {
        const weeklyChannel = supabase
            .channel('weekly-leaderboard')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'profiles',
                    filter: 'weekly_study_seconds=gt.0',
                },
                () => {
                    get().fetchLeaderboard();
                }
            )
            .subscribe();

        const totalChannel = supabase
            .channel('total-leaderboard')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'profiles',
                    filter: 'total_study_seconds=gt.0',
                },
                () => {
                    get().fetchLeaderboard();
                }
            )
            .subscribe();

        return () => {
            weeklyChannel.unsubscribe();
            totalChannel.unsubscribe();
        };
    },

    fetchActiveUsers: async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, weekly_study_seconds, is_active, last_active_at')
                .eq('is_active', true)
                .order('weekly_study_seconds', { ascending: false })
                .limit(10);

            if (error) throw error;

            const activeUsers: LeaderboardEntry[] = (data || []).map((entry: any) => ({
                user_id: entry.id,
                username: entry.username,
                avatar_url: entry.avatar_url,
                study_seconds: entry.weekly_study_seconds,
                rank: 0,
                is_active: entry.is_active ?? true,
                last_active_at: entry.last_active_at ?? null,
            }));

            set({ activeUsers });
        } catch (err) {
            // Sessiz
        }
    },

    subscribeToActiveUsers: () => {
        const channel = supabase
            .channel('active-users')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'profiles',
                    filter: 'is_active=eq.true',
                },
                () => {
                    get().fetchActiveUsers();
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    },
}));