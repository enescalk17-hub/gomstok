'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type StokSatir = {
  lokasyon: string
  lokasyon_tip: string
  model: string
  renk: string
  beden: string
  barkod: string
  miktar: number
  urun_id: string
  lokasyon_id: string
}

export default function StokPage() {
  const supabase = createClient()
  const [stok, setStok] = useState<StokSatir[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [secilenLokasyon, setSecilenLokasyon] = useState('hepsi')
  const [arama, setArama] = useState('')

  useEffect(() => {
    async function getir() {
      const { data } = await supabase.from('lokasyon_stok').select('*')
      setStok((data as StokSatir[]) || [])
      setYukleniyor(false)
    }
    getir()
  }, [])

  const toplamlar = {
    hepsi:  stok.reduce((t, s) => t + s.miktar, 0),
    atolye: stok.filter(s => s.lokasyon_tip === 'atolye').reduce((t, s) => t + s.miktar, 0),
    magaza: stok.filter(s => s.lokasyon_tip === 'magaza').reduce((t, s) => t + s.miktar, 0),
    depo:   stok.filter(s => s.lokasyon_tip === 'depo').reduce((t, s) => t + s.miktar, 0),
    yolda:  stok.filter(s => s.lokasyon_tip === 'yolda').reduce((t, s) => t + s.miktar, 0),
  }

  const sekmeler = [
    { tip: 'hepsi',  ad: 'Tumu',   toplam: toplamlar.hepsi },
    { tip: 'atolye', ad: 'Atolye', toplam: toplamlar.atolye },
    { tip: 'magaza', ad: 'Magaza', toplam: toplamlar.magaza },
    { tip: 'depo',   ad: 'Depo',   toplam: toplamlar.depo },
    { tip: 'yolda',  ad: 'Yolda',  toplam: toplamlar.yolda },
  ]

  const filtrelenmis = stok.filter(s => {
    const lokOk = secilenLokasyon === 'hepsi' || s.lokasyon_tip === secilenLokasyon
    const aramaOk = !arama ||
      s.barkod.includes(arama) ||
      s.model.toLowerCase().includes(arama.toLowerCase()) ||
      s.renk.toLowerCase().includes(arama.toLowerCase())
    return lokOk && aramaOk
  })

  function miktarRenk(miktar: number) {
    if (miktar === 0) return 'bg-red-50 text-red-600'
    if (miktar < 5)  return 'bg-amber-50 text-amber-600'
    return 'bg-green-50 text-green-700'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-xl">
              leftarrow
            </Link>
            <div>
              <h1 className="font-semibold text-gray-900 text-sm">Stok</h1>
              <p className="text-xs text-gray-500">Lokasyon bazli gorunum</p>
            </div>
          </div>
          <Link
            href="/dashboard/stok/giris"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-2 rounded-xl">
            + Stok Girisi
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">

        {/* Sekmeler */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {sekmeler.map(s => (
            <button
              key={s.tip}
              onClick={() => setSecilenLokasyon(s.tip)}
              className={
                secilenLokasyon === s.tip
                  ? 'flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white'
                  : 'flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium bg-white text-gray-600 border border-gray-200'
              }>
              {s.ad} ({s.toplam})
            </button>
          ))}
        </div>

        {/* Arama */}
        <input
          value={arama}
          onChange={e => setArama(e.target.value)}
          placeholder="Barkod, model veya renk ara..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Liste */}
        {yukleniyor ? (
          <div className="text-center py-12 text-gray-400 text-sm">Yukleniyor...</div>
        ) : filtrelenmis.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">Stok bulunamadi.</p>
            <Link href="/dashboard/stok/giris" className="text-blue-600 text-sm mt-2 inline-block">
              Stok girisi yap
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between text-xs text-gray-500 font-medium">
              <span>URUN</span>
              <span>{filtrelenmis.length} satir</span>
            </div>
            {filtrelenmis.map((satir, i) => (
              <div
                key={satir.urun_id + satir.lokasyon_id}
                className={i < filtrelenmis.length - 1 ? 'flex items-center justify-between px-4 py-3 border-b border-gray-50' : 'flex items-center justify-between px-4 py-3'}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xs font-bold font-mono text-blue-700">
                    {satir.beden}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {satir.model} — {satir.renk}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">{satir.barkod}</p>
                    {secilenLokasyon === 'hepsi' && (
                      <p className="text-xs text-gray-400">{satir.lokasyon}</p>
                    )}
                  </div>
                </div>
                <span className={miktarRenk(satir.miktar) + ' text-sm font-bold px-3 py-1 rounded-xl'}>
                  {satir.miktar}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}