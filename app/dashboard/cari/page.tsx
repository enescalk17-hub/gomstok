'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { tr } from 'date-fns/locale'

export default function CariHesapPage() {
  const supabase = createClient()
  const [lokasyonlar, setLokasyonlar] = useState<any[]>([])
  const [secilenLokasyonId, setSecilenLokasyonId] = useState<string>('')
  
  const [hareketler, setHareketler] = useState<any[]>([])
  const [stokHareketleri, setStokHareketleri] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)

  // Form States
  const [modalAcik, setModalAcik] = useState(false)
  const [formYukleniyor, setFormYukleniyor] = useState(false)
  const [hata, setHata] = useState('')

  useEffect(() => {
    async function getir() {
      const { data } = await supabase.from('lokasyonlar').select('id, ad, tip').order('ad')
      if (data) {
        setLokasyonlar(data)
        if (data.length > 0) setSecilenLokasyonId(data[0].id)
      }
    }
    getir()
  }, [])

  useEffect(() => {
    if (!secilenLokasyonId) return
    verileriCek()
  }, [secilenLokasyonId])

  async function verileriCek() {
    setYukleniyor(true)
    const [cariRes, stokRes] = await Promise.all([
      supabase.from('cari_hesaplar').select('*').eq('lokasyon_id', secilenLokasyonId).order('tarih', { ascending: false }).limit(200),
      supabase.from('stok_hareketleri').select('miktar, hareket_tipi, tarih')
        .eq('lokasyon_id', secilenLokasyonId)
        // Eğer atölyeyse 'giris' (üretim demektir), hesap için tümünü çekeceğiz
        .gte('tarih', startOfMonth(new Date()).toISOString())
        .lte('tarih', endOfMonth(new Date()).toISOString())
    ])

    setHareketler(cariRes.data || [])
    setStokHareketleri(stokRes.data || [])
    setYukleniyor(false)
  }

  // --- İSTATİSTİKLER ---
  const istatistik = useMemo(() => {
    const loc = lokasyonlar.find(l => l.id === secilenLokasyonId)
    const isAtolye = loc?.tip === 'atolye'

    // Bu Ayki Toplam Cari Ödemeler
    const buAyBaslangic = startOfMonth(new Date())
    const odemeler = hareketler.filter(h => h.islem_tipi === 'odeme' && new Date(h.tarih) >= buAyBaslangic)
      .reduce((t, h) => t + parseFloat(h.tutar), 0)

    const borclar = hareketler.filter(h => h.islem_tipi === 'borc' && new Date(h.tarih) >= buAyBaslangic)
      .reduce((t, h) => t + parseFloat(h.tutar), 0)

    // Bu Ayki Stok Girdisi (Eğer atölyeyse üretilen adet, mağazaysa sevk edilen)
    let adet = 0
    if (isAtolye) adet = stokHareketleri.filter(s => s.hareket_tipi === 'giris').reduce((t, s) => t + s.miktar, 0)
    else adet = stokHareketleri.filter(s => s.hareket_tipi === 'transfer_giris').reduce((t, s) => t + s.miktar, 0)

    const birimMaliyet = adet > 0 ? (odemeler / adet).toFixed(2) : '0.00'
    const bakiye = borclar - odemeler // Pozitifse bize borçlu/içerde parası var, kurguya göre değişir

    return { odemeler, borclar, adet, birimMaliyet, bakiye, isAtolye }
  }, [hareketler, stokHareketleri, lokasyonlar, secilenLokasyonId])

  async function handleEkle(e: React.FormEvent<HTMLFormElement>) {
     e.preventDefault()
     setFormYukleniyor(true)
     setHata('')

     const f = new FormData(e.currentTarget)
     const dbObj = {
        lokasyon_id: secilenLokasyonId,
        islem_tipi: f.get('islem_tipi'),
        tutar: parseFloat(f.get('tutar') as string),
        aciklama: f.get('aciklama'),
        belge_no: f.get('belge_no'),
        tarih: f.get('tarih')
     }

     const { error } = await supabase.from('cari_hesaplar').insert(dbObj)
     
     setFormYukleniyor(false)
     if (error) {
        setHata('Kayıt eklenirken hata oluştu: ' + error.message)
     } else {
        setModalAcik(false)
        verileriCek()
     }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
       <header className="bg-white border-b border-gray-200 px-4 py-4 shrink-0">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-xl">←</Link>
              <div>
                <h1 className="font-semibold text-gray-900 text-sm">Cari & Faturalandırma</h1>
                <p className="text-xs text-gray-500">Atölye ve mağaza finansal hareket takibi</p>
              </div>
            </div>
            {lokasyonlar.length > 0 && (
               <select 
                  value={secilenLokasyonId} 
                  onChange={e => setSecilenLokasyonId(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-blue-500 bg-white shadow-sm font-medium">
                  {lokasyonlar.map(l => (
                     <option key={l.id} value={l.id}>{l.ad.toUpperCase()} ({l.tip})</option>
                  ))}
               </select>
            )}
          </div>
       </header>

       <main className="flex-1 max-w-4xl mx-auto w-full p-4 space-y-6">
          
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="flex-1 w-full grid grid-cols-3 gap-6">
                 <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Bu Ay {istatistik.isAtolye ? 'Üretilen Gömlek' : 'Gelen Gömlek'}</p>
                    <p className="text-3xl font-black text-gray-800">{istatistik.adet.toLocaleString('tr-TR')} <span className="text-sm font-medium text-gray-400">adet</span></p>
                 </div>
                 <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Bu Ay Ödenen Tutar</p>
                    <p className="text-3xl font-black text-green-600">{istatistik.odemeler.toLocaleString('tr-TR')} <span className="text-xl">₺</span></p>
                 </div>
                 <div>
                    <p className={`text-xs ${istatistik.isAtolye ? 'text-purple-600' : 'text-gray-500'} font-medium mb-1`}>Gömlek Başı {istatistik.isAtolye ? 'Maliyet' : 'Düşen Ödeme'}</p>
                    <p className="text-3xl font-black text-purple-700">{istatistik.birimMaliyet} <span className="text-xl">₺</span></p>
                 </div>
             </div>
             
             <button onClick={() => setModalAcik(true)} className="w-full md:w-auto shrink-0 bg-gray-900 hover:bg-black text-white px-6 py-4 rounded-2xl font-semibold shadow-md whitespace-nowrap">
                + Yeni İşlem Ekle
             </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
             <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">Cari Hareket Kütükleri</h3>
                <span className="text-xs text-gray-500">Son 200 Kayıt</span>
             </div>
             
             {yukleniyor ? (
                <div className="p-10 text-center text-gray-400">Yükleniyor...</div>
             ) : hareketler.length === 0 ? (
                <div className="p-10 text-center text-gray-400">Bu lokasyon için henüz cari hareket girilmemiş.</div>
             ) : (
                <table className="w-full text-left text-sm whitespace-nowrap">
                   <thead className="bg-white text-gray-400 text-xs font-medium border-b border-gray-100">
                      <tr>
                         <th className="px-5 py-3">Tarih</th>
                         <th className="px-5 py-3">İşlem</th>
                         <th className="px-5 py-3">Açıklama</th>
                         <th className="px-5 py-3">Belge No</th>
                         <th className="px-5 py-3 text-right">Tutar</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                      {hareketler.map(h => (
                         <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3 text-gray-500 font-medium">
                               {format(new Date(h.tarih), 'dd MMM yyyy', { locale: tr })}
                            </td>
                            <td className="px-5 py-3">
                               {h.islem_tipi === 'odeme' && <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">ÖDEME</span>}
                               {h.islem_tipi === 'borc' && <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">ALACAK/BORÇ</span>}
                               {h.islem_tipi === 'not' && <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold">NOT</span>}
                            </td>
                            <td className="px-5 py-3 text-gray-700 max-w-[200px] truncate">{h.aciklama || '-'}</td>
                            <td className="px-5 py-3 text-gray-500 text-xs font-mono">{h.belge_no || '-'}</td>
                            <td className={`px-5 py-3 text-right font-bold text-lg ${h.islem_tipi === 'odeme' ? 'text-green-600' : h.islem_tipi === 'borc' ? 'text-red-600' : 'text-gray-400'}`}>
                               {parseFloat(h.tutar).toLocaleString('tr-TR')} ₺
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             )}
          </div>

       </main>

       {/* Yeni İşlem Ekleme Modalı */}
       {modalAcik && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl">
                 <h2 className="text-xl font-bold text-gray-900 mb-6">Cari İşlem Gir</h2>
                 <form onSubmit={handleEkle} className="space-y-4">
                     
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">İşlem Tipi</label>
                           <select name="islem_tipi" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none font-semibold text-gray-700 bg-gray-50">
                              <option value="odeme">Ödeme Yapıldı</option>
                              <option value="borc">Borç Girişi / Fatura</option>
                              <option value="not">Sadece Not (0₺)</option>
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Tarih</label>
                           <input type="date" name="tarih" defaultValue={new Date().toISOString().split('T')[0]} required className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-700 bg-gray-50 focus:border-blue-500 outline-none" />
                        </div>
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Tutar (TL)</label>
                        <input type="number" step="0.01" name="tutar" placeholder="15000" required className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 text-xl font-black text-gray-900 bg-gray-50 focus:border-blue-500 focus:bg-white outline-none" />
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Açıklama (Örn: Ocak Fason Bedeli)</label>
                        <input type="text" name="aciklama" required className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 focus:border-blue-500 outline-none" />
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Belge/Fatura No (Opsiyonel)</label>
                        <input type="text" name="belge_no" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-mono text-gray-700 focus:border-blue-500 outline-none" />
                     </div>

                     {hata && <div className="text-red-600 bg-red-50 p-3 rounded-xl text-sm font-medium border border-red-100">{hata}</div>}

                     <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setModalAcik(false)} className="flex-1 px-4 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-colors">İptal</button>
                        <button type="submit" disabled={formYukleniyor} className="flex-[2] px-4 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-lg shadow-blue-600/30">
                           {formYukleniyor ? 'KAYDEDİLİYOR...' : 'ONAYLA VE KAYDET'}
                        </button>
                     </div>

                 </form>
             </div>
          </div>
       )}
    </div>
  )
}
