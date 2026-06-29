/**
 * KPSS Aşkı - Leaderboard Store'u
 * Gerçek zamanlı Supabase subscription ile anlık sıralama
 */

import { create } from 'zustand';
import { supabase, getCurrentWeekStart } from '../services/supabase';
import { LeaderboardEntry, LeaderboardMode } from '../types';

interface LeaderboardState {
    mode: LeaderboardMode;
    weeklyEntries: LeaderboardEntry[];
    totalEntries: LeaderboardEntry[];
    currentUserWeeklyRank: number | null;
    currentUserTotalRank: number | null;
    isLoading: boolean;
    error: string | null;

    setMode: (mode: LeaderboardMode) => void;
    fetchLeaderboard: () => Promise<void>;
    subscribeToLeaderboard: () => () => void; // unsubscribe fonksiyonu döner
}

export const useLeaderboardStore = create<LeaderboardState>((set, get) => ({
    mode: 'weekly',
    weeklyEntries: [],
    totalEntries: [],
    currentUserWeeklyRank: null,
    currentUserTotalRank: null,
    isLoading: false,
    error: null,

    setMode: (mode) => set({ mode }),

    fetchLeaderboard: async () => {
        set({ isLoading: true, error: null });

        try {
            const weekStart = getCurrentWeekStart();

            // Haftalık leaderboard
            const { data: weeklyData, error: weeklyError } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, weekly_study_seconds')
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
                })
            );

            // Toplam leaderboard
            const { data: totalData, error: totalError } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, total_study_seconds')
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
        // Weekly değişiklikleri dinle
        const weeklyChannel = supabase
            .channel('weekly-leaderboard')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'profiles',
                    filter: `weekly_study_seconds=gt.0`,
                },
                () => {
                    // Değişiklik olduğunda yeniden fetch et
                    get().fetchLeaderboard();
                }
            )
            .subscribe();

        // Total değişiklikleri dinle
        const totalChannel = supabase
            .channel('total-leaderboard')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'profiles',
                    filter: `total_study_seconds=gt.0`,
                },
                () => {
                    get().fetchLeaderboard();
                }
            )
            .subscribe();

        // Cleanup fonksiyonu
        return () => {
            weeklyChannel.unsubscribe();
            totalChannel.unsubscribe();
        };
    },
}));