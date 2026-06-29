/**
 * KPSS Aşkı - Supabase Servisi
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '../types/database';
import { Room, LeaderboardEntry, PastWeekOption } from '../types';

// TODO: Supabase projenizi oluşturduktan sonra bu değerleri güncelleyin
// https://supabase.com/dashboard adresinden proje oluşturun
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://bhawilumayixgxmqoeod.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_L3oWBw19pDcYL4ap3b3PEQ__RvLVRoU';

// Brave / gizlilik odaklı tarayıcılar için in-memory fallback storage
// AsyncStorage (localStorage) engellendiğinde oturum token'ını memory'de tutar
function createSafeStorage() {
    const memoryMap = new Map<string, string>();
    let localStorageAvailable = false;

    // localStorage testi
    try {
        const testKey = '__kpss_storage_test__';
        localStorage.setItem(testKey, '1');
        localStorage.removeItem(testKey);
        localStorageAvailable = true;
    } catch (e) {
        localStorageAvailable = false;
    }

    return {
        getItem: async (key: string): Promise<string | null> => {
            try {
                if (localStorageAvailable) {
                    return await AsyncStorage.getItem(key);
                }
            } catch (e) { /* fall through */ }
            return memoryMap.get(key) ?? null;
        },
        setItem: async (key: string, value: string): Promise<void> => {
            try {
                if (localStorageAvailable) {
                    await AsyncStorage.setItem(key, value);
                    return;
                }
            } catch (e) { /* fall through */ }
            memoryMap.set(key, value);
        },
        removeItem: async (key: string): Promise<void> => {
            try {
                if (localStorageAvailable) {
                    await AsyncStorage.removeItem(key);
                    return;
                }
            } catch (e) { /* fall through */ }
            memoryMap.delete(key);
        },
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: createSafeStorage() as any,
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

        // Pasif profili reaktive et: RLS'yi bypass eden SECURITY DEFINER 
        // PostgreSQL fonksiyonunu çağır
        const { data: rpcResult, error: rpcError } = await supabase.rpc(
            'reactivate_profile',
            {
                p_old_profile_id: existingProfile.id,
                p_new_auth_id: authData.user.id,
                p_username: username,
            }
        );

        if (rpcError) {
            await supabase.auth.signOut();
            throw rpcError;
        }

        if (!rpcResult?.success) {
            await supabase.auth.signOut();
            throw new Error(rpcResult?.error || 'Profil reaktive edilemedi');
        }

        return {
            user: authData.user,
            session: authData.session,
            reactivated: true,
            previousStats: {
                total_study_seconds: rpcResult.total_study_seconds || 0,
                weekly_study_seconds: rpcResult.weekly_study_seconds || 0,
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
        .select('*, profiles:created_by(username)')
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
                creator_username: room.profiles?.username || null,
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

    // Odaya katılırken süreler sıfırdan başlasın (her oda ayrı)
    const { error: memberError } = await supabase
        .from('room_members')
        .upsert({
            user_id: userId,
            room_id: roomId,
            weekly_study_seconds: 0,
            total_study_seconds: 0,
        } as any, { onConflict: 'user_id,room_id' });

    if (memberError) {
        throw memberError;
    }
}

export async function leaveRoom(userId: string, weeklySeconds: number = 0, totalSeconds: number = 0): Promise<void> {
    // Önce o anki odadaki süreleri room_members'a kaydet
    const { data: profile } = await supabase
        .from('profiles')
        .select('current_room_id')
        .eq('id', userId)
        .single();

    if (profile?.current_room_id) {
        await supabase
            .from('room_members')
            .update({
                weekly_study_seconds: weeklySeconds,
                total_study_seconds: totalSeconds,
            } as any)
            .eq('user_id', userId)
            .eq('room_id', profile.current_room_id);
    }

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

// Oda bazlı leaderboard getir (sayfalama destekli) — room_members üzerinden
export async function fetchRoomLeaderboard(
    roomId: string,
    mode: 'weekly' | 'total' | 'past_week',
    page: number = 0,
    pageSize: number = 25
): Promise<{ entries: LeaderboardEntry[]; totalCount: number }> {
    const orderColumn = mode === 'weekly' ? 'rm.weekly_study_seconds' : 'rm.total_study_seconds';
    const minSeconds = 0;
    const offset = page * pageSize;

    // Toplam kayıt sayısı (oda bazlı, > 0 süre)
    const { count: totalCount, error: countError } = await supabase
        .from('room_members')
        .select('user_id', { count: 'exact', head: true })
        .eq('room_id', roomId)
        .gt(mode === 'weekly' ? 'weekly_study_seconds' : 'total_study_seconds', minSeconds);

    if (countError) throw countError;

    // room_members ile profiles join yaparak kullanıcı bilgilerini al
    const { data, error } = await supabase
        .from('room_members')
        .select(`
            user_id,
            weekly_study_seconds,
            total_study_seconds,
            profiles:user_id (
                id,
                username,
                avatar_url,
                is_active,
                last_active_at,
                current_room_id
            )
        `)
        .eq('room_id', roomId)
        .gt(mode === 'weekly' ? 'weekly_study_seconds' : 'total_study_seconds', minSeconds)
        .order(mode === 'weekly' ? 'weekly_study_seconds' : 'total_study_seconds', { ascending: false })
        .range(offset, offset + pageSize - 1);

    if (error) throw error;

    const entries: LeaderboardEntry[] = (data || []).map(
        (entry: any, index: number) => ({
            user_id: entry.user_id,
            username: entry.profiles?.username || '?',
            avatar_url: entry.profiles?.avatar_url || null,
            study_seconds: mode === 'weekly' ? entry.weekly_study_seconds : entry.total_study_seconds,
            rank: offset + index + 1,
            is_active: entry.profiles?.is_active ?? false,
            last_active_at: entry.profiles?.last_active_at ?? null,
            room_id: entry.profiles?.current_room_id ?? null,
        })
    );

    return { entries, totalCount: totalCount ?? 0 };
}

// Kullanıcının sıralamasını ve yakın rakipleri getir (room_members üzerinden)
export async function fetchUserRankAndNearby(
    roomId: string,
    userId: string,
    mode: 'weekly' | 'total' | 'past_week'
): Promise<{
    userEntry: LeaderboardEntry | null;
    aboveEntry: LeaderboardEntry | null;
    belowEntry: LeaderboardEntry | null;
    totalCount: number;
}> {
    const orderColumn = mode === 'weekly' ? 'weekly_study_seconds' : 'total_study_seconds';

    // Kullanıcının oda bazlı süresini al
    const { data: memberData, error: memberError } = await supabase
        .from('room_members')
        .select(`
            user_id,
            weekly_study_seconds,
            total_study_seconds,
            profiles:user_id (
                username,
                avatar_url,
                is_active,
                last_active_at,
                current_room_id
            )
        `)
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .single();

    if (memberError || !memberData) {
        return { userEntry: null, aboveEntry: null, belowEntry: null, totalCount: 0 };
    }

    const member: any = memberData;
    const userSeconds = mode === 'weekly' ? member.weekly_study_seconds : member.total_study_seconds;

    // Toplam kayıt sayısı (> 0 süre)
    const { count: totalCount } = await supabase
        .from('room_members')
        .select('user_id', { count: 'exact', head: true })
        .eq('room_id', roomId)
        .gt(orderColumn, 0);

    // Sıralama: kullanıcıdan fazla çalışanları say
    const { count: higherCount } = await supabase
        .from('room_members')
        .select('user_id', { count: 'exact', head: true })
        .eq('room_id', roomId)
        .gt(orderColumn, userSeconds);

    const rank = (higherCount ?? 0) + 1;

    const userEntry: LeaderboardEntry = {
        user_id: member.user_id,
        username: member.profiles?.username || '?',
        avatar_url: member.profiles?.avatar_url || null,
        study_seconds: userSeconds,
        rank,
        is_active: member.profiles?.is_active ?? false,
        last_active_at: member.profiles?.last_active_at ?? null,
        room_id: member.profiles?.current_room_id ?? null,
    };

    // Bir üstteki kullanıcı
    let aboveEntry: LeaderboardEntry | null = null;
    const { data: aboveData } = await supabase
        .from('room_members')
        .select(`
            user_id,
            weekly_study_seconds,
            total_study_seconds,
            profiles:user_id (
                username,
                avatar_url,
                is_active,
                last_active_at,
                current_room_id
            )
        `)
        .eq('room_id', roomId)
        .gt(orderColumn, userSeconds)
        .order(orderColumn, { ascending: true })
        .limit(1);

    if (aboveData && aboveData.length > 0) {
        const above: any = aboveData[0];
        aboveEntry = {
            user_id: above.user_id,
            username: above.profiles?.username || '?',
            avatar_url: above.profiles?.avatar_url || null,
            study_seconds: mode === 'weekly' ? above.weekly_study_seconds : above.total_study_seconds,
            rank: rank - 1,
            is_active: above.profiles?.is_active ?? false,
            last_active_at: above.profiles?.last_active_at ?? null,
            room_id: above.profiles?.current_room_id ?? null,
        };
    }

    // Bir alttaki kullanıcı
    let belowEntry: LeaderboardEntry | null = null;
    const { data: belowData } = await supabase
        .from('room_members')
        .select(`
            user_id,
            weekly_study_seconds,
            total_study_seconds,
            profiles:user_id (
                username,
                avatar_url,
                is_active,
                last_active_at,
                current_room_id
            )
        `)
        .eq('room_id', roomId)
        .lt(orderColumn, userSeconds)
        .order(orderColumn, { ascending: false })
        .limit(1);

    if (belowData && belowData.length > 0) {
        const below: any = belowData[0];
        belowEntry = {
            user_id: below.user_id,
            username: below.profiles?.username || '?',
            avatar_url: below.profiles?.avatar_url || null,
            study_seconds: mode === 'weekly' ? below.weekly_study_seconds : below.total_study_seconds,
            rank: rank + 1,
            is_active: below.profiles?.is_active ?? false,
            last_active_at: below.profiles?.last_active_at ?? null,
            room_id: below.profiles?.current_room_id ?? null,
        };
    }

    return {
        userEntry,
        aboveEntry,
        belowEntry,
        totalCount: totalCount ?? 0,
    };
}

// Odadaki aktif kullanıcıları getir (room_members üzerinden, profiles join)
export async function fetchRoomActiveUsers(roomId: string): Promise<LeaderboardEntry[]> {
    const { data, error } = await supabase
        .from('room_members')
        .select(`
            user_id,
            weekly_study_seconds,
            profiles:user_id (
                username,
                avatar_url,
                is_active,
                last_active_at,
                current_room_id
            )
        `)
        .eq('room_id', roomId)
        .order('weekly_study_seconds', { ascending: false })
        .limit(20);

    if (error) throw error;

    return (data || [])
        .filter((entry: any) => entry.profiles?.is_active === true)
        .map((entry: any) => ({
            user_id: entry.user_id,
            username: entry.profiles?.username || '?',
            avatar_url: entry.profiles?.avatar_url || null,
            study_seconds: entry.weekly_study_seconds,
            rank: 0,
            is_active: true,
            last_active_at: entry.profiles?.last_active_at ?? null,
            room_id: entry.profiles?.current_room_id ?? null,
        }));
}

export async function deleteRoom(roomId: string): Promise<void> {
    const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId);

    if (error) throw error;
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
