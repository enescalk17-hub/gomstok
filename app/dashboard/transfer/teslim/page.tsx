'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

type KoliDetay = {
  id: string
  koli_no: string
  koli_barkod: string
  toplam_adet: number
  kaynak: { ad: string }
  hedef: { ad: string; id: string }
  hedef_lokasyon_id: string
  icerik: {
    id: string
    planlanan_adet: number
    kabul_edilen_adet: number | null
    durum: string
    urun: {
      id: string
      barkod: string
      model: { ad: string }
      renk: { ad: string }
      beden: { ad: string }
    }
  }[]
}

function TeslimIci() {
  const supabase = createClient()
  const router = useRouter()
  const params = useSearchParams()
  const baslangicBarkod = params.get('koli') || ''

  const [koliBarkod, setKoliBarkod] = useState(baslangicBarkod)
  const [koli, setKoli] = useState<KoliDetay | null>(null)
  const [icerik, setIcerik] = useState<KoliDetay['icerik']>([])
  const [hata, setHata] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [tamamlandi, setTamamlandi] = useState(false)

  useEffect(() => {
    if (baslangicBarkod) koliAra(baslangicBarkod)
  }, [])

  async function koliAra(barkod?: string) {
    const arananBarkod = barkod || koliBarkod
    if (!arananBarkod.trim()) return
    setHata('')
    setKoli(null)

    const { data } = await supabase
      .from('koliler')
      .select(`
        id, koli_no, koli_barkod, toplam_adet, hedef_lokasyon_id,
        kaynak:lokasyonlar!kaynak_lokasyon_id(ad),
        hedef:lokasyonlar!hedef_lokasyon_id(ad, id),
        icerik:koli_icerik(
          id, planlanan_adet, kabul_edilen_adet, durum,
          urun:urunler(
            id, barkod,
            model:modeller(ad),
            renk:renkler(ad),
            beden:bedenler(ad)
          )
        )
      `)
      .eq('koli_barkod', arananBarkod.trim())
      .eq('durum', 'yolda')
      .single()

    if (!data) {
      setHata('Yolda olan koli bulunamadi. Barkodu kontrol edin.')
      return
    }

    const koliData = data as unknown as KoliDetay
    setKoli(koliData)
    setIcerik(koliData.icerik.map(ic => ({
      ...ic,
      kabul_edilen_adet: ic.planlanan_adet,
    })))
  }

  function adetGuncelle(id: string, adet: number, max: number) {
    setIcerik(prev => prev.map(ic =>
      ic.id === id
        ? { ...ic, kabul_edilen_adet: Math.max(0, Math.min(adet, max)) }
        : ic
    ))
  }

  function durumGuncelle(id: string, durum: string) {
    setIcerik(prev => prev.map(ic =>
      ic.id === id ? { ...ic, durum } : ic
    ))
  }

  async function teslimAl() {
    if (!koli) return
    setYukleniyor(true)
    setHata('')
    const { data: { user } } = await supabase.auth.getUser()

    const { data: yoldaLok } = await supabase
      .from('lokasyonlar').select('id').eq('tip', 'yolda').single()
    const { data: fireLok } = await supabase
      .from('lokasyonlar').select('id').eq('tip', 'fire').single()

    for (const ic of icerik) {
      const kabulAdet = ic.kabul_edilen_adet || 0
      const fireAdet = ic.planlanan_adet - kabulAdet

      // Koli içeriğini güncelle
      await supabase.from('koli_icerik')
        .update({ kabul_edilen_adet: kabulAdet, durum: ic.durum })
        .eq('id', ic.id)

      // Yolda stoktan düş
      if (yoldaLok) {
        const { data: yoldaStok } = await supabase
          .from('stok').select('id, miktar')
          .eq('urun_id', ic.urun.id)
          .eq('lokasyon_id', yoldaLok.id)
          .single()
        if (yoldaStok) {
          await supabase.from('stok')
            .update({ miktar: Math.max(0, yoldaStok.miktar - ic.planlanan_adet) })
            .eq('id', yoldaStok.id)
        }
      }

      // Hedefe ekle
      if (kabulAdet > 0) {
        const { data: hedefStok } = await supabase
          .from('stok').select('id, miktar')
          .eq('urun_id', ic.urun.id)
          .eq('lokasyon_id', koli.hedef_lokasyon_id)
          .single()
        if (hedefStok) {
          await supabase.from('stok')
            .update({ miktar: hedefStok.miktar + kabulAdet })
            .eq('id', hedefStok.id)
        } else {
          await supabase.from('stok')
            .insert({ urun_id: ic.urun.id, lokasyon_id: koli.hedef_lokasyon_id, miktar: kabulAdet })
        }
        await supabase.from('stok_hareketleri').insert({
          urun_id: ic.urun.id,
          lokasyon_id: koli.hedef_lokasyon_id,
          hareket_tipi: 'transfer_giris',
          miktar: kabulAdet,
          koli_id: koli.id,
          yapan_id: user?.id,
          aciklama: koli.koli_no + ' teslim alindi',
        })
      }

      // Fire varsa
      if (fireAdet > 0 && fireLok) {
        const { data: fireStok } = await supabase
          .from('stok').select('id, miktar')
          .eq('urun_id', ic.urun.id)
          .eq('lokasyon_id', fireLok.id)
          .single()
        if (fireStok) {
          await supabase.from('stok')
            .update({ miktar: fireStok.miktar + fireAdet })
            .eq('id', fireStok.id)
        } else {
          await supabase.from('stok')
            .insert({ urun_id: ic.urun.id, lokasyon_id: fireLok.id, miktar: fireAdet })
        }
      }
    }

    // Koli durumunu güncelle
    const kismiKabul = icerik.some(ic => (ic.kabul_edilen_adet || 0) < ic.planlanan_adet)
    await supabase.from('koliler')
      .update({
        durum: kismiKabul ? 'kismi_kabul' : 'teslim_edildi',
        teslim_alan_id: user?.id,
        teslim_tarihi: new Date().toISOString(),
      })
      .eq('id', koli.id)

    setTamamlandi(true)
    setYukleniyor(false)
  }

  if (tamamlandi) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-sm w-full">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Teslim Alindi!</h2>
          <p className="text-gray-500 text-sm mb-6">
            Koli basariyla teslim alindi ve stoklar guncellendi.
          </p>
          <Link href="/dashboard/transfer"
            className="block w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-medium text-center">
            Transferlere Don
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <Link href="/dashboard/transfer" className="text-gray-400 hover:text-gray-600 text-xl">
            &larr;
          </Link>
          <div>
            <h1 className="font-semibold text-gray-900 text-sm">Teslim Al</h1>
            <p className="text-xs text-gray-500">Koli barkodunu okut</p>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4">

        {/* Barkod Girişi */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Koli Barkodu
          </label>
          <div className="flex gap-2">
            <input
              value={koliBarkod}
              onChange={e => setKoliBarkod(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && koliAra()}
              placeholder="Koli barkodunu okut veya yaz..."
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button onClick={() => koliAra()}
              className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700">
              Ara
            </button>
          </div>
        </div>

        {hata && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-600 text-sm">{hata}</p>
          </div>
        )}

        {/* Koli Detayı */}
        {koli && (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="font-semibold text-amber-900 text-sm">{koli.koli_no}</p>
              <p className="text-xs text-amber-700 mt-1">
                {koli.kaynak?.ad} &rarr; {(koli.hedef as any)?.ad} &bull; {koli.toplam_adet} urun
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 text-xs text-gray-500 font-medium">
                URUNLERI KONTROL ET
              </div>
              {icerik.map((ic, i) => (
                <div key={ic.id}
                  className={i < icerik.length - 1 ? 'p-4 border-b border-gray-50' : 'p-4'}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center text-xs font-bold font-mono text-blue-700">
                        {ic.urun.beden?.ad}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {ic.urun.model?.ad} — {ic.urun.renk?.ad}
                        </p>
                        <p className="text-xs text-gray-400">Beklenen: {ic.planlanan_adet} adet</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-xs text-gray-500">Kabul:</span>
                      <button
                        onClick={() => adetGuncelle(ic.id, (ic.kabul_edilen_adet || 0) - 1, ic.planlanan_adet)}
                        className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 font-bold flex items-center justify-center">
                        -
                      </button>
                      <span className="w-8 text-center font-bold text-sm text-gray-900">
                        {ic.kabul_edilen_adet}
                      </span>
                      <button
                        onClick={() => adetGuncelle(ic.id, (ic.kabul_edilen_adet || 0) + 1, ic.planlanan_adet)}
                        className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 font-bold flex items-center justify-center">
                        +
                      </button>
                    </div>

                    {(ic.kabul_edilen_adet || 0) < ic.planlanan_adet && (
                      <select
                        value={ic.durum}
                        onChange={e => durumGuncelle(ic.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none">
                        <option value="fire">Fire/Hasarli</option>
                        <option value="iade">Atölyeye Iade</option>
                        <option value="bekliyor">Sonra Gelecek</option>
                      </select>
                    )}

                    {(ic.kabul_edilen_adet || 0) === ic.planlanan_adet && (
                      <span className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-lg font-medium">
                        Tamam
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={teslimAl}
              disabled={yukleniyor}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-medium py-4 rounded-2xl text-sm transition-colors">
              {yukleniyor ? 'Isleniyor...' : 'Teslim Almayi Onayla'}
            </button>
          </>
        )}
      </main>
    </div>
  )
}

export default function TeslimPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">Yukleniyor...</div>}>
      <TeslimIci />
    </Suspense>
  )
}