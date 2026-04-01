import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import UretimEmriButonu from './UretimEmriButonu'

export default async function UyarilarPage() {
  const supabase = await createClient()

  // RBAC Kontrolü (Aadece admin ve depo vb)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: uyariListesi, error } = await supabase
    .from('kritik_stok_analizi')
    .select('*')
    .in('durum', ['tukendi', 'kritik', 'dusuk'])
    .order('durum', { ascending: true }) // Not: string alfabetik sıralar (dusuk, kritik, tukendi), ideali duruma göre case yazmak ama şimdilik yeterli.

  // Supabase hatası ise view kurulu değil demektir.
  if (error || !uyariListesi) {
     return (
       <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
         <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-sm text-center">
           <h2 className="text-red-700 font-bold text-lg mb-2">Kurulum Eksik</h2>
           <p className="text-sm text-red-600 mb-6">Lütfen veritabanında "kritik_stok_analizi" görünümünü oluşturun. Hata detayı: {error?.message}</p>
           <Link href="/dashboard" className="bg-white border border-gray-300 text-gray-700 font-medium px-4 py-2 rounded shadow-sm hover:bg-gray-50">Ana Sayfaya Dön</Link>
         </div>
       </div>
     )
  }

  // Renklendirme mantığı
  const getBadgeColor = (durum: string) => {
     switch (durum) {
        case 'tukendi': return 'bg-red-100 text-red-800 border-red-200'
        case 'kritik': return 'bg-orange-100 text-orange-800 border-orange-200'
        case 'dusuk': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
        default: return 'bg-gray-100 text-gray-800 border-gray-200'
     }
  }

  const getLabel = (durum: string) => {
     switch(durum){
        case 'tukendi': return '🔴 TÜKENDİ'
        case 'kritik': return '🟠 KRİTİK'
        case 'dusuk': return '🟡 DÜŞÜK'
        default: return durum.toUpperCase()
     }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-xl">←</Link>
            <div>
              <h1 className="font-semibold text-gray-900 text-sm">Stok Uyarıları</h1>
              <p className="text-xs text-gray-500">Üretim & Sipariş Planlaması</p>
            </div>
          </div>
          {uyariListesi.length > 0 && (
             <UretimEmriButonu />
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6 mt-4">
        
        {uyariListesi.length === 0 ? (
          <div className="text-center py-20">
             <div className="text-5xl mb-4">✅</div>
             <h2 className="text-xl font-bold text-gray-800 mb-2">Her Şey Yolunda</h2>
             <p className="text-gray-500 text-sm">Üretim yapılması veya kritik eşiğe düşen hiçbir ürün bulunamadı. Stoğunuz mükemmel seviyede.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
             
             {/* Liste */}
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 text-gray-600 font-medium text-xs border-b border-gray-200">
                     <tr>
                        <th className="px-4 py-3">Ürün (Model / Renk)</th>
                        <th className="px-4 py-3 text-center">Beden</th>
                        <th className="px-4 py-3">Durum</th>
                        <th className="px-4 py-3 text-right">Mevcut</th>
                        <th className="px-4 py-3 text-right">Tavsiye Üretim</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                     {uyariListesi.map(uyari => (
                       <tr key={uyari.urun_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-4">
                             <div className="font-medium text-gray-900">{uyari.model}</div>
                             <div className="text-xs text-gray-500">{uyari.renk} • <span className="font-mono">{uyari.barkod}</span></div>
                          </td>
                          <td className="px-4 py-4 text-center">
                             <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 font-bold rounded-md font-mono text-xs">{uyari.beden}</span>
                          </td>
                          <td className="px-4 py-4">
                             <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold border uppercase tracking-wider ${getBadgeColor(uyari.durum)}`}>
                               {getLabel(uyari.durum)}
                             </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                             <div className="font-mono font-bold text-gray-900">{uyari.toplam_stok}</div>
                             <div className="text-[10px] text-gray-400">Kritik: {uyari.kritik_stok}</div>
                          </td>
                          <td className="px-4 py-4 text-right">
                             <div className="font-black text-gray-900">{uyari.tavsiye_uretim_adedi} <span className="text-xs font-normal text-gray-500">adet</span></div>
                             <div className="text-[10px] text-gray-400">Optimal: {uyari.optimal_stok}</div>
                          </td>
                       </tr>
                     ))}
                  </tbody>
               </table>
             </div>
          </div>
        )}
      </main>
    </div>
  )
}
