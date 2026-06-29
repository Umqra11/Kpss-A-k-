/**
 * KPSS Aşkı - Supabase Servisi
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '../types/database';
import { Room, LeaderboardEntry } from '../types';

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

// ============================================================================
// ODA (ROOMS) SERVİS FONKSİYONLARI
// ============================================================================

// İsmi slug'a çevir (Türkçe karakter desteği ile)
function slugify(name: string): string {
    const turkishChars: Record<string, string> = {
        'ı': 'i', 'İ': 'i', 'ğ': 'g', 'Ğ': 'g',
        'ü': 'u', 'Ü': 'u', 'ş': 's', 'Ş': 's',
        'ö': 'o', 'Ö': 'o', 'ç': 'c', 'Ç': 'c',
    };
    return name
        .toLowerCase()
        .replace(/[ıİğĞüÜşŞöÖçÇ]/g, (char) => turkishChars[char] || char)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);
}

// Tüm odaları getir (üye sayısı ve aktif üye sayısı ile)
export async function fetchRooms(): Promise<Room[]> {
    const { data: rooms, error } = await supabase
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) throw error;
    if (!rooms || rooms.length === 0) return [];

    // Her oda için üye sayısı ve aktif üye sayısını hesapla
    const roomsWithCounts: Room[] = await Promise.all(
        rooms.map(async (room: any) => {
            // Toplam üye sayısı
            const { count: memberCount, error: memberError } = await supabase
                .from('room_members')
                .select('*', { count: 'exact', head: true })
                .eq('room_id', room.id);

            if (memberError) console.warn('Member count error:', memberError);

            // Aktif üye sayısı (profiles ile JOIN)
            const { count: activeCount, error: activeError } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('current_room_id', room.id)
                .eq('is_active', true);

            if (activeError) console.warn('Active count error:', activeError);

            return {
                id: room.id,
                name: room.name,
                slug: room.slug,
                description: room.description || '',
                created_by: room.created_by,
                created_at: room.created_at,
                member_count: memberCount ?? 0,
                active_member_count: activeCount ?? 0,
            } as Room;
        })
    );

    return roomsWithCounts;
}

// Odaya katıl
export async function joinRoom(userId: string, roomId: string): Promise<void> {
    // current_room_id'yi güncelle
    const { error: profileError } = await supabase
        .from('profiles')
        .update({
            current_room_id: roomId,
            is_active: true,
            last_active_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        } as any)
        .eq('id', userId);

    if (profileError) throw profileError;

    // room_members'a ekle (zaten varsa hata vermez)
    const { error: memberError } = await supabase
        .from('room_members')
        .insert({
            user_id: userId,
            room_id: roomId,
        } as any);

    // 23505 = unique violation (zaten üye), bu hatayı yoksay
    if (memberError && memberError.code !== '23505') {
        throw memberError;
    }
}

// Odadan ayrıl (current_room_id'yi temizle)
export async function leaveRoom(userId: string): Promise<void> {
    const { error } = await supabase
        .from('profiles')
        .update({
            current_room_id: null,
            is_active: false,
            last_active_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        } as any)
        .eq('id', userId);

    if (error) throw error;
}

// Oda bazlı leaderboard getir
export async function fetchRoomLeaderboard(
    roomId: string,
    mode: 'weekly' | 'total'
): Promise<LeaderboardEntry[]> {
    const orderColumn = mode === 'weekly' ? 'weekly_study_seconds' : 'total_study_seconds';
    const minSeconds = 0; // Sıfırdan büyük olanları getir

    const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, weekly_study_seconds, total_study_seconds, is_active, last_active_at, current_room_id')
        .eq('current_room_id', roomId)
        .gt(orderColumn, minSeconds)
        .order(orderColumn, { ascending: false })
        .limit(50);

    if (error) throw error;

    const entries: LeaderboardEntry[] = (data || []).map(
        (entry: any, index: number) => ({
            user_id: entry.id,
            username: entry.username,
            avatar_url: entry.avatar_url,
            study_seconds: mode === 'weekly' ? entry.weekly_study_seconds : entry.total_study_seconds,
            rank: index + 1,
            is_active: entry.is_active ?? false,
            last_active_at: entry.last_active_at ?? null,
            room_id: entry.current_room_id,
        })
    );

    return entries;
}

// Odadaki aktif kullanıcıları getir
export async function fetchRoomActiveUsers(roomId: string): Promise<LeaderboardEntry[]> {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, weekly_study_seconds, is_active, last_active_at, current_room_id')
        .eq('current_room_id', roomId)
        .eq('is_active', true)
        .order('weekly_study_seconds', { ascending: false })
        .limit(20);

    if (error) throw error;

    const activeUsers: LeaderboardEntry[] = (data || []).map(
        (entry: any) => ({
            user_id: entry.id,
            username: entry.username,
            avatar_url: entry.avatar_url,
            study_seconds: entry.weekly_study_seconds,
            rank: 0,
            is_active: true,
            last_active_at: entry.last_active_at ?? null,
            room_id: entry.current_room_id,
        })
    );

    return activeUsers;
}

// Yeni oda oluştur
export async function createRoom(
    userId: string,
    name: string,
    description?: string
): Promise<{ id: string; name: string; slug: string }> {
    const slug = slugify(name);

    // Aynı slug varsa kontrol et
    const { data: existingRoom } = await supabase
        .from('rooms')
        .select('id')
        .eq('slug', slug)
        .single();

    if (existingRoom) {
        throw new Error('Bu isimde bir oda zaten var');
    }

    const { data, error } = await supabase
        .from('rooms')
        .insert({
            name: name.trim(),
            slug,
            description: description?.trim() || null,
            created_by: userId,
        } as any)
        .select('id, name, slug')
        .single();

    if (error) {
        if (error.code === '23505') {
            throw new Error('Bu isimde bir oda zaten var');
        }
        throw error;
    }

    // Oluşturan kişiyi otomatik odaya ekle
    await joinRoom(userId, data.id);

    return data;
}