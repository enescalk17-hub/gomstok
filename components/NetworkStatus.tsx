'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getOfflineKuyruk, OfflineTask } from '@/lib/offlineStore'

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [quality, setQuality] = useState<'high' | 'low'>('high')
  const [queue, setQueue] = useState<OfflineTask[]>([])

  useEffect(() => {
    if (typeof window !== 'undefined') {
       setIsOnline(navigator.onLine)
       
       const handleOnline = () => setIsOnline(true)
       const handleOffline = () => setIsOnline(false)
       
       window.addEventListener('online', handleOnline)
       window.addEventListener('offline', handleOffline)
       
       // Ağ bağlantı kalitesini check et (sadece destekleyen tarayıcılarda)
       const connection = (navigator as any).connection
       if (connection) {
         const updateQuality = () => {
           if (connection.downlink < 1.5 || connection.rtt > 500) {
              setQuality('low')
           } else {
              setQuality('high')
           }
         }
         updateQuality()
         connection.addEventListener('change', updateQuality)
       }

       // Kuyruk durumunu düzenli dinle
       const yolda = async () => {
          const q = await getOfflineKuyruk()
          setQueue(q)
       }
       yolda()
       
       window.addEventListener('offlineKuyrukGuncellendi', yolda)
       
       return () => {
         window.removeEventListener('online', handleOnline)
         window.removeEventListener('offline', handleOffline)
         window.removeEventListener('offlineKuyrukGuncellendi', yolda)
       }
    }
  }, [])

  // Eğer her şey olağanüstü ise hiç gösterme
  if (isOnline && quality === 'high' && queue.length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 p-3 bg-white rounded-2xl shadow-xl border border-gray-200">
      
      {!isOnline && (
         <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 rounded-lg text-sm font-medium">
            <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            Çevrimdışı
         </div>
      )}

      {isOnline && quality === 'low' && (
         <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium">
           <div className="w-2 h-2 rounded-full bg-amber-500" />
           Zayıf Bağlantı
         </div>
      )}

      {queue.length > 0 && (
         <Link href="/dashboard/kuyruk" className="flex items-center gap-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-bold transition-colors">
            <span>📦</span> 
            {queue.length} İşlem Bekliyor
         </Link>
      )}

    </div>
  )
}
