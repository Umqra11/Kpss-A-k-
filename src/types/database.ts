/**
 * KPSS Aşkı - Supabase Database Types (Generated + Extended)
 * v8: room_members study columns included
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
          current_room_id: string | null;
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
          current_room_id?: string | null;
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
          current_room_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      rooms: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
      room_members: {
        Row: {
          user_id: string;
          room_id: string;
          weekly_study_seconds: number;
          total_study_seconds: number;
          joined_at: string;
        };
        Insert: {
          user_id: string;
          room_id: string;
          weekly_study_seconds?: number;
          total_study_seconds?: number;
          joined_at?: string;
        };
        Update: {
          user_id?: string;
          room_id?: string;
          weekly_study_seconds?: number;
          total_study_seconds?: number;
          joined_at?: string;
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
          room_id: string | null;
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
          room_id?: string | null;
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
          room_id?: string | null;
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
        Insert: {
          id?: string;
          name: string;
          description: string;
          icon: string;
          required_hours: number;
          category: 'weekly' | 'total';
          sort_order?: number;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          icon?: string;
          required_hours?: number;
          category?: 'weekly' | 'total';
          sort_order?: number;
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
        Insert: {
          id?: string;
          user_id: string;
          achievement_id: string;
          earned_at?: string;
          week_start: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          achievement_id?: string;
          earned_at?: string;
          week_start?: string;
        };
      };
    };
    Functions: {
      reactivate_profile: {
        Args: {
          p_old_profile_id: string;
          p_new_auth_id: string;
          p_username: string;
        };
        Returns: {
          success: boolean;
          error?: string;
          total_study_seconds?: number;
          weekly_study_seconds?: number;
        };
      };
      reset_weekly_study_times: {
        Args: Record<string, never>;
        Returns: void;
      };
      delete_room_cascade: {
        Args: {
          p_room_id: string;
        };
        Returns: void;
      };
    };
  };
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type ProfilesRow = Tables<'profiles'>;
export type RoomsRow = Tables<'rooms'>;
export type RoomMembersRow = Tables<'room_members'>;
export type StudySessionsRow = Tables<'study_sessions'>;
export type AchievementsRow = Tables<'achievements'>;
export type UserAchievementsRow = Tables<'user_achievements'>;
