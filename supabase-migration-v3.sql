-- ============================================================================
-- KPSS Aşkı - v3 Migration
-- Oda Sistemi (Rooms): Kullanıcıların odalara katılıp oda bazlı leaderboard görmesi
-- Çalıştırma: Supabase SQL Editor'da çalıştırın
-- ============================================================================

-- 1. ROOMS TABLOSU
CREATE TABLE IF NOT EXISTS public.rooms (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    slug            TEXT UNIQUE NOT NULL,
    description     TEXT,
    created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. ROOM MEMBERS TABLOSU (Çoka-Çok İlişki)
CREATE TABLE IF NOT EXISTS public.room_members (
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    room_id         UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, room_id)
);

-- 3. PROFILES TABLOSUNA current_room_id EKLE
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL;

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON public.room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON public.room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_current_room_id ON public.profiles(current_room_id) WHERE current_room_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rooms_slug ON public.rooms(slug);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

-- Rooms: Herkes okuyabilir
CREATE POLICY "Rooms are viewable by everyone" ON public.rooms
    FOR SELECT USING (true);

-- Rooms: Sadece giriş yapmış kullanıcılar oluşturabilir
CREATE POLICY "Authenticated users can create rooms" ON public.rooms
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Room Members: Herkes okuyabilir
CREATE POLICY "Room members are viewable by everyone" ON public.room_members
    FOR SELECT USING (true);

-- Room Members: Kullanıcı kendini odaya ekleyebilir
CREATE POLICY "Users can join rooms" ON public.room_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Room Members: Kullanıcı kendini odadan çıkarabilir
CREATE POLICY "Users can leave rooms" ON public.room_members
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- SEED DATA: Varsayılan Odalar
-- ============================================================================
INSERT INTO public.rooms (name, slug, description) VALUES
    ('Genel', 'genel', 'Herkese açık genel çalışma odası. Tüm KPSS adayları burada!')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- MEVCUT KULLANICILARI "Genel" ODASINA ATA
-- ============================================================================
DO $$
DECLARE
    genel_room_id UUID;
    user_record RECORD;
BEGIN
    -- Genel odasının ID'sini al
    SELECT id INTO genel_room_id FROM public.rooms WHERE slug = 'genel';
    
    IF genel_room_id IS NOT NULL THEN
        -- Tüm kullanıcıları Genel odasına ekle (current_room_id)
        UPDATE public.profiles 
        SET current_room_id = genel_room_id
        WHERE current_room_id IS NULL;
        
        -- Tüm kullanıcıları room_members tablosuna ekle
        FOR user_record IN 
            SELECT id FROM public.profiles
            WHERE id NOT IN (
                SELECT user_id FROM public.room_members WHERE room_id = genel_room_id
            )
        LOOP
            INSERT INTO public.room_members (user_id, room_id)
            VALUES (user_record.id, genel_room_id)
            ON CONFLICT (user_id, room_id) DO NOTHING;
        END LOOP;
    END IF;
END $$;

-- ============================================================================
-- NOTLAR:
-- 1. Supabase Dashboard → Database → Replication:
--    "rooms" ve "room_members" tablolarını Realtime'a ekleyin
--    (profiles zaten ekli olmalı, değilse onu da ekleyin)
-- 2. Bu migration'ı çalıştırdıktan sonra uygulamayı güncelleyin
-- ============================================================================