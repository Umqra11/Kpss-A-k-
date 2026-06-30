/**
 * KPSS Aşkı - Oda Servisi
 * v8: Tip güvenli, ERR-004 fix (delete_room_cascade)
 */

import { supabase } from './supabaseClient';
import type { Room, LeaderboardEntry } from '../types';
import type { ProfilesRow } from '../types/database';
import { slugify } from '../utils/date';

// ============================================================================
// ODA CRUD
// ============================================================================

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
        creator_username: (room as any).profiles?.username || null,
        created_at: room.created_at,
        member_count: memberCount ?? 0,
        active_member_count: activeCount ?? 0,
      };
    })
  );

  return roomsWithCounts;
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
    })
    .select('id, name, slug')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Bu isimde bir oda zaten var');
    }
    throw error;
  }

  return data;
}

export async function deleteRoom(roomId: string): Promise<void> {
  // ERR-004 fix: RPC ile cascade silme
  const { error } = await supabase.rpc('delete_room_cascade', {
    p_room_id: roomId,
  });

  if (error) throw error;
}

// ============================================================================
// ODA ÜYELİĞİ
// ============================================================================

export async function joinRoom(userId: string, roomId: string): Promise<void> {
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      current_room_id: roomId,
      is_active: true,
      last_active_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (profileError) throw profileError;

  const { error: memberError } = await supabase
    .from('room_members')
    .upsert(
      {
        user_id: userId,
        room_id: roomId,
        weekly_study_seconds: 0,
        total_study_seconds: 0,
      },
      { onConflict: 'user_id,room_id' }
    );

  if (memberError) throw memberError;
}

export async function leaveRoom(
  userId: string,
  weeklySeconds: number = 0,
  totalSeconds: number = 0
): Promise<void> {
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
      })
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
    })
    .eq('id', userId);

  if (error) throw error;
}

export async function updateRoomMemberStudyTime(
  userId: string,
  roomId: string,
  weeklySeconds: number,
  totalSeconds: number
): Promise<void> {
  const { error } = await supabase
    .from('room_members')
    .update({
      weekly_study_seconds: weeklySeconds,
      total_study_seconds: totalSeconds,
    })
    .eq('user_id', userId)
    .eq('room_id', roomId);

  if (error) {
    console.error('[roomService] room_members UPDATE HATASI:', error);
    throw error;
  }
}

// ============================================================================
// LEADERBOARD
// ============================================================================

export async function fetchRoomLeaderboard(
  roomId: string,
  mode: 'weekly' | 'total' | 'past_week',
  page: number = 0,
  pageSize: number = 25
): Promise<{ entries: LeaderboardEntry[]; totalCount: number }> {
  const orderColumn = mode === 'weekly' ? 'weekly_study_seconds' : 'total_study_seconds';
  const offset = page * pageSize;

  const { count: totalCount, error: countError } = await supabase
    .from('room_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('room_id', roomId)
    .gt(orderColumn, 0);

  if (countError) throw countError;

  const { data, error } = await supabase
    .from('room_members')
    .select(
      `
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
    `
    )
    .eq('room_id', roomId)
    .gt(orderColumn, 0)
    .order(orderColumn, { ascending: false })
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

  const { data: memberData } = await supabase
    .from('room_members')
    .select(
      `
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
    `
    )
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .single();

  if (!memberData) {
    return { userEntry: null, aboveEntry: null, belowEntry: null, totalCount: 0 };
  }

  const member: any = memberData;
  const userSeconds = mode === 'weekly' ? member.weekly_study_seconds : member.total_study_seconds;

  const { count: totalCount } = await supabase
    .from('room_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('room_id', roomId)
    .gt(orderColumn, 0);

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
    .select(
      `
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
    `
    )
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
    .select(
      `
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
    `
    )
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

  return { userEntry, aboveEntry, belowEntry, totalCount: totalCount ?? 0 };
}

export async function fetchRoomActiveUsers(roomId: string): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('room_members')
    .select(
      `
      user_id,
      weekly_study_seconds,
      profiles:user_id (
        username,
        avatar_url,
        is_active,
        last_active_at,
        current_room_id
      )
    `
    )
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
