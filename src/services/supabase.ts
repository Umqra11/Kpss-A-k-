/**
 * KPSS Aşkı - Supabase Servisi
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '../types/database';

// TODO: Supabase projenizi oluşturduktan sonra bu değerleri güncelleyin
// https://supabase.com/dashboard adresinden proje oluşturun
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://bhawilumayixgxmqoeod.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_L3oWBw19pDcYL4ap3b3PEQ__RvLVRoU';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
    realtime: {
        params: {
            eventsPerSecond: 10,
        },
    },
});

// Kullanıcı adı ile kayıt (anon auth)
export async function signUpWithUsername(username: string) {
    const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single();

    if (existingProfile) {
        throw new Error('Bu kullanıcı adı zaten alınmış!');
    }

    // Anonim oturum oluştur
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();

    if (authError) throw authError;

    // Profil oluştur
    const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user?.id,
        username,
    } as any);

    if (profileError) {
        // Profil oluşturulamadıysa oturumu temizle
        await supabase.auth.signOut();
        throw profileError;
    }

    return {
        user: authData.user,
        session: authData.session,
    };
}

// Otomatik giriş (token varsa)
export async function autoLogin() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) return null;

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    return { user: session.user, profile };
}

// Kullanıcı profilini getir
export async function getProfile(userId: string) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) throw error;
    return data;
}

// Çıkış yap
export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

// Tebrik mesajını gösterdikten sonra haftalık kazanılanları sıfırla
export async function markMilestoneEarned(achievementId: string) {
    const { error } = await supabase.from('user_achievements').insert({
        achievement_id: achievementId,
        week_start: getCurrentWeekStart(),
    } as any);

    if (error) throw error;
}

// Hafta başlangıcı (Salı 00:00)
export function getCurrentWeekStart(): string {
    const now = new Date();
    const dayOfWeek = now.getDay();
    // Salı = 2, Çarşamba = 3, ..., Pazartesi = 1
    // Salı'yı haftanın ilk günü kabul edelim
    const daysUntilTuesday = dayOfWeek >= 2 ? dayOfWeek - 2 : dayOfWeek + 5;
    const tuesday = new Date(now);
    tuesday.setDate(now.getDate() - daysUntilTuesday);
    tuesday.setHours(0, 0, 0, 0);
    return tuesday.toISOString().split('T')[0];
}

// Bugünün tarihi (YYYY-MM-DD)
export function getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
}