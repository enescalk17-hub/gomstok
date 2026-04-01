'use client'

import { useEffect, useState } from 'react'
import { getOfflineKuyruk, clearOfflineKuyruk, removeOfflineTask, executeOfflineTask, OfflineTask } from '@/lib/offlineStore'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function OfflineKuyrukPage() {
  const [queue, setQueue] = useState<OfflineTask[]>([])
  const [syncing, setSyncing] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
     setIsOnline(navigator.onLine)
     const updateOn = () => setIsOnline(true)
     const updateOff = () => setIsOnline(false)
     window.addEventListener('online', updateOn)
     window.addEventListener('offline', updateOff)
     
     loadQueue()

     return () => {
        window.removeEventListener('online', updateOn)
        window.removeEventListener('offline', updateOff)
     }
  }, [])

  const loadQueue = async () => {
    const q = await getOfflineKuyruk()
    setQueue(q)
  }

  const handleSyncAll = async () => {
     if (queue.length === 0) return
     if (!isOnline) {
        alert("İnternet bağlantınız yok. Eşitleme başlatılamaz.")
        return
     }

     setSyncing(true)
     setProgress(0)
     
     const supabase = createClient()
     let basariliList: string[] = []
     
     for (let i = 0; i < queue.length; i++) {
        const t = queue[i]
        const success = await executeOfflineTask(t, supabase)
        if (success) {
           basariliList.push(t.id)
        }
        setProgress(Math.round(((i + 1) / queue.length) * 100))
     }

     // Başarılı olanları sil
     for (const id of basariliList) {
        await removeOfflineTask(id)
     }
     
     await loadQueue()
     setSyncing(false)
     
     if (basariliList.length === queue.length) {
        alert("Bütün bekleyen işlemler başarıyla aktarıldı!")
     } else {
        alert("Bazı işlemler hata aldı, kuyrukta bekliyor.")
     }
  }
  
  const handleSil = async (id: string) => {
     if(confirm("Bu tekil işlemi kuyruktan silmek istediğinize emin misiniz? (Silinirse merkeze gönderilmez)")) {
        await removeOfflineTask(id)
        loadQueue()
     }
  }

  const handleTumunuSil = async () => {
     if(confirm("Tüm kuyruğu çöpe atmak istediğinize emin misiniz?\nBu işlem Geri Alınamaz!")) {
        await clearOfflineKuyruk()
        loadQueue()
     }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
       <header className="bg-white border-b border-gray-200 px-4 py-4 shrink-0 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-xl">←</Link>
              <div>
                <h1 className="font-semibold text-gray-900 text-base">Bekleyen İşlemler</h1>
                <p className="text-xs text-gray-500">Offline Cihaz Senkronizasyonu</p>
              </div>
            </div>
            {!isOnline && <span className="text-xs font-bold px-2 py-1 bg-red-100 text-red-700 rounded animate-pulse">ÇEVRİMDIŞI</span>}
          </div>
       </header>

       <main className="flex-1 max-w-2xl mx-auto w-full p-4 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm text-center">
             <div className="text-4xl mb-3">📦</div>
             <p className="text-2xl font-black text-gray-900">{queue.length}</p>
             <p className="text-sm text-gray-500 mb-6">Paket bekliyor</p>
             
             {syncing && (
                <div className="w-full bg-gray-100 rounded-full h-2 mb-4 overflow-hidden">
                   <div className="bg-blue-600 h-2 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
             )}
             
             <div className="flex gap-3 justify-center">
                <button disabled={syncing || queue.length === 0} onClick={handleTumunuSil} className="px-5 py-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 font-medium text-sm transition-colors">
                   Tümünü Çöpe At
                </button>
                <button disabled={syncing || queue.length === 0 || !isOnline} onClick={handleSyncAll} className="flex-1 max-w-xs px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium text-sm transition-colors shadow">
                   {syncing ? 'Aktarılıyor...' : 'Şimdi Gönder'}
                </button>
             </div>
             
             {!isOnline && queue.length > 0 && (
                <p className="text-xs text-red-500 font-medium mt-4">İnternet bağlantınız koptuğu için işlemler bekliyor. Bağlandığınızda [Şimdi Gönder] butonu açılacaktır.</p>
             )}
          </div>

          <div className="space-y-3">
             <h3 className="font-semibold text-gray-700 text-xs">KUYRUK LOGLARI</h3>
             {queue.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Kuyruk bomboş. Aktarılacak veri yok.</p>
             ) : (
                queue.map(q => (
                   <div key={q.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-start justify-between">
                      <div>
                         <p className="text-xs font-bold text-blue-700 mb-1">{q.tip}</p>
                         <p className="text-xs text-gray-600 font-mono break-all">{JSON.stringify(q.payload).substring(0, 60)}...</p>
                         <p className="text-[10px] text-gray-400 mt-1">{new Date(q.zaman).toLocaleString()}</p>
                      </div>
                      <button onClick={() => handleSil(q.id)} className="text-red-400 hover:text-red-600 px-2 py-1">Sil</button>
                   </div>
                ))
             )}
          </div>
       </main>
    </div>
  )
}
