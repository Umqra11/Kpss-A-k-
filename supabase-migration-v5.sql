-- ============================================================================
-- KPSS Aşkı - v5 Migration
-- Profil reaktivasyonu için SECURITY DEFINER fonksiyonu
-- Çalıştırma: Supabase SQL Editor'da çalıştırın
-- ============================================================================

-- 1. REACTIVATE_PROFILE fonksiyonu: RLS'yi bypass ederek pasif profili
--    yeni auth id ile yeniden aktive eder, eski istatistikleri korur.
--    Neden: Anonim oturum kapatılıp yeni anonim oturum açıldığında,
--    yeni auth.uid() eski profil id'sinden farklıdır. Normal UPDATE/DELETE
--    RLS tarafından engellenir. Bu SECURITY DEFINER fonksiyon RLS'yi bypass eder.
CREATE OR REPLACE FUNCTION public.reactivate_profile(
    p_old_profile_id UUID,
    p_new_auth_id UUID,
    p_username TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_old_profile RECORD;
    v_result JSONB;
BEGIN
    -- Eski profili bul
    SELECT * INTO v_old_profile 
    FROM public.profiles 
    WHERE id = p_old_profile_id 
    AND username = p_username
    AND NOT is_active;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Profil bulunamadı veya aktif');
    END IF;
    
    -- Eski profili sil (cascade: room_members, study_sessions vb. de silinir)
    DELETE FROM public.profiles WHERE id = p_old_profile_id;
    
    -- Yeni profil oluştur, eski istatistikleri koru
    INSERT INTO public.profiles (
        id,
        username,
        total_study_seconds,
        weekly_study_seconds,
        previous_weekly_study_seconds,
        is_active,
        last_active_at,
        current_room_id,
        created_at,
        updated_at
    ) VALUES (
        p_new_auth_id,
        p_username,
        COALESCE(v_old_profile.total_study_seconds, 0),
        COALESCE(v_old_profile.weekly_study_seconds, 0),
        COALESCE(v_old_profile.previous_weekly_study_seconds, 0),
        true,
        now(),
        NULL,
        COALESCE(v_old_profile.created_at, now()),
        now()
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'total_study_seconds', COALESCE(v_old_profile.total_study_seconds, 0),
        'weekly_study_seconds', COALESCE(v_old_profile.weekly_study_seconds, 0)
    );
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('success', false, 'error', 'Bu kullanıcı adı zaten alınmış');
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 2. PROFILES DELETE policy'si (yedek - SECURITY DEFINER fonksiyon olduğu için
--    normalde gerekmez, ama ilerde client'tan direkt silme gerekebilir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can delete own profile' 
        AND tablename = 'profiles'
    ) THEN
        CREATE POLICY "Users can delete own profile" ON public.profiles
            FOR DELETE USING (auth.uid() = id);
    END IF;
END $$;
