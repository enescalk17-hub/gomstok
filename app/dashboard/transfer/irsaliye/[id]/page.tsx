import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'

// Server Component for fetching Waybill (İrsaliye) details
export default async function IrsaliyeYazdirPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Koliyi çek
  const { data: koli, error } = await supabase
    .from('koliler')
    .select(`
      *,
      kaynak:lokasyonlar!koliler_kaynak_lokasyon_id_fkey(ad, adres, telefon),
      hedef:lokasyonlar!koliler_hedef_lokasyon_id_fkey(ad, adres, telefon)
    `)
    .eq('id', id)
    .single()

  if (error || !koli) {
    return notFound()
  }

  // Koli içeriğini çek
  const { data: icerik } = await supabase
    .from('koli_icerik')
    .select(`
      planlanan_adet,
      urun:urunler(
        barkod,
        model:modeller(ad),
        renk:renkler(ad),
        beden:bedenler(ad)
      )
    `)
    .eq('koli_id', id)

  // Basit tarih formatı
  const fTarih = (dateStr: string) => {
     if(!dateStr) return '-'
     const d = new Date(dateStr)
     return d.toLocaleDateString('tr-TR') + ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white print:p-0 p-8 flex justify-center">
      
      {/* Sayfa Kontrolleri (Sadece Ekranda Görünür) */}
      <div className="print:hidden fixed top-4 right-4 flex gap-3">
        <Link href="/dashboard/transfer" className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded shadow-sm hover:bg-gray-50 transition-colors font-medium">
           Geri Dön
        </Link>
        <button onClick={() => { /* Client side print için, ama RSC içindeyiz. Global `window.print` triggerlanmalı, aşağıda bir inline script kullanacağız.*/ }} 
                className="bg-blue-600 border border-blue-600 text-white px-4 py-2 rounded shadow-sm hover:bg-blue-700 transition-colors font-medium cursor-pointer"
                id="btn-print">
           🖨️ PDF Seç & Yazdır
        </button>
      </div>

      {/* İRSALİYE A4 KAĞIDI */}
      <div className="bg-white w-full max-w-[210mm] min-h-[297mm] p-[15mm] shadow-lg print:shadow-none print:w-[210mm] text-gray-900 border border-gray-200 print:border-none mx-auto relative text-sm">
         
         {/* HEADER */}
         <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
            <div>
               <h1 className="text-3xl font-black tracking-tight">GÖMSTOK</h1>
               <h2 className="text-lg font-semibold text-gray-600 tracking-widest mt-1">SEVKİYAT İRSALİYESİ</h2>
            </div>
            <div className="text-right">
               <p className="font-mono text-lg font-bold">No: {koli.irsaliye_no || koli.koli_no}</p>
               <p className="text-gray-600 mt-1">Tarih: {fTarih(koli.gonderilme)}</p>
            </div>
         </div>

         {/* ADRESLER */}
         <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="p-4 border border-gray-300 rounded-lg">
               <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Gönderici</p>
               <p className="font-bold text-lg">{koli.kaynak?.ad}</p>
               <p className="text-gray-700 mt-1 whitespace-pre-line leading-tight">{koli.kaynak?.adres || 'Sistemde adres kayıtlı değil.'}</p>
               <p className="text-gray-600 mt-3 font-mono text-xs">Tel: {koli.kaynak?.telefon || '-'}</p>
            </div>
            <div className="p-4 border border-gray-300 rounded-lg">
               <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Alıcı</p>
               <p className="font-bold text-lg">{koli.hedef?.ad}</p>
               <p className="text-gray-700 mt-1 whitespace-pre-line leading-tight">{koli.hedef?.adres || 'Sistemde adres kayıtlı değil.'}</p>
               <p className="text-gray-600 mt-3 font-mono text-xs">Tel: {koli.hedef?.telefon || '-'}</p>
            </div>
         </div>

         {/* NAKLİYE BİLGİLERİ */}
         <div className="bg-gray-50 p-4 border border-gray-300 rounded-lg mb-8">
             <p className="text-xs font-bold text-gray-500 mb-2 uppercase border-b border-gray-200 pb-2">Nakliye Bilgileri</p>
             <div className="grid grid-cols-2 gap-4 mt-3">
                <p><span className="font-semibold w-24 inline-block">Araç Plaka:</span> {koli.plaka || '-'}</p>
                <p><span className="font-semibold w-32 inline-block">Şoför Telefon:</span> {koli.sofor_telefon || '-'}</p>
                <p><span className="font-semibold w-24 inline-block">Şoför / Firma:</span> {koli.sofor || '-'}</p>
                <p><span className="font-semibold w-32 inline-block">Tahmini Varış:</span> {fTarih(koli.tahmini_teslim)}</p>
             </div>
         </div>

         {/* ÜRÜN LİSTESİ */}
         <div className="mb-12">
            <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Ürün Listesi</p>
            <table className="w-full border-collapse">
               <thead>
                  <tr className="border-y-2 border-black">
                     <th className="py-2 px-1 text-left">Barkod</th>
                     <th className="py-2 px-1 text-left">Model</th>
                     <th className="py-2 px-1 text-left">Renk</th>
                     <th className="py-2 px-1 text-center">Beden</th>
                     <th className="py-2 px-1 text-right">Adet</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-300">
                  {icerik?.map((item: any, i) => (
                    <tr key={i}>
                       <td className="py-3 px-1 font-mono text-xs text-gray-600">{item.urun?.barkod}</td>
                       <td className="py-3 px-1 font-semibold">{item.urun?.model?.ad}</td>
                       <td className="py-3 px-1">{item.urun?.renk?.ad}</td>
                       <td className="py-3 px-1 text-center bg-gray-50 font-bold border-l border-r border-white">{item.urun?.beden?.ad}</td>
                       <td className="py-3 px-1 text-right font-bold text-base">{item.planlanan_adet}</td>
                    </tr>
                  ))}
               </tbody>
               <tfoot>
                  <tr className="border-t-2 border-black font-bold text-lg">
                     <td colSpan={4} className="py-4 text-right pr-4 uppercase">Genel Toplam:</td>
                     <td className="py-4 text-right">{koli.toplam_adet} Adet</td>
                  </tr>
               </tfoot>
            </table>
         </div>

         {/* İMZALAR */}
         <div className="grid grid-cols-2 gap-8 mt-16 pt-8 break-inside-avoid">
            <div className="text-center">
               <p className="font-bold text-gray-500 mb-12">TESLİM EDEN</p>
               <p className="border-t border-gray-400 mx-8 pt-2 text-sm text-gray-500">Ad Soyad / İmza</p>
            </div>
            <div className="text-center">
               <p className="font-bold text-gray-500 mb-12">TESLİM ALAN</p>
               <p className="border-t border-gray-400 mx-8 pt-2 text-sm text-gray-500">Ad Soyad / İmza</p>
            </div>
         </div>
         
         <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-gray-400 font-mono print:block hidden">
            GömStok Lojistik Yönetimi — Çıktı Alınma Tarihi: {new Date().toLocaleString('tr-TR')}
         </div>
      </div>
      
      {/* Client-side print script injected */}
      <script dangerouslySetInnerHTML={{__html: `
        document.getElementById('btn-print').addEventListener('click', function() {
           window.print();
        });
      `}} />
    </div>
  )
}
