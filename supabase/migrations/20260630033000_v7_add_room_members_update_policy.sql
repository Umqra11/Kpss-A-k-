-- ============================================================================
-- v7: room_members UPDATE policy EKLİYOR
-- ============================================================================
-- v3'te INSERT, SELECT, DELETE policy'leri vardı ama UPDATE eksikti.
-- Bu yüzden timerStore'daki update/upsert işlemleri 403 alıyordu.
-- Hata: "new row violates row-level security policy (USING expression) for table room_members"
--
-- Çalıştırma: Supabase Dashboard → SQL Editor → bu dosyayı yapıştır → Run
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'room_members'
          AND policyname = 'Users can update own room membership'
    ) THEN
        CREATE POLICY "Users can update own room membership" ON public.room_members
            FOR UPDATE USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;