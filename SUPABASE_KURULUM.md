# 🗄️ KPSS Aşkı - Supabase Kurulum Rehberi

## Adım Adım Kurulum

### 1. Supabase Dashboard'a Git
https://supabase.com/dashboard adresine git ve projene tıkla.

### 2. SQL Editor'da Şemayı Çalıştır
- Sol menüden **SQL Editor**'a tıkla
- **New Query** butonuna tıkla
- `supabase-schema.sql` dosyasının **tüm içeriğini** kopyala
- SQL Editor'a yapıştır
- **Run** butonuna tıkla

### 3. Anonim Girişi Aç
- Sol menüden **Authentication** → **Settings**'e tıkla
- **Allow anonymous sign-ins** seçeneğini **AÇIK (ON)** konuma getir
- **Save** butonuna tıkla

### 4. Realtime'ı Etkinleştir
- Sol menüden **Database** → **Replication**'a tıkla
- **0 tables** yazan yere tıkla
- `profiles` ve `study_sessions` tablolarını seç
- Değişiklikleri kaydet

### 5. Haftalık Sıfırlama (Opsiyonel)
Haftalık sıfırlama için iki seçenek var:

**Seçenek A: pg_cron (Pro Plan Gerektirir)**
- `supabase-schema.sql` dosyasındaki yorum satırındaki pg_cron kodunu çalıştır

**Seçenek B: Edge Function (Ücretsiz)**
- Supabase CLI ile yeni Edge Function oluştur
- Haftada bir Salı 00:00'da çalışacak cron job oluştur

---

## ✅ Kurulum Kontrol Listesi
- [ ] SQL şeması çalıştırıldı
- [ ] Anonim giriş açıldı
- [ ] Realtime tabloları eklendi
- [ ] `.env` dosyası oluşturuldu

## 🚀 Uygulamayı Başlat
```bash
npm install
npm start