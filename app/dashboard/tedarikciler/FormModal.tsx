'use client'
import { useState } from 'react'
import { kaydet } from './actions'

type Tedarikci = {
  id?: string
  ad: string
  vergi_no?: string
  adres?: string
  telefon?: string
  eposta?: string
  tur: string
}

export default function FormModal({ mevcut }: { mevcut?: Tedarikci }) {
  const [acik, setAcik] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState('')

  const isEkleme = !mevcut

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setYukleniyor(true)
    setHata('')
    const formData = new FormData(e.currentTarget)
    const payload = Object.fromEntries(formData.entries())
    if (mevcut?.id) payload.id = mevcut.id

    const res = await kaydet(payload)
    if (res?.error) {
      setHata(res.error)
      setYukleniyor(false)
    } else {
      setAcik(false)
      setYukleniyor(false)
    }
  }

  return (
    <>
      {isEkleme ? (
        <button onClick={() => setAcik(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
          + Yeni Tedarikçi
        </button>
      ) : (
        <button onClick={() => setAcik(true)} className="text-blue-600 hover:text-blue-800 text-xs font-medium bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg">
          Düzenle
        </button>
      )}

      {acik && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {isEkleme ? 'Yeni Tedarikçi Ekle' : 'Tedarikçiyi Düzenle'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Firma Adı (Zorunlu)</label>
                <input name="ad" defaultValue={mevcut?.ad} required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tür</label>
                  <select name="tur" defaultValue={mevcut?.tur || 'kumas'} required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="kumas">Kumaşçı</option>
                    <option value="fason">Fason Atölye</option>
                    <option value="ip_dugme">İplik & Düğme</option>
                    <option value="ambalaj">Koli & Ambalaj</option>
                    <option value="diger">Diğer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Telefon</label>
                  <input name="telefon" defaultValue={mevcut?.telefon} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Vergi No / TCKN</label>
                <input name="vergi_no" defaultValue={mevcut?.vergi_no} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">E-Posta</label>
                <input name="eposta" type="email" defaultValue={mevcut?.eposta} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Adres</label>
                <textarea name="adres" defaultValue={mevcut?.adres} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
              </div>

              {hata && <div className="text-red-600 text-xs bg-red-50 p-2 rounded-lg">{hata}</div>}

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setAcik(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">İptal</button>
                <button type="submit" disabled={yukleniyor} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {yukleniyor ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
