/**
 * KPSS Aşkı - Kronometre Store'u
 * Timestamp-based yaklaşım: Uygulama kill edilse bile doğru süre hesaplanır
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TimerState, TimerStatus } from '../types';
import { supabase, getTodayDate, getCurrentWeekStart } from '../services/supabase';

const TIMER_STATE_KEY = '@kpss_aski_timer_state';
const MILESTONES_EARNED_KEY = '@kpss_aski_milestones_earned';

interface TimerStore extends TimerState {
    dailyStudySeconds: number;
    weeklyStudySeconds: number;
    totalStudySeconds: number;
    milestonesEarnedThisWeek: number[];
    lastMilestonePopup: { icon: string; title: string; message: string } | null;

    // Actions
    startTimer: () => Promise<void>;
    pauseTimer: () => Promise<void>;
    resetTimer: () => Promise<void>;
    resumeTimer: () => Promise<void>;
    getElapsedMs: () => number;
    loadTimerState: () => Promise<void>;
    saveTimerState: () => Promise<void>;
    dismissMilestone: () => void;
    checkMilestone: () => Promise<void>;
    syncWithSupabase: () => Promise<void>;
    computeStudyStats: () => void;
}

function getNow(): number {
    return Date.now();
}

export const useTimerStore = create<TimerStore>((set, get) => ({
    startTime: null,
    accumulatedMs: 0,
    status: 'idle',
    sessionStartTime: null,
    dailyStudySeconds: 0,
    weeklyStudySeconds: 0,
    totalStudySeconds: 0,
    milestonesEarnedThisWeek: [],
    lastMilestonePopup: null,

    startTimer: async () => {
        const state = get();
        const now = getNow();

        set({
            startTime: now,
            accumulatedMs: 0,
            status: 'running',
            sessionStartTime: new Date().toISOString(),
        });

        await get().saveTimerState();

        // Supabase'te yeni oturum oluştur
        const { useAuthStore } = await import('./authStore');
        const user = useAuthStore.getState().user;
        if (user) {
            try {
                await supabase.from('study_sessions').insert({
                    user_id: user.id,
                    start_time: new Date(now).toISOString(),
                    duration_seconds: 0,
                    date: getTodayDate(),
                    week_start: getCurrentWeekStart(),
                    status: 'active',
                } as any);
            } catch (err) {
                // Offline çalışmaya devam
            }
        }
    },

    pauseTimer: async () => {
        const { startTime, accumulatedMs, status } = get();
        if (status !== 'running' || !startTime) return;

        const now = getNow();
        const newAccumulated = accumulatedMs + (now - startTime);

        set({
            accumulatedMs: newAccumulated,
            startTime: null,
            status: 'paused',
        });

        await get().saveTimerState();
        get().computeStudyStats();
        await get().checkMilestone();
        await get().syncWithSupabase();
    },

    resumeTimer: async () => {
        const { status } = get();
        if (status !== 'paused') return;

        set({
            startTime: getNow(),
            status: 'running',
        });

        await get().saveTimerState();
    },

    resetTimer: async () => {
        const { status } = get();
        if (status === 'idle') return;

        // Supabase'te aktif oturumları tamamla
        const { useAuthStore } = await import('./authStore');
        const user = useAuthStore.getState().user;
        if (user) {
            try {
                const now = new Date().toISOString();
                const elapsed = get().getElapsedMs();

                // Aktif oturumları bul ve kapat
                const { data: sessions } = await supabase
                    .from('study_sessions')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('status', 'active');

                if (sessions) {
                    for (const s of sessions) {
                        await supabase
                            .from('study_sessions')
                            .update({
                                end_time: now,
                                duration_seconds: Math.floor(elapsed / 1000),
                                status: 'completed',
                            } as any)
                            .eq('id', s.id);
                    }
                }
            } catch (err) {
                // Offline
            }
        }

        set({
            startTime: null,
            accumulatedMs: 0,
            status: 'idle',
            sessionStartTime: null,
        });

        get().computeStudyStats();
        await get().saveTimerState();
    },

    getElapsedMs: () => {
        const { startTime, accumulatedMs, status } = get();
        if (status === 'running' && startTime) {
            return accumulatedMs + (getNow() - startTime);
        }
        return accumulatedMs;
    },

    loadTimerState: async () => {
        try {
            const stored = await AsyncStorage.getItem(TIMER_STATE_KEY);
            if (stored) {
                const state: TimerState = JSON.parse(stored);

                // Eğer uygulama kapatılıp açıldıysa ve timer running ise
                if (state.status === 'running' && state.startTime) {
                    // Süreyi doğru hesapla (timestamp-based)
                    set({
                        ...state,
                        status: 'running',
                    });
                } else if (state.status === 'paused') {
                    set({
                        ...state,
                        status: 'paused',
                    });
                } else {
                    set({
                        startTime: null,
                        accumulatedMs: 0,
                        status: 'idle',
                        sessionStartTime: null,
                    });
                }
            }

            // Kazanılan milestone'ları yükle
            const storedMilestones = await AsyncStorage.getItem(MILESTONES_EARNED_KEY);
            if (storedMilestones) {
                set({ milestonesEarnedThisWeek: JSON.parse(storedMilestones) });
            }
        } catch (err) {
            // sessiz
        }

        get().computeStudyStats();
    },

    saveTimerState: async () => {
        const { startTime, accumulatedMs, status, sessionStartTime } = get();
        const state: TimerState = { startTime, accumulatedMs, status, sessionStartTime };
        await AsyncStorage.setItem(TIMER_STATE_KEY, JSON.stringify(state));

        const { milestonesEarnedThisWeek } = get();
        await AsyncStorage.setItem(MILESTONES_EARNED_KEY, JSON.stringify(milestonesEarnedThisWeek));
    },

    dismissMilestone: () => {
        set({ lastMilestonePopup: null });
    },

    checkMilestone: async () => {
        const { weeklyStudySeconds, milestonesEarnedThisWeek } = get();
        const weeklyHours = Math.floor(weeklyStudySeconds / 3600);

        // 24 baraj var, 1'den 24'e kadar
        for (let h = 1; h <= 24; h++) {
            if (weeklyHours >= h && !milestonesEarnedThisWeek.includes(h)) {
                // Bu milestone henüz kazanılmamış
                const { MILESTONES } = await import('../theme/milestones');
                const milestone = MILESTONES.find((m) => m.hours === h);
                if (milestone) {
                    const newEarned = [...milestonesEarnedThisWeek, h];
                    set({
                        milestonesEarnedThisWeek: newEarned,
                        lastMilestonePopup: {
                            icon: milestone.icon,
                            title: milestone.title,
                            message: milestone.message,
                        },
                    });
                    await get().saveTimerState();
                    break; // Her seferinde sadece bir popup
                }
            }
        }
    },

    syncWithSupabase: async () => {
        const { useAuthStore } = await import('./authStore');
        const user = useAuthStore.getState().user;
        if (!user) return;

        const elapsedMs = get().getElapsedMs();
        const elapsedSeconds = Math.floor(elapsedMs / 1000);

        try {
            // Aktif oturumu güncelle
            const { data: sessions } = await supabase
                .from('study_sessions')
                .select('id')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1);

            if (sessions && sessions.length > 0) {
                await supabase
                    .from('study_sessions')
                    .update({
                        duration_seconds: elapsedSeconds,
                    } as any)
                    .eq('id', sessions[0].id);
            }

            // Profili güncelle
            const state = get();
            await supabase
                .from('profiles')
                .update({
                    weekly_study_seconds: state.weeklyStudySeconds,
                    total_study_seconds: state.totalStudySeconds,
                    updated_at: new Date().toISOString(),
                } as any)
                .eq('id', user.id);

            // Auth store'daki profili de yenile
            await useAuthStore.getState().refreshProfile();
        } catch (err) {
            // Offline - sessiz
        }
    },

    computeStudyStats: async () => {
        const { useAuthStore } = await import('./authStore');
        const profile = useAuthStore.getState().profile;

        const elapsedSeconds = Math.floor(get().getElapsedMs() / 1000);

        if (profile) {
            // Haftalık süre: önceki haftalık + bu oturum
            const weekly = profile.weekly_study_seconds + elapsedSeconds;
            const total = profile.total_study_seconds + elapsedSeconds;

            set({
                dailyStudySeconds: profile.weekly_study_seconds + elapsedSeconds, // Basitleştirilmiş (gerçek günlük hesaplama için backend kullan)
                weeklyStudySeconds: weekly,
                totalStudySeconds: total,
            });
        } else {
            set({
                weeklyStudySeconds: elapsedSeconds,
                totalStudySeconds: elapsedSeconds,
            });
        }
    },
}));
