'use client'

import { useState } from 'react'
import { kullaniciEkle } from './actions'

export default function EkleModal({ lokasyonlar }: { lokasyonlar: any[] }) {
  const [acik, setAcik] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState('')
  const [rol, setRol] = useState('atolye')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setYukleniyor(true)
    setHata('')
    
    const formData = new FormData(e.currentTarget)
    const res = await kullaniciEkle(formData)
    
    setYukleniyor(false)
    if (res.error) {
      setHata(res.error)
    } else {
      setAcik(false)
    }
  }

  return (
    <>
      <button onClick={() => setAcik(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
        + Personel Ekle
      </button>

      {acik && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Yeni Personel Hesabı Aç</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Ad Soyad</label>
                <input name="ad_soyad" required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Giriş E-postası</label>
                <input name="email" type="email" required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Şifre</label>
                <input name="password" type="password" required minLength={6} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Rol</label>
                <select name="rol" value={rol} onChange={e => setRol(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="admin">Admin</option>
                  <option value="atolye">Atölye Sorumlusu</option>
                  <option value="magaza">Mağaza Sorumlusu</option>
                  <option value="depo">Depo Sorumlusu</option>
                </select>
              </div>

              {rol !== 'admin' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Bağlı Olduğu Lokasyon (Zorunlu)</label>
                  <select name="lokasyon_id" required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">Seçiniz...</option>
                    {lokasyonlar.map(l => (
                      <option key={l.id} value={l.id}>{l.ad} ({l.tip})</option>
                    ))}
                  </select>
                </div>
              )}

              {hata && <div className="text-red-600 text-xs bg-red-50 p-2 rounded-lg">{hata}</div>}

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setAcik(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">İptal</button>
                <button type="submit" disabled={yukleniyor} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {yukleniyor ? 'Oluşturuluyor...' : 'Hesabı Aç'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
