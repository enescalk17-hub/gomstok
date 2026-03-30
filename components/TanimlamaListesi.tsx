'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Props = {
  tablo: string
  baslik: string
  ikon: string
  kodAlani?: boolean  // kod girişi gerekiyor mu
}

type Kayit = {
  id: string
  ad: string
  kod?: string
  sira?: number
  aktif: boolean
}

export default function TanimlamaListesi({ tablo, baslik, ikon, kodAlani = true }: Props) {
  const supabase = createClient()
  const [liste, setListe] = useState<Kayit[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [yeniAd, setYeniAd] = useState('')
  const [yeniKod, setYeniKod] = useState('')
  const [ekleniyor, setEkleniyor] = useState(false)
  const [hata, setHata] = useState('')
  const [formAcik, setFormAcik] = useState(false)

  async function getir() {
    const q = supabase
      .from(tablo)
      .select('*')
      .order(tablo === 'bedenler' ? 'sira' : 'ad')
    const { data } = await q
    setListe(data || [])
    setYukleniyor(false)
  }

  useEffect(() => { getir() }, [])

  // Kod otomatik üretimi: mevcut en yüksek kod + 1
  function otomatikKod(mevcutListe: Kayit[]) {
    if (mevcutListe.length === 0) return '01'
    const kodlar = mevcutListe
      .map(k => parseInt(k.kod || '0'))
      .filter(n => !isNaN(n))
    const max = Math.max(...kodlar)
    return String(max + 1).padStart(2, '0')
  }

  function formuAc() {
    setYeniAd('')
    setYeniKod(otomatikKod(liste))
    setHata('')
    setFormAcik(true)
  }

  async function ekle(e: React.FormEvent) {
    e.preventDefault()
    if (!yeniAd.trim()) { setHata('Ad boş olamaz.'); return }
    if (kodAlani && !yeniKod.trim()) { setHata('Kod boş olamaz.'); return }
    setEkleniyor(true)
    setHata('')

const kayit: any = { ad: yeniAd.trim(), aktif: true }
if (kodAlani) kayit.kod = yeniKod.trim()
if (tablo === 'bedenler') kayit.sira = liste.length + 1
if (tablo === 'koleksiyonlar') {
  const yilKodu = parseInt(yeniKod.trim())
  kayit.yil = yilKodu < 50 ? 2000 + yilKodu : 1900 + yilKodu
}

    const { error } = await supabase.from(tablo).insert(kayit)

    if (error) {
      setHata(error.message.includes('unique')
        ? 'Bu kod veya ad zaten mevcut.'
        : 'Bir hata oluştu: ' + error.message)
      setEkleniyor(false)
      return
    }

    setFormAcik(false)
    setYeniAd('')
    setYeniKod('')
    setEkleniyor(false)
    getir()
  }

  async function durumDegistir(id: string, aktif: boolean) {
    await supabase.from(tablo).update({ aktif: !aktif }).eq('id', id)
    getir()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/urunler"
              className="text-gray-400 hover:text-gray-600 text-xl">←</Link>
            <div>
              <h1 className="font-semibold text-gray-900 text-sm">
                {ikon} {baslik}
              </h1>
              <p className="text-xs text-gray-500">{liste.length} kayıt</p>
            </div>
          </div>
          <button
            onClick={formuAc}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs 
                       font-medium px-4 py-2 rounded-xl transition-colors">
            + Ekle
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4">

        {/* Ekleme Formu */}
        {formAcik && (
          <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-sm">
            <h3 className="font-medium text-gray-900 text-sm mb-4">
              Yeni {baslik.slice(0, -3)} Ekle
            </h3>
            <form onSubmit={ekle} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Ad *
                </label>
                <input
                  value={yeniAd}
                  onChange={e => setYeniAd(e.target.value)}
                  placeholder={`Örn: ${
                    tablo === 'koleksiyonlar' ? '2025 Yaz' :
                    tablo === 'modeller' ? 'Slim Fit' :
                    tablo === 'renkler' ? 'Beyaz' : 'XL'
                  }`}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 
                             focus:outline-none focus:ring-2 focus:ring-blue-500 
                             text-sm text-gray-900"
                  autoFocus
                />
              </div>

              {kodAlani && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Barkod Kodu (2 hane) *
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      value={yeniKod}
                      onChange={e => setYeniKod(e.target.value.slice(0, 2))}
                      placeholder="01"
                      maxLength={2}
                      className="w-24 px-4 py-3 rounded-xl border border-gray-200 
                                 focus:outline-none focus:ring-2 focus:ring-blue-500 
                                 text-sm font-mono text-center text-gray-900"
                    />
                    <p className="text-xs text-gray-400">
                      Otomatik önerildi, değiştirebilirsin
                    </p>
                  </div>
                </div>
              )}

              {hata && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2">
                  <p className="text-red-600 text-xs">{hata}</p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={ekleniyor}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                             text-white font-medium py-3 rounded-xl text-sm transition-colors">
                  {ekleniyor ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={() => setFormAcik(false)}
                  className="px-6 py-3 rounded-xl border border-gray-200 
                             text-gray-600 text-sm hover:bg-gray-50 transition-colors">
                  İptal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Liste */}
        {yukleniyor ? (
          <div className="text-center py-12 text-gray-400 text-sm">Yükleniyor...</div>
        ) : liste.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">{ikon}</div>
            <p className="text-gray-500 text-sm">Henüz kayıt yok.</p>
            <button
              onClick={formuAc}
              className="mt-3 text-blue-600 text-sm hover:underline">
              İlk kaydı ekle →
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 
                            text-xs text-gray-500 font-medium uppercase tracking-wide">
              {baslik} Listesi
            </div>
            {liste.map((kayit, i) => (
              <div
                key={kayit.id}
                className={`flex items-center justify-between px-4 py-3
                            ${i < liste.length - 1 ? 'border-b border-gray-50' : ''}
                            ${!kayit.aktif ? 'opacity-40' : ''}`}>
                <div className="flex items-center gap-3">
                  {kodAlani && (
                    <span className="w-10 h-10 bg-purple-50 rounded-xl flex items-center 
                                     justify-center text-xs font-mono font-bold text-purple-700">
                      {kayit.kod}
                    </span>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{kayit.ad}</p>
                    {kodAlani && (
                      <p className="text-xs text-gray-400 font-mono">
                        Barkodda: {kayit.kod}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => durumDegistir(kayit.id, kayit.aktif)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors
                    ${kayit.aktif
                      ? 'bg-green-50 text-green-700 hover:bg-red-50 hover:text-red-600'
                      : 'bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-700'
                    }`}>
                  {kayit.aktif ? 'Aktif' : 'Pasif'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Bilgi Kutusu */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-xs text-blue-700 font-medium mb-1">💡 Barkod Mantığı</p>
          <p className="text-xs text-blue-600">
            Her {baslik.toLowerCase().slice(0,-3)} 2 haneli bir kodla temsil edilir.
            Bu kodlar birleşerek 8 haneli ürün barkoду oluşturur.
            <br/>
            <span className="font-mono font-bold">KOL + MOD + RNK + BDN = BARKOD</span>
          </p>
        </div>
      </main>
    </div>
  )
}