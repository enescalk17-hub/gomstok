'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function YeniUrunPage() {
  const router = useRouter()
  const supabase = createClient()

  const [koleksiyonlar, setKoleksiyonlar] = useState<any[]>([])
  const [modeller, setModeller] = useState<any[]>([])
  const [renkler, setRenkler] = useState<any[]>([])
  const [bedenler, setBedenler] = useState<any[]>([])

  const [secilen, setSecilen] = useState({
    koleksiyon_id: '',
    model_id: '',
    renk_id: '',
    beden_id: '',
  })

  const [onizleme, setOnizleme] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState('')
  const [basari, setBasari] = useState('')

  useEffect(() => {
    async function getir() {
      const [k, m, r, b] = await Promise.all([
        supabase.from('koleksiyonlar').select('*').eq('aktif', true),
        supabase.from('modeller').select('*').eq('aktif', true),
        supabase.from('renkler').select('*').eq('aktif', true),
        supabase.from('bedenler').select('*').eq('aktif', true).order('sira'),
      ])
      setKoleksiyonlar(k.data || [])
      setModeller(m.data || [])
      setRenkler(r.data || [])
      setBedenler(b.data || [])
    }
    getir()
  }, [])

  // Barkod önizlemesi otomatik güncellenir
  useEffect(() => {
    const k = koleksiyonlar.find(x => x.id === secilen.koleksiyon_id)
    const m = modeller.find(x => x.id === secilen.model_id)
    const r = renkler.find(x => x.id === secilen.renk_id)
    const b = bedenler.find(x => x.id === secilen.beden_id)
    if (k && m && r && b) {
      setOnizleme(`${k.kod}${m.kod}${r.kod}${b.kod}`)
    } else {
      setOnizleme('')
    }
  }, [secilen, koleksiyonlar, modeller, renkler, bedenler])

  async function kaydet(e: React.FormEvent) {
    e.preventDefault()
    if (!onizleme) { setHata('Tüm alanları seçin.'); return }
    setYukleniyor(true)
    setHata('')

    const { error } = await supabase.from('urunler').insert({
      ...secilen,
      barkod: onizleme,
      aktif: true,
    })

    if (error) {
      setHata(error.message.includes('unique') 
        ? 'Bu ürün zaten mevcut.' 
        : 'Bir hata oluştu.')
      setYukleniyor(false)
      return
    }

    setBasari(`✅ Ürün oluşturuldu! Barkod: ${onizleme}`)
    setSecilen({ koleksiyon_id: '', model_id: '', renk_id: '', beden_id: '' })
    setYukleniyor(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <Link href="/dashboard/urunler"
            className="text-gray-400 hover:text-gray-600 text-xl">←</Link>
          <div>
            <h1 className="font-semibold text-gray-900 text-sm">Yeni Ürün</h1>
            <p className="text-xs text-gray-500">SKU & Barkod Oluştur</p>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4">
        <form onSubmit={kaydet} className="space-y-4">

          {/* Barkod Önizleme */}
          <div className="bg-blue-600 rounded-2xl p-6 text-center text-white">
            <p className="text-xs opacity-70 mb-2 uppercase tracking-wider">
              Üretilecek Barkod
            </p>
            <p className="text-4xl font-mono font-bold tracking-widest">
              {onizleme || '????????'}
            </p>
            <p className="text-xs opacity-60 mt-2">
              Koleksiyon + Model + Renk + Beden
            </p>
          </div>

          {/* Seçim Alanları */}
          {[
            { label: '🗓️ Koleksiyon', field: 'koleksiyon_id', liste: koleksiyonlar },
            { label: '👔 Model', field: 'model_id', liste: modeller },
            { label: '🎨 Renk', field: 'renk_id', liste: renkler },
            { label: '📏 Beden', field: 'beden_id', liste: bedenler },
          ].map(({ label, field, liste }) => (
            <div key={field} className="bg-white rounded-2xl border border-gray-200 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {label}
              </label>
              {liste.length === 0 ? (
                <p className="text-xs text-red-500">
                  Önce bu kategoriyi tanımlamalısın →{' '}
                  <Link href={`/dashboard/urunler/${field.replace('_id','') + 'ler'}`}
                    className="underline">buradan ekle</Link>
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {liste.map((item: any) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSecilen(s => ({ ...s, [field]: item.id }))}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors
                        ${secilen[field as keyof typeof secilen] === item.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}>
                      {item.ad}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {hata && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-red-600 text-sm">{hata}</p>
            </div>
          )}
          {basari && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <p className="text-green-700 text-sm">{basari}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={yukleniyor || !onizleme}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 
                       text-white font-medium py-4 rounded-2xl transition-colors text-sm">
            {yukleniyor ? 'Kaydediliyor...' : `Ürün Oluştur ${onizleme ? `(${onizleme})` : ''}`}
          </button>
        </form>
      </main>
    </div>
  )
}