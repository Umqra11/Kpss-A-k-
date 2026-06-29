/**
 * KPSS Aşkı - Supabase Database Types (Generated + Extended)
 */

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
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
                };
                Insert: {
                    id: string;
                    username: string;
                    display_name?: string | null;
                    avatar_url?: string | null;
                    total_study_seconds?: number;
                    weekly_study_seconds?: number;
                    previous_weekly_study_seconds?: number;
                    is_active?: boolean;
                    last_active_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    username?: string;
                    display_name?: string | null;
                    avatar_url?: string | null;
                    total_study_seconds?: number;
                    weekly_study_seconds?: number;
                    previous_weekly_study_seconds?: number;
                    is_active?: boolean;
                    last_active_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            study_sessions: {
                Row: {
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
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    start_time?: string;
                    end_time?: string | null;
                    duration_seconds?: number;
                    date: string;
                    week_start: string;
                    status?: 'active' | 'paused' | 'completed';
                    submitted_at?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    start_time?: string;
                    end_time?: string | null;
                    duration_seconds?: number;
                    date?: string;
                    week_start?: string;
                    status?: 'active' | 'paused' | 'completed';
                    submitted_at?: string | null;
                    created_at?: string;
                };
            };
            achievements: {
                Row: {
                    id: string;
                    name: string;
                    description: string;
                    icon: string;
                    required_hours: number;
                    category: 'weekly' | 'total';
                    sort_order: number;
                };
            };
            user_achievements: {
                Row: {
                    id: string;
                    user_id: string;
                    achievement_id: string;
                    earned_at: string;
                    week_start: string;
                };
            };
        };
    };
}