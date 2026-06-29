-- ============================================================================
-- KPSS Aşkı - v4 Migration
-- reset_weekly_study_times() güncellemesi:
--   Haftalık sıfırlamadan önce tüm aktif/paused oturumları kapatır.
--   Bu sayede Salı 00:00'da çalışan kullanıcıların süresi doğru haftaya yazılır.
-- Çalıştırma: Supabase SQL Editor'da çalıştırın
-- ============================================================================

-- 1. reset_weekly_study_times() fonksiyonunu güncelle
--    Önce tüm active/paused oturumları completed yap,
--    sonra haftalık study sürelerini sıfırla.
CREATE OR REPLACE FUNCTION public.reset_weekly_study_times()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1a. Tüm aktif ve duraklatılmış oturumları kapat
    --     duration_seconds olduğu gibi kalır (client periyodik sync ile güncel)
    UPDATE public.study_sessions
    SET 
        end_time = now(),
        status = 'completed',
        submitted_at = now()
    WHERE status IN ('active', 'paused');

    -- 1b. Haftalık çalışma sürelerini sıfırla
    UPDATE public.profiles
    SET 
        previous_weekly_study_seconds = weekly_study_seconds,
        weekly_study_seconds = 0,
        updated_at = now();
END;
$$;

-- ============================================================================
-- NOTLAR:
-- 1. Bu fonksiyon zaten pg_cron ile schedule edilmiş olmalı:
--    SELECT cron.schedule(
--        'reset-weekly-study-times',
--        '0 0 * * 2',
--        'SELECT public.reset_weekly_study_times();'
--    );
-- 2. Eğer pg_cron aktif değilse, Supabase Dashboard'dan etkinleştirin
--    (Pro plan gerekebilir) veya Edge Function ile tetikleyin
-- 3. Client tarafında (timerStore.ts) hafta sınırı tespiti ile
--    yeni oturum otomatik başlatılır, kronometre kesintisiz devam eder
-- ============================================================================