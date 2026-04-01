'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function StokKartlari({ initialData }: { initialData: any[] }) {
  const supabase = createClient()
  const [stokOzet, setStokOzet] = useState<any[]>(initialData || [])

  useEffect(() => {
    async function fetchOzet() {
      const { data } = await supabase.from('genel_stok_ozet').select('*')
      if (data) setStokOzet(data)
    }

    // İlk mount'ta çek, sonra 5 saniyede bir güncelle (sayfa yenilemeden)
    fetchOzet()
    const interval = setInterval(fetchOzet, 5000)
    return () => clearInterval(interval)
  }, [])

  const toplamAtolye = stokOzet.reduce((t, r) => t + (r.atolye || 0), 0)
  const toplamMagaza = stokOzet.reduce((t, r) => t + (r.magaza || 0), 0)
  const toplamDepo   = stokOzet.reduce((t, r) => t + (r.depo   || 0), 0)
  const toplamYolda  = stokOzet.reduce((t, r) => t + (r.yolda  || 0), 0)

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <KartBilgi renk="blue"   ikon={"🏭"} baslik="Atölye"      deger={toplamAtolye} />
      <KartBilgi renk="green"  ikon={"🏪"} baslik="Mağaza"      deger={toplamMagaza} />
      <KartBilgi renk="purple" ikon={"🏬"} baslik="Fatih Depo"  deger={toplamDepo}   />
      <KartBilgi renk="amber"  ikon={"🚚"} baslik="Yolda"       deger={toplamYolda}  />
    </div>
  )
}

function KartBilgi({ renk, ikon, baslik, deger }: {
  renk: string; ikon: string; baslik: string; deger: number
}) {
  const renkler: Record<string, string> = {
    blue:   'bg-blue-50   border-blue-100   text-blue-700',
    green:  'bg-green-50  border-green-100  text-green-700',
    purple: 'bg-purple-50 border-purple-100 text-purple-700',
    amber:  'bg-amber-50  border-amber-100  text-amber-700',
  }
  return (
    <div className={`${renkler[renk]} border rounded-2xl p-4 transition-all duration-300`}>
      <div className="text-2xl mb-2">{ikon}</div>
      <div className="text-2xl font-bold">{deger}</div>
      <div className="text-xs font-medium mt-0.5 opacity-80">{baslik}</div>
    </div>
  )
}
