'use client'

import { useEffect, useRef } from 'react'
import { useUsbScanner } from './useUsbScanner'

/**
 * RFID okuyucuları gibi saniyede onlarca barkod fırlatan (Klavye Emülasyonu) donanımlar için,
 * art arda gelen okumaları biriktirip (debounce) tek bir dizi olarak fırlatan kanca.
 * @param onBatchScan Toplanan barkodların listesini döndürür
 * @param timeoutMs Kaç milisaniye süresince yeni okuma gelmezse sepeti fırlatacağı (Varsayılan 250ms)
 */
export function useBatchScanner(onBatchScan: (barkodlar: string[]) => void, timeoutMs: number = 250) {
  const batchRef = useRef<string[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Her tekil barkod geldiğinde yut ve zamanlayıcıyı uzat
  useUsbScanner((barkod) => {
     batchRef.current.push(barkod)

     if (timerRef.current) {
        clearTimeout(timerRef.current)
     }

     timerRef.current = setTimeout(() => {
        // Taramalar bitti (veya biraz duraksadı) -> Tüm grubu fırlat
        const flush = [...batchRef.current]
        batchRef.current = [] // sıfırla
        if (flush.length > 0) {
           onBatchScan(flush)
        }
     }, timeoutMs)
  })

  // Hook unmount olursa süreyi temizle
  useEffect(() => {
     return () => {
        if (timerRef.current) clearTimeout(timerRef.current)
     }
  }, [])
}
