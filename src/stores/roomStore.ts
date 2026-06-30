/**
 * KPSS Aşkı - Oda Store'u
 * v8: ERR-002 fix (RealtimeManager), ERR-004 fix (delete_room_cascade)
 */

import { create } from 'zustand';
import type { Room } from '../types';
import {
  fetchRooms,
  joinRoom,
  leaveRoom,
  createRoom,
  deleteRoom,
} from '../services/roomService';
import { realtimeManager } from '../services/RealtimeManager';

interface RoomState {
  rooms: Room[];
  currentRoomId: string | null;
  isLoading: boolean;
  error: string | null;

  loadRooms: () => Promise<void>;
  join: (userId: string, roomId: string) => Promise<void>;
  leave: (userId: string) => Promise<void>;
  create: (userId: string, name: string, description?: string) => Promise<Room>;
  delete: (userId: string, roomId: string) => Promise<void>;
  setCurrentRoomId: (roomId: string | null) => void;
  subscribeToRooms: () => () => void;
  clearError: () => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  rooms: [],
  currentRoomId: null,
  isLoading: false,
  error: null,

  loadRooms: async () => {
    set({ isLoading: true, error: null });
    try {
      const rooms = await fetchRooms();
      set({ rooms, isLoading: false });
    } catch (err: any) {
      set({
        error: err.message || 'Odalar yüklenemedi',
        isLoading: false,
      });
    }
  },

  join: async (userId: string, roomId: string) => {
    set({ error: null });
    try {
      const { useAuthStore } = await import('./authStore');
      const profile = useAuthStore.getState().profile;
      if (profile?.current_room_id && profile.current_room_id !== roomId) {
        await get().leave(userId);
      }

      await joinRoom(userId, roomId);
      set({ currentRoomId: roomId });

      await useAuthStore.getState().refreshProfile();
      await get().loadRooms();
    } catch (err: any) {
      set({ error: err.message || 'Odaya katılınamadı' });
      throw err;
    }
  },

  leave: async (userId: string) => {
    set({ error: null });
    try {
      const { useTimerStore } = await import('./timerStore');
      const timerState = useTimerStore.getState();
      const weeklySeconds = timerState.weeklyStudySeconds;
      const totalSeconds = timerState.totalStudySeconds;

      await leaveRoom(userId, weeklySeconds, totalSeconds);
      set({ currentRoomId: null });

      const { useAuthStore } = await import('./authStore');
      await useAuthStore.getState().refreshProfile();

      // Timer state'ini sıfırla
      useTimerStore.setState({
        dailyStudySeconds: 0,
        weeklyStudySeconds: 0,
        totalStudySeconds: 0,
        _lastSyncedElapsedMs: 0,
      });

      await get().loadRooms();
    } catch (err: any) {
      set({ error: err.message || 'Odadan ayrılınamadı' });
      throw err;
    }
  },

  create: async (userId: string, name: string, description?: string) => {
    set({ error: null });
    try {
      const { useAuthStore } = await import('./authStore');
      const profile = useAuthStore.getState().profile;
      if (profile?.current_room_id) {
        await get().leave(userId);
      }

      const newRoom = await createRoom(userId, name, description);
      await get().loadRooms();
      set({ currentRoomId: newRoom.id });

      await useAuthStore.getState().refreshProfile();

      const room: Room = {
        id: newRoom.id,
        name: newRoom.name,
        slug: newRoom.slug,
        description: description || '',
        created_by: userId,
        created_at: new Date().toISOString(),
        member_count: 1,
        active_member_count: 1,
      };

      return room;
    } catch (err: any) {
      set({ error: err.message || 'Oda oluşturulamadı' });
      throw err;
    }
  },

  delete: async (userId: string, roomId: string) => {
    set({ error: null });
    try {
      await deleteRoom(roomId);
      // ERR-004 fix: Eğer silinen odadaysak, state'i temizle
      const { currentRoomId } = get();
      if (currentRoomId === roomId) {
        set({ currentRoomId: null });
        const { useAuthStore } = await import('./authStore');
        await useAuthStore.getState().refreshProfile();
      }
      await get().loadRooms();
    } catch (err: any) {
      set({ error: err.message || 'Oda silinemedi' });
      throw err;
    }
  },

  setCurrentRoomId: (roomId: string | null) => {
    set({ currentRoomId: roomId });
  },

  subscribeToRooms: () => {
    // ERR-002 fix: RealtimeManager ile memory-leak'siz subscription
    const unsub1 = realtimeManager.subscribe(
      'rooms-changes',
      { table: 'rooms', event: '*' },
      () => get().loadRooms()
    );

    const unsub2 = realtimeManager.subscribe(
      'room-members-changes',
      { table: 'room_members', event: '*' },
      () => get().loadRooms()
    );

    const unsub3 = realtimeManager.subscribe(
      'profiles-room-changes',
      { table: 'profiles', event: 'UPDATE' },
      () => get().loadRooms()
    );

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  },

  clearError: () => set({ error: null }),
}));
