'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Kumas = {
  id: string
  kumas_barkod: string | null
  tur: string
  desen: string
  renk: string
  en_cm: number
  mevcut_metre: number
  lokasyon: string
  tedarikci: string
  olusturulma: string
}

export default function KumaslarPage() {
  const supabase = createClient()
  const [kumaslar, setKumaslar] = useState<Kumas[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [formAcik, setFormAcik] = useState(false)

  // Form state
  const [turler, setTurler] = useState<any[]>([])
  const [desenler, setDesenler] = useState<any[]>([])
  const [lokasyonlar, setLokasyonlar] = useState<any[]>([])
  const [tedarikciler, setTedarikciler] = useState<any[]>([])

  const [form, setForm] = useState({
    kumas_barkod: '',
    tur_id: '',
    desen_id: '',
    renk: '',
    en_cm: '150',
    miktar_metre: '',
    tedarikci_id: '',
    lokasyon_id: '',
    maliyet_metre: '',
    notlar: '',
  })
  const [kayit, setKayit] = useState(false)
  const [hata, setHata] = useState('')

  useEffect(() => {
    getir()
    getirFormVerileri()
  }, [])

  async function getir() {
    const { data } = await supabase
      .from('kumas_stok')
      .select('*')
      .order('olusturulma', { ascending: false })
    setKumaslar((data as Kumas[]) || [])
    setYukleniyor(false)
  }

  async function getirFormVerileri() {
    const [t, d, l, ted] = await Promise.all([
      supabase.from('kumas_turleri').select('*').eq('aktif', true),
      supabase.from('kumas_desenleri').select('*').eq('aktif', true),
      supabase.from('lokasyonlar').select('*').in('tip', ['atolye', 'depo']).eq('aktif', true),
      supabase.from('tedarikciler').select('*').eq('aktif', true),
    ])
    setTurler(t.data || [])
    setDesenler(d.data || [])
    setLokasyonlar(l.data || [])
    setTedarikciler(ted.data || [])

    // Varsayılan lokasyon: Depo
    const depo = l.data?.find((x: any) => x.tip === 'depo')
    if (depo) setForm(f => ({ ...f, lokasyon_id: depo.id }))
  }

  async function kaydet(e: React.FormEvent) {
    e.preventDefault()
    if (!form.renk || !form.miktar_metre || !form.lokasyon_id) {
      setHata('Renk, miktar ve lokasyon zorunludur.')
      return
    }
    setKayit(true)
    setHata('')

    const { error } = await supabase.from('kumaslar').insert({
      kumas_barkod: form.kumas_barkod || null,
      tur_id: form.tur_id || null,
      desen_id: form.desen_id || null,
      renk: form.renk,
      en_cm: parseInt(form.en_cm) || 150,
      miktar_metre: parseFloat(form.miktar_metre),
      tedarikci_id: form.tedarikci_id || null,
      lokasyon_id: form.lokasyon_id,
      maliyet_metre: form.maliyet_metre ? parseFloat(form.maliyet_metre) : null,
      notlar: form.notlar || null,
    })

    if (error) {
      setHata('Hata: ' + error.message)
      setKayit(false)
      return
    }

    setFormAcik(false)
    setKayit(false)
    setForm({
      kumas_barkod: '', tur_id: '', desen_id: '', renk: '',
      en_cm: '150', miktar_metre: '', tedarikci_id: '',
      lokasyon_id: lokasyonlar.find(l => l.tip === 'depo')?.id || '',
      maliyet_metre: '', notlar: '',
    })
    getir()
  }

  // Kumaştan kaç gömlek çıkar hesabı
  function gomlek_hesapla(metre: number, en: number) {
    const tuketimler = [
      { kalip: 'Slim Fit',  tuketim: 1.80 },
      { kalip: 'Regular',   tuketim: 2.00 },
      { kalip: 'Klasik',    tuketim: 2.20 },
    ]
    return tuketimler.map(t => ({
      kalip: t.kalip,
      adet: Math.floor(metre / t.tuketim),
    }))
  }

  function tarihFormat(t: string) {
    return new Date(t).toLocaleDateString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-xl">
              &larr;
            </Link>
            <div>
              <h1 className="font-semibold text-gray-900 text-sm">Kumaslar</h1>
              <p className="text-xs text-gray-500">{kumaslar.length} kumas kaydi</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/kumaslar/transfer"
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium px-4 py-2 rounded-xl transition-colors">
              Atölyeye Sevk
            </Link>
            <button
              onClick={() => setFormAcik(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-2 rounded-xl transition-colors">
              + Kumaş Ekle
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">

        {/* Yeni Kumaş Formu */}
        {formAcik && (
          <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 text-sm">Yeni Kumas Girisi</h3>
              <button onClick={() => setFormAcik(false)}
                className="text-gray-400 hover:text-gray-600 text-sm">
                Kapat
              </button>
            </div>

            <form onSubmit={kaydet} className="space-y-3">

              {/* Barkod */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Kumas Barkodu (opsiyonel)
                </label>
                <input
                  value={form.kumas_barkod}
                  onChange={e => setForm(f => ({ ...f, kumas_barkod: e.target.value }))}
                  placeholder="Kumas uzerindeki barkodu okut veya yaz"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Tür + Desen */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Kumas Turu
                  </label>
                  <select
                    value={form.tur_id}
                    onChange={e => setForm(f => ({ ...f, tur_id: e.target.value }))}
                    className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Secin...</option>
                    {turler.map(t => (
                      <option key={t.id} value={t.id}>{t.ad}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Desen
                  </label>
                  <select
                    value={form.desen_id}
                    onChange={e => setForm(f => ({ ...f, desen_id: e.target.value }))}
                    className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Secin...</option>
                    {desenler.map(d => (
                      <option key={d.id} value={d.id}>{d.ad}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Renk */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Renk *
                </label>
                <input
                  value={form.renk}
                  onChange={e => setForm(f => ({ ...f, renk: e.target.value }))}
                  placeholder="Ornek: Lacivert, Beyaz, Kirmizi..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* En + Metre */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Kumas Eni (cm)
                  </label>
                  <input
                    type="number"
                    value={form.en_cm}
                    onChange={e => setForm(f => ({ ...f, en_cm: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Miktar (metre) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={form.miktar_metre}
                    onChange={e => setForm(f => ({ ...f, miktar_metre: e.target.value }))}
                    placeholder="60"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Gömlek Hesabı Önizleme */}
              {form.miktar_metre && parseFloat(form.miktar_metre) > 0 && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                  <p className="text-xs font-medium text-green-800 mb-2">
                    Bu kumastan tahmini gomlek adedi:
                  </p>
                  <div className="flex gap-3">
                    {gomlek_hesapla(parseFloat(form.miktar_metre), parseInt(form.en_cm)).map(h => (
                      <div key={h.kalip} className="bg-white rounded-lg px-3 py-2 text-center">
                        <p className="text-lg font-bold text-green-700">{h.adet}</p>
                        <p className="text-xs text-gray-500">{h.kalip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lokasyon + Tedarikçi */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Lokasyon *
                  </label>
                  <select
                    value={form.lokasyon_id}
                    onChange={e => setForm(f => ({ ...f, lokasyon_id: e.target.value }))}
                    className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Secin...</option>
                    {lokasyonlar.map(l => (
                      <option key={l.id} value={l.id}>{l.ad}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Tedarikci
                  </label>
                  <select
                    value={form.tedarikci_id}
                    onChange={e => setForm(f => ({ ...f, tedarikci_id: e.target.value }))}
                    className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Secin...</option>
                    {tedarikciler.map(t => (
                      <option key={t.id} value={t.id}>{t.ad}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Maliyet */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Metre Fiyati (TL) - opsiyonel
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.maliyet_metre}
                  onChange={e => setForm(f => ({ ...f, maliyet_metre: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Not */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Not
                </label>
                <textarea
                  value={form.notlar}
                  onChange={e => setForm(f => ({ ...f, notlar: e.target.value }))}
                  placeholder="Varsa eklemek istediginiz not..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {hata && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-red-600 text-xs">{hata}</p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={kayit}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 rounded-xl text-sm">
                  {kayit ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={() => setFormAcik(false)}
                  className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">
                  Iptal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Kumaş Listesi */}
        {yukleniyor ? (
          <div className="text-center py-12 text-gray-400 text-sm">Yukleniyor...</div>
        ) : kumaslar.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🧵</p>
            <p className="text-gray-500 text-sm">Henuz kumas kaydi yok.</p>
            <button
              onClick={() => setFormAcik(true)}
              className="mt-3 text-blue-600 text-sm hover:underline">
              Ilk kumasi ekle
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {kumaslar.map(k => (
              <div key={k.id}
                className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {k.tur || 'Belirsiz'} — {k.desen || 'Duz'} — {k.renk}
                    </p>
                    {k.kumas_barkod && (
                      <p className="text-xs font-mono text-gray-400 mt-0.5">
                        {k.kumas_barkod}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-700">
                      {k.mevcut_metre}
                    </p>
                    <p className="text-xs text-gray-400">metre</p>
                  </div>
                </div>

                {/* Gömlek Tahmini */}
                <div className="flex gap-2 mb-3">
                  {gomlek_hesapla(k.mevcut_metre, k.en_cm).map(h => (
                    <div key={h.kalip}
                      className="bg-gray-50 rounded-lg px-2.5 py-1.5 text-center">
                      <p className="text-sm font-bold text-gray-700">{h.adet}</p>
                      <p className="text-xs text-gray-400">{h.kalip}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{k.lokasyon} &bull; {k.tedarikci || 'Tedarikci yok'}</span>
                  <span>{tarihFormat(k.olusturulma)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}