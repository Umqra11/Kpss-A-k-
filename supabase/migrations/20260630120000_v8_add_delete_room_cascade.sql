-- ============================================================================
-- KPSS Aşkı - v8 Migration
-- ERR-004 fix: delete_room_cascade RPC fonksiyonu
--
-- Oda silindiğinde:
--   1. O odadaki tüm kullanıcıların current_room_id'sini NULL yapar
--   2. O odaya ait tüm room_members kayıtlarını siler
--   3. Odayı siler
--   4. Odaya ait study_sessions kayıtlarındaki room_id'yi NULL yapar
--
-- Çalıştırma: Supabase Dashboard → SQL Editor → bu dosyayı yapıştır → Run
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_room_cascade(p_room_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- 1. O odadaki kullanıcıların current_room_id'sini temizle
    UPDATE public.profiles
    SET
        current_room_id = NULL,
        updated_at = now()
    WHERE current_room_id = p_room_id;

    -- 2. O odaya ait room_members kayıtlarını sil
    DELETE FROM public.room_members
    WHERE room_id = p_room_id;

    -- 3. O odaya ait study_sessions kayıtlarında room_id'yi temizle
    UPDATE public.study_sessions
    SET room_id = NULL
    WHERE room_id = p_room_id;

    -- 4. Odayı sil
    DELETE FROM public.rooms
    WHERE id = p_room_id;
END;
$$;

-- Aynı fonksiyonu supabase/migrations/ dizinine de koy
-- ============================================================================
-- NOTLAR:
-- 1. SECURITY DEFINER sayesinde RLS bypass edilir
-- 2. Çağrı: SELECT delete_room_cascade('room-uuid-here');
-- 3. Client tarafında: supabase.rpc('delete_room_cascade', { p_room_id })
-- ============================================================================
