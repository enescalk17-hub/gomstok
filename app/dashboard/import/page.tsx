'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import * as XLSX from 'xlsx'

type SatirOnizleme = {
  dis_barkod: string
  model: string
  renk: string
  beden: string
  kalip: string
  kol_tipi: string
  sezon: string
  durum: 'yeni' | 'mevcut' | 'hata'
  hata_mesaji?: string
}

export default function ImportPage() {
  const supabase = createClient()
  const dosyaRef = useRef<HTMLInputElement>(null)

  const [mod, setMod] = useState<'excel' | 'barkod'>('excel')
  const [satirlar, setSatirlar] = useState<SatirOnizleme[]>([])
  const [yukleniyor, setYukleniyor] = useState(false)
  const [yuklendi, setYuklendi] = useState(false)
  const [sonuc, setSonuc] = useState({ eklenen: 0, atlanan: 0, hata: 0 })
  const [barkodInput, setBarkodInput] = useState('')
  const [tekliList, setTekliList] = useState<string[]>([])

  // Excel dosyası okundu
  function dosyaOku(e: React.ChangeEvent<HTMLInputElement>) {
    const dosya = e.target.files?.[0]
    if (!dosya) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const data = evt.target?.result
      const workbook = XLSX.read(data, { type: 'binary' })
      const sayfa = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(sayfa) as any[]

      const islenmis: SatirOnizleme[] = jsonData.map(satir => {
        // Esnek kolon isimleri — Türkçe ve İngilizce destekli
        const barkod = String(
          satir['Barkod'] || satir['barkod'] ||
          satir['BARKOD'] || satir['Barcode'] ||
          satir['barcode'] || ''
        ).trim()

        if (!barkod) {
          return {
            dis_barkod: '', model: '', renk: '', beden: '',
            kalip: '', kol_tipi: '', sezon: '',
            durum: 'hata' as const,
            hata_mesaji: 'Barkod alanı boş'
          }
        }

        return {
          dis_barkod: barkod,
          model: String(satir['Model'] || satir['model'] || satir['Ürün'] || '').trim(),
          renk: String(satir['Renk'] || satir['renk'] || satir['Color'] || '').trim(),
          beden: String(satir['Beden'] || satir['beden'] || satir['Size'] || satir['Beden/Size'] || '').trim(),
          kalip: String(satir['Kalip'] || satir['kalip'] || satir['Kalıp'] || satir['Fit'] || '').trim(),
          kol_tipi: String(satir['Kol'] || satir['kol'] || satir['Kol Tipi'] || '').trim(),
          sezon: String(satir['Sezon'] || satir['sezon'] || satir['Season'] || '').trim(),
          durum: 'yeni' as const,
        }
      })

      setSatirlar(islenmis)
      setYuklendi(false)
    }
    reader.readAsBinaryString(dosya)
  }

  // Tekli barkod ekle (okuyucu veya manuel)
  function tekliEkle() {
    const b = barkodInput.trim()
    if (!b) return
    if (tekliList.includes(b)) {
      setBarkodInput('')
      return
    }
    setTekliList(prev => [...prev, b])
    setBarkodInput('')
  }

  function tekliSil(barkod: string) {
    setTekliList(prev => prev.filter(b => b !== barkod))
  }

  // Sisteme kaydet
  async function kaydet() {
    setYukleniyor(true)
    let eklenen = 0, atlanan = 0, hata = 0

    // Modeller, renkler, bedenler önce çek
    const [{ data: modeller }, { data: renkler }, { data: bedenler }, { data: kaliplar }] =
      await Promise.all([
        supabase.from('modeller').select('id, ad'),
        supabase.from('renkler').select('id, ad'),
        supabase.from('bedenler').select('id, ad'),
        supabase.from('kaliplar').select('id, ad'),
      ])

    const modelMap = new Map(modeller?.map(m => [m.ad.toLowerCase(), m.id]))
    const renkMap  = new Map(renkler?.map(r => [r.ad.toLowerCase(), r.id]))
    const bedenMap = new Map(bedenler?.map(b => [b.ad.toLowerCase(), b.id]))
    const kalipMap = new Map(kaliplar?.map(k => [k.ad.toLowerCase(), k.id]))

    const islenecekler = mod === 'excel' ? satirlar : tekliList.map(b => ({
      dis_barkod: b, model: '', renk: '', beden: '',
      kalip: '', kol_tipi: '', sezon: '', durum: 'yeni' as const
    }))

    for (const satir of islenecekler) {
      if (satir.durum === 'hata') { hata++; continue }

      // Zaten var mı?
      const { data: mevcut } = await supabase
        .from('urunler')
        .select('id')
        .eq('dis_barkod', satir.dis_barkod)
        .single()

      if (mevcut) { atlanan++; continue }

      // Model/renk/beden ID bul veya oluştur
      let modelId = modelMap.get(satir.model.toLowerCase())
      let renkId  = renkMap.get(satir.renk.toLowerCase())
      let bedenId = bedenMap.get(satir.beden.toLowerCase())
      let kalipId = kalipMap.get(satir.kalip.toLowerCase())

      // Yoksa otomatik oluştur
      if (satir.model && !modelId) {
        const { data } = await supabase
          .from('modeller')
          .insert({ ad: satir.model, kod: String(modelMap.size + 1).padStart(2, '0'), aktif: true })
          .select('id').single()
        if (data) { modelId = data.id; modelMap.set(satir.model.toLowerCase(), data.id) }
      }

      if (satir.renk && !renkId) {
        const { data } = await supabase
          .from('renkler')
          .insert({ ad: satir.renk, kod: String(renkMap.size + 1).padStart(2, '0'), aktif: true })
          .select('id').single()
        if (data) { renkId = data.id; renkMap.set(satir.renk.toLowerCase(), data.id) }
      }

      if (satir.beden && !bedenId) {
        const { data } = await supabase
          .from('bedenler')
          .insert({ ad: satir.beden, kod: String(bedenMap.size + 1).padStart(2, '0'), sira: bedenMap.size + 1, aktif: true })
          .select('id').single()
        if (data) { bedenId = data.id; bedenMap.set(satir.beden.toLowerCase(), data.id) }
      }

      // Ürünü ekle
      // Barkod alanı için dis_barkod'u kullan, iç barkod olarak da aynısını koy
      const { error } = await supabase.from('urunler').insert({
        barkod: satir.dis_barkod,       // iç barkod = dış barkod (artık aynı)
        dis_barkod: satir.dis_barkod,   // mağaza barkodu
        model_id: modelId,
        renk_id: renkId,
        beden_id: bedenId,
        kalip_id: kalipId,
        kol_tipi: satir.kol_tipi || null,
        sezon: satir.sezon || null,
        koleksiyon_id: null,            // artık zorunlu değil
        aktif: true,
      })

      if (error) { hata++; } else { eklenen++ }
    }

    setSonuc({ eklenen, atlanan, hata })
    setYuklendi(true)
    setYukleniyor(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-xl">
            &larr;
          </Link>
          <div>
            <h1 className="font-semibold text-gray-900 text-sm">Barkod Import</h1>
            <p className="text-xs text-gray-500">Excel veya okuyucu ile toplu urun ekle</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">

        {/* Mod Seçimi */}
        <div className="flex gap-2">
          <button
            onClick={() => { setMod('excel'); setSatirlar([]); setYuklendi(false) }}
            className={mod === 'excel'
              ? 'flex-1 py-3 rounded-xl text-sm font-medium bg-blue-600 text-white'
              : 'flex-1 py-3 rounded-xl text-sm font-medium bg-white text-gray-600 border border-gray-200'}>
            Excel ile Yukle
          </button>
          <button
            onClick={() => { setMod('barkod'); setTekliList([]); setYuklendi(false) }}
            className={mod === 'barkod'
              ? 'flex-1 py-3 rounded-xl text-sm font-medium bg-blue-600 text-white'
              : 'flex-1 py-3 rounded-xl text-sm font-medium bg-white text-gray-600 border border-gray-200'}>
            Barkod Okut
          </button>
        </div>

        {/* EXCEL MODU */}
        {mod === 'excel' && (
          <div className="space-y-4">

            {/* Excel Şablon İndir */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
              <p className="text-sm font-medium text-blue-900 mb-1">
                Excel Sablon Formati
              </p>
              <p className="text-xs text-blue-700 mb-3">
                Excel dosyanda su kolonlar olmali (bos olanlar opsiyonel):
              </p>
              <div className="bg-white rounded-xl p-3 font-mono text-xs text-gray-700 overflow-x-auto">
                Barkod | Model | Renk | Beden | Kalip | Kol | Sezon
              </div>
              <button
                onClick={() => {
                  const ws = XLSX.utils.aoa_to_sheet([
                    ['Barkod', 'Model', 'Renk', 'Beden', 'Kalip', 'Kol', 'Sezon'],
                    ['216422', 'Ekose Kasmir', 'Lacivert', 'M', 'Slim Fit', 'uzun', '2025 Kis'],
                    ['216423', 'Ekose Kasmir', 'Lacivert', 'L', 'Slim Fit', 'uzun', '2025 Kis'],
                  ])
                  const wb = XLSX.utils.book_new()
                  XLSX.utils.book_append_sheet(wb, ws, 'Urunler')
                  XLSX.writeFile(wb, 'gomstok-sablon.xlsx')
                }}
                className="mt-3 text-xs bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700">
                Sablon Indir
              </button>
            </div>

            {/* Dosya Yükle */}
            <div
              onClick={() => dosyaRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-2xl p-8
                         text-center cursor-pointer hover:border-blue-300 transition-colors bg-white">
              <p className="text-3xl mb-2">📂</p>
              <p className="text-sm font-medium text-gray-700">Excel dosyasini sec</p>
              <p className="text-xs text-gray-400 mt-1">.xlsx veya .xls</p>
              <input
                ref={dosyaRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={dosyaOku}
                className="hidden"
              />
            </div>

            {/* Önizleme */}
            {satirlar.length > 0 && !yuklendi && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex justify-between
                                text-xs text-gray-500 font-medium">
                  <span>ONIZLEME</span>
                  <span>
                    {satirlar.filter(s => s.durum !== 'hata').length} urun eklenecek,{' '}
                    {satirlar.filter(s => s.durum === 'hata').length} hatali
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {satirlar.slice(0, 50).map((satir, i) => (
                    <div key={i}
                      className={i < satirlar.length - 1
                        ? 'flex items-center justify-between px-4 py-2.5 border-b border-gray-50'
                        : 'flex items-center justify-between px-4 py-2.5'}>
                      <div>
                        <span className="font-mono text-sm font-bold text-gray-900">
                          {satir.dis_barkod}
                        </span>
                        {satir.model && (
                          <span className="text-xs text-gray-500 ml-2">
                            {satir.model} {satir.renk} {satir.beden}
                          </span>
                        )}
                        {satir.hata_mesaji && (
                          <span className="text-xs text-red-500 ml-2">
                            {satir.hata_mesaji}
                          </span>
                        )}
                      </div>
                      <span className={
                        satir.durum === 'hata'
                          ? 'text-xs bg-red-50 text-red-600 px-2 py-1 rounded-lg'
                          : 'text-xs bg-green-50 text-green-700 px-2 py-1 rounded-lg'}>
                        {satir.durum === 'hata' ? 'Hata' : 'Eklenecek'}
                      </span>
                    </div>
                  ))}
                  {satirlar.length > 50 && (
                    <p className="text-center text-xs text-gray-400 py-3">
                      +{satirlar.length - 50} satir daha...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* BARKOD OKUTMA MODU */}
        {mod === 'barkod' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Barkod Okut veya Yaz
              </label>
              <div className="flex gap-2">
                <input
                  value={barkodInput}
                  onChange={e => setBarkodInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && tekliEkle()}
                  placeholder="Barkodu okut veya yaz... (Enter)"
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200
                             text-sm font-mono text-gray-900 focus:outline-none
                             focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={tekliEkle}
                  className="px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                  Ekle
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Barkod okuyucu veya M3 terminali ile okutabilirsin.
                Telefon kamerasi icin asagidaki butonu kullan.
              </p>
            </div>

            {/* Eklenen barkodlar */}
            {tekliList.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex justify-between
                                text-xs text-gray-500 font-medium">
                  <span>EKLENEN BARKODLAR</span>
                  <span>{tekliList.length} adet</span>
                </div>
                {tekliList.map((b, i) => (
                  <div key={b}
                    className={i < tekliList.length - 1
                      ? 'flex items-center justify-between px-4 py-3 border-b border-gray-50'
                      : 'flex items-center justify-between px-4 py-3'}>
                    <span className="font-mono text-sm text-gray-900">{b}</span>
                    <button
                      onClick={() => tekliSil(b)}
                      className="text-xs text-red-400 hover:text-red-600 px-2 py-1">
                      Sil
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sonuç */}
        {yuklendi && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
            <p className="font-semibold text-green-900 mb-3">Import Tamamlandi!</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{sonuc.eklenen}</p>
                <p className="text-xs text-gray-500 mt-0.5">Eklendi</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{sonuc.atlanan}</p>
<p className="text-xs text-gray-500 mt-0.5">Zaten Vardi</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-red-500">{sonuc.hata}</p>
                <p className="text-xs text-gray-500 mt-0.5">Hata</p>
              </div>
            </div>
            <Link href="/dashboard/urunler"
              className="block mt-4 text-center text-sm text-blue-600 hover:underline">
              Urunleri Goruntule
            </Link>
          </div>
        )}

        {/* Kaydet Butonu */}
        {!yuklendi && (mod === 'excel' ? satirlar.length > 0 : tekliList.length > 0) && (
          <button
            onClick={kaydet}
            disabled={yukleniyor}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300
                       text-white font-medium py-4 rounded-2xl text-sm transition-colors">
            {yukleniyor
              ? 'Yukleniyor...'
              : mod === 'excel'
                ? satirlar.filter(s => s.durum !== 'hata').length + ' urunu sisteme aktar'
                : tekliList.length + ' barkodu sisteme ekle'}
          </button>
        )}

      </main>
    </div>
  )
}