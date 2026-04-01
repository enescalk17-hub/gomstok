import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function StokUyarilariWidget() {
  const supabase = await createClient()

  // kritik_stok_analizi view'undan verileri çek
  const { data: uyariListesi, error } = await supabase
    .from('kritik_stok_analizi')
    .select('urun_id, durum, tavsiye_uretim_adedi')
    .in('durum', ['tukendi', 'kritik', 'dusuk'])

  // Eğer tablo veya view oluşturulmamışsa (postgrest error), hata almamak için erken dön
  if (error || !uyariListesi) {
     return (
       <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-6 text-center">
         <p className="text-red-700 font-semibold mb-2">⚠️ Stok Uyarıları Aktif Değil</p>
         <p className="text-xs text-red-600">
           Veritabanı şeması henüz güncellenmedi. Lütfen "kritik_stok_analizi" görünümünü SQL üzerinden oluşturun.
         </p>
       </div>
     )
  }

  const tukendi = uyariListesi.filter(u => u.durum === 'tukendi').length
  const kritik = uyariListesi.filter(u => u.durum === 'kritik').length
  const dusuk = uyariListesi.filter(u => u.durum === 'dusuk').length
  
  // Sadece üretim tavsiyesi bulunanların üretim miktarlarını topla
  const toplamUretimOnerisi = uyariListesi.reduce((sum, u) => sum + (u.tavsiye_uretim_adedi || 0), 0)

  if (uyariListesi.length === 0) {
     return (
       <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-6 shadow-sm">
          <p className="text-green-800 font-semibold text-sm mb-1">✅ Stok Sağlığı Mükemmel</p>
          <p className="text-xs text-green-700">Tüm ürünler optimal stok seviyesinin üzerinde veya yeterli seviyede.</p>
       </div>
     )
  }

  return (
    <div className="bg-white border text-left border-gray-200 rounded-2xl p-0 mb-6 shadow-sm overflow-hidden">
        <div className="bg-red-50 border-b border-red-100 px-5 py-4">
           <h3 className="text-red-800 font-bold text-sm">⚠️ STOK UYARILARI</h3>
        </div>
        <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
               <div className="bg-red-50 p-3 rounded-xl flex justify-between items-center border border-red-100">
                  <span className="text-red-700 font-bold text-sm">🔴 Tükendi:</span>
                  <span className="text-red-900 font-mono font-bold">{tukendi} ürün</span>
               </div>
               <div className="bg-orange-50 p-3 rounded-xl flex justify-between items-center border border-orange-100">
                  <span className="text-orange-700 font-bold text-sm">🟠 Kritik:</span>
                  <span className="text-orange-900 font-mono font-bold">{kritik} ürün</span>
               </div>
               <div className="bg-yellow-50 p-3 rounded-xl flex justify-between items-center border border-yellow-100">
                  <span className="text-yellow-700 font-bold text-sm">🟡 Düşük:</span>
                  <span className="text-yellow-900 font-mono font-bold">{dusuk} ürün</span>
               </div>
            </div>

            <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
               <div>
                  <p className="text-xs text-gray-500 font-medium uppercase mb-1">Toplam Tavsiye Üretim / Sipariş</p>
                  <p className="text-2xl font-black text-gray-900">{toplamUretimOnerisi} <span className="text-sm font-medium text-gray-500">adet</span></p>
               </div>
               <Link href="/dashboard/uyarilar" 
                     className="bg-gray-900 hover:bg-black text-white text-sm font-medium px-6 py-3 rounded-xl transition-colors text-center shadow-md flex items-center justify-center gap-2">
                 <span>Listele & Üretim Emri Çıkar</span>
                 <span className="text-lg">→</span>
               </Link>
            </div>
        </div>
    </div>
  )
}
