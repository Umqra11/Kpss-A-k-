/**
 * KPSS Aşkı - Kronometre Store'u
 * Timestamp-based yaklaşım: Uygulama kill edilse bile doğru süre hesaplanır
 * 
 * v2: stopAndSubmitTimer, online presence, periyodik sync, AppState handler
 * v4: Hafta sınırı tespiti - Salı 00:00'da oturumu böl, süreler doğru haftaya yazılsın
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
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
    _syncInterval: ReturnType<typeof setInterval> | null;
    _appStateSubscription: any;
    _sessionWeekStart: string | null;
    _postResetAccumulatedMs: number;
    _lastSyncedElapsedMs: number;
    _roomBaseWeeklySeconds: number;
    _roomBaseTotalSeconds: number;

    // Actions
    startTimer: () => Promise<void>;
    pauseTimer: () => Promise<void>;
    resetTimer: () => Promise<void>;
    resumeTimer: () => Promise<void>;
    stopAndSubmitTimer: () => Promise<void>;
    getElapsedMs: () => number;
    loadTimerState: () => Promise<void>;
    saveTimerState: () => Promise<void>;
    dismissMilestone: () => void;
    checkMilestone: () => Promise<void>;
    syncWithSupabase: () => Promise<void>;
    computeStudyStats: () => void;
    _handleWeekBoundary: () => Promise<void>;
    _startPeriodicSync: () => void;
    _stopPeriodicSync: () => void;
    _setupAppStateHandler: () => void;
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
    _syncInterval: null,
    _appStateSubscription: null,
    _sessionWeekStart: null,
    _postResetAccumulatedMs: 0,
    _lastSyncedElapsedMs: 0,
    _roomBaseWeeklySeconds: 0,
    _roomBaseTotalSeconds: 0,

    startTimer: async () => {
        const state = get();
        const now = getNow();

        // Oda bazlı base süreleri Supabase'den oku
        const { useAuthStore } = await import('./authStore');
        const user = useAuthStore.getState().user;
        const profile = useAuthStore.getState().profile;
        let roomBaseWeekly = 0;
        let roomBaseTotal = 0;

        if (user && profile?.current_room_id) {
            try {
                const { data: memberData } = await supabase
                    .from('room_members')
                    .select('weekly_study_seconds, total_study_seconds')
                    .eq('user_id', user.id)
                    .eq('room_id', profile.current_room_id)
                    .single();

                if (memberData) {
                    roomBaseWeekly = memberData.weekly_study_seconds || 0;
                    roomBaseTotal = memberData.total_study_seconds || 0;
                }
            } catch (err) {
                // Offline - sessiz
            }
        }

        set({
            startTime: now,
            accumulatedMs: 0,
            status: 'running',
            sessionStartTime: new Date().toISOString(),
            _sessionWeekStart: getCurrentWeekStart(),
            _postResetAccumulatedMs: 0,
            _roomBaseWeeklySeconds: roomBaseWeekly,
            _roomBaseTotalSeconds: roomBaseTotal,
            _lastSyncedElapsedMs: 0,
        } as any);

        await get().saveTimerState();

        // Supabase'te yeni oturum oluştur
        if (user) {
            try {
                await supabase.from('study_sessions').insert({
                    user_id: user.id,
                    start_time: new Date(now).toISOString(),
                    duration_seconds: 0,
                    date: getTodayDate(),
                    week_start: getCurrentWeekStart(),
                    status: 'active',
                    room_id: profile?.current_room_id || null,
                } as any);

                // Online presence: kullanıcıyı aktif işaretle
                await supabase.from('profiles').update({
                    is_active: true,
                    last_active_at: new Date().toISOString(),
                } as any).eq('id', user.id);
            } catch (err) {
                // Offline çalışmaya devam
            }
        }

        // Periyodik sync ve AppState handler'ı başlat
        get()._startPeriodicSync();
        get()._setupAppStateHandler();
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

    stopAndSubmitTimer: async () => {
        const { status } = get();
        if (status === 'idle') return;

        const elapsedMs = get().getElapsedMs();
        const elapsedSeconds = Math.floor(elapsedMs / 1000);

        const { useAuthStore } = await import('./authStore');
        const user = useAuthStore.getState().user;

        if (user) {
            try {
                const now = new Date().toISOString();

                // Aktif oturumu bul ve tamamla
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
                            end_time: now,
                            duration_seconds: elapsedSeconds,
                            status: 'completed',
                            submitted_at: now,
                        } as any)
                        .eq('id', sessions[0].id);
                }

                // Profili güncelle ve aktif durumdan çıkar (süreleri profiles'a YAZMA)
                const state = get();
                const profile = useAuthStore.getState().profile;

                await supabase
                    .from('profiles')
                    .update({
                        is_active: false,
                        last_active_at: now,
                    } as any)
                    .eq('id', user.id);

                // Oda bazlı süreleri room_members'a yaz
                if (profile?.current_room_id) {
                    await supabase
                        .from('room_members')
                        .update({
                            weekly_study_seconds: state.weeklyStudySeconds,
                            total_study_seconds: state.totalStudySeconds,
                        } as any)
                        .eq('user_id', user.id)
                        .eq('room_id', profile.current_room_id);
                }

                // Auth store'daki profili yenile
                await useAuthStore.getState().refreshProfile();

                // Leaderboard'u yenile (oda bazlı)
                const { useLeaderboardStore } = await import('./leaderboardStore');
                if (profile?.current_room_id) {
                    await useLeaderboardStore.getState().fetchLeaderboard(profile.current_room_id);
                }
            } catch (err) {
                // Offline - sessiz
            }
        }

        // State'i sıfırla
        set({
            startTime: null,
            accumulatedMs: 0,
            status: 'idle',
            sessionStartTime: null,
            _sessionWeekStart: null,
            _postResetAccumulatedMs: 0,
            _lastSyncedElapsedMs: 0,
        } as any);

        get().computeStudyStats();
        get()._stopPeriodicSync();
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

                // Aktif durumdan çıkar, oda bazlı süreleri room_members'a yaz
                const state = get();
                const profile = useAuthStore.getState().profile;
                await supabase.from('profiles').update({
                    is_active: false,
                    last_active_at: now,
                } as any).eq('id', user.id);

                if (profile?.current_room_id) {
                    await supabase
                        .from('room_members')
                        .update({
                            weekly_study_seconds: state.weeklyStudySeconds,
                            total_study_seconds: state.totalStudySeconds,
                        } as any)
                        .eq('user_id', user.id)
                        .eq('room_id', profile.current_room_id);
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
            _sessionWeekStart: null,
            _postResetAccumulatedMs: 0,
        } as any);

        get().computeStudyStats();
        get()._stopPeriodicSync();
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
                const parsed = JSON.parse(stored);
                const state: TimerState & { _sessionWeekStart?: string | null; _postResetAccumulatedMs?: number; _roomBaseWeeklySeconds?: number; _roomBaseTotalSeconds?: number } = parsed;

                if (state.status === 'running' && state.startTime) {
                    set({
                        ...state,
                        status: 'running',
                        _sessionWeekStart: state._sessionWeekStart ?? getCurrentWeekStart(),
                        _postResetAccumulatedMs: state._postResetAccumulatedMs ?? 0,
                        _roomBaseWeeklySeconds: state._roomBaseWeeklySeconds ?? 0,
                        _roomBaseTotalSeconds: state._roomBaseTotalSeconds ?? 0,
                    } as any);
                    get()._startPeriodicSync();
                    get()._setupAppStateHandler();
                } else if (state.status === 'paused') {
                    set({
                        ...state,
                        status: 'paused',
                        _sessionWeekStart: state._sessionWeekStart ?? getCurrentWeekStart(),
                        _postResetAccumulatedMs: state._postResetAccumulatedMs ?? 0,
                        _roomBaseWeeklySeconds: state._roomBaseWeeklySeconds ?? 0,
                        _roomBaseTotalSeconds: state._roomBaseTotalSeconds ?? 0,
                    } as any);
                } else {
                    set({
                        startTime: null,
                        accumulatedMs: 0,
                        status: 'idle',
                        sessionStartTime: null,
                        _sessionWeekStart: null,
                        _postResetAccumulatedMs: 0,
                        _roomBaseWeeklySeconds: 0,
                        _roomBaseTotalSeconds: 0,
                    } as any);
                }
            }

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
        const { startTime, accumulatedMs, status, sessionStartTime, _sessionWeekStart, _postResetAccumulatedMs, _roomBaseWeeklySeconds, _roomBaseTotalSeconds } = get();
        const state = { startTime, accumulatedMs, status, sessionStartTime, _sessionWeekStart, _postResetAccumulatedMs, _roomBaseWeeklySeconds, _roomBaseTotalSeconds };
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

        for (let h = 1; h <= 24; h++) {
            if (weeklyHours >= h && !milestonesEarnedThisWeek.includes(h)) {
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
                    break;
                }
            }
        }
    },

    syncWithSupabase: async () => {
        const { useAuthStore } = await import('./authStore');
        const user = useAuthStore.getState().user;
        const profile = useAuthStore.getState().profile;
        if (!user) return;

        // Hafta sınırı kontrolü
        const currentWeekStart = getCurrentWeekStart();
        const sessionWeekStart = get()._sessionWeekStart;

        if (sessionWeekStart && currentWeekStart !== sessionWeekStart) {
            // Hafta değişti! Oturumu böl
            await get()._handleWeekBoundary();
            return; // Bu sync'te gerisini yapma
        }

        const elapsedMs = get().getElapsedMs();
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        const state = get();

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

            // Oda bazlı süreleri SADECE room_members'a yaz (profiles'a DEĞİL)
            if (profile?.current_room_id) {
                await supabase
                    .from('room_members')
                    .update({
                        weekly_study_seconds: state.weeklyStudySeconds,
                        total_study_seconds: state.totalStudySeconds,
                    } as any)
                    .eq('user_id', user.id)
                    .eq('room_id', profile.current_room_id);
            }

            await useAuthStore.getState().refreshProfile();
        } catch (err) {
            // Offline - sessiz
        }
    },

    _handleWeekBoundary: async () => {
        const currentWeekStart = getCurrentWeekStart();
        const elapsedMs = get().getElapsedMs();

        // Sunucu zaten eski oturumu kapatmıştır (v4 migration)
        // Reset anına kadar olan toplam süreyi kaydet
        const preResetMs = elapsedMs;

        // Yeni study_sessions kaydı (yeni hafta, oda bilgisiyle)
        const { useAuthStore } = await import('./authStore');
        const user = useAuthStore.getState().user;
        const profile = useAuthStore.getState().profile;
        if (user) {
            try {
                await supabase.from('study_sessions').insert({
                    user_id: user.id,
                    start_time: new Date().toISOString(),
                    duration_seconds: 0,
                    date: getTodayDate(),
                    week_start: currentWeekStart,
                    status: 'active',
                    room_id: profile?.current_room_id || null,
                } as any);
            } catch (err) {
                // Offline devam
            }
        }

        // Hafta değişince base süreleri sıfırla (sunucu weekly'leri sıfırladı)
        set({
            _sessionWeekStart: currentWeekStart,
            _postResetAccumulatedMs: preResetMs,
            _roomBaseWeeklySeconds: 0,
            accumulatedMs: elapsedMs, // Görsel kronometre değişmez!
            startTime: null,
        } as any);

        // Running durumundaysa startTime'ı yeniden başlat
        if (get().status === 'running') {
            set({ startTime: getNow() } as any);
        }

        get().computeStudyStats();
        await get().saveTimerState();
    },

    computeStudyStats: () => {
        const elapsedMs = get().getElapsedMs();
        const roomBaseWeekly = get()._roomBaseWeeklySeconds ?? 0;
        const roomBaseTotal = get()._roomBaseTotalSeconds ?? 0;
        const postResetAccumulated = get()._postResetAccumulatedMs ?? 0;

        // Bu oturumda toplam geçen süre
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        // Hafta sınırı sonrası efektif süre (reset anına kadar olan kısım hariç)
        const effectiveElapsedMs = elapsedMs - postResetAccumulated;
        const effectiveElapsedSeconds = Math.floor(effectiveElapsedMs / 1000);

        // Oda bazlı: base (DB'den okunan) + bu oturumun tamamı
        const weekly = roomBaseWeekly + effectiveElapsedSeconds;
        const total = roomBaseTotal + elapsedSeconds;

        set({
            dailyStudySeconds: weekly,
            weeklyStudySeconds: weekly,
            totalStudySeconds: total,
            _lastSyncedElapsedMs: elapsedMs,
        });
    },

    _startPeriodicSync: () => {
        const store = get() as any;
        if (store._syncInterval) clearInterval(store._syncInterval);

        const interval = setInterval(async () => {
            const state = get();
            if (state.status === 'running' || state.status === 'paused') {
                get().computeStudyStats();
                await get().syncWithSupabase();
            }
        }, 3000);

        set({ _syncInterval: interval } as any);
    },

    _stopPeriodicSync: () => {
        const store = get() as any;
        if (store._syncInterval) {
            clearInterval(store._syncInterval);
            set({ _syncInterval: null } as any);
        }
    },

    _setupAppStateHandler: () => {
        const existing = get()._appStateSubscription;
        if (existing && existing.remove) {
            existing.remove();
        }

        const handleChange = async (nextState: AppStateStatus) => {
            const state = get();
            if (nextState === 'active') {
                if (state.status === 'running' || state.status === 'paused') {
                    const { useAuthStore } = await import('./authStore');
                    const user = useAuthStore.getState().user;
                    if (user) {
                        await supabase.from('profiles').update({
                            is_active: true,
                            last_active_at: new Date().toISOString(),
                        } as any).eq('id', user.id);
                    }
                    get()._startPeriodicSync();
                }
            } else if (nextState === 'background' || nextState === 'inactive') {
                get()._stopPeriodicSync();
            }
        };

        const subscription = AppState.addEventListener('change', handleChange);
        set({ _appStateSubscription: subscription } as any);
    },
}));