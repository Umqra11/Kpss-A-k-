/**
 * KPSS Aşkı - Tip Tanımlamaları (v8 Rewrite)
 */

import type { Tables, RoomMembersRow } from './database';

// Kullanıcı profili
export type Profile = Tables<'profiles'>;

// Oda
export interface Room {
  id: string;
  name: string;
  slug: string;
  description: string;
  created_by: string | null;
  creator_username?: string | null;
  created_at: string;
  member_count?: number;
  active_member_count?: number;
}

// Oda üyesi (frontend extended)
export interface RoomMember extends Omit<RoomMembersRow, 'user_id' | 'room_id'> {
  user_id: string;
  room_id: string;
  username?: string;
  display_name?: string | null;
  avatar_url?: string | null;
  is_active?: boolean;
}

// Çalışma oturumu
export type StudySession = Tables<'study_sessions'>;

// Başarım tanımı
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  required_hours: number;
  category: 'weekly' | 'total';
  sort_order: number;
}

// Kullanıcı başarımı
export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  week_start: string;
}

// Leaderboard girişi
export interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  study_seconds: number;
  rank: number;
  is_active?: boolean;
  last_active_at?: string | null;
  room_id?: string;
}

// Kronometre durumu
export type TimerStatus = 'idle' | 'running' | 'paused';

// Kronometre state'i
export interface TimerState {
  startTime: number | null;
  accumulatedMs: number;
  status: TimerStatus;
  sessionStartTime: string | null;
}

// Başarım barajları (motivasyon)
export interface MilestoneConfig {
  hours: number;
  icon: string;
  title: string;
  message: string;
}

// Haftalık/Toplam görünüm modu
export type LeaderboardMode = 'weekly' | 'past_week' | 'total';

// Geçmiş hafta seçeneği
export interface PastWeekOption {
  weekStart: string;
  label: string;
}

// Navigasyon ekran isimleri
export type ScreenName = 'Auth' | 'RoomSelection' | 'Main' | 'Leaderboard' | 'Profile';

// Dark mode
export type ColorScheme = 'light' | 'dark' | 'system';
