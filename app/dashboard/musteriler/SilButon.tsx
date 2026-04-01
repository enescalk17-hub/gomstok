'use client'
import { useState } from 'react'
import { sil } from './actions'

export default function SilButon({ id }: { id: string }) {
  const [yukleniyor, setYukleniyor] = useState(false)

  async function handleSil() {
    if (!confirm('Müşteriyi silmek istediğinize emin misiniz?')) return
    setYukleniyor(true)
    const res = await sil(id)
    if (res?.error) {
      alert(res.error)
      setYukleniyor(false)
    }
  }

  return (
    <button
      disabled={yukleniyor}
      onClick={handleSil}
      className="text-red-500 hover:text-red-700 text-xs font-medium px-2 py-1 bg-red-50 hover:bg-red-100 rounded-lg transition-colors ml-2">
      {yukleniyor ? '...' : 'Sil'}
    </button>
  )
}