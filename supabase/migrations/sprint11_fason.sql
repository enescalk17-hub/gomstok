-- =============================================================
-- Sprint 11: Fason İş ve Müşteri Emanet Kumaş Takibi
-- =============================================================

-- 1. B2B MÜŞTERİLER TABLOSU
-- (Bize fason iş getiren firmalar — tedarikciler'den ayrı)
CREATE TABLE IF NOT EXISTS musteriler (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad          text NOT NULL,
  telefon     text,
  eposta      text,
  adres       text,
  vergi_no    text,
  notlar      text,
  aktif       boolean NOT NULL DEFAULT true,
  olusturulma timestamptz NOT NULL DEFAULT now()
);

-- 2. KUMAŞLAR TABLOSUNA MÜŞTERİ BAĞLANTISI
-- Dolu ise o kumaş "Emanet Kumaş"tır (müşterinin getirdiği)
ALTER TABLE kumaslar
  ADD COLUMN IF NOT EXISTS musteri_id uuid REFERENCES musteriler(id) ON DELETE SET NULL;

-- 3. FASON İŞ EMİRLERİ TABLOSU
CREATE TABLE IF NOT EXISTS fason_is_emirleri (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  irsaliye_no         text UNIQUE,               -- FAS-2026-0001 (teslimde üretilir)
  musteri_id          uuid NOT NULL REFERENCES musteriler(id),
  kumas_id            uuid REFERENCES kumaslar(id) ON DELETE SET NULL,
  model_tanimi        text NOT NULL,             -- "Slim Fit V-Yaka Gömlek"
  hedef_adet          integer NOT NULL,
  teslim_alinan_metre numeric(10,2),             -- müşterinin getirdiği kumaş miktarı
  durum               text NOT NULL DEFAULT 'bekliyor',
  -- durum: bekliyor | kesimde | uretimde | teslim_edildi | iptal

  baslangic_tarihi    date,
  bitis_tarihi        date,

  -- Üretim sonuçları (iş tamamlandığında doldurulur)
  uretilen_adet       integer,
  fire_adet           integer,
  kullanilan_metre    numeric(10,2),
  fire_metre          numeric(10,2),

  -- Beden dağılımı: {"S": 100, "M": 200, "L": 150, "XL": 80}
  beden_dagilimi      jsonb,

  notlar              text,

  -- true = sadece irsaliye; stok tablosuna ASLA girmesin (fabrika standardı)
  stoka_girmesin      boolean NOT NULL DEFAULT true,

  olusturulma         timestamptz NOT NULL DEFAULT now(),
  guncellendi         timestamptz NOT NULL DEFAULT now()
);

-- 4. ROW LEVEL SECURITY
ALTER TABLE musteriler        ENABLE ROW LEVEL SECURITY;
ALTER TABLE fason_is_emirleri ENABLE ROW LEVEL SECURITY;

-- Authenticated users can do everything (admin check handled at app layer)
CREATE POLICY "musteriler_all" ON musteriler
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "fason_all" ON fason_is_emirleri
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. INDEX
CREATE INDEX IF NOT EXISTS fason_musteri_idx ON fason_is_emirleri (musteri_id);
CREATE INDEX IF NOT EXISTS fason_durum_idx   ON fason_is_emirleri (durum);
CREATE INDEX IF NOT EXISTS kumas_musteri_idx ON kumaslar (musteri_id);

-- =============================================================
-- Çalıştırma: Supabase Dashboard > SQL Editor > New Query
-- =============================================================