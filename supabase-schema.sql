-- ============================================================================
-- KPSS Aşkı - Supabase Veritabanı Şeması
-- Bu SQL'i Supabase SQL Editor'da çalıştırın
-- ============================================================================

-- 1. PROFILES TABLOSU
CREATE TABLE public.profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username        TEXT UNIQUE NOT NULL CHECK (char_length(username) BETWEEN 3 AND 30),
    display_name    TEXT,
    avatar_url      TEXT,
    total_study_seconds   BIGINT NOT NULL DEFAULT 0,
    weekly_study_seconds  BIGINT NOT NULL DEFAULT 0,
    previous_weekly_study_seconds BIGINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. STUDY SESSIONS TABLOSU
CREATE TYPE study_session_status AS ENUM ('active', 'paused', 'completed');

CREATE TABLE public.study_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    start_time      TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_time        TIMESTAMPTZ,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    date            DATE NOT NULL,
    week_start      DATE NOT NULL,
    status          study_session_status NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. ACHIEVEMENTS TABLOSU
CREATE TABLE public.achievements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    description     TEXT NOT NULL,
    icon            TEXT NOT NULL,
    required_hours  INTEGER NOT NULL,
    category        TEXT NOT NULL CHECK (category IN ('weekly', 'total')),
    sort_order      INTEGER NOT NULL DEFAULT 0
);

-- 4. USER ACHIEVEMENTS TABLOSU
CREATE TABLE public.user_achievements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id  UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    earned_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    week_start      DATE NOT NULL
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_study_sessions_user_id ON public.study_sessions(user_id);
CREATE INDEX idx_study_sessions_date ON public.study_sessions(date);
CREATE INDEX idx_study_sessions_week_start ON public.study_sessions(week_start);
CREATE INDEX idx_study_sessions_status ON public.study_sessions(status);
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX idx_user_achievements_week_start ON public.user_achievements(week_start);
CREATE INDEX idx_user_achievements_achievement_id ON public.user_achievements(achievement_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Profiles: Herkes okuyabilir, sadece kendisi yazabilir
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Study Sessions: Herkes görebilir, sadece kendisi ekleyebilir
CREATE POLICY "Sessions are viewable by everyone" ON public.study_sessions
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own sessions" ON public.study_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.study_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Achievements: Herkes okuyabilir, sadece admin ekleyebilir
CREATE POLICY "Achievements are viewable by everyone" ON public.achievements
    FOR SELECT USING (true);

-- User Achievements: Herkes görebilir, sistem ekler
CREATE POLICY "User achievements are viewable by everyone" ON public.user_achievements
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own achievements" ON public.user_achievements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- HAFTALIK SIFIRLAMA FONKSİYONU (Salı 00:00)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reset_weekly_study_times()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.profiles
    SET 
        previous_weekly_study_seconds = weekly_study_seconds,
        weekly_study_seconds = 0,
        updated_at = now();
END;
$$;

-- ============================================================================
-- pg_cron JOB: Her Salı 00:00'da çalışır
-- NOT: Supabase'de pg_cron extension'ını etkinleştirmeniz gerekir
-- ============================================================================
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule(
--     'reset-weekly-study-times',
--     '0 0 * * 2',  -- Her Salı 00:00 (UTC)
--     'SELECT public.reset_weekly_study_times();'
-- );

-- ============================================================================
-- BAŞARIM TANIMLARI (seed data)
-- ============================================================================
INSERT INTO public.achievements (name, description, icon, required_hours, category, sort_order) VALUES
('İlk Kıvılcım', 'İlk 1 saat çalışma', '🔥', 1, 'weekly', 1),
('Hızlanıyor', '2 saat çalışma', '⭐', 2, 'weekly', 2),
('Disiplin Kuşağı', '3 saat çalışma', '💪', 3, 'weekly', 3),
('Enerji Topu', '4 saat çalışma', '⚡', 4, 'weekly', 4),
('Tam Odak', '5 saat çalışma', '🎯', 5, 'weekly', 5),
('Parlayan Yıldız', '6 saat çalışma', '🌟', 6, 'weekly', 6),
('Sihirli Dokunuş', '7 saat çalışma', '🔮', 7, 'weekly', 7),
('Tam Mesai', '8 saat çalışma', '💎', 8, 'weekly', 8),
('Alev Topu', '10 saat çalışma', '🔥', 10, 'weekly', 10),
('Yarım Gün', '12 saat çalışma', '🏅', 12, 'weekly', 12),
('Taç Giy', '16 saat çalışma', '👑', 16, 'weekly', 16),
('Roket Hızı', '20 saat çalışma', '🚀', 20, 'weekly', 20),
('Tam Gün', '24 saat çalışma', '🏆', 24, 'weekly', 24);

-- ============================================================================
-- NOTLAR:
-- 1. Supabase Dashboard'da anon sign-in'i etkinleştirin:
--    Authentication > Settings > Allow anonymous sign-ins: ON
-- 2. Realtime'ı etkinleştirin:
--    Database > Replication > 0 tables (Tables to add)
--    "profiles" ve "study_sessions" tablolarını ekleyin
-- 3. pg_cron extension'ını Supabase Dashboard'dan etkinleştirin
--    (veya destek talebi açın - Pro plan gerektirebilir)
-- 4. Alternatif haftalık sıfırlama: Edge Function ile
-- ============================================================================