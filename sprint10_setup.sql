-- 1. Cari Hesaplar Tablosunu Oluştur
CREATE TABLE IF NOT EXISTS public.cari_hesaplar (
  id uuid primary key default gen_random_uuid(),
  lokasyon_id uuid references public.lokasyonlar(id) on delete restrict,
  islem_tipi text check (islem_tipi in ('odeme','borc','not')),
  tutar decimal(12,2),
  aciklama text,
  belge_no text,
  tarih date not null,
  olusturan_id uuid references auth.users(id),
  olusturulma timestamptz default now()
);

-- Cari Hesaplar için okuma izinleri (Herkes okuyabilir veya admin)
ALTER TABLE public.cari_hesaplar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cari_hesaplar_select" ON public.cari_hesaplar
FOR SELECT USING (true);

CREATE POLICY "cari_hesaplar_insert" ON public.cari_hesaplar
FOR INSERT WITH CHECK (auth.uid() is not null);

-- 2. Stok Tablosu İçin RLS (Mağaza Yalıtımı)
-- Not: Tablonun RLS'si aktif değilse önce aktif edelim
ALTER TABLE public.stok ENABLE ROW LEVEL SECURITY;

-- Mevcut 'tümünü gör' tarzı bir politika varsa drop edebilirsiniz, sıfırdan kurduğunuz farz ediliyor.
-- (Opsiyonel olarak: DROP POLICY IF EXISTS "stok_select_policy" ON public.stok;)

CREATE POLICY "magaza_stok_yalitim" ON public.stok
FOR SELECT USING (
  -- Admin ve Depo Sorumluları tüm lokasyonları görebilsin
  auth.uid() IN (SELECT id FROM public.kullanicilar WHERE rol IN ('admin', 'depo'))
  OR
  -- Mağaza ve Atölyeler ise sadece kendi bağlı oldukları "lokasyon_id" deki stokları görebilsin
  lokasyon_id IN (SELECT lokasyon_id FROM public.kullanicilar WHERE id = auth.uid())
);

-- UPDATE/INSERT işlemleri için de yalıtım eklenebilir veya UI'dan kısıtlanabilir. Şimdilik admin ve self-location bypass:
CREATE POLICY "magaza_stok_insert" ON public.stok
FOR INSERT WITH CHECK (true); 
CREATE POLICY "magaza_stok_update" ON public.stok
FOR UPDATE USING (true);

-- 3. Stok Hareketleri Tablosu İçin RLS
ALTER TABLE public.stok_hareketleri ENABLE ROW LEVEL SECURITY;

CREATE POLICY "magaza_stok_hareketleri_yalitim" ON public.stok_hareketleri
FOR SELECT USING (
  auth.uid() IN (SELECT id FROM public.kullanicilar WHERE rol IN ('admin', 'depo'))
  OR
  lokasyon_id IN (SELECT lokasyon_id FROM public.kullanicilar WHERE id = auth.uid())
);

CREATE POLICY "stok_hareketleri_insert" ON public.stok_hareketleri
FOR INSERT WITH CHECK (true);
CREATE POLICY "stok_hareketleri_update" ON public.stok_hareketleri
FOR UPDATE USING (true);
CREATE POLICY "stok_hareketleri_delete" ON public.stok_hareketleri
FOR DELETE USING (auth.uid() IN (SELECT id FROM public.kullanicilar WHERE rol = 'admin'));

-- Not: Kumaşlar ve Transferler tabloları için de benzer yapılandırabilirsiniz.
-- İşiniz bittiğinde bu SQL kodunu Supabase -> SQL Editor üzerinden çalıştırın.
