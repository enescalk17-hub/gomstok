'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import BarkodOkuyucu from '@/components/BarkodOkuyucu'

type KoliSatir = {
  urun_id: string
  barkod: string
  model: string
  renk: string
  beden: string
  adet: number
  mevcutStok: number
}

export default function YeniTransferPage() {
  const supabase = createClient()
  const router = useRouter()

  const [lokasyonlar, setLokasyonlar] = useState<any[]>([])
  const [kaynakId, setKaynakId] = useState('')
  const [hedefId, setHedefId] = useState('')
  const [barkod, setBarkod] = useState('')
  const [satirlar, setSatirlar] = useState<KoliSatir[]>([])
  const [hata, setHata] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [kameraAcik, setKameraAcik] = useState(false)

  useEffect(() => {
    async function getir() {
      const { data } = await supabase
        .from('lokasyonlar')
        .select('*')
        .in('tip', ['atolye', 'magaza', 'depo'])
        .eq('aktif', true)
      setLokasyonlar(data || [])
      const atolye = data?.find((l: any) => l.tip === 'atolye')
      if (atolye) setKaynakId(atolye.id)
    }
    getir()
  }, [])

  async function barkodEkle(okunanBarkod?: string) {
    const b = (okunanBarkod || barkod).trim()
    if (!b || !kaynakId) return
    setHata('')

    if (satirlar.find(s => s.barkod === b)) {
      setSatirlar(prev => prev.map(s =>
        s.barkod === b ? { ...s, adet: s.adet + 1 } : s
      ))
      setBarkod('')
      return
    }

    const { data: urun } = await supabase
      .from('urunler')
      .select(`
        id, barkod, dis_barkod,
        model:modeller(ad),
        renk:renkler(ad),
        beden:bedenler(ad)
      `)
      .or(`barkod.eq.${b},dis_barkod.eq.${b}`)
      .single()

    if (!urun) { setHata('Urun bulunamadi: ' + b); return }

    const { data: stokKayit } = await supabase
      .from('stok')
      .select('miktar')
      .eq('urun_id', urun.id)
      .eq('lokasyon_id', kaynakId)
      .single()

    const mevcutStok = stokKayit?.miktar || 0
    if (mevcutStok === 0) {
      setHata('Bu urunden kaynak lokasyonda stok yok!')
      return
    }

    setSatirlar(prev => [...prev, {
      urun_id: urun.id,
      barkod: b,
      model: (urun.model as any)?.ad || '',
      renk: (urun.renk as any)?.ad || '',
      beden: (urun.beden as any)?.ad || '',
      adet: 1,
      mevcutStok,
    }])
    setBarkod('')
  }

  function adetGuncelle(barkod: string, yeniAdet: number) {
    setSatirlar(prev => prev.map(s => {
      if (s.barkod !== barkod) return s
      return { ...s, adet: Math.max(1, Math.min(yeniAdet, s.mevcutStok)) }
    }))
  }

  function satirSil(barkod: string) {
    setSatirlar(prev => prev.filter(s => s.barkod !== barkod))
  }

  function koliNoUret() {
    const tarih = new Date()
    const rnd = Math.floor(Math.random() * 9000) + 1000
    return 'KL-' + tarih.getFullYear() + '-' + rnd
  }

  async function koliOlusturVeGonder() {
    if (satirlar.length === 0) { setHata('Koli bos olamaz.'); return }
    if (!kaynakId || !hedefId) { setHata('Kaynak ve hedef secin.'); return }
    if (kaynakId === hedefId) { setHata('Kaynak ve hedef ayni olamaz.'); return }
    setYukleniyor(true)
    setHata('')

    const koliNo = koliNoUret()
    const koliBarkod = 'KB' + Date.now()
    const toplamAdet = satirlar.reduce((t, s) => t + s.adet, 0)

    const { data: koli, error: koliHata } = await supabase
      .from('koliler')
      .insert({
        koli_no: koliNo,
        koli_barkod: koliBarkod,
        kaynak_lokasyon_id: kaynakId,
        hedef_lokasyon_id: hedefId,
        durum: 'yolda',
        toplam_adet: toplamAdet,
        gonderilme: new Date().toISOString(),
      })
      .select()
      .single()

    if (koliHata || !koli) {
      setHata('Koli olusturulamadi: ' + (koliHata?.message || ''))
      setYukleniyor(false)
      return
    }

    const { data: yoldaLok } = await supabase
      .from('lokasyonlar')
      .select('id')
      .eq('tip', 'yolda')
      .single()

    for (const satir of satirlar) {
      await supabase.from('koli_icerik').insert({
        koli_id: koli.id,
        urun_id: satir.urun_id,
        planlanan_adet: satir.adet,
        durum: 'bekliyor',
      })

      const { data: mevcut } = await supabase
        .from('stok')
        .select('id, miktar')
        .eq('urun_id', satir.urun_id)
        .eq('lokasyon_id', kaynakId)
        .single()

      if (mevcut) {
        await supabase.from('stok')
          .update({ miktar: mevcut.miktar - satir.adet })
          .eq('id', mevcut.id)
      }

      if (yoldaLok) {
        const { data: yoldaMevcut } = await supabase
          .from('stok')
          .select('id, miktar')
          .eq('urun_id', satir.urun_id)
          .eq('lokasyon_id', yoldaLok.id)
          .single()

        if (yoldaMevcut) {
          await supabase.from('stok')
            .update({ miktar: yoldaMevcut.miktar + satir.adet })
            .eq('id', yoldaMevcut.id)
        } else {
          await supabase.from('stok')
            .insert({ urun_id: satir.urun_id, lokasyon_id: yoldaLok.id, miktar: satir.adet })
        }
      }

      await supabase.from('stok_hareketleri').insert({
        urun_id: satir.urun_id,
        lokasyon_id: kaynakId,
        hareket_tipi: 'transfer_cikis',
        miktar: -satir.adet,
        koli_id: koli.id,
        aciklama: koliNo + ' nolu koli ile gonderildi',
      })
    }

    router.push('/dashboard/transfer')
  }

  const toplamAdet = satirlar.reduce((t, s) => t + s.adet, 0)

  return (
    <div className="min-h-screen bg-gray-50">

      {kameraAcik && (
        <BarkodOkuyucu
          onOkutuldu={(b) => {
            setKameraAcik(false)
            barkodEkle(b)
          }}
          onKapat={() => setKameraAcik(false)}
        />
      )}

      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <Link href="/dashboard/transfer" className="text-gray-400 hover:text-gray-600 text-xl">
            &larr;
          </Link>
          <div>
            <h1 className="font-semibold text-gray-900 text-sm">Yeni Koli</h1>
            <p className="text-xs text-gray-500">
              {toplamAdet > 0 ? toplamAdet + ' urun eklendi' : 'Urunleri ekle ve gonder'}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4">

        {/* Kaynak → Hedef */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Nereden</label>
            <div className="flex flex-wrap gap-2">
              {lokasyonlar.map(l => (
                <button key={l.id} type="button"
                  onClick={() => setKaynakId(l.id)}
                  className={kaynakId === l.id
                    ? 'px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white'
                    : 'px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700'}>
                  {l.ad}
                </button>
              ))}
            </div>
          </div>
          <div className="text-center text-gray-300 text-xl">&#8595;</div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Nereye</label>
            <div className="flex flex-wrap gap-2">
              {lokasyonlar.filter(l => l.id !== kaynakId).map(l => (
                <button key={l.id} type="button"
                  onClick={() => setHedefId(l.id)}
                  className={hedefId === l.id
                    ? 'px-4 py-2 rounded-xl text-sm font-medium bg-green-600 text-white'
                    : 'px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700'}>
                  {l.ad}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Barkod Ekle */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Urun Ekle
          </label>
          <div className="flex gap-2">
            <input
              value={barkod}
              onChange={e => setBarkod(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && barkodEkle()}
              placeholder="Barkod okut veya yaz..."
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button onClick={() => barkodEkle()}
              className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700">
              Ekle
            </button>
          </div>
          <button
            onClick={() => setKameraAcik(true)}
            className="w-full mt-2 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl text-sm font-medium transition-colors">
            Kamera ile Okut
          </button>
        </div>

        {hata && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-600 text-sm">{hata}</p>
          </div>
        )}

        {/* Koli İçeriği */}
        {satirlar.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between text-xs text-gray-500 font-medium">
              <span>KOLI ICERIGI</span>
              <span>{toplamAdet} adet</span>
            </div>
            {satirlar.map((satir, i) => (
              <div key={satir.barkod}
                className={i < satirlar.length - 1
                  ? 'flex items-center justify-between px-4 py-3 border-b border-gray-50'
                  : 'flex items-center justify-between px-4 py-3'}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center text-xs font-bold font-mono text-blue-700">
                    {satir.beden}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {satir.model} — {satir.renk}
                    </p>
                    <p className="text-xs text-gray-400">Mevcut: {satir.mevcutStok}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => adetGuncelle(satir.barkod, satir.adet - 1)}
                    className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 font-bold text-sm flex items-center justify-center">
                    -
                  </button>
                  <span className="w-8 text-center font-bold text-sm text-gray-900">
                    {satir.adet}
                  </span>
                  <button onClick={() => adetGuncelle(satir.barkod, satir.adet + 1)}
                    className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 font-bold text-sm flex items-center justify-center">
                    +
                  </button>
                  <button onClick={() => satirSil(satir.barkod)}
                    className="w-7 h-7 rounded-lg bg-red-50 text-red-400 text-sm flex items-center justify-center ml-1">
                    x
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {satirlar.length > 0 && (
          <button
            onClick={koliOlusturVeGonder}
            disabled={yukleniyor || !hedefId}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-4 rounded-2xl text-sm transition-colors">
            {yukleniyor
              ? 'Gonderiliyor...'
              : 'Koliyi Olustur ve Gonder (' + toplamAdet + ' urun)'}
          </button>
        )}
      </main>
    </div>
  )
}