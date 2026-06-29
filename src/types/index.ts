/**
 * KPSS Aşkı - Tip Tanımlamaları
 */

// Kullanıcı profili
export interface Profile {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    total_study_seconds: number;
    weekly_study_seconds: number;
    previous_weekly_study_seconds: number;
    is_active: boolean;
    last_active_at: string | null;
    created_at: string;
    updated_at: string;
}

// Çalışma oturumu
export interface StudySession {
    id: string;
    user_id: string;
    start_time: string;
    end_time: string | null;
    duration_seconds: number;
    date: string;
    week_start: string;
    status: 'active' | 'paused' | 'completed';
    submitted_at: string | null;
    created_at: string;
}

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
export type LeaderboardMode = 'weekly' | 'total';

// Navigasyon ekran isimleri
export type ScreenName = 'Auth' | 'Main' | 'Leaderboard' | 'Profile';