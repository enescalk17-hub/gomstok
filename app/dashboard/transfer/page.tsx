'use client'
import BarkodOkuyucu from '@/components/BarkodOkuyucu'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Koli = {
  id: string
  koli_no: string
  koli_barkod: string
  durum: string
  toplam_adet: number
  olusturulma: string
  gonderilme: string | null
  kaynak: { ad: string }
  hedef: { ad: string }
}

export default function TransferPage() {
  const supabase = createClient()
  const [koliler, setKoliler] = useState<Koli[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [filtre, setFiltre] = useState('hepsi')
  const [kameraAcik, setKameraAcik] = useState(false)
<button
  onClick={() => setKameraAcik(true)}
  className="w-full mt-2 flex items-center justify-center gap-2
             bg-gray-100 hover:bg-gray-200 text-gray-700
             py-3 rounded-xl text-sm font-medium">
  Kamera ile Okut
</button>

{kameraAcik && (
  <BarkodOkuyucu
    onOkutuldu={(barkod) => {
      setBarkod(barkod)
      setKameraAcik(false)
      barkodEkle()
    }}
    onKapat={() => setKameraAcik(false)}
  />
)}
  useEffect(() => { getir() }, [])

  async function getir() {
    const { data } = await supabase
      .from('koliler')
      .select(`
        id, koli_no, koli_barkod, durum, toplam_adet,
        olusturulma, gonderilme,
        kaynak:lokasyonlar!kaynak_lokasyon_id(ad),
        hedef:lokasyonlar!hedef_lokasyon_id(ad)
      `)
      .order('olusturulma', { ascending: false })
    setKoliler((data as unknown as Koli[]) || [])
    setYukleniyor(false)
  }

  const durumlar = [
    { key: 'hepsi',         ad: 'Tumu' },
    { key: 'hazirlaniyor',  ad: 'Hazirlaniyor' },
    { key: 'yolda',         ad: 'Yolda' },
    { key: 'teslim_edildi', ad: 'Teslim Edildi' },
  ]

  const filtrelenmis = koliler.filter(k =>
    filtre === 'hepsi' || k.durum === filtre
  )

  function durumBadge(durum: string) {
    const map: Record<string, string> = {
      hazirlaniyor:  'bg-gray-100 text-gray-600',
      yolda:         'bg-amber-50 text-amber-700',
      teslim_edildi: 'bg-green-50 text-green-700',
      kismi_kabul:   'bg-blue-50 text-blue-700',
      iade:          'bg-red-50 text-red-600',
    }
    const adMap: Record<string, string> = {
      hazirlaniyor:  'Hazirlaniyor',
      yolda:         'Yolda',
      teslim_edildi: 'Teslim Edildi',
      kismi_kabul:   'Kismi Kabul',
      iade:          'Iade',
    }
    return (
      <span className={map[durum] + ' text-xs font-medium px-2.5 py-1 rounded-lg'}>
        {adMap[durum] || durum}
      </span>
    )
  }

  function tarihFormat(t: string) {
    return new Date(t).toLocaleDateString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
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
              <h1 className="font-semibold text-gray-900 text-sm">Transfer</h1>
              <p className="text-xs text-gray-500">Koli gonder ve teslim al</p>
            </div>
          </div>
          <Link
            href="/dashboard/transfer/yeni"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-2 rounded-xl">
            + Yeni Koli
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">

        {/* Teslim Al Butonu - Yolda koli varsa belirgin göster */}
        {koliler.filter(k => k.durum === 'yolda').length > 0 && (
          <Link
            href="/dashboard/transfer/teslim"
            className="block bg-amber-500 hover:bg-amber-600 text-white rounded-2xl p-4 text-center transition-colors">
            <p className="font-semibold text-sm">
              {koliler.filter(k => k.durum === 'yolda').length} koli yolda
            </p>
            <p className="text-xs opacity-80 mt-0.5">Teslim almak icin tikla</p>
          </Link>
        )}

        {/* Filtre Sekmeleri */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {durumlar.map(d => (
            <button
              key={d.key}
              onClick={() => setFiltre(d.key)}
              className={
                filtre === d.key
                  ? 'flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white'
                  : 'flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium bg-white text-gray-600 border border-gray-200'
              }>
              {d.ad}
              <span className="ml-1.5 text-xs opacity-70">
                ({koliler.filter(k => d.key === 'hepsi' || k.durum === d.key).length})
              </span>
            </button>
          ))}
        </div>

        {/* Koli Listesi */}
        {yukleniyor ? (
          <div className="text-center py-12 text-gray-400 text-sm">Yukleniyor...</div>
        ) : filtrelenmis.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📦</p>
            <p className="text-gray-500 text-sm">Henuz transfer yok.</p>
            <Link href="/dashboard/transfer/yeni"
              className="text-blue-600 text-sm mt-2 inline-block hover:underline">
              Ilk koliyi olustur
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtrelenmis.map(koli => (
              <div key={koli.id}
                className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm font-mono">
                      {koli.koli_no}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {koli.kaynak?.ad} &rarr; {koli.hedef?.ad}
                    </p>
                  </div>
                  {durumBadge(koli.durum)}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{koli.toplam_adet} gomlek</span>
                  <span>{tarihFormat(koli.olusturulma)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-mono text-gray-400">
                    Barkod: {koli.koli_barkod}
                  </p>
                  {koli.durum === 'yolda' && (
                    <Link
                      href={'/dashboard/transfer/teslim?koli=' + koli.koli_barkod}
                      className="text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg font-medium hover:bg-amber-100">
                      Teslim Al
                    </Link>
                  )}
                  {koli.durum === 'hazirlaniyor' && (
                    <Link
                      href={'/dashboard/transfer/yeni?duzenle=' + koli.id}
                      className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg font-medium hover:bg-gray-200">
                      Gonder
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}