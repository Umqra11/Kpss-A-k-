/**
 * KPSS Aşkı - Oda Store'u
 * Odaları listeleme, odaya katılma/ayrılma, yeni oda oluşturma
 * Gerçek zamanlı Supabase subscription ile oda değişikliklerini dinleme
 */

import { create } from 'zustand';
import { Room } from '../types';
import {
    supabase,
    fetchRooms,
    joinRoom,
    leaveRoom,
    createRoom,
} from '../services/supabase';

interface RoomState {
    rooms: Room[];
    currentRoomId: string | null;
    isLoading: boolean;
    error: string | null;

    loadRooms: () => Promise<void>;
    join: (userId: string, roomId: string) => Promise<void>;
    leave: (userId: string) => Promise<void>;
    create: (userId: string, name: string, description?: string) => Promise<Room>;
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
            await joinRoom(userId, roomId);
            set({ currentRoomId: roomId });

            // Auth store'daki profili güncelle
            const { useAuthStore } = await import('./authStore');
            await useAuthStore.getState().refreshProfile();

            // Odaları yeniden yükle (üye sayıları değişti)
            await get().loadRooms();
        } catch (err: any) {
            set({ error: err.message || 'Odaya katılınamadı' });
            throw err;
        }
    },

    leave: async (userId: string) => {
        set({ error: null });
        try {
            await leaveRoom(userId);
            set({ currentRoomId: null });

            // Auth store'daki profili güncelle
            const { useAuthStore } = await import('./authStore');
            await useAuthStore.getState().refreshProfile();

            // Odaları yeniden yükle
            await get().loadRooms();
        } catch (err: any) {
            set({ error: err.message || 'Odadan ayrılınamadı' });
            throw err;
        }
    },

    create: async (userId: string, name: string, description?: string) => {
        set({ error: null });
        try {
            const newRoom = await createRoom(userId, name, description);

            // Odaları yeniden yükle
            await get().loadRooms();

            // Oluşturan kişi otomatik katılmış olur
            set({ currentRoomId: newRoom.id });

            // Auth store'daki profili güncelle
            const { useAuthStore } = await import('./authStore');
            await useAuthStore.getState().refreshProfile();

            // Odayı Room tipinde döndür (tam olarak)
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

    setCurrentRoomId: (roomId: string | null) => {
        set({ currentRoomId: roomId });
    },

    subscribeToRooms: () => {
        // Rooms tablosundaki değişiklikleri dinle
        const roomsChannel = supabase
            .channel('rooms-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'rooms',
                },
                () => {
                    get().loadRooms();
                }
            )
            .subscribe();

        // Room members değişikliklerini dinle (üye sayıları için)
        const membersChannel = supabase
            .channel('room-members-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'room_members',
                },
                () => {
                    get().loadRooms();
                }
            )
            .subscribe();

        // Profiles current_room_id değişiklikleri (aktif sayıları için)
        const profilesChannel = supabase
            .channel('profiles-room-changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                },
                () => {
                    get().loadRooms();
                }
            )
            .subscribe();

        return () => {
            roomsChannel.unsubscribe();
            membersChannel.unsubscribe();
            profilesChannel.unsubscribe();
        };
    },

    clearError: () => set({ error: null }),
}));