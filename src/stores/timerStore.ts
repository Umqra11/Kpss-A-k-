/**
 * KPSS Aşkı - Kronometre Store'u
 * v8: Timestamp-based, ERR-003 fix (in-flight flag), ERR-005 fix (foreground sync)
 *
 * Timestamp-based yaklaşım: Uygulama kill edilse bile doğru süre hesaplanır.
 * setInterval sadece UI güncellemesi içindir.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, type AppStateStatus } from 'react-native';
import type { TimerState, TimerStatus } from '../types';
import { supabase } from '../services/supabaseClient';
import { updateRoomMemberStudyTime } from '../services/roomService';
import {
  createSession,
  completeSession,
  completeAllActiveSessions,
  createWeekBoundarySession,
  updateSessionDuration,
} from '../services/sessionService';
import { updatePresence, setActiveStatus } from '../services/profileService';
import { getCurrentWeekStart, getTodayDate, getNow } from '../utils/date';

const TIMER_STATE_KEY = '@kpss_aski_timer_state';
const MILESTONES_EARNED_KEY = '@kpss_aski_milestones_earned';

interface TimerStore extends TimerState {
  dailyStudySeconds: number;
  weeklyStudySeconds: number;
  totalStudySeconds: number;
  milestonesEarnedThisWeek: number[];
  lastMilestonePopup: { icon: string; title: string; message: string } | null;

  // Internal state
  _syncInterval: ReturnType<typeof setInterval> | null;
  _appStateSubscription: any;
  _sessionWeekStart: string | null;
  _postResetAccumulatedMs: number;
  _lastSyncedElapsedMs: number;
  _roomBaseWeeklySeconds: number;
  _roomBaseTotalSeconds: number;
  _isStarting: boolean; // ERR-003 fix

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
  _handleAppForeground: () => Promise<void>;
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
  _isStarting: false,

  startTimer: async () => {
    // ERR-003 fix: in-flight flag
    if (get()._isStarting) return;
    set({ _isStarting: true });

    try {
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
        } catch {
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
      });

      await get().saveTimerState();

      // Supabase'te yeni oturum oluştur
      if (user) {
        try {
          await createSession(user.id, profile?.current_room_id || null);
          await setActiveStatus(user.id, true);
        } catch {
          // Offline devam
        }
      }

      // Periyodik sync ve AppState handler'ı başlat
      get()._startPeriodicSync();
      get()._setupAppStateHandler();
    } finally {
      set({ _isStarting: false });
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

  stopAndSubmitTimer: async () => {
    const { status } = get();
    if (status === 'idle') return;

    const elapsedMs = get().getElapsedMs();
    const elapsedSeconds = Math.floor(elapsedMs / 1000);

    const { useAuthStore } = await import('./authStore');
    const user = useAuthStore.getState().user;

    if (user) {
      try {
        // Oturumu tamamla
        await completeSession(user.id, elapsedSeconds);

        // Aktif durumdan çıkar
        await supabase
          .from('profiles')
          .update({
            is_active: false,
            last_active_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        // Oda bazlı süreleri room_members'a yaz
        get().computeStudyStats();
        const state = get();
        const profile = useAuthStore.getState().profile;

        if (profile?.current_room_id) {
          await updateRoomMemberStudyTime(
            user.id,
            profile.current_room_id,
            state.weeklyStudySeconds,
            state.totalStudySeconds
          );
        }

        // Auth store'daki profili yenile
        await useAuthStore.getState().refreshProfile();

        // Leaderboard'u yenile
        const { useLeaderboardStore } = await import('./leaderboardStore');
        if (profile?.current_room_id) {
          await useLeaderboardStore.getState().fetchLeaderboard(profile.current_room_id);
        }
      } catch {
        // Offline - sessiz
      }
    }

    set({
      startTime: null,
      accumulatedMs: 0,
      status: 'idle',
      sessionStartTime: null,
      _sessionWeekStart: null,
      _postResetAccumulatedMs: 0,
      _lastSyncedElapsedMs: 0,
    });

    get().computeStudyStats();
    get()._stopPeriodicSync();
    await get().saveTimerState();
  },

  resetTimer: async () => {
    const { status } = get();
    if (status === 'idle') return;

    const { useAuthStore } = await import('./authStore');
    const user = useAuthStore.getState().user;
    if (user) {
      try {
        const elapsed = get().getElapsedMs();
        await completeAllActiveSessions(user.id, Math.floor(elapsed / 1000));

        await supabase
          .from('profiles')
          .update({
            is_active: false,
            last_active_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        const state = get();
        const profile = useAuthStore.getState().profile;
        if (profile?.current_room_id) {
          await updateRoomMemberStudyTime(
            user.id,
            profile.current_room_id,
            state.weeklyStudySeconds,
            state.totalStudySeconds
          );
        }
      } catch {
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
    });

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
        const {
          startTime,
          accumulatedMs,
          status,
          sessionStartTime,
          _sessionWeekStart,
          _postResetAccumulatedMs,
          _roomBaseWeeklySeconds,
          _roomBaseTotalSeconds,
        } = parsed;

        if (status === 'running' && startTime) {
          set({
            startTime,
            accumulatedMs: accumulatedMs || 0,
            status: 'running',
            sessionStartTime: sessionStartTime || null,
            _sessionWeekStart: _sessionWeekStart ?? getCurrentWeekStart(),
            _postResetAccumulatedMs: _postResetAccumulatedMs ?? 0,
            _roomBaseWeeklySeconds: _roomBaseWeeklySeconds ?? 0,
            _roomBaseTotalSeconds: _roomBaseTotalSeconds ?? 0,
          });
          get()._startPeriodicSync();
          get()._setupAppStateHandler();
        } else if (status === 'paused') {
          set({
            startTime: startTime || null,
            accumulatedMs: accumulatedMs || 0,
            status: 'paused',
            sessionStartTime: sessionStartTime || null,
            _sessionWeekStart: _sessionWeekStart ?? getCurrentWeekStart(),
            _postResetAccumulatedMs: _postResetAccumulatedMs ?? 0,
            _roomBaseWeeklySeconds: _roomBaseWeeklySeconds ?? 0,
            _roomBaseTotalSeconds: _roomBaseTotalSeconds ?? 0,
          });
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
          });
        }
      }

      const storedMilestones = await AsyncStorage.getItem(MILESTONES_EARNED_KEY);
      if (storedMilestones) {
        set({ milestonesEarnedThisWeek: JSON.parse(storedMilestones) });
      }
    } catch {
      // sessiz
    }

    // DB'den taze base süreleri oku
    const { useAuthStore } = await import('./authStore');
    const user = useAuthStore.getState().user;
    const profile = useAuthStore.getState().profile;
    if (user && profile?.current_room_id && (get().status === 'running' || get().status === 'paused')) {
      try {
        const { data: memberData } = await supabase
          .from('room_members')
          .select('weekly_study_seconds, total_study_seconds')
          .eq('user_id', user.id)
          .eq('room_id', profile.current_room_id)
          .single();
        if (memberData) {
          set({
            _roomBaseWeeklySeconds: memberData.weekly_study_seconds || 0,
            _roomBaseTotalSeconds: memberData.total_study_seconds || 0,
          });
        }
      } catch {
        // Offline - sessiz
      }
    }

    get().computeStudyStats();
  },

  saveTimerState: async () => {
    const {
      startTime,
      accumulatedMs,
      status,
      sessionStartTime,
      _sessionWeekStart,
      _postResetAccumulatedMs,
      _roomBaseWeeklySeconds,
      _roomBaseTotalSeconds,
    } = get();
    const state = {
      startTime,
      accumulatedMs,
      status,
      sessionStartTime,
      _sessionWeekStart,
      _postResetAccumulatedMs,
      _roomBaseWeeklySeconds,
      _roomBaseTotalSeconds,
    };
    await AsyncStorage.setItem(TIMER_STATE_KEY, JSON.stringify(state));

    const { milestonesEarnedThisWeek } = get();
    await AsyncStorage.setItem(
      MILESTONES_EARNED_KEY,
      JSON.stringify(milestonesEarnedThisWeek)
    );
  },

  dismissMilestone: () => {
    set({ lastMilestonePopup: null });
  },

  checkMilestone: async () => {
    const { weeklyStudySeconds, milestonesEarnedThisWeek } = get();
    const weeklyHours = Math.floor(weeklyStudySeconds / 3600);

    // En son kazanılan milestone'u bul — verimsiz döngüyü önle
    const lastEarned =
      milestonesEarnedThisWeek.length > 0
        ? Math.max(...milestonesEarnedThisWeek)
        : 0;

    // Sadece kazanılmamış saatleri kontrol et (lastEarned+1'den başla)
    for (let h = lastEarned + 1; h <= Math.min(weeklyHours, 24); h++) {
      if (!milestonesEarnedThisWeek.includes(h)) {
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
          break; // Her seferinde sadece 1 milestone göster
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
      await get()._handleWeekBoundary();
      return;
    }

    const elapsedMs = get().getElapsedMs();
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const state = get();

    try {
      // Aktif oturumu güncelle
      await updateSessionDuration(user.id, elapsedSeconds);

      // Oda bazlı süreleri room_members'a yaz
      if (profile?.current_room_id) {
        try {
          await updateRoomMemberStudyTime(
            user.id,
            profile.current_room_id,
            state.weeklyStudySeconds,
            state.totalStudySeconds
          );
          // Base değerleri güncelle
          set({
            _roomBaseWeeklySeconds: state.weeklyStudySeconds,
            _roomBaseTotalSeconds: state.totalStudySeconds,
            _postResetAccumulatedMs: elapsedMs,
          });
        } catch (err) {
          console.error('[syncWithSupabase] room_members UPDATE HATASI:', err);
        }
      }

      await useAuthStore.getState().refreshProfile();
    } catch {
      // Offline - sessiz
    }
  },

  _handleWeekBoundary: async () => {
    const currentWeekStart = getCurrentWeekStart();
    const elapsedMs = get().getElapsedMs();
    const preResetMs = elapsedMs;

    const { useAuthStore } = await import('./authStore');
    const user = useAuthStore.getState().user;
    const profile = useAuthStore.getState().profile;
    if (user) {
      try {
        await createWeekBoundarySession(user.id, profile?.current_room_id || null);
      } catch {
        // Offline devam
      }
    }

    set({
      _sessionWeekStart: currentWeekStart,
      _postResetAccumulatedMs: preResetMs,
      _roomBaseWeeklySeconds: 0,
      accumulatedMs: elapsedMs,
      startTime: null,
    });

    if (get().status === 'running') {
      set({ startTime: getNow() });
    }

    get().computeStudyStats();
    await get().saveTimerState();
  },

  computeStudyStats: () => {
    const elapsedMs = get().getElapsedMs();
    const roomBaseWeekly = get()._roomBaseWeeklySeconds ?? 0;
    const roomBaseTotal = get()._roomBaseTotalSeconds ?? 0;
    const postResetAccumulated = get()._postResetAccumulatedMs ?? 0;

    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const effectiveElapsedMs = Math.max(0, elapsedMs - postResetAccumulated);
    const effectiveElapsedSeconds = Math.floor(effectiveElapsedMs / 1000);

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
    if (get()._syncInterval) {
      clearInterval(get()._syncInterval!);
    }

    const interval = setInterval(async () => {
      const state = get();
      if (state.status === 'running' || state.status === 'paused') {
        get().computeStudyStats();
        await get().syncWithSupabase();
      }
    }, 3000);

    set({ _syncInterval: interval });
  },

  _stopPeriodicSync: () => {
    if (get()._syncInterval) {
      clearInterval(get()._syncInterval!);
      set({ _syncInterval: null });
    }
  },

  _setupAppStateHandler: () => {
    const existing = get()._appStateSubscription;
    if (existing && existing.remove) {
      existing.remove();
    }

    const handleChange = async (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        await get()._handleAppForeground();
      } else if (nextState === 'background' || nextState === 'inactive') {
        get()._stopPeriodicSync();
      }
    };

    const subscription = AppState.addEventListener('change', handleChange);
    set({ _appStateSubscription: subscription });
  },

  // ERR-005 fix: Foreground dönüşte hemen sync et
  _handleAppForeground: async () => {
    const state = get();
    if (state.status === 'running' || state.status === 'paused') {
      const { useAuthStore } = await import('./authStore');
      const user = useAuthStore.getState().user;
      if (user) {
        try {
          await updatePresence(user.id);
        } catch {
          // sessiz
        }
      }
      get().computeStudyStats();
      await get().syncWithSupabase();
      get()._startPeriodicSync();
    }
  },
}));
