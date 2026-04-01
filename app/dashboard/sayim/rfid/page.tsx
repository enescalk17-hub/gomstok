'use client'

import { useState, useEffect } from 'react'
import { useBatchScanner } from '@/hooks/useBatchScanner'
import { useTerminalKeys } from '@/hooks/useTerminalKeys'
import { createClient } from '@/lib/supabase/client'
import { addOfflineTask } from '@/lib/offlineStore'
import Link from 'next/link'

export default function RfidKoliSayimPage() {
  const [okunanBarkodlar, setOkunanBarkodlar] = useState<Set<string>>(new Set())
  const [sonParti, setSonParti] = useState<number>(0)
  const [hata, setHata] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  const DEFAULT_LOKASYON = '5f49cd51-3b52-47d5-a352-78d1ab2157a4'

  useEffect(() => {
     setIsOnline(navigator.onLine)
     const onOn = () => setIsOnline(true)
     const onOff = () => setIsOnline(false)
     window.addEventListener('online', onOn)
     window.addEventListener('offline', onOff)
     return () => {
        window.removeEventListener('online', onOn)
        window.removeEventListener('offline', onOff)
     }
  }, [])

  // Agresif RFID Tarama Buffer Hook'u
  useBatchScanner((yeniBarkodDizisi) => {
      setHata('')
      setSonParti(yeniBarkodDizisi.length)
      
      setOkunanBarkodlar(prev => {
         const kopya = new Set(prev)
         yeniBarkodDizisi.forEach(b => {
             // RFID çipler sık sık aynı kodu defalarca gönderir, Set yapısı sayesinde otomatik tekilleşir
             // Gömlek barkodları veya EPC formatları direkt unique key olarak kaydedilir.
             const clean = b.trim()
             if (clean) kopya.add(clean)
         })
         return kopya
      })
      
      if (typeof window !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(50) // Her parti okumada hissiyat
      }
  }, 300) // 300ms sessizlik olunca partiyi yolla

  useTerminalKeys(() => {
      tamamla()
  })

  const sifirla = () => {
      if(confirm("Tüm sayımı sıfırlamak istiyor musunuz?")) {
          setOkunanBarkodlar(new Set())
          setSonParti(0)
      }
  }

  const tamamla = async () => {
      if (okunanBarkodlar.size === 0) return setHata("Lütfen koli/ürün okutun.")
      
      setYukleniyor(true)
      
      // RFID okumalarında her etiket Unique (tekil ürün) olduğu için miktar hep 1'dir.
      const barkodListesi = Array.from(okunanBarkodlar)

      if (isOnline) {
          const supabase = createClient()
          // Toplu fetch optimizasyonu: Her barkoda ayrı istek atmak yerine IN sorgusu
          const { data } = await supabase.from('urunler').select('id, barkod').in('barkod', barkodListesi)
          
          if (data && data.length > 0) {
              for (const urun of data) {
                  // Her eşleşen RFID EPC'sini (Barkod'u) sayım olarak it.
                  await addOfflineTask('SAYIM_EKLE', { urun_id: urun.id, lokasyon_id: DEFAULT_LOKASYON, secilenSayim: 1 })
              }
          }
          if (data && data.length < barkodListesi.length) {
              setHata(`Uyarı: Okunan ${barkodListesi.length} çipten sadece ${data.length} tanesi GömStok'ta bulundu!`)
          }
      } else {
          for (const barkod of barkodListesi) {
              await addOfflineTask('SAYIM_EKLE', { urun_id: `offline_bekleyen_rfid_${barkod}`, lokasyon_id: DEFAULT_LOKASYON, secilenSayim: 1, raw_barkod: barkod })
          }
      }

      // Kısmi hata göstermek için timeout ile bekletilebilir ama UAT için direkt temizliyoruz:
      if(isOnline && hata === '') {
         setOkunanBarkodlar(new Set())
         setSonParti(0)
      } else if (!isOnline) {
         setOkunanBarkodlar(new Set())
         setSonParti(0)
      }
      
      setYukleniyor(false)
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-mono selection:bg-gray-800">
       <div className="absolute top-2 left-2 flex gap-2">
           <Link href="/dashboard" className="px-3 py-1 bg-gray-900 border border-gray-700 rounded text-xs text-gray-400">Çıkış</Link>
           {!isOnline ? <span className="px-2 py-1 bg-red-900 border border-red-700 text-red-100 rounded text-[10px] animate-pulse">OFFLINE</span> : <span className="px-2 py-1 bg-blue-900 border border-blue-700 text-blue-100 rounded text-[10px]">RFID ONLINE</span>}
       </div>
       
       <div className="flex-1 flex flex-col items-center justify-center p-4">
          
          <div className="w-full max-w-sm rounded-[2rem] border-[3px] border-gray-800 bg-gray-950 p-8 shadow-[0_0_50px_rgba(37,99,235,0.1)] flex flex-col items-center relative overflow-hidden">
             
             {/* Radar Efekti */}
             <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 blur-sm opacity-50 animate-pulse"></div>
             
             <div className="text-gray-500 text-sm mb-2 font-black tracking-[0.2em] uppercase">Koli İçi Adet</div>
             
             <div className="text-[6rem] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-blue-400 to-blue-700 mb-6 drop-shadow-lg">
                {okunanBarkodlar.size}
             </div>
             
             <div className="w-full bg-gray-900/50 rounded-2xl p-4 text-center border border-gray-800 mb-8 backdrop-blur">
                 <div className="text-[11px] text-gray-500 mb-2 uppercase tracking-widest">Son Gelen Sinyal Paketi</div>
                 <div className="flex items-center justify-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${sonParti > 0 ? 'bg-green-500 animate-ping' : 'bg-gray-700'}`}></div>
                    <div className="text-xl font-bold text-gray-300">
                       +{sonParti} <span className="text-sm font-normal text-gray-600">tık</span>
                    </div>
                 </div>
             </div>

             {hata && <div className="w-full text-amber-400 text-xs text-center p-3 mb-6 bg-amber-900/20 border border-amber-900/50 rounded-xl">{hata}</div>}

             <div className="w-full flex gap-3">
                 <button 
                    disabled={yukleniyor || okunanBarkodlar.size === 0}
                    onClick={sifirla} 
                    className="flex-shrink-0 px-6 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-400 font-bold py-4 rounded-xl text-sm transition-colors border border-gray-700">
                    SIFIRLA
                 </button>
                 <button 
                     disabled={yukleniyor || okunanBarkodlar.size === 0}
                     onClick={tamamla} 
                     className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-black py-4 rounded-xl text-lg flex items-center justify-center gap-2 transition-colors shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                     {yukleniyor ? 'YAZILIYOR...' : `F1 · ONAYLA`}
                 </button>
             </div>
          </div>
          
          <div className="mt-12 text-xs text-gray-600 flex flex-col items-center gap-2">
             <p className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-600"></span> Tetiğe basılı tutarak koliyi tarayın.</p>
             <p className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-600"></span> İşlemi bitirmek için cihazin fiziksel F1 tuşuna basın.</p>
          </div>
          
       </div>
    </div>
  )
}
