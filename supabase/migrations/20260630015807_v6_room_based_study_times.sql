-- ============================================================================
-- KPSS Aşkı - v6 Migration
-- Oda bazlı süre takibi: room_members tablosuna study süre sütunları,
-- study_sessions tablosuna room_id ekleme, room silme yetkisi
-- Çalıştırma: Supabase SQL Editor'da çalıştırın
-- ============================================================================

-- 1. ROOM_MEMBERS tablosuna study süre sütunları ekle
ALTER TABLE public.room_members 
ADD COLUMN IF NOT EXISTS weekly_study_seconds BIGINT NOT NULL DEFAULT 0;

ALTER TABLE public.room_members 
ADD COLUMN IF NOT EXISTS total_study_seconds BIGINT NOT NULL DEFAULT 0;

-- 2. STUDY_SESSIONS tablosuna room_id ekle (hangi odada çalışıldığını takip için)
ALTER TABLE public.study_sessions 
ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL;

-- 3. Room silme yetkisi: Odayı sadece oluşturan kişi silebilir
--    (room_members cascade delete zaten var)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Room creators can delete their rooms' 
        AND tablename = 'rooms'
    ) THEN
        CREATE POLICY "Room creators can delete their rooms" ON public.rooms
            FOR DELETE USING (auth.uid() = created_by);
    END IF;
END $$;

-- 4. INDEX: oda bazlı leaderboard sorguları için
CREATE INDEX IF NOT EXISTS idx_room_members_study_seconds 
ON public.room_members(room_id, weekly_study_seconds DESC);

CREATE INDEX IF NOT EXISTS idx_room_members_total_seconds 
ON public.room_members(room_id, total_study_seconds DESC);

CREATE INDEX IF NOT EXISTS idx_study_sessions_room_id 
ON public.study_sessions(room_id);

-- 5. Mevcut kullanıcıların oda sürelerini senkronize et (profiles'tan room_members'a kopyala)
--    Sadece şu an bir odada olan kullanıcılar için
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN 
        SELECT p.id as profile_id, p.current_room_id, 
               p.weekly_study_seconds, p.total_study_seconds
        FROM public.profiles p
        WHERE p.current_room_id IS NOT NULL
    LOOP
        UPDATE public.room_members
        SET 
            weekly_study_seconds = user_record.weekly_study_seconds,
            total_study_seconds = user_record.total_study_seconds
        WHERE user_id = user_record.profile_id 
          AND room_id = user_record.current_room_id;
    END LOOP;
END $$;

-- 6. Haftalık sıfırlama fonksiyonunu güncelle: room_members weekly'leri de sıfırla
CREATE OR REPLACE FUNCTION public.reset_weekly_study_times()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Aktif ve duraklatılmış oturumları kapat
    UPDATE public.study_sessions
    SET 
        end_time = now(),
        status = 'completed',
        submitted_at = now()
    WHERE status IN ('active', 'paused');

    -- Profiles haftalık süreleri sıfırla
    UPDATE public.profiles
    SET 
        previous_weekly_study_seconds = weekly_study_seconds,
        weekly_study_seconds = 0,
        updated_at = now();

    -- Room members haftalık süreleri sıfırla
    UPDATE public.room_members
    SET weekly_study_seconds = 0;
END;
$$;

-- ============================================================================
-- NOTLAR:
-- 1. Bu migration'ı çalıştırdıktan sonra uygulamayı güncelleyin.
-- 2. Oda bazlı leaderboard artık profiles yerine room_members üzerinden çalışır.
-- 3. Bir kullanıcı farklı odalarda farklı sürelere sahip olabilir.
-- 4. Odayı sadece oluşturan kişi silebilir (DELETE policy).
-- ============================================================================