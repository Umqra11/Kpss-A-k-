/**
 * KPSS Aşkı - Çalışma Oturumu Servisi
 * v8: Tip güvenli
 */

import { supabase } from './supabaseClient';
import { getTodayDate, getCurrentWeekStart } from '../utils/date';

// Yeni çalışma oturumu oluştur
export async function createSession(
  userId: string,
  roomId: string | null
): Promise<void> {
  const { error } = await supabase.from('study_sessions').insert({
    user_id: userId,
    start_time: new Date().toISOString(),
    duration_seconds: 0,
    date: getTodayDate(),
    week_start: getCurrentWeekStart(),
    status: 'active',
    room_id: roomId,
  });

  if (error) {
    console.error('[sessionService] createSession hatası:', error);
  }
}

// Aktif oturum bul
async function findActiveSession(userId: string) {
  const { data: sessions } = await supabase
    .from('study_sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1);

  return sessions && sessions.length > 0 ? sessions[0] : null;
}

// Tüm aktif oturumları bul
async function findAllActiveSessions(userId: string) {
  const { data: sessions } = await supabase
    .from('study_sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active');

  return sessions || [];
}

// Oturum süresini güncelle (sync)
export async function updateSessionDuration(
  userId: string,
  elapsedSeconds: number
): Promise<void> {
  const session = await findActiveSession(userId);
  if (!session) return;

  await supabase
    .from('study_sessions')
    .update({
      duration_seconds: elapsedSeconds,
    })
    .eq('id', session.id);
}

// Oturumu tamamla (stop)
export async function completeSession(
  userId: string,
  elapsedSeconds: number
): Promise<void> {
  const now = new Date().toISOString();
  const session = await findActiveSession(userId);

  if (session) {
    await supabase
      .from('study_sessions')
      .update({
        end_time: now,
        duration_seconds: elapsedSeconds,
        status: 'completed',
        submitted_at: now,
      })
      .eq('id', session.id);
  }
}

// Tüm aktif oturumları kapat (reset)
export async function completeAllActiveSessions(
  userId: string,
  elapsedSeconds: number
): Promise<void> {
  const now = new Date().toISOString();
  const sessions = await findAllActiveSessions(userId);

  for (const s of sessions) {
    await supabase
      .from('study_sessions')
      .update({
        end_time: now,
        duration_seconds: elapsedSeconds,
        status: 'completed',
      })
      .eq('id', s.id);
  }
}

// Hafta sınırında yeni oturum oluştur
export async function createWeekBoundarySession(
  userId: string,
  roomId: string | null
): Promise<void> {
  await supabase.from('study_sessions').insert({
    user_id: userId,
    start_time: new Date().toISOString(),
    duration_seconds: 0,
    date: getTodayDate(),
    week_start: getCurrentWeekStart(),
    status: 'active',
    room_id: roomId,
  });
}

// Tebrik mesajını kaydet
export async function markMilestoneEarned(achievementId: string): Promise<void> {
  const { error } = await supabase.from('user_achievements').insert({
    achievement_id: achievementId,
    week_start: getCurrentWeekStart(),
  });

  if (error) throw error;
}
