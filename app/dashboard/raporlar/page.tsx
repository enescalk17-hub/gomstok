'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Hareket = {
  id: string
  hareket_tipi: string
  miktar: number
  tarih: string
  aciklama: string | null
  urun: {
    barkod: string
    model: { ad: string }
    renk: { ad: string }
    beden: { ad: string }
  }
  lokasyon: { ad: string; tip: string }
}

type StokOzet = {
  barkod: string
  koleksiyon: string
  model: string
  renk: string
  beden: string
  atolye: number
  magaza: number
  depo: number
  yolda: number
  toplam: number
}

export default function RaporlarPage() {
  const supabase = createClient()
  const [aktifSekme, setAktifSekme] = useState<'ozet' | 'hareketler'>('ozet')
  const [ozet, setOzet] = useState<StokOzet[]>([])
  const [hareketler, setHareketler] = useState<Hareket[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [aramaOzet, setAramaOzet] = useState('')

  useEffect(() => {
    getirOzet()
    getirHareketler()
  }, [])

  async function getirOzet() {
    const { data } = await supabase
      .from('genel_stok_ozet')
      .select('*')
    setOzet((data as StokOzet[]) || [])
    setYukleniyor(false)
  }

  async function getirHareketler() {
    const { data } = await supabase
      .from('stok_hareketleri')
      .select(`
        id, hareket_tipi, miktar, tarih, aciklama,
        urun:urunler(
          barkod,
          model:modeller(ad),
          renk:renkler(ad),
          beden:bedenler(ad)
        ),
        lokasyon:lokasyonlar(ad, tip)
      `)
      .order('tarih', { ascending: false })
      .limit(100)
    setHareketler((data as unknown as Hareket[]) || [])
  }

  const filtreliOzet = ozet.filter(s =>
    !aramaOzet ||
    s.model.toLowerCase().includes(aramaOzet.toLowerCase()) ||
    s.renk.toLowerCase().includes(aramaOzet.toLowerCase()) ||
    s.barkod.includes(aramaOzet)
  )

  // Genel toplamlar
  const genelToplam = {
    atolye: ozet.reduce((t, s) => t + (s.atolye || 0), 0),
    magaza: ozet.reduce((t, s) => t + (s.magaza || 0), 0),
    depo:   ozet.reduce((t, s) => t + (s.depo   || 0), 0),
    yolda:  ozet.reduce((t, s) => t + (s.yolda  || 0), 0),
    toplam: ozet.reduce((t, s) => t + (s.toplam || 0), 0),
  }

  function hareketRenk(tip: string) {
    const map: Record<string, string> = {
      giris:           'bg-green-50 text-green-700',
      cikis:           'bg-red-50 text-red-600',
      transfer_cikis:  'bg-amber-50 text-amber-700',
      transfer_giris:  'bg-blue-50 text-blue-700',
      satis:           'bg-purple-50 text-purple-700',
      fire:            'bg-red-100 text-red-700',
      sayim:           'bg-gray-100 text-gray-600',
    }
    return map[tip] || 'bg-gray-100 text-gray-600'
  }

  function hareketAd(tip: string) {
    const map: Record<string, string> = {
      giris:           'Stok Girisi',
      cikis:           'Stok Cikisi',
      transfer_cikis:  'Transfer Gonderildi',
      transfer_giris:  'Transfer Teslim',
      satis:           'Satis',
      fire:            'Fire',
      sayim:           'Sayim Duzeltme',
      iade:            'Iade',
    }
    return map[tip] || tip
  }

  function tarihFormat(t: string) {
    return new Date(t).toLocaleDateString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  function excelIndir() {
    const basliklar = ['Barkod', 'Koleksiyon', 'Model', 'Renk', 'Beden',
                       'Atolye', 'Magaza', 'Depo', 'Yolda', 'Toplam']
    const satirlar = filtreliOzet.map(s => [
      s.barkod, s.koleksiyon, s.model, s.renk, s.beden,
      s.atolye, s.magaza, s.depo, s.yolda, s.toplam,
    ])
    const icerik = [basliklar, ...satirlar]
      .map(satir => satir.join('\t'))
      .join('\n')
    const blob = new Blob(['\ufeff' + icerik], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'gomstok-stok-' + new Date().toISOString().slice(0, 10) + '.xls'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-xl">
              &larr;
            </Link>
            <div>
              <h1 className="font-semibold text-gray-900 text-sm">Raporlar</h1>
              <p className="text-xs text-gray-500">Stok ozeti ve hareketler</p>
            </div>
          </div>
          {aktifSekme === 'ozet' && (
            <button
              onClick={excelIndir}
              className="bg-green-600 hover:bg-green-700 text-white text-xs
                         font-medium px-4 py-2 rounded-xl transition-colors">
              Excel Indir
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">

        {/* Genel Ozet Kartlari */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { ad: 'Atolye',      deger: genelToplam.atolye, renk: 'blue'   },
            { ad: 'Magaza',      deger: genelToplam.magaza, renk: 'green'  },
            { ad: 'Depo',        deger: genelToplam.depo,   renk: 'purple' },
            { ad: 'Yolda',       deger: genelToplam.yolda,  renk: 'amber'  },
          ].map(k => (
            <div key={k.ad}
              className={`rounded-2xl p-4 border
                ${k.renk === 'blue'   ? 'bg-blue-50 border-blue-100' : ''}
                ${k.renk === 'green'  ? 'bg-green-50 border-green-100' : ''}
                ${k.renk === 'purple' ? 'bg-purple-50 border-purple-100' : ''}
                ${k.renk === 'amber'  ? 'bg-amber-50 border-amber-100' : ''}
              `}>
              <p className={`text-2xl font-bold
                ${k.renk === 'blue'   ? 'text-blue-700' : ''}
                ${k.renk === 'green'  ? 'text-green-700' : ''}
                ${k.renk === 'purple' ? 'text-purple-700' : ''}
                ${k.renk === 'amber'  ? 'text-amber-700' : ''}
              `}>{k.deger}</p>
              <p className={`text-xs font-medium mt-0.5
                ${k.renk === 'blue'   ? 'text-blue-600' : ''}
                ${k.renk === 'green'  ? 'text-green-600' : ''}
                ${k.renk === 'purple' ? 'text-purple-600' : ''}
                ${k.renk === 'amber'  ? 'text-amber-600' : ''}
              `}>{k.ad}</p>
            </div>
          ))}
        </div>

        {/* Toplam */}
        <div className="bg-gray-900 text-white rounded-2xl p-4 flex items-center justify-between">
          <p className="text-sm font-medium">Toplam Stok</p>
          <p className="text-3xl font-bold">{genelToplam.toplam}</p>
        </div>

        {/* Sekmeler */}
        <div className="flex gap-2">
          <button
            onClick={() => setAktifSekme('ozet')}
            className={aktifSekme === 'ozet'
              ? 'px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white'
              : 'px-4 py-2 rounded-xl text-sm font-medium bg-white text-gray-600 border border-gray-200'}>
            Stok Ozeti
          </button>
          <button
            onClick={() => setAktifSekme('hareketler')}
            className={aktifSekme === 'hareketler'
              ? 'px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white'
              : 'px-4 py-2 rounded-xl text-sm font-medium bg-white text-gray-600 border border-gray-200'}>
            Hareketler
          </button>
        </div>

        {/* STOK OZETI */}
        {aktifSekme === 'ozet' && (
          <div className="space-y-3">
            <input
              value={aramaOzet}
              onChange={e => setAramaOzet(e.target.value)}
              placeholder="Model, renk veya barkod ara..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white
                         text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {yukleniyor ? (
              <div className="text-center py-8 text-gray-400 text-sm">Yukleniyor...</div>
            ) : filtreliOzet.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">Kayit bulunamadi.</div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {/* Tablo Baslik */}
                <div className="hidden sm:grid grid-cols-9 px-4 py-2 border-b border-gray-100
                                text-xs text-gray-400 font-medium uppercase tracking-wide">
                  <div className="col-span-3">Urun</div>
                  <div className="text-center">Atolye</div>
                  <div className="text-center">Magaza</div>
                  <div className="text-center">Depo</div>
                  <div className="text-center">Yolda</div>
                  <div className="col-span-2 text-right">Toplam</div>
                </div>

                {filtreliOzet.map((satir, i) => (
                  <div key={satir.barkod}
                    className={i < filtreliOzet.length - 1
                      ? 'px-4 py-3 border-b border-gray-50'
                      : 'px-4 py-3'}>

                    {/* Mobil */}
                    <div className="sm:hidden">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {satir.model} — {satir.renk}
                          </p>
                          <p className="text-xs text-gray-400 font-mono">{satir.barkod}</p>
                        </div>
                        <span className="text-lg font-bold text-gray-900">{satir.toplam}</span>
                      </div>
                      <div className="flex gap-2 text-xs">
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">
                          A:{satir.atolye}
                        </span>
                        <span className="bg-green-50 text-green-700 px-2 py-1 rounded-lg">
                          M:{satir.magaza}
                        </span>
                        <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-lg">
                          D:{satir.depo}
                        </span>
                        {satir.yolda > 0 && (
                          <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-lg">
                            Y:{satir.yolda}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Masaustu */}
                    <div className="hidden sm:grid grid-cols-9 items-center">
                      <div className="col-span-3">
                        <p className="text-sm font-medium text-gray-900">
                          {satir.model} — {satir.renk}
                          <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md font-mono">
                            {satir.beden}
                          </span>
                        </p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{satir.barkod}</p>
                      </div>
                      <div className="text-center text-sm font-medium text-blue-700">
                        {satir.atolye || 0}
                      </div>
                      <div className="text-center text-sm font-medium text-green-700">
                        {satir.magaza || 0}
                      </div>
                      <div className="text-center text-sm font-medium text-purple-700">
                        {satir.depo || 0}
                      </div>
                      <div className="text-center text-sm font-medium text-amber-600">
                        {satir.yolda || 0}
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-sm font-bold text-gray-900">{satir.toplam}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* HAREKETLER */}
        {aktifSekme === 'hareketler' && (
          <div className="space-y-2">
            {hareketler.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">Henuz hareket yok.</div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex justify-between
                                text-xs text-gray-500 font-medium">
                  <span>SON 100 HAREKET</span>
                  <span>{hareketler.length} kayit</span>
                </div>
                {hareketler.map((h, i) => (
                  <div key={h.id}
                    className={i < hareketler.length - 1
                      ? 'flex items-center justify-between px-4 py-3 border-b border-gray-50'
                      : 'flex items-center justify-between px-4 py-3'}>
                    <div className="flex items-center gap-3">
                      <span className={hareketRenk(h.hareket_tipi) +
                        ' text-xs font-medium px-2.5 py-1 rounded-lg whitespace-nowrap'}>
                        {hareketAd(h.hareket_tipi)}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {h.urun?.model?.ad} — {h.urun?.renk?.ad} {h.urun?.beden?.ad}
                        </p>
                        <p className="text-xs text-gray-400">
                          {h.lokasyon?.ad} &bull; {tarihFormat(h.tarih)}
                        </p>
                      </div>
                    </div>
                    <span className={
                      h.miktar > 0
                        ? 'text-sm font-bold text-green-600'
                        : 'text-sm font-bold text-red-500'}>
                      {h.miktar > 0 ? '+' : ''}{h.miktar}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}


