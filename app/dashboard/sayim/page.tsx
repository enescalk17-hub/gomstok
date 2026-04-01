'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import BarkodOkuyucu from '@/components/BarkodOkuyucu'
import { useUsbScanner } from '@/hooks/useUsbScanner'

type SayimSatir = {
  urun_id: string
  barkod: string
  model: string
  renk: string
  beden: string
  sistemdeki: number
  sayilan: number
}

type Oturum = {
  id: string
  lokasyon: string
  durum: string
  baslangic: string
  satirSayisi: number
  farkliSayisi: number
}

export default function SayimPage() {
  const supabase = createClient()
  const [ekran, setEkran] = useState<'liste' | 'yeni' | 'aktif'>('liste')
  const [lokasyonlar, setLokasyonlar] = useState<any[]>([])
  const [secilenLok, setSecilenLok] = useState('')
  const [oturumlar, setOturumlar] = useState<Oturum[]>([])
  const [aktifOturum, setAktifOturum] = useState<any>(null)
  const [satirlar, setSatirlar] = useState<SayimSatir[]>([])
  const [barkodInput, setBarkodInput] = useState('')
  const [kameraAcik, setKameraAcik] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [baslatiliyor, setBaslatiliyor] = useState(false)
  const [hata, setHata] = useState('')
  const [tamamlandi, setTamamlandi] = useState(false)

  useUsbScanner((okunanBarkod) => {
    // Sadece aktif sayim durumundayken islem yapsin
    if (ekran === 'aktif' && aktifOturum) {
       barkodOkutKamera(okunanBarkod)
    }
  })

  useEffect(() => {
    getirLokasyonlar()
    getirOturumlar()
  }, [])

  async function getirLokasyonlar() {
    const { data } = await supabase
      .from('lokasyonlar')
      .select('*')
      .in('tip', ['atolye', 'magaza', 'depo'])
      .eq('aktif', true)
    setLokasyonlar(data || [])
  }

  async function getirOturumlar() {
    const { data } = await supabase
      .from('sayim_oturumlari')
      .select(`
        id, durum, baslangic,
        lokasyon:lokasyonlar(ad)
      `)
      .order('baslangic', { ascending: false })
      .limit(20)

    if (!data) return

    const ozet = await Promise.all(data.map(async (o: any) => {
      const { count: satirSayisi } = await supabase
        .from('sayim_satirlari')
        .select('*', { count: 'exact', head: true })
        .eq('oturum_id', o.id)

      const { count: farkliSayisi } = await supabase
        .from('sayim_satirlari')
        .select('*', { count: 'exact', head: true })
        .eq('oturum_id', o.id)
        .neq('fark', 0)

      return {
        id: o.id,
        lokasyon: o.lokasyon?.ad || '',
        durum: o.durum,
        baslangic: o.baslangic,
        satirSayisi: satirSayisi || 0,
        farkliSayisi: farkliSayisi || 0,
      }
    }))

    setOturumlar(ozet)
  }

  async function sayimBaslat() {
    if (!secilenLok) { setHata('Lokasyon secin.'); return }
    setBaslatiliyor(true)
    setHata('')

    const { data: user } = await supabase.auth.getUser()

    const { data: oturum, error } = await supabase
      .from('sayim_oturumlari')
      .insert({
        lokasyon_id: secilenLok,
        baslayan_id: user.user?.id,
        durum: 'devam',
      })
      .select()
      .single()

    if (error || !oturum) {
      setHata('Oturum olusturulamadi.')
      setBaslatiliyor(false)
      return
    }

    const { data: stok } = await supabase
      .from('lokasyon_stok')
      .select('*')
      .eq('lokasyon_id', secilenLok)

    const baslangicSatirlar: SayimSatir[] = (stok || []).map((s: any) => ({
      urun_id: s.urun_id,
      barkod: s.barkod,
      model: s.model,
      renk: s.renk,
      beden: s.beden,
      sistemdeki: s.miktar,
      sayilan: 0,
    }))

    setAktifOturum(oturum)
    setSatirlar(baslangicSatirlar)
    setBaslatiliyor(false)
    setEkran('aktif')
  }

  async function barkodOkut() {
    const b = barkodInput.trim()
    if (!b) return
    setBarkodInput('')
    setHata('')

    const mevcutIndex = satirlar.findIndex(s => s.barkod === b)

    if (mevcutIndex >= 0) {
      setSatirlar(prev => prev.map((s, i) =>
        i === mevcutIndex ? { ...s, sayilan: s.sayilan + 1 } : s
      ))
    } else {
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

      if (!urun) {
        setHata('Barkod sistemde bulunamadi: ' + b)
        return
      }

      setSatirlar(prev => [...prev, {
        urun_id: urun.id,
        barkod: b,
        model: (urun.model as any)?.ad || '',
        renk: (urun.renk as any)?.ad || '',
        beden: (urun.beden as any)?.ad || '',
        sistemdeki: 0,
        sayilan: 1,
      }])
    }
  }

  async function barkodOkutKamera(barkod: string) {
    setKameraAcik(false)
    setBarkodInput(barkod)
    setHata('')

    const mevcutIndex = satirlar.findIndex(s => s.barkod === barkod)

    if (mevcutIndex >= 0) {
      setSatirlar(prev => prev.map((s, i) =>
        i === mevcutIndex ? { ...s, sayilan: s.sayilan + 1 } : s
      ))
    } else {
      const { data: urun } = await supabase
        .from('urunler')
        .select(`
          id, barkod, dis_barkod,
          model:modeller(ad),
          renk:renkler(ad),
          beden:bedenler(ad)
        `)
        .or(`barkod.eq.${barkod},dis_barkod.eq.${barkod}`)
        .single()

      if (!urun) {
        setHata('Barkod sistemde bulunamadi: ' + barkod)
        return
      }

      setSatirlar(prev => [...prev, {
        urun_id: urun.id,
        barkod: barkod,
        model: (urun.model as any)?.ad || '',
        renk: (urun.renk as any)?.ad || '',
        beden: (urun.beden as any)?.ad || '',
        sistemdeki: 0,
        sayilan: 1,
      }])
    }
    setBarkodInput('')
  }

  function sayiGuncelle(urun_id: string, yeniSayi: number) {
    setSatirlar(prev => prev.map(s =>
      s.urun_id === urun_id ? { ...s, sayilan: Math.max(0, yeniSayi) } : s
    ))
  }

  async function sayimTamamla() {
    if (!aktifOturum) return
    setYukleniyor(true)

    for (const satir of satirlar) {
      const { data: mevcut } = await supabase
        .from('sayim_satirlari')
        .select('id')
        .eq('oturum_id', aktifOturum.id)
        .eq('urun_id', satir.urun_id)
        .single()

      if (mevcut) {
        await supabase
          .from('sayim_satirlari')
          .update({
            sistemdeki_miktar: satir.sistemdeki,
            sayilan_miktar: satir.sayilan,
          })
          .eq('id', mevcut.id)
      } else {
        await supabase.from('sayim_satirlari').insert({
          oturum_id: aktifOturum.id,
          urun_id: satir.urun_id,
          sistemdeki_miktar: satir.sistemdeki,
          sayilan_miktar: satir.sayilan,
        })
      }
    }

    await supabase
      .from('sayim_oturumlari')
      .update({ durum: 'tamamlandi', bitis: new Date().toISOString() })
      .eq('id', aktifOturum.id)

    setYukleniyor(false)
    setTamamlandi(true)
  }

  async function stokGuncelle() {
    if (!aktifOturum) return
    setYukleniyor(true)

    const farklilar = satirlar.filter(s => s.sayilan !== s.sistemdeki)

    for (const satir of farklilar) {
      const { data: stokKayit } = await supabase
        .from('stok')
        .select('id')
        .eq('urun_id', satir.urun_id)
        .eq('lokasyon_id', secilenLok)
        .single()

      if (stokKayit) {
        await supabase
          .from('stok')
          .update({ miktar: satir.sayilan })
          .eq('id', stokKayit.id)
      } else if (satir.sayilan > 0) {
        await supabase.from('stok').insert({
          urun_id: satir.urun_id,
          lokasyon_id: secilenLok,
          miktar: satir.sayilan,
        })
      }

      const { data: user } = await supabase.auth.getUser()
      await supabase.from('stok_hareketleri').insert({
        urun_id: satir.urun_id,
        lokasyon_id: secilenLok,
        hareket_tipi: 'sayim',
        miktar: satir.sayilan - satir.sistemdeki,
        yapan_id: user.user?.id,
        aciklama: 'Sayim duzeltmesi',
      })
    }

    setYukleniyor(false)
    setTamamlandi(true)
    getirOturumlar()
  }

  function tarihFormat(t: string) {
    return new Date(t).toLocaleDateString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const farkliSatirlar = satirlar.filter(s => s.sayilan !== s.sistemdeki)
  const sayilanToplam = satirlar.reduce((t, s) => t + s.sayilan, 0)

  if (tamamlandi) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-sm w-full">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sayim Tamamlandi!</h2>
          <div className="grid grid-cols-2 gap-3 my-4">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-gray-900">{sayilanToplam}</p>
              <p className="text-xs text-gray-500">Sayilan urun</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-red-600">{farkliSatirlar.length}</p>
              <p className="text-xs text-gray-500">Farkli urun</p>
            </div>
          </div>
          <button
            onClick={() => {
              setTamamlandi(false)
              setEkran('liste')
              setAktifOturum(null)
              setSatirlar([])
              getirOturumlar()
            }}
            className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-medium mt-2">
            Sayim Listesine Don
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {kameraAcik && (
        <BarkodOkuyucu
          onOkutuldu={barkodOkutKamera}
          onKapat={() => setKameraAcik(false)}
        />
      )}

      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {ekran === 'liste' ? (
              <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-xl">
                &larr;
              </Link>
            ) : (
              <button
                onClick={() => setEkran('liste')}
                className="text-gray-400 hover:text-gray-600 text-xl">
                &larr;
              </button>
            )}
            <div>
              <h1 className="font-semibold text-gray-900 text-sm">
                {ekran === 'liste' && 'Sayim'}
                {ekran === 'yeni' && 'Yeni Sayim'}
                {ekran === 'aktif' && 'Sayim Devam Ediyor'}
              </h1>
              <p className="text-xs text-gray-500">
                {ekran === 'aktif'
                  ? sayilanToplam + ' urun sayildi'
                  : 'Stok sayim modulu'}
              </p>
            </div>
          </div>
          {ekran === 'liste' && (
            <button
              onClick={() => setEkran('yeni')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-2 rounded-xl">
              + Yeni Sayim
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">

        {ekran === 'liste' && (
          <>
            {oturumlar.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-gray-500 text-sm">Henuz sayim yapilmamis.</p>
                <button
                  onClick={() => setEkran('yeni')}
                  className="mt-3 text-blue-600 text-sm hover:underline">
                  Ilk sayimi baslat
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {oturumlar.map(o => (
                  <div key={o.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{o.lokasyon}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{tarihFormat(o.baslangic)}</p>
                      </div>
                      <span className={
                        o.durum === 'tamamlandi'
                          ? 'text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-lg font-medium'
                          : 'text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg font-medium'}>
                        {o.durum === 'tamamlandi' ? 'Tamamlandi' : 'Devam Ediyor'}
                      </span>
                    </div>
                    <div className="flex gap-3 text-xs">
                      <span className="bg-gray-50 px-2.5 py-1 rounded-lg text-gray-600">
                        {o.satirSayisi} urun sayildi
                      </span>
                      {o.farkliSayisi > 0 && (
                        <span className="bg-red-50 px-2.5 py-1 rounded-lg text-red-600">
                          {o.farkliSayisi} fark var
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {ekran === 'yeni' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="font-medium text-gray-900 text-sm mb-4">
              Hangi lokasyonu sayacaksin?
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {lokasyonlar.map(l => (
                <button
                  key={l.id}
                  onClick={() => setSecilenLok(l.id)}
                  className={secilenLok === l.id
                    ? 'px-5 py-3 rounded-xl text-sm font-medium bg-blue-600 text-white'
                    : 'px-5 py-3 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200'}>
                  {l.ad}
                </button>
              ))}
            </div>
            {hata && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-3">
                <p className="text-red-600 text-sm">{hata}</p>
              </div>
            )}
            <button
              onClick={sayimBaslat}
              disabled={baslatiliyor || !secilenLok}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-4 rounded-2xl text-sm">
              {baslatiliyor ? 'Hazirlaniyor...' : 'Sayimi Baslat'}
            </button>
          </div>
        )}

        {ekran === 'aktif' && (
          <div className="space-y-4">

            {/* Barkod Okutma */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Barkod Okut
              </label>
              <div className="flex gap-2">
                <input
                  value={barkodInput}
                  onChange={e => setBarkodInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && barkodOkut()}
                  placeholder="Barkod yaz veya okut... (Enter)"
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={barkodOkut}
                  className="px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                  Okut
                </button>
              </div>
              <button
                onClick={() => setKameraAcik(true)}
                className="w-full mt-2 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl text-sm font-medium transition-colors">
                Kamera ile Okut
              </button>
              {hata && <p className="text-xs text-red-500 mt-2">{hata}</p>}
            </div>

            {/* Özet */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
                <p className="text-xl font-bold text-gray-900">{satirlar.length}</p>
                <p className="text-xs text-gray-400">Toplam urun</p>
              </div>
              <div className="bg-blue-50 rounded-xl border border-blue-100 p-3 text-center">
                <p className="text-xl font-bold text-blue-700">{sayilanToplam}</p>
                <p className="text-xs text-blue-500">Sayilan adet</p>
              </div>
              <div className="bg-red-50 rounded-xl border border-red-100 p-3 text-center">
                <p className="text-xl font-bold text-red-600">{farkliSatirlar.length}</p>
                <p className="text-xs text-red-400">Farkli urun</p>
              </div>
            </div>

            {/* Ürün Listesi */}
            {satirlar.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex justify-between text-xs text-gray-500 font-medium">
                  <span>URUNLER</span>
                  <span>Sistem / Sayilan</span>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {satirlar.map((satir, i) => (
                    <div
                      key={satir.urun_id}
                      className={[
                        'flex items-center justify-between px-4 py-3',
                        i < satirlar.length - 1 ? 'border-b border-gray-50' : '',
                        satir.sayilan !== satir.sistemdeki ? 'bg-red-50' : '',
                      ].join(' ')}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center text-xs font-bold font-mono text-blue-700">
                          {satir.beden}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {satir.model} — {satir.renk}
                          </p>
                          <p className="text-xs text-gray-400 font-mono">{satir.barkod}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{satir.sistemdeki}</span>
                        <span className="text-xs text-gray-300">/</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => sayiGuncelle(satir.urun_id, satir.sayilan - 1)}
                            className="w-6 h-6 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold flex items-center justify-center">
                            -
                          </button>
                          <span className={[
                            'w-8 text-center text-sm font-bold',
                            satir.sayilan > satir.sistemdeki ? 'text-green-600' :
                            satir.sayilan < satir.sistemdeki ? 'text-red-600' : 'text-gray-900'
                          ].join(' ')}>
                            {satir.sayilan}
                          </span>
                          <button
                            onClick={() => sayiGuncelle(satir.urun_id, satir.sayilan + 1)}
                            className="w-6 h-6 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold flex items-center justify-center">
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fark Raporu */}
            {farkliSatirlar.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <p className="text-sm font-semibold text-red-900 mb-2">
                  Fark Raporu ({farkliSatirlar.length} urun)
                </p>
                {farkliSatirlar.map(s => (
                  <div key={s.urun_id}
                    className="flex items-center justify-between py-1.5 border-b border-red-100 last:border-0">
                    <p className="text-xs text-red-800">
                      {s.model} {s.renk} {s.beden}
                    </p>
                    <p className="text-xs font-bold text-red-700">
                      Sistem:{s.sistemdeki} Sayilan:{s.sayilan}
                      ({s.sayilan - s.sistemdeki > 0 ? '+' : ''}{s.sayilan - s.sistemdeki})
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Butonlar */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={sayimTamamla}
                disabled={yukleniyor}
                className="bg-gray-700 hover:bg-gray-800 disabled:bg-gray-300 text-white font-medium py-4 rounded-2xl text-sm">
                {yukleniyor ? 'Kaydediliyor...' : 'Sadece Kaydet'}
              </button>
              <button
                onClick={stokGuncelle}
                disabled={yukleniyor || farkliSatirlar.length === 0}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-medium py-4 rounded-2xl text-sm">
                {yukleniyor ? 'Guncelleniyor...' : 'Stoku Guncelle (' + farkliSatirlar.length + ')'}
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center">
              Sadece Kaydet: Stoku degistirmez. Stoku Guncelle: Farklari duzelter.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}