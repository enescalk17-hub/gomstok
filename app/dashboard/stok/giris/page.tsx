'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function StokGirisPage() {
  const supabase = createClient()
  const router = useRouter()

  const [lokasyonlar, setLokasyonlar] = useState<any[]>([])
  const [secilenLokasyon, setSecilenLokasyon] = useState('')
  const [barkod, setBarkod] = useState('')
  const [miktar, setMiktar] = useState(1)
  const [bulunanUrun, setBulunanUrun] = useState<any>(null)
  const [aramaYapildi, setAramaYapildi] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [basari, setBasari] = useState('')
  const [hata, setHata] = useState('')

  useEffect(() => {
    async function getir() {
      const { data } = await supabase
        .from('lokasyonlar')
        .select('*')
        .in('tip', ['atolye', 'magaza', 'depo'])
        .eq('aktif', true)
      setLokasyonlar(data || [])
      // Varsayılan: Atölye
      const atolye = data?.find((l: any) => l.tip === 'atolye')
      if (atolye) setSecilenLokasyon(atolye.id)
    }
    getir()
  }, [])

  async function barkodAra() {
    if (!barkod.trim()) return
    setAramaYapildi(true)
    setBulunanUrun(null)
    setHata('')

    const { data } = await supabase
      .from('urunler')
      .select(`
        id, barkod,
        koleksiyon:koleksiyonlar(ad),
        model:modeller(ad),
        renk:renkler(ad),
        beden:bedenler(ad)
      `)
      .eq('barkod', barkod.trim())
      .eq('aktif', true)
      .single()

    if (!data) {
      setHata('Bu barkoda sahip ürün bulunamadı.')
      return
    }
    setBulunanUrun(data)
  }

  async function stokEkle() {
    if (!bulunanUrun || !secilenLokasyon || miktar < 1) return
    setYukleniyor(true)
    setHata('')

    // Mevcut stok var mı kontrol et
    const { data: mevcutStok } = await supabase
      .from('stok')
      .select('id, miktar')
      .eq('urun_id', bulunanUrun.id)
      .eq('lokasyon_id', secilenLokasyon)
      .single()

    if (mevcutStok) {
      // Güncelle
      await supabase
        .from('stok')
        .update({ miktar: mevcutStok.miktar + miktar, guncelleme: new Date().toISOString() })
        .eq('id', mevcutStok.id)
    } else {
      // Yeni kayıt
      await supabase
        .from('stok')
        .insert({ urun_id: bulunanUrun.id, lokasyon_id: secilenLokasyon, miktar })
    }

    // Hareket kaydı
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('stok_hareketleri').insert({
      urun_id: bulunanUrun.id,
      lokasyon_id: secilenLokasyon,
      hareket_tipi: 'giris',
      miktar: miktar,
      yapan_id: user?.id,
      aciklama: 'Manuel stok girişi',
    })

    const lok = lokasyonlar.find(l => l.id === secilenLokasyon)
    setBasari(`✅ ${miktar} adet "${bulunanUrun.model?.ad} ${bulunanUrun.renk?.ad} ${bulunanUrun.beden?.ad}" → ${lok?.ad} stokuna eklendi.`)
    setBarkod('')
    setBulunanUrun(null)
    setAramaYapildi(false)
    setMiktar(1)
    setYukleniyor(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <Link href="/dashboard/stok"
            className="text-gray-400 hover:text-gray-600 text-xl">←</Link>
          <div>
            <h1 className="font-semibold text-gray-900 text-sm">Stok Girişi</h1>
            <p className="text-xs text-gray-500">Barkod okut veya yaz</p>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4">

        {/* Lokasyon Seç */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Stok Girilecek Lokasyon
          </label>
          <div className="flex flex-wrap gap-2">
            {lokasyonlar.map(l => (
              <button
                key={l.id}
                type="button"
                onClick={() => setSecilenLokasyon(l.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors
                  ${secilenLokasyon === l.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}>
                {l.ad}
              </button>
            ))}
          </div>
        </div>

        {/* Barkod Girişi */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Ürün Barkodu
          </label>
          <div className="flex gap-2">
            <input
              value={barkod}
              onChange={e => {
                setBarkod(e.target.value)
                setBulunanUrun(null)
                setAramaYapildi(false)
                setHata('')
              }}
              onKeyDown={e => e.key === 'Enter' && barkodAra()}
              placeholder="Barkod okut veya yaz... (Enter)"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         text-sm font-mono text-gray-900"
              autoFocus
            />
            <button
              onClick={barkodAra}
              className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl
                         text-sm font-medium text-gray-700 transition-colors">
              Ara
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            M3 terminal veya barkod okuyucu ile okutabilirsin — Enter'a basınca otomatik arar.
          </p>
        </div>

        {/* Ürün Bulunamadı */}
        {aramaYapildi && hata && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-red-600 text-sm">{hata}</p>
          </div>
        )}

        {/* Bulunan Ürün */}
        {bulunanUrun && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <p className="text-xs text-green-600 font-medium mb-2 uppercase tracking-wide">
              Ürün Bulundu
            </p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center
                              justify-center text-sm font-bold font-mono text-green-700 border border-green-200">
                {bulunanUrun.beden?.ad}
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {bulunanUrun.model?.ad} — {bulunanUrun.renk?.ad}
                </p>
                <p className="text-xs font-mono text-gray-500">{bulunanUrun.barkod}</p>
                <p className="text-xs text-gray-500">{bulunanUrun.koleksiyon?.ad}</p>
              </div>
            </div>
          </div>
        )}

        {/* Miktar */}
        {bulunanUrun && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Adet
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setMiktar(m => Math.max(1, m - 1))}
                className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200
                           text-xl font-bold text-gray-700 transition-colors flex
                           items-center justify-center">
                −
              </button>
              <input
                type="number"
                value={miktar}
                onChange={e => setMiktar(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 text-center text-2xl font-bold text-gray-900
                           border border-gray-200 rounded-xl py-2
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setMiktar(m => m + 1)}
                className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200
                           text-xl font-bold text-gray-700 transition-colors flex
                           items-center justify-center">
                +
              </button>
            </div>
          </div>
        )}

        {/* Başarı mesajı */}
        {basari && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="text-blue-700 text-sm">{basari}</p>
          </div>
        )}

        {/* Kaydet Butonu */}
        {bulunanUrun && (
          <button
            onClick={stokEkle}
            disabled={yukleniyor}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                       text-white font-medium py-4 rounded-2xl transition-colors text-sm">
            {yukleniyor
              ? 'Kaydediliyor...'
              : `${miktar} Adet Stok Ekle`}
          </button>
        )}

        {/* Stok Görüntüle */}
        <Link href="/dashboard/stok"
          className="block text-center text-sm text-blue-600 hover:underline py-2">
          Mevcut stoku görüntüle →
        </Link>
      </main>
    </div>
  )
}