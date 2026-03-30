'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Urun = {
  id: string
  barkod: string
  koleksiyon: { ad: string; kod: string }
  model: { ad: string }
  renk: { ad: string }
  beden: { ad: string }
}

export default function UrunlerPage() {
  const [urunler, setUrunler] = useState<Urun[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [arama, setArama] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function getir() {
      const { data } = await supabase
        .from('urunler')
        .select(`
          id, barkod,
          koleksiyon:koleksiyonlar(ad, kod),
          model:modeller(ad),
          renk:renkler(ad),
          beden:bedenler(ad)
        `)
        .eq('aktif', true)
        .order('barkod')
      setUrunler((data as unknown as Urun[]) || [])
      setYukleniyor(false)
    }
    getir()
  }, [])

  const filtrelenmis = urunler.filter(u =>
    u.barkod.includes(arama) ||
    u.model?.ad?.toLowerCase().includes(arama.toLowerCase()) ||
    u.renk?.ad?.toLowerCase().includes(arama.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard"
              className="text-gray-400 hover:text-gray-600 text-xl">←</Link>
            <div>
              <h1 className="font-semibold text-gray-900 text-sm">Ürünler</h1>
              <p className="text-xs text-gray-500">SKU & Barkod Yönetimi</p>
            </div>
          </div>
          <Link href="/dashboard/urunler/yeni"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs 
                       font-medium px-4 py-2 rounded-xl transition-colors">
            + Yeni Ürün
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Arama */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            value={arama}
            onChange={e => setArama(e.target.value)}
            placeholder="Barkod, model veya renk ara..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 
                       bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 
                       text-sm text-gray-900"
          />
        </div>

        {/* Tanımlama Kartları */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link href="/dashboard/urunler/koleksiyonlar"
            className="bg-white border border-gray-200 rounded-xl p-3 
                       hover:border-purple-300 transition-colors block text-center">
            <div className="text-lg mb-1">🗓️</div>
            <div className="text-xs font-medium text-gray-700">Koleksiyonlar</div>
          </Link>
          <Link href="/dashboard/urunler/modeller"
            className="bg-white border border-gray-200 rounded-xl p-3 
                       hover:border-purple-300 transition-colors block text-center">
            <div className="text-lg mb-1">👔</div>
            <div className="text-xs font-medium text-gray-700">Modeller</div>
          </Link>
          <Link href="/dashboard/urunler/renkler"
            className="bg-white border border-gray-200 rounded-xl p-3 
                       hover:border-purple-300 transition-colors block text-center">
            <div className="text-lg mb-1">🎨</div>
            <div className="text-xs font-medium text-gray-700">Renkler</div>
          </Link>
          <Link href="/dashboard/urunler/bedenler"
            className="bg-white border border-gray-200 rounded-xl p-3 
                       hover:border-purple-300 transition-colors block text-center">
            <div className="text-lg mb-1">📏</div>
            <div className="text-xs font-medium text-gray-700">Bedenler</div>
          </Link>
        </div>

        {/* Ürün Listesi */}
        {yukleniyor ? (
          <div className="text-center py-12 text-gray-400 text-sm">Yükleniyor...</div>
        ) : filtrelenmis.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📦</div>
            <p className="text-gray-500 text-sm">
              {arama ? 'Arama sonucu bulunamadı.' : 'Henüz ürün tanımlanmamış.'}
            </p>
            {!arama && (
              <Link href="/dashboard/urunler/yeni"
                className="inline-block mt-3 text-blue-600 text-sm hover:underline">
                İlk ürünü ekle →
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center 
                            justify-between text-xs text-gray-500 font-medium">
              <span>ÜRÜN</span>
              <span>{filtrelenmis.length} adet</span>
            </div>
            {filtrelenmis.map((urun, i) => (
              <div key={urun.id}
                className={`flex items-center justify-between px-4 py-3 
                            ${i < filtrelenmis.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center 
                                  justify-center text-sm font-mono text-blue-700 font-bold">
                    {urun.beden?.ad}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {urun.model?.ad} — {urun.renk?.ad}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">{urun.barkod}</div>
                  </div>
                </div>
                <span className="text-xs bg-purple-50 text-purple-700 
                                 px-2 py-1 rounded-lg font-medium">
                  {urun.koleksiyon?.ad}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}