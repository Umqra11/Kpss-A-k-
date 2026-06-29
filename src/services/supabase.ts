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
    // Mevcut profili kontrol et (aktif/pasif fark etmez)
    const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

    // Anonim oturum oluştur
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();

    if (authError) throw authError;
    if (!authData.user) throw new Error('Oturum oluşturulamadı');

    if (existingProfile) {
        // Eğer profil aktifse (başkası kullanıyorsa) hata ver
        if (existingProfile.is_active) {
            await supabase.auth.signOut();
            throw new Error('Bu kullanıcı adı zaten alınmış!');
        }

        // Pasif profili reaktive et: eski id'yi yeni auth id ile güncelle
        // NOT: Supabase anon auth'ta PK değişemez, o yüzden eski kaydı silip yeni kayıt oluşturacağız
        const oldProfile = existingProfile;

        // Eski profili sil (yeni auth id'si ile yeniden oluşturacağız)
        await supabase.from('profiles').delete().eq('id', oldProfile.id);

        // Yeni auth id'si ile profili oluştur, eski verileri koru
        const { error: insertError } = await supabase.from('profiles').insert({
            id: authData.user.id,
            username,
            total_study_seconds: oldProfile.total_study_seconds || 0,
            weekly_study_seconds: oldProfile.weekly_study_seconds || 0,
            previous_weekly_study_seconds: oldProfile.previous_weekly_study_seconds || 0,
            is_active: true,
            last_active_at: new Date().toISOString(),
            current_room_id: oldProfile.current_room_id,
            created_at: oldProfile.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
        } as any);

        if (insertError) {
            await supabase.auth.signOut();
            throw insertError;
        }

        return {
            user: authData.user,
            session: authData.session,
            reactivated: true,
            previousStats: {
                total_study_seconds: oldProfile.total_study_seconds || 0,
                weekly_study_seconds: oldProfile.weekly_study_seconds || 0,
            },
        };
    }

    // Yeni profil oluştur
    const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user?.id,
        username,
    } as any);

    if (profileError) {
        await supabase.auth.signOut();
        throw profileError;
    }

    return {
        user: authData.user,
        session: authData.session,
        reactivated: false,
    };
}

// Promise timeout helper
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
    const timeout = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), ms)
    );
    return Promise.race([promise, timeout]);
}

// Otomatik giriş (token varsa)
export async function autoLogin() {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sessionResult: any = await withTimeout(supabase.auth.getSession(), 8000);
        const session = sessionResult?.data?.session ?? null;

        if (!session) return null;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const profileResult: any = await withTimeout(
            supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single(),
            8000
        );

        return { user: session.user, profile: profileResult?.data ?? null };
    } catch (err) {
        console.warn('[autoLogin] Failed:', err);
        return null;
    }
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

export async function fetchRooms(): Promise<Room[]> {
    const { data: rooms, error } = await supabase
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) throw error;
    if (!rooms || rooms.length === 0) return [];

    const roomsWithCounts: Room[] = await Promise.all(
        rooms.map(async (room: any) => {
            const { count: memberCount } = await supabase
                .from('room_members')
                .select('*', { count: 'exact', head: true })
                .eq('room_id', room.id);

            const { count: activeCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('current_room_id', room.id)
                .eq('is_active', true);

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

export async function joinRoom(userId: string, roomId: string): Promise<void> {
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

    const { error: memberError } = await supabase
        .from('room_members')
        .insert({
            user_id: userId,
            room_id: roomId,
        } as any);

    if (memberError && memberError.code !== '23505') {
        throw memberError;
    }
}

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

// Oda bazlı leaderboard getir (sayfalama destekli)
export async function fetchRoomLeaderboard(
    roomId: string,
    mode: 'weekly' | 'total',
    page: number = 0,
    pageSize: number = 25
): Promise<{ entries: LeaderboardEntry[]; totalCount: number }> {
    const orderColumn = mode === 'weekly' ? 'weekly_study_seconds' : 'total_study_seconds';
    const minSeconds = 0;
    const offset = page * pageSize;

    // Toplam kayıt sayısı
    const { count: totalCount, error: countError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('current_room_id', roomId)
        .gt(orderColumn, minSeconds);

    if (countError) throw countError;

    // Sayfalama sorgusu
    const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, weekly_study_seconds, total_study_seconds, is_active, last_active_at, current_room_id')
        .eq('current_room_id', roomId)
        .gt(orderColumn, minSeconds)
        .order(orderColumn, { ascending: false })
        .range(offset, offset + pageSize - 1);

    if (error) throw error;

    const entries: LeaderboardEntry[] = (data || []).map(
        (entry: any, index: number) => ({
            user_id: entry.id,
            username: entry.username,
            avatar_url: entry.avatar_url,
            study_seconds: mode === 'weekly' ? entry.weekly_study_seconds : entry.total_study_seconds,
            rank: offset + index + 1,
            is_active: entry.is_active ?? false,
            last_active_at: entry.last_active_at ?? null,
            room_id: entry.current_room_id,
        })
    );

    return { entries, totalCount: totalCount ?? 0 };
}

// Kullanıcının sıralamasını ve yakın rakipleri getir
export async function fetchUserRankAndNearby(
    roomId: string,
    userId: string,
    mode: 'weekly' | 'total'
): Promise<{
    userEntry: LeaderboardEntry | null;
    aboveEntry: LeaderboardEntry | null;
    belowEntry: LeaderboardEntry | null;
    totalCount: number;
}> {
    const orderColumn = mode === 'weekly' ? 'weekly_study_seconds' : 'total_study_seconds';

    // Kullanıcı profilini al
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, weekly_study_seconds, total_study_seconds, is_active, last_active_at, current_room_id')
        .eq('current_room_id', roomId)
        .eq('id', userId)
        .single();

    if (profileError || !profile) {
        return { userEntry: null, aboveEntry: null, belowEntry: null, totalCount: 0 };
    }

    const userSeconds = mode === 'weekly' ? profile.weekly_study_seconds : profile.total_study_seconds;

    // Toplam kayıt sayısı
    const { count: totalCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('current_room_id', roomId)
        .gt(orderColumn, 0);

    // Sıralama: kullanıcıdan fazla çalışanları say
    const { count: higherCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('current_room_id', roomId)
        .gt(orderColumn, userSeconds);

    const rank = (higherCount ?? 0) + 1;

    const userEntry: LeaderboardEntry = {
        user_id: profile.id,
        username: profile.username,
        avatar_url: profile.avatar_url,
        study_seconds: userSeconds,
        rank,
        is_active: profile.is_active ?? false,
        last_active_at: profile.last_active_at ?? null,
        room_id: profile.current_room_id,
    };

    // Bir üstteki kullanıcı
    let aboveEntry: LeaderboardEntry | null = null;
    const { data: aboveData } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, weekly_study_seconds, total_study_seconds, is_active, last_active_at, current_room_id')
        .eq('current_room_id', roomId)
        .gt(orderColumn, userSeconds)
        .order(orderColumn, { ascending: true })
        .limit(1);

    if (aboveData && aboveData.length > 0) {
        const above = aboveData[0];
        aboveEntry = {
            user_id: above.id,
            username: above.username,
            avatar_url: above.avatar_url,
            study_seconds: mode === 'weekly' ? above.weekly_study_seconds : above.total_study_seconds,
            rank: rank - 1,
            is_active: above.is_active ?? false,
            last_active_at: above.last_active_at ?? null,
            room_id: above.current_room_id,
        };
    }

    // Bir alttaki kullanıcı
    let belowEntry: LeaderboardEntry | null = null;
    const { data: belowData } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, weekly_study_seconds, total_study_seconds, is_active, last_active_at, current_room_id')
        .eq('current_room_id', roomId)
        .lt(orderColumn, userSeconds)
        .order(orderColumn, { ascending: false })
        .limit(1);

    if (belowData && belowData.length > 0) {
        const below = belowData[0];
        belowEntry = {
            user_id: below.id,
            username: below.username,
            avatar_url: below.avatar_url,
            study_seconds: mode === 'weekly' ? below.weekly_study_seconds : below.total_study_seconds,
            rank: rank + 1,
            is_active: below.is_active ?? false,
            last_active_at: below.last_active_at ?? null,
            room_id: below.current_room_id,
        };
    }

    return {
        userEntry,
        aboveEntry,
        belowEntry,
        totalCount: totalCount ?? 0,
    };
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

    return (data || []).map((entry: any) => ({
        user_id: entry.id,
        username: entry.username,
        avatar_url: entry.avatar_url,
        study_seconds: entry.weekly_study_seconds,
        rank: 0,
        is_active: true,
        last_active_at: entry.last_active_at ?? null,
        room_id: entry.current_room_id,
    }));
}

export async function createRoom(
    userId: string,
    name: string,
    description?: string
): Promise<{ id: string; name: string; slug: string }> {
    const slug = slugify(name);

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

    await joinRoom(userId, data.id);

    return data;
}