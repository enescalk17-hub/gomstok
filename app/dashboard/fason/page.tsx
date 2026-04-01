'use client'

import { useEffect, useState, useTransition, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { isEmriOlustur, durumGuncelle, teslimEt, isEmriSil } from './actions'
import { useSearchParams, useRouter } from 'next/navigation'

type IsEmri = {
  id: string
  irsaliye_no: string | null
  musteri_id: string
  musteri_ad: string
  kumas_id: string | null
  model_tanimi: string
  hedef_adet: number
  teslim_alinan_metre: number | null
  durum: string
  baslangic_tarihi: string | null
  bitis_tarihi: string | null
  uretilen_adet: number | null
  fire_adet: number | null
  kullanilan_metre: number | null
  fire_metre: number | null
  beden_dagilimi: Record<string, number> | null
  notlar: string | null
  olusturulma: string
}

const DURUM_SIRALAMA = ['bekliyor', 'kesimde', 'uretimde', 'teslim_edildi', 'iptal']

const DURUM_ETIKET: Record<string, { label: string; cls: string }> = {
  bekliyor:       { label: 'Bekliyor',       cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  kesimde:        { label: 'Kesimde',         cls: 'bg-orange-100 text-orange-800 border-orange-200' },
  uretimde:       { label: 'Üretimde',        cls: 'bg-blue-100 text-blue-800 border-blue-200' },
  teslim_edildi:  { label: 'Teslim Edildi',   cls: 'bg-green-100 text-green-800 border-green-200' },
  iptal:          { label: 'İptal',            cls: 'bg-gray-100 text-gray-500 border-gray-200' },
}

export default function FasonPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">Yükleniyor...</div>}>
      <FasonIcerik />
    </Suspense>
  )
}

function FasonIcerik() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [emirler, setEmirler] = useState<IsEmri[]>([])
  const [musteriler, setMusteriler] = useState<any[]>([])
  const [kumaslar, setKumaslar] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)

  const [yeniModal, setYeniModal] = useState(false)
  const [teslimModal, setTeslimModal] = useState<IsEmri | null>(null)
  const [detayId, setDetayId] = useState<string | null>(null)
  const [hata, setHata] = useState('')
  const [basari, setBasari] = useState('')

  const filtreMusteriId = searchParams.get('musteri') || ''
  const [durumlFitre, setDurumFiltre] = useState('')

  useEffect(() => {
    getir()
    getirYardimci()
  }, [])

  async function getir() {
    setYukleniyor(true)
    const { data } = await supabase
      .from('fason_is_emirleri')
      .select(`
        *,
        musteri:musteriler(ad)
      `)
      .order('olusturulma', { ascending: false })

    const mapped = (data || []).map((e: any) => ({
      ...e,
      musteri_ad: e.musteri?.ad || 'Bilinmiyor',
    }))
    setEmirler(mapped)
    setYukleniyor(false)
  }

  async function getirYardimci() {
    const [musRes, kumRes] = await Promise.all([
      supabase.from('musteriler').select('id, ad').eq('aktif', true).order('ad'),
      supabase.from('kumas_stok').select('id, tur, renk, mevcut_metre').order('olusturulma', { ascending: false }),
    ])
    setMusteriler(musRes.data || [])
    setKumaslar(kumRes.data || [])
  }

  async function handleYeniEmri(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setHata('')
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await isEmriOlustur(formData)
      if (res?.error) { setHata(res.error); return }
      setYeniModal(false)
      setBasari('İş emri oluşturuldu.')
      setTimeout(() => setBasari(''), 3000)
      getir()
    })
  }

  async function handleDurumDegistir(id: string, yeniDurum: string) {
    startTransition(async () => {
      const res = await durumGuncelle(id, yeniDurum)
      if (res?.error) { alert(res.error); return }
      getir()
    })
  }

  async function handleTeslim(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!teslimModal) return
    setHata('')
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await teslimEt(teslimModal.id, formData)
      if (res?.error) { setHata(res.error); return }
      setTeslimModal(null)
      setBasari(`Teslim kaydedildi. İrsaliye: ${res.irsaliyeNo}`)
      setTimeout(() => setBasari(''), 5000)
      getir()
    })
  }

  async function handleSil(id: string) {
    if (!confirm('Bu iş emrini silmek istediğinizden emin misiniz?')) return
    startTransition(async () => {
      const res = await isEmriSil(id)
      if (res?.error) { alert(res.error); return }
      getir()
    })
  }

  const filtreliEmirler = emirler.filter(e => {
    if (filtreMusteriId && e.musteri_id !== filtreMusteriId) return false
    if (durumlFitre && e.durum !== durumlFitre) return false
    return true
  })

  const aktifSayisi = emirler.filter(e => !['teslim_edildi', 'iptal'].includes(e.durum)).length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-xl">←</Link>
            <div>
              <h1 className="font-semibold text-gray-900 text-sm">Fason Üretim</h1>
              <p className="text-xs text-gray-500">
                {aktifSayisi > 0 ? `${aktifSayisi} aktif iş emri` : 'İş emri yönetimi'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/musteriler"
              className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-2 rounded-xl">
              Müşteriler
            </Link>
            <button
              onClick={() => { setYeniModal(true); setHata('') }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-2 rounded-xl transition-colors">
              + Yeni İş Emri
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">

        {basari && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-green-800 text-sm font-medium">
            {basari}
          </div>
        )}

        {/* Filtreler */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setDurumFiltre('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${!durumlFitre ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            Tümü ({emirler.length})
          </button>
          {DURUM_SIRALAMA.filter(d => emirler.some(e => e.durum === d)).map(d => {
            const meta = DURUM_ETIKET[d]
            const sayi = emirler.filter(e => e.durum === d).length
            return (
              <button
                key={d}
                onClick={() => setDurumFiltre(d === durumlFitre ? '' : d)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${durumlFitre === d ? 'ring-2 ring-gray-400' : ''} ${meta.cls}`}>
                {meta.label} ({sayi})
              </button>
            )
          })}
          {filtreMusteriId && (
            <button
              onClick={() => router.push('/dashboard/fason')}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
              Müşteri Filtresi ✕
            </button>
          )}
        </div>

        {/* İş Emirleri Listesi */}
        {yukleniyor ? (
          <div className="text-center py-12 text-gray-400 text-sm">Yükleniyor...</div>
        ) : filtreliEmirler.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
            <p className="text-4xl mb-3">✂️</p>
            <p className="text-gray-500 text-sm">Henüz iş emri yok.</p>
            <button onClick={() => setYeniModal(true)} className="mt-3 text-blue-600 text-sm hover:underline">
              İlk iş emrini oluştur
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtreliEmirler.map(e => {
              const meta = DURUM_ETIKET[e.durum] || DURUM_ETIKET.bekliyor
              const isDetay = detayId === e.id
              return (
                <div key={e.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  {/* Kart başlığı */}
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setDetayId(isDetay ? null : e.id)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-xs font-semibold ${meta.cls}`}>
                            {meta.label}
                          </span>
                          {e.irsaliye_no && (
                            <span className="text-xs font-mono text-gray-400">{e.irsaliye_no}</span>
                          )}
                        </div>
                        <p className="font-semibold text-gray-900 truncate">{e.musteri_ad}</p>
                        <p className="text-sm text-gray-500 truncate">{e.model_tanimi}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-black text-gray-800">{e.uretilen_adet ?? e.hedef_adet}</p>
                        <p className="text-xs text-gray-400">{e.uretilen_adet != null ? 'üretilen' : 'hedef'} adet</p>
                      </div>
                    </div>
                    {e.teslim_alinan_metre != null && (
                      <div className="mt-2 text-xs text-gray-400">
                        Teslim alınan kumaş: <span className="font-medium text-gray-600">{e.teslim_alinan_metre} m</span>
                        {e.kullanilan_metre != null && (
                          <> · Kullanılan: <span className="font-medium text-gray-600">{e.kullanilan_metre} m</span></>
                        )}
                        {e.fire_metre != null && (
                          <> · Fire: <span className="text-red-500 font-medium">{e.fire_metre} m</span></>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Açık detay paneli */}
                  {isDetay && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">

                      {/* Beden dağılımı */}
                      {e.beden_dagilimi && Object.keys(e.beden_dagilimi).length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-2">Beden Dağılımı</p>
                          <div className="flex gap-2 flex-wrap">
                            {Object.entries(e.beden_dagilimi).map(([b, a]) => (
                              <div key={b} className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-center">
                                <p className="text-sm font-bold text-gray-700">{a}</p>
                                <p className="text-xs text-gray-400">{b}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notlar */}
                      {e.notlar && (
                        <p className="text-xs text-gray-500 bg-white border border-gray-100 rounded-lg px-3 py-2">
                          {e.notlar}
                        </p>
                      )}

                      {/* Tarihler */}
                      <div className="text-xs text-gray-400 flex gap-4">
                        {e.baslangic_tarihi && <span>Başlangıç: {new Date(e.baslangic_tarihi).toLocaleDateString('tr-TR')}</span>}
                        {e.bitis_tarihi && <span>Bitiş: {new Date(e.bitis_tarihi).toLocaleDateString('tr-TR')}</span>}
                        <span>Oluşturulma: {new Date(e.olusturulma).toLocaleDateString('tr-TR')}</span>
                      </div>

                      {/* Aksiyon butonları */}
                      <div className="flex gap-2 flex-wrap pt-1">
                        {e.durum === 'bekliyor' && (
                          <button
                            disabled={isPending}
                            onClick={() => handleDurumDegistir(e.id, 'kesimde')}
                            className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50">
                            Kesime Al
                          </button>
                        )}
                        {e.durum === 'kesimde' && (
                          <button
                            disabled={isPending}
                            onClick={() => handleDurumDegistir(e.id, 'uretimde')}
                            className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50">
                            Üretime Al
                          </button>
                        )}
                        {['bekliyor', 'kesimde', 'uretimde'].includes(e.durum) && (
                          <button
                            onClick={() => { setTeslimModal(e); setHata('') }}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-4 py-2 rounded-xl transition-colors">
                            Teslim Et & İrsaliye
                          </button>
                        )}
                        {e.durum === 'teslim_edildi' && e.irsaliye_no && (
                          <Link
                            href={`/dashboard/fason/${e.id}/irsaliye`}
                            className="bg-gray-900 hover:bg-black text-white text-xs font-medium px-4 py-2 rounded-xl transition-colors">
                            İrsaliye Yazdır
                          </Link>
                        )}
                        {['bekliyor', 'kesimde'].includes(e.durum) && (
                          <button
                            disabled={isPending}
                            onClick={() => handleDurumDegistir(e.id, 'iptal')}
                            className="text-gray-500 hover:text-gray-700 text-xs font-medium px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
                            İptal Et
                          </button>
                        )}
                        <button
                          onClick={() => handleSil(e.id)}
                          className="text-red-500 hover:text-red-700 text-xs font-medium px-3 py-2 rounded-xl border border-red-100 hover:bg-red-50 transition-colors ml-auto">
                          Sil
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* YENİ İŞ EMRİ MODALI */}
      {yeniModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg max-h-[90vh] overflow-y-auto p-7 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900">Yeni Fason İş Emri</h2>
              <button onClick={() => setYeniModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleYeniEmri} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Müşteri *</label>
                <select name="musteri_id" required
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 focus:border-blue-500 outline-none">
                  <option value="">Müşteri seçin...</option>
                  {musteriler.map(m => (
                    <option key={m.id} value={m.id}>{m.ad}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Model Tanımı *</label>
                <input name="model_tanimi" required placeholder="Örn: Slim Fit V-Yaka Gömlek"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 focus:border-blue-500 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Hedef Adet *</label>
                  <input type="number" name="hedef_adet" required min="1" placeholder="2500"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Teslim Alınan Kumaş (m)</label>
                  <input type="number" step="0.5" name="teslim_alinan_metre" placeholder="5000"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 focus:border-blue-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Kumaş Stoğu (Opsiyonel)</label>
                <select name="kumas_id"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 focus:border-blue-500 outline-none">
                  <option value="">Bağlı kumaş yok</option>
                  {kumaslar.map((k: any) => (
                    <option key={k.id} value={k.id}>
                      {k.tur || 'Kumaş'} — {k.renk} ({k.mevcut_metre} m)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Başlangıç Tarihi</label>
                <input type="date" name="baslangic_tarihi" defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 focus:border-blue-500 outline-none" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Not</label>
                <textarea name="notlar" rows={2} placeholder="Varsa ek bilgi..."
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 focus:border-blue-500 outline-none resize-none" />
              </div>

              {hata && <div className="text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl text-sm">{hata}</div>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setYeniModal(false)}
                  className="flex-1 px-4 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-colors">
                  İptal
                </button>
                <button type="submit" disabled={isPending}
                  className="flex-[2] px-4 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-lg shadow-blue-600/30">
                  {isPending ? 'KAYDEDİLİYOR...' : 'İŞ EMRİ OLUŞTUR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TESLİM MODALI */}
      {teslimModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg max-h-[90vh] overflow-y-auto p-7 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-gray-900">Teslim & İrsaliye</h2>
              <button onClick={() => setTeslimModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              {teslimModal.musteri_ad} — {teslimModal.model_tanimi}
            </p>

            <form onSubmit={handleTeslim} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Üretilen Adet *</label>
                  <input type="number" name="uretilen_adet" required
                    defaultValue={teslimModal.hedef_adet}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Fire Adet</label>
                  <input type="number" name="fire_adet" defaultValue={0}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 focus:border-blue-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Kullanılan Kumaş (m)</label>
                  <input type="number" step="0.5" name="kullanilan_metre"
                    defaultValue={teslimModal.teslim_alinan_metre ?? ''}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Fire Kumaş (m)</label>
                  <input type="number" step="0.5" name="fire_metre" defaultValue={0}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 focus:border-blue-500 outline-none" />
                </div>
              </div>

              {/* Beden Dağılımı */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Beden Dağılımı (Opsiyonel)</label>
                <div className="grid grid-cols-4 gap-2">
                  {['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'].map(b => (
                    <div key={b}>
                      <label className="block text-xs text-gray-500 text-center mb-1">{b}</label>
                      <input type="number" min="0" name={`beden_${b}`}
                        className="w-full border border-gray-200 rounded-xl px-2 py-2 text-sm text-center font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                  ))}
                </div>
              </div>

              {hata && <div className="text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl text-sm">{hata}</div>}

              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-700">
                Teslim kaydedilince otomatik irsaliye numarası üretilir ve
                İrsaliye Yazdır butonu aktif olur.
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setTeslimModal(null)}
                  className="flex-1 px-4 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-colors">
                  İptal
                </button>
                <button type="submit" disabled={isPending}
                  className="flex-[2] px-4 py-4 bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 transition-colors disabled:opacity-50 shadow-lg shadow-green-600/30">
                  {isPending ? 'KAYDEDİLİYOR...' : 'TESLİM ET & İRSALİYE OLUŞTUR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
