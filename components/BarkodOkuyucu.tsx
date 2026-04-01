'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

type Props = {
  onOkutuldu: (barkod: string) => void
  onKapat: () => void
}

export default function BarkodOkuyucu({ onOkutuldu, onKapat }: Props) {
  const tarayiciId = 'barkod-tarayici'
  const html5QrRef = useRef<Html5Qrcode | null>(null)
  const [hata, setHata] = useState('')
  const [baslatildi, setBaslatildi] = useState(false)

  useEffect(() => {
    baslat()
    return () => { durdur() }
  }, [])

  const tarayiciKilit = useRef(false)

  async function baslat() {
    try {
      const html5Qr = new Html5Qrcode(tarayiciId)
      html5QrRef.current = html5Qr
      tarayiciKilit.current = false

      await html5Qr.start(
        { facingMode: 'environment' }, // Arka kamera
        {
          fps: 10,
          qrbox: { width: 280, height: 140 },
          aspectRatio: 2.0,
        },
        (decodedText) => {
          // İlk okumada kilitle ki peş peşe tetiklenmesin
          if (tarayiciKilit.current) return
          tarayiciKilit.current = true

          // Barkod okundu
          durdur()
          onOkutuldu(decodedText)
        },
        () => {
          // Tarama devam ediyor, hata değil
        }
      )
      setBaslatildi(true)
    } catch (err: any) {
      setHata('Kamera acilmadi. Tarayici izni verdiniz mi?')
    }
  }

  async function durdur() {
    try {
      if (html5QrRef.current && baslatildi) {
        await html5QrRef.current.stop()
        html5QrRef.current.clear()
      }
    } catch {}
  }

  function kapat() {
    durdur()
    onKapat()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex flex-col">
      {/* Üst Bar */}
      <div className="flex items-center justify-between px-4 py-4 bg-black">
        <p className="text-white font-medium text-sm">Barkod Okut</p>
        <button
          onClick={kapat}
          className="text-white text-2xl w-10 h-10 flex items-center justify-center">
          x
        </button>
      </div>

      {/* Kamera Alanı */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div id={tarayiciId} className="w-full rounded-2xl overflow-hidden" />
        </div>

        {hata && (
          <div className="mt-4 bg-red-900 rounded-xl px-4 py-3 w-full max-w-sm">
            <p className="text-red-200 text-sm">{hata}</p>
          </div>
        )}

        {!hata && !baslatildi && (
          <p className="text-gray-400 text-sm mt-4">Kamera aciliyor...</p>
        )}

        {baslatildi && (
          <p className="text-gray-300 text-sm mt-4 text-center">
            Barkodu cerceve icine getirin
          </p>
        )}
      </div>

      {/* Alt Bar */}
      <div className="px-4 py-6 bg-black">
        <button
          onClick={kapat}
          className="w-full bg-gray-800 text-white py-3 rounded-xl text-sm font-medium">
          Iptal
        </button>
      </div>
    </div>
  )
}