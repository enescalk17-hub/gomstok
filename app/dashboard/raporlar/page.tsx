'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend } from 'recharts'
import { startOfDay, startOfWeek, startOfMonth, subMonths, isAfter, format } from 'date-fns'

export default function RaporlarPage() {
  const supabase = createClient()
  
  // States
  const [aktifSekme, setAktifSekme] = useState('grafikler')
  const [tarihAraligi, setTarihAraligi] = useState('bu_ay')
  const [yukleniyor, setYukleniyor] = useState(true)

  // Data States
  const [ozet, setOzet] = useState<any[]>([])
  const [hareketler, setHareketler] = useState<any[]>([])
  const [kumasHareketleri, setKumasHareketleri] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [tarihAraligi])

  async function fetchData() {
    setYukleniyor(true)
    
    // Tarih filtresi belirleme
    let baslangic: Date | null = null
    const bugun = new Date()
    if (tarihAraligi === 'bugun') baslangic = startOfDay(bugun)
    else if (tarihAraligi === 'bu_hafta') baslangic = startOfWeek(bugun, { weekStartsOn: 1 })
    else if (tarihAraligi === 'bu_ay') baslangic = startOfMonth(bugun)
    else if (tarihAraligi === 'son_3_ay') baslangic = subMonths(bugun, 3)

    let shQuery = supabase.from('stok_hareketleri').select(`
      id, hareket_tipi, miktar, tarih, aciklama,
      urun:urunler(barkod, model:modeller(ad), renk:renkler(ad), beden:bedenler(ad)),
      lokasyon:lokasyonlar(ad, tip)
    `).order('tarih', { ascending: false }).limit(2000)

    let khQuery = supabase.from('kumas_hareketleri').select(`
      id, islem_tipi, miktar_metre, tarih:olusturulma, notlar, hedef_tahmini_adet,
      kumas:kumaslar(renk, tur:kumas_turleri(ad), desen:kumas_desenleri(ad)),
      cikis:lokasyonlar!kumas_hareketleri_cikis_lokasyon_id_fkey(ad),
      varis:lokasyonlar!kumas_hareketleri_varis_lokasyon_id_fkey(ad)
    `).order('olusturulma', { ascending: false }).limit(2000)

    if (baslangic) {
      shQuery = shQuery.gte('tarih', baslangic.toISOString())
      khQuery = khQuery.gte('olusturulma', baslangic.toISOString())
    }

    const [oz, sh, kh] = await Promise.all([
      supabase.from('genel_stok_ozet').select('*'), // Bu anlık stok olduğu için tarihe göre filtrelenmez
      shQuery,
      khQuery
    ])

    setOzet(oz.data || [])
    setHareketler(sh.data || [])
    setKumasHareketleri(kh.data || [])
    setYukleniyor(false)
  }

  // --- KPI HESAPLAMALARI ---
  const kpis = useMemo(() => {
    let uretilen = 0, sevk = 0, fire = 0, sayimFarki = 0
    hareketler.forEach(h => {
      // Atölyeye giriş = Üretim
      if (h.hareket_tipi === 'giris' && h.lokasyon?.tip === 'atolye') uretilen += h.miktar
      // Mağaza/Depoya sevk
      if (h.hareket_tipi === 'transfer_cikis') sevk += Math.abs(h.miktar)
      if (h.hareket_tipi === 'fire') fire += Math.abs(h.miktar)
      if (h.hareket_tipi === 'sayim') sayimFarki += h.miktar // Eksi veya artı
    })
    return { uretilen, sevk, fire, sayimFarki }
  }, [hareketler])

  // --- GRAFİK 1: LOKASYON DAĞILIMI (Bar Chart) ---
  const lokasyonDagilimi = useMemo(() => {
    const data = [
      { name: 'Atölye', stok: ozet.reduce((t, s) => t + (s.atolye || 0), 0), fill: '#3b82f6' },
      { name: 'Depo', stok: ozet.reduce((t, s) => t + (s.depo || 0), 0), fill: '#a855f7' },
      { name: 'Mağaza', stok: ozet.reduce((t, s) => t + (s.magaza || 0), 0), fill: '#22c55e' },
    ]
    return data
  }, [ozet])

  // --- GRAFİK 2: GÜNLÜK TRANSFER HACMİ ---
  const transferHacmi = useMemo(() => {
    const gunler: Record<string, number> = {}
    hareketler.filter(h => h.hareket_tipi === 'transfer_cikis').forEach(h => {
      const g = format(new Date(h.tarih), 'dd MMM')
      gunler[g] = (gunler[g] || 0) + Math.abs(h.miktar)
    })
    return Object.keys(gunler).reverse().map(k => ({ tarih: k, Adet: gunler[k] }))
  }, [hareketler])

  // --- GRAFİK 3: STOK TRENDİ (Line Chart - Kaba Simülasyon) ---
  // Geriye doğru hareketleri çıkararak geçmiş stoka ulaşırız
  const stokTrendi = useMemo(() => {
    let guncelAtolye = lokasyonDagilimi[0].stok
    let guncelDepo = lokasyonDagilimi[1].stok
    let guncelMagaza = lokasyonDagilimi[2].stok

    const data = []
    data.push({ tarih: 'Bugün', Atölye: guncelAtolye, Depo: guncelDepo, Mağaza: guncelMagaza })

    // Son 1 haftayı tersten gidelim
    const gruplar: Record<string, any[]>  = {}
    hareketler.forEach(h => {
      const d = format(new Date(h.tarih), 'dd MMM')
      if(!gruplar[d]) gruplar[d] = []
      gruplar[d].push(h)
    })

    const siraliGunler = Object.keys(gruplar).slice(0, 10) // Son 10 gün hareketi
    siraliGunler.forEach(gun => {
       gruplar[gun].forEach(h => {
          const m = h.hareket_tipi === 'cikis' || h.hareket_tipi === 'transfer_cikis' || h.hareket_tipi === 'fire' ? -h.miktar : h.miktar
          // Eğer bugün stok X ise ve o gün Y değiştiyse, dünkü stok = X - Y olur
          if (h.lokasyon?.tip === 'atolye') guncelAtolye -= m
          else if (h.lokasyon?.tip === 'depo') guncelDepo -= m
          else if (h.lokasyon?.tip === 'magaza') guncelMagaza -= m
       })
       data.unshift({ tarih: gun, Atölye: Math.max(0, guncelAtolye), Depo: Math.max(0, guncelDepo), Mağaza: Math.max(0, guncelMagaza) })
    })
    return data
  }, [hareketler, lokasyonDagilimi])

  // Print PDF Fonksiyonu (Native Browser Print API)
  function yazdir() {
    window.print()
  }

  return (
    <div className="min-h-screen bg-gray-50 print-bg-white pb-20">
      
      {/* HEADER (Baskıda Görünür Başlığa Dönüşür) */}
      <div className="hidden print:block text-center py-6 border-b border-gray-300 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">GömStok Yönetim Raporu</h1>
        <p className="text-gray-500">Tarih: {new Date().toLocaleDateString('tr-TR')} | Kapsam: {tarihAraligi.replace('_', ' ').toUpperCase()}</p>
      </div>

      <header className="bg-white border-b border-gray-200 px-4 py-4 print:hidden sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-xl">←</Link>
            <div>
              <h1 className="font-semibold text-gray-900">Gelişmiş Raporlar</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <select 
               value={tarihAraligi} 
               onChange={e => setTarihAraligi(e.target.value)}
               className="border border-gray-200 bg-gray-50 text-sm font-medium px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
               <option value="bugun">Bugün</option>
               <option value="bu_hafta">Bu Hafta</option>
               <option value="bu_ay">Bu Ay</option>
               <option value="son_3_ay">Son 3 Ay</option>
               <option value="tum_zamanlar">Tüm Zamanlar</option>
            </select>

            <button onClick={yazdir} className="bg-gray-900 hover:bg-black text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
              PDF / Yazdır
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-6">
        
        {/* KPI KARTLARI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm print:border-gray-400">
             <p className="text-xs font-semibold text-gray-500 mb-1">📦 ÜRETİLEN GÖMLEK</p>
             <p className="text-2xl font-bold text-gray-900">{kpis.uretilen}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm print:border-gray-400">
             <p className="text-xs font-semibold text-gray-500 mb-1">📤 TRANSFER HACMİ</p>
             <p className="text-2xl font-bold text-gray-900">{kpis.sevk}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm print:border-gray-400">
             <p className="text-xs font-semibold text-red-500 mb-1">🔥 TOPLAM FİRE</p>
             <p className="text-2xl font-bold text-red-600">{kpis.fire}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm print:border-gray-400">
             <p className="text-xs font-semibold text-purple-600 mb-1">⚡ SAYIM FARKI</p>
             <p className="text-2xl font-bold text-purple-700">{kpis.sayimFarki > 0 ? '+'+kpis.sayimFarki : kpis.sayimFarki}</p>
          </div>
        </div>

        {/* SEKME NAVİGASYONU (Print'te gizle) */}
        <div className="flex overflow-x-auto gap-2 pb-2 print:hidden scrollbar-hide">
          {[
            { id: 'grafikler', ad: '📊 Grafikler' },
            { id: 'stok_ozeti', ad: '📦 Stok Özeti' },
            { id: 'kumas_hareketleri', ad: '🧵 Kumaş Kullanımı' },
            { id: 'fire_raporu', ad: '🔥 Fire & Kayıp' },
            { id: 'tum_hareketler', ad: '📋 Tüm Hareketler' },
          ].map(sekme => (
            <button key={sekme.id} onClick={() => setAktifSekme(sekme.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors
               ${aktifSekme === sekme.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              {sekme.ad}
            </button>
          ))}
        </div>

        {yukleniyor ? (
          <div className="py-20 text-center text-gray-400">Veriler Derleniyor...</div>
        ) : (
          <div className="space-y-6">
            
            {/* SEKME 1: GRAFİKLER */}
            {(aktifSekme === 'grafikler' || typeof window === 'undefined') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 
                 <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm print:break-inside-avoid">
                    <h3 className="text-sm font-semibold text-gray-800 mb-4">Lokasyon Bazlı Stok Dağılımı</h3>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={lokasyonDagilimi} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                           <XAxis dataKey="name" tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                           <YAxis tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                           <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                           <Bar dataKey="stok" radius={[4, 4, 0, 0]} />
                         </BarChart>
                      </ResponsiveContainer>
                    </div>
                 </div>

                 <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm print:break-inside-avoid">
                    <h3 className="text-sm font-semibold text-gray-800 mb-4">Günlük Transfer Hacmi</h3>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={transferHacmi} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                           <XAxis dataKey="tarih" tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                           <YAxis tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                           <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                           <Bar dataKey="Adet" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                         </BarChart>
                      </ResponsiveContainer>
                    </div>
                 </div>

                 <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm md:col-span-2 print:break-inside-avoid">
                    <h3 className="text-sm font-semibold text-gray-800 mb-4">Stok Trendi (Simülasyon)</h3>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                         <LineChart data={stokTrendi} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                           <XAxis dataKey="tarih" tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                           <YAxis tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                           <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                           <Legend iconType="circle" wrapperStyle={{fontSize: '12px'}} />
                           <Line type="monotone" dataKey="Atölye" stroke="#3b82f6" strokeWidth={3} dot={false} />
                           <Line type="monotone" dataKey="Depo" stroke="#a855f7" strokeWidth={3} dot={false} />
                           <Line type="monotone" dataKey="Mağaza" stroke="#22c55e" strokeWidth={3} dot={false} />
                         </LineChart>
                      </ResponsiveContainer>
                    </div>
                 </div>

              </div>
            )}

            {/* SEKME 2: FİRE / KAYIP RAPORU */}
            {aktifSekme === 'fire_raporu' && (
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                 <div className="p-4 bg-gray-50 border-b border-gray-200">
                   <h3 className="font-semibold text-gray-800 text-sm">Fire ve Sayım Kayıpları</h3>
                   <p className="text-xs text-gray-500">Kayıp sebepleri ve düzeltmeler</p>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                       <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                          <tr>
                             <th className="px-4 py-3">Tarih</th>
                             <th className="px-4 py-3">Tip</th>
                             <th className="px-4 py-3">Model/Barkod</th>
                             <th className="px-4 py-3">Lokasyon</th>
                             <th className="px-4 py-3">Nedeni</th>
                             <th className="px-4 py-3 text-right">Adet</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                          {hareketler.filter(h => h.hareket_tipi === 'fire' || h.hareket_tipi === 'sayim').map(h => (
                             <tr key={h.id} className="hover:bg-gray-50">
                               <td className="px-4 py-3 text-gray-500 text-xs">{format(new Date(h.tarih), 'dd.MM.yyyy HH:mm')}</td>
                               <td className="px-4 py-3">
                                 {h.hareket_tipi === 'fire' ? <span className="bg-red-100 text-red-700 px-2 py-1 rounded">Fire</span> : <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded">Sayım Farkı</span>}
                               </td>
                               <td className="px-4 py-3">
                                  <p className="font-medium">{h.urun?.model?.ad} {h.urun?.renk?.ad}</p>
                                  <p className="text-xs text-gray-400 font-mono">{h.urun?.barkod}</p>
                               </td>
                               <td className="px-4 py-3 text-gray-600">{h.lokasyon?.ad}</td>
                               <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{h.aciklama || '-'}</td>
                               <td className="px-4 py-3 text-right font-bold text-red-600">{h.miktar}</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
            )}

            {/* SEKME 3: KUMAŞ HAREKETLERİ */}
            {aktifSekme === 'kumas_hareketleri' && (
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                 <div className="p-4 bg-gray-50 border-b border-gray-200">
                   <h3 className="font-semibold text-gray-800 text-sm">Kumaş Tüketimi ve Verimlilik</h3>
                   <p className="text-xs text-gray-500">Sevk edilen kumaşlar ve beklenen hedefler.</p>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                       <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                          <tr>
                             <th className="px-4 py-3">Tarih</th>
                             <th className="px-4 py-3">İşlem</th>
                             <th className="px-4 py-3">Kumaş Meterya</th>
                             <th className="px-4 py-3 text-center">Metraj</th>
                             <th className="px-4 py-3">Tahmini Gömlek</th>
                             <th className="px-4 py-3">Not</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                          {kumasHareketleri.map(k => (
                             <tr key={k.id} className="hover:bg-gray-50">
                               <td className="px-4 py-3 text-gray-500 text-xs">{format(new Date(k.tarih), 'dd.MM.yyyy')}</td>
                               <td className="px-4 py-3">
                                 {k.islem_tipi === 'sevk' ? <span className="text-blue-700 bg-blue-50 px-2 py-1 rounded">Transfer (Sevk)</span> : <span className="text-amber-700 bg-amber-50 px-2 py-1 rounded">Kesim (Tüketim)</span>}
                               </td>
                               <td className="px-4 py-3 font-medium text-gray-800">
                                 {k.kumas?.tur?.ad} {k.kumas?.desen?.ad} ({k.kumas?.renk})
                               </td>
                               <td className="px-4 py-3 text-center font-bold text-gray-900">{k.miktar_metre}m</td>
                               <td className="px-4 py-3 text-purple-700 font-medium">
                                 {k.hedef_tahmini_adet ? `~${k.hedef_tahmini_adet} adet` : '-'}
                               </td>
                               <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-xs">{k.notlar || '-'}</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
            )}

            {/* SEKME 4: STOK ÖZETİ */}
            {aktifSekme === 'stok_ozeti' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-blue-50 border border-blue-200 p-4 rounded-2xl">
                   <p className="text-blue-800 text-sm">Aşağıdaki tablo güncel (anlık) durumu gösterir, tarih aralığı filtresinden etkilenmez.</p>
                   <button onClick={() => {
                        const satirlar = ozet.map(s => [s.barkod, s.model, s.renk, s.beden, s.atolye, s.magaza, s.depo, s.toplam])
                        const icerik = ['Barkod\tModel\tRenk\tBeden\tAtolye\tMagaza\tDepo\tToplam\n', ...satirlar.map(s => s.join('\t'))].join('\n')
                        const blob = new Blob(['\ufeff' + icerik], { type: 'text/plain;charset=utf-8' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = 'stok_ozeti.xls'
                        a.click()
                   }} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded-xl">Excel İndir</button>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="hidden sm:grid grid-cols-9 px-4 py-2 border-b border-gray-100 text-xs text-gray-400 font-medium uppercase tracking-wide">
                    <div className="col-span-3">Ürün</div>
                    <div className="text-center">Atölye</div>
                    <div className="text-center">Mağaza</div>
                    <div className="text-center">Depo</div>
                    <div className="text-center">Yolda</div>
                    <div className="col-span-2 text-right">Toplam</div>
                  </div>
                  {ozet.slice(0, 100).map((satir, i) => (
                    <div key={satir.barkod} className="px-4 py-3 border-b border-gray-50 flex flex-col sm:grid sm:grid-cols-9 sm:items-center">
                       <div className="col-span-3">
                          <p className="text-sm font-medium text-gray-900">{satir.model} — {satir.renk} <span className="text-xs bg-gray-100 px-1 rounded">{satir.beden}</span></p>
                          <p className="text-xs text-gray-400 font-mono">{satir.barkod}</p>
                       </div>
                       <div className="text-center text-sm font-medium text-blue-700 mt-2 sm:mt-0">Atölye: {satir.atolye || 0}</div>
                       <div className="text-center text-sm font-medium text-green-700">Mağ:<br className="sm:hidden"/> {satir.magaza || 0}</div>
                       <div className="text-center text-sm font-medium text-purple-700">Depo:<br className="sm:hidden"/> {satir.depo || 0}</div>
                       <div className="text-center text-sm font-medium text-amber-600">Yol:<br className="sm:hidden"/> {satir.yolda || 0}</div>
                       <div className="col-span-2 text-right mt-2 sm:mt-0"><span className="text-sm font-bold text-gray-900 border-t sm:border-none pt-2 sm:pt-0 block w-full text-center sm:text-right">Top: {satir.toplam}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SEKME 5: TÜM HAREKETLER */}
            {aktifSekme === 'tum_hareketler' && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-gray-100 flex justify-between text-xs text-gray-500 font-medium bg-gray-50">
                  <span>HAREKETLER KÜTÜĞÜ (Filtrelenmiş Uzun Liste)</span>
                  <span>{hareketler.length} kayıt</span>
                </div>
                <div className="overflow-x-auto max-h-[600px]">
                   <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-gray-50 text-gray-500 sticky top-0 border-b border-gray-100 font-medium shadow-sm">
                          <tr>
                             <th className="px-4 py-3">Tarih</th>
                             <th className="px-4 py-3">İşlem</th>
                             <th className="px-4 py-3">Ürün</th>
                             <th className="px-4 py-3">Lokasyon</th>
                             <th className="px-4 py-3 text-right">Miktar</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {hareketler.map(h => (
                           <tr key={h.id} className="hover:bg-gray-50">
                             <td className="px-4 py-3 text-xs text-gray-500">{format(new Date(h.tarih), 'dd.MM.yyyy HH:mm')}</td>
                             <td className="px-4 py-3">
                                <span className={`text-xs font-medium px-2 py-1 rounded 
                                  ${h.hareket_tipi.includes('giris') ? 'bg-green-100 text-green-700' : 
                                    h.hareket_tipi.includes('cikis') ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                  }`}>
                                   {h.hareket_tipi.replace('_', ' ').toUpperCase()}
                                </span>
                             </td>
                             <td className="px-4 py-3">
                                <p className="font-medium text-gray-900">{h.urun?.model?.ad} {h.urun?.renk?.ad}</p>
                                <p className="text-xs text-gray-400 font-mono">{h.urun?.barkod}</p>
                             </td>
                             <td className="px-4 py-3 text-gray-600">{h.lokasyon?.ad}</td>
                             <td className={`px-4 py-3 text-right font-bold ${h.miktar > 0 ? 'text-green-600' : 'text-red-600'}`}>
                               {h.miktar > 0 ? '+' : ''}{h.miktar}
                             </td>
                           </tr>
                        ))}
                      </tbody>
                   </table>
                </div>
              </div>
            )}

          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print-bg-white, .print-bg-white * {
            visibility: visible;
          }
          .print-bg-white {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}} />
    </div>
  )
}
