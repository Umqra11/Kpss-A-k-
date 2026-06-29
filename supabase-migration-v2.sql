-- ============================================================================
-- KPSS Aşkı - v2 Migration
-- Aktif kullanıcı takibi ve oturum submit özellikleri
-- Çalıştırma: Supabase SQL Editor'da çalıştırın
-- ============================================================================

-- 1. profiles tablosuna active tracking alanları ekle
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- 2. study_sessions tablosuna submitted_at ekle
ALTER TABLE public.study_sessions 
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

-- 3. Aktif kullanıcılar için index
CREATE INDEX IF NOT EXISTS idx_profiles_is_active 
ON public.profiles(is_active) 
WHERE is_active = true;

-- 4. Tetikleyici: profiles güncellendiğinde last_active_at'i otomatik güncelle
CREATE OR REPLACE FUNCTION public.update_last_active_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = true AND (OLD.is_active = false OR OLD.is_active IS NULL) THEN
        NEW.last_active_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_last_active_at ON public.profiles;
CREATE TRIGGER trigger_update_last_active_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_last_active_at();

-- 5. NOT: Supabase Dashboard → Database → Replication → profiles tablosunu ekleyin
--    (Realtime için gerekli - zaten ekli olabilir, kontrol edin)