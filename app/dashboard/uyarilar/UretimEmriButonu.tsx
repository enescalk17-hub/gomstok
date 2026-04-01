'use client'

import React, { useState } from 'react'

export default function UretimEmriButonu() {
   const [loading, setLoading] = useState(false)

   const handleClick = async () => {
      setLoading(true)
      try {
         const res = await fetch('/api/stok-uyari', { method: 'POST' })
         if (!res.ok) throw new Error("Mail gönderimi başarısız!")
         alert('✅ Üretim Emri atölyeye ve merkeze e-posta olarak gönderildi!')
      } catch (err: any) {
         alert('Hata: ' + err.message)
      } finally {
         setLoading(false)
      }
   }

   return (
      <button
         onClick={handleClick}
         disabled={loading}
         className="bg-gray-900 hover:bg-black disabled:bg-gray-500 text-white text-xs font-medium px-4 py-2 rounded-xl transition-colors shadow-md flex items-center gap-2 cursor-pointer">
         <span>{loading ? 'Gönderiliyor...' : '📧 Emri Gönder'}</span>
      </button>
   )
}
