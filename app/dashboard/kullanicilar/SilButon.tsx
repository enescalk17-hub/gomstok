'use client'

import { kullaniciSil } from './actions'
import { useState } from 'react'

export default function SilButon({ id }: { id: string }) {
  const [yukleniyor, setYukleniyor] = useState(false)

  async function sil() {
    if (!confirm('Kullanıcı sistemden tamamen silinecek. Emin misiniz?')) return
    setYukleniyor(true)
    const res = await kullaniciSil(id)
    if (res?.error) {
      alert(res.error)
      setYukleniyor(false)
    }
  }

  return (
    <button disabled={yukleniyor} onClick={sil} className="text-red-500 hover:text-red-700 text-xs font-medium px-2 py-1 bg-red-50 hover:bg-red-100 rounded-md transition-colors">
      {yukleniyor ? '...' : 'Sil'}
    </button>
  )
}
