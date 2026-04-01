'use client'

import { useEffect, useRef } from 'react'

const BARKOD_HIZI_ESIGI = 50 // ms (Karakterler arası max süre)
const MIN_BARKOD_UZUNLUGU = 4 // karakter

export function useUsbScanner(onScan: (barkod: string) => void) {
  const charsRef = useRef<string[]>([])
  const lastTimeRef = useRef<number>(0)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignored elements: If user is explicitly focused on textareas or inputs that shouldn't be overridden?
      // Actually, a hardware scanner types EVEN when focused on an input. It's better to capture it everywhere
      // and let the handler decide. However, if they are typing, we only aggregate fast strokes.
      
      const now = Date.now()
      const diff = now - lastTimeRef.current

      // If the time between keys is too long, we reset the buffer
      if (diff > BARKOD_HIZI_ESIGI) {
        charsRef.current = []
      }

      // Sadece yazılabilir, printable karakterleri veya Enter tuşunu al
      if (e.key === 'Enter') {
        if (charsRef.current.length >= MIN_BARKOD_UZUNLUGU) {
          // Scanner finished sending data
          const barkod = charsRef.current.join('')
          onScan(barkod)
          // Form submit olmasını engelle (Çünkü USB scanner genelde inputu doldurup Enter'a basar)
          e.preventDefault() 
        }
        charsRef.current = []
      } else if (e.key.length === 1) { // Normal tekil karakterler (harf, rakam vs)
        charsRef.current.push(e.key)
      }

      lastTimeRef.current = now
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onScan])
}
