/**
 * KPSS Aşkı - Kimlik Doğrulama Store'u
 */

import { create } from 'zustand';
import { Profile } from '../types';
import { signUpWithUsername, autoLogin, signOut, supabase } from '../services/supabase';

interface AuthState {
    user: { id: string } | null;
    profile: Profile | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    error: string | null;

    login: () => Promise<void>;
    register: (username: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,

    login: async () => {
        set({ isLoading: true, error: null });
        try {
            const result = await autoLogin();
            if (result) {
                set({
                    user: result.user,
                    profile: (result.profile ?? null) as unknown as Profile,
                    isAuthenticated: true,
                    isLoading: false,
                });
            } else {
                set({ isLoading: false });
            }
        } catch (err) {
            set({
                error: 'Giriş yapılamadı',
                isLoading: false,
            });
        }
    },

    register: async (username: string) => {
        set({ isLoading: true, error: null });
        try {
            const trimmed = username.trim().toLowerCase();

            if (trimmed.length < 3) {
                throw new Error('Kullanıcı adı en az 3 karakter olmalı');
            }

            if (trimmed.length > 30) {
                throw new Error('Kullanıcı adı en fazla 30 karakter olabilir');
            }

            if (!/^[a-z0-9_]+$/.test(trimmed)) {
                throw new Error('Sadece harf, rakam ve alt çizgi kullanılabilir');
            }

            const result = await signUpWithUsername(trimmed);

            if (result.user) {
                set({
                    user: { id: result.user.id },
                    profile: {
                        id: result.user.id,
                        username: trimmed,
                        display_name: null,
                        avatar_url: null,
                        total_study_seconds: 0,
                        weekly_study_seconds: 0,
                        previous_weekly_study_seconds: 0,
                        is_active: false,
                        last_active_at: null,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    },
                    isAuthenticated: true,
                    isLoading: false,
                });
            }
        } catch (err: any) {
            set({
                error: err.message || 'Kayıt başarısız oldu',
                isLoading: false,
            });
        }
    },

    logout: async () => {
        try {
            await signOut();
        } catch (err) {
            // Supabase oturum silinemedi, local state'i temizle
        }
        set({
            user: null,
            profile: null,
            isAuthenticated: false,
            error: null,
        });
    },

    refreshProfile: async () => {
        const { user } = get();
        if (!user) return;

        try {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (data) {
                set({ profile: data as unknown as Profile });
            }
        } catch (err) {
            // sessizce başarısız
        }
    },

    clearError: () => set({ error: null }),
}));