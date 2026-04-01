'use client'

import { useState } from 'react'
import { kumasTransferGit } from './actions'

type Kumas = {
  id: string
  kumas_barkod: string | null
  renk: string
  en_cm: number
  miktar_metre: number
  tur: { ad: string }
  desen: { ad: string }
}

export default function TransferForm({ 
  kumaslar, atolyeler, modeller 
}: { 
  kumaslar: Kumas[], 
  atolyeler: {id: string, ad: string}[],
  modeller: {id: string, ad: string}[]
}) {
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState('')
  const [basarili, setBasarili] = useState(false)

  const [seciliKumas, setSeciliKumas] = useState<Kumas | null>(null)
  const [metre, setMetre] = useState('')

  const tahminiGomlek = seciliKumas && metre 
    ? Math.floor(parseFloat(metre) / 1.8) 
    : 0

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setYukleniyor(true)
    setHata('')
    setBasarili(false)

    const formData = new FormData(e.currentTarget)
    formData.append('hedef_tahmini_adet', tahminiGomlek.toString())

    const res = await kumasTransferGit(formData)
    if (res?.error) {
       setHata(res.error)
    } else {
       setBasarili(true)
       setSeciliKumas(null)
       setMetre('')
       ;(e.target as HTMLFormElement).reset()
    }
    setYukleniyor(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
       {basarili && (
          <div className="bg-green-50 text-green-700 p-4 rounded-xl mb-4 border border-green-200 font-medium text-sm">
             ✅ Transfer başarıyla kaydedildi! Kumaş atölye stoğuna aktarıldı.
          </div>
       )}
       {hata && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-4 border border-red-200 font-medium text-sm">
             ❌ {hata}
          </div>
       )}

       <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Sevk Edilecek Kumaş (Depo Stoğu)</label>
            <select 
               name="kumas_id" 
               required 
               onChange={e => setSeciliKumas(kumaslar.find(k => k.id === e.target.value) || null)}
               className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50">
               <option value="">Seçiniz...</option>
               {kumaslar.map(k => (
                 <option key={k.id} value={k.id}>
                    {k.tur?.ad || 'Tip Yok'} - {k.desen?.ad || 'Düz'} ({k.renk}) | Mevcut: {k.miktar_metre} mt.
                 </option>
               ))}
            </select>
            {kumaslar.length === 0 && <p className="text-xs text-red-500 mt-1">Depoda sevk edilecek kumaş bulunmuyor.</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div>
               <label className="block text-xs font-medium text-gray-700 mb-1">Varış Lokasyonu</label>
               <select name="varis_lokasyon_id" required className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50">
                  <option value="">Atölye Seçin...</option>
                  {atolyeler.map(a => (
                    <option key={a.id} value={a.id}>{a.ad}</option>
                  ))}
               </select>
             </div>
             <div>
               <label className="block text-xs font-medium text-gray-700 mb-1">Sevk Metrajı (Metre)</label>
               <input 
                 name="miktar_metre" 
                 type="number" 
                 step="0.1" 
                 required 
                 value={metre}
                 onChange={e => setMetre(e.target.value)}
                 max={seciliKumas?.miktar_metre || ''}
                 placeholder={`Maks: ${seciliKumas?.miktar_metre || 0}`}
                 className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div>
               <label className="block text-xs font-medium text-gray-700 mb-1">Planlanan Model (Sevk Emri / Opsiyonel)</label>
               <select name="hedef_model_id" className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50">
                  <option value="">Sadece Kumaş Gönderiliyor</option>
                  {modeller.map(m => (
                    <option key={m.id} value={m.id}>{m.ad}</option>
                  ))}
               </select>
             </div>
             <div className="flex flex-col justify-end pb-3 text-sm text-gray-600">
                <p>Tahmini Çıkacak Gömlek: <strong className="text-blue-700 text-lg ml-1">{tahminiGomlek}</strong></p>
             </div>
          </div>

          <div>
             <label className="block text-xs font-medium text-gray-700 mb-1">Not / İrsaliye vb.</label>
             <input name="notlar" placeholder="Opsiyonel not ekleyin..." className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          <button type="submit" disabled={yukleniyor || !seciliKumas} className="w-full bg-blue-600 text-white font-medium py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
            {yukleniyor ? 'Transfer Ediliyor...' : 'Kumaşı Atölyeye Sevk Et'}
          </button>
       </form>
    </div>
  )
}
