import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Stok özetini çek
  const { data: stokOzet } = await supabase
    .from('genel_stok_ozet')
    .select('*')

  const toplamAtolyé = stokOzet?.reduce((t, r) => t + (r.atolye || 0), 0) || 0
  const toplamMagaza = stokOzet?.reduce((t, r) => t + (r.magaza || 0), 0) || 0
  const toplamDepo   = stokOzet?.reduce((t, r) => t + (r.depo   || 0), 0) || 0
  const toplamYolda  = stokOzet?.reduce((t, r) => t + (r.yolda  || 0), 0) || 0

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg">👕</span>
            </div>
            <div>
              <h1 className="font-semibold text-gray-900 text-sm">GömStok</h1>
              <p className="text-xs text-gray-500">Stok Yönetimi</p>
            </div>
          </div>
          <form action="/auth/signout" method="post">
            <button className="text-xs text-gray-500 hover:text-gray-900 
                               border border-gray-200 px-3 py-1.5 rounded-lg">
              Çıkış
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">

        {/* Stok Özet Kartları */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KartBilgi renk="blue"   ikon="🏭" baslik="Atölye"      deger={toplamAtolyé} />
          <KartBilgi renk="green"  ikon="🏪" baslik="Mağaza"      deger={toplamMagaza} />
          <KartBilgi renk="purple" ikon="🏬" baslik="Fatih Depo"  deger={toplamDepo}   />
          <KartBilgi renk="amber"  ikon="🚚" baslik="Yolda"       deger={toplamYolda}  />
        </div>

        {/* Menü Kartları */}
        <div className="grid grid-cols-2 gap-3">
          <MenuKart href="/dashboard/urunler"   ikon="📦" baslik="Ürünler"     aciklama="SKU & barkod yönetimi" />
          <MenuKart href="/dashboard/transfer"  ikon="🚚" baslik="Transfer"    aciklama="Koli oluştur & gönder" />
          <MenuKart href="/dashboard/stok"      ikon="📊" baslik="Stok"        aciklama="Lokasyon bazlı görünüm" />
          <MenuKart href="/dashboard/raporlar"  ikon="📈" baslik="Raporlar"    aciklama="Hareketler & analiz" />
        </div>

      </main>
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
    <div className={`${renkler[renk]} border rounded-2xl p-4`}>
      <div className="text-2xl mb-2">{ikon}</div>
      <div className="text-2xl font-bold">{deger}</div>
      <div className="text-xs font-medium mt-0.5 opacity-80">{baslik}</div>
    </div>
  )
}

function MenuKart({ href, ikon, baslik, aciklama }: {
  href: string; ikon: string; baslik: string; aciklama: string
}) {
  return (
    <a href={href} className="bg-white border border-gray-200 rounded-2xl p-5 
                               hover:border-blue-300 hover:shadow-sm 
                               transition-all active:scale-95 block">
      <div className="text-2xl mb-3">{ikon}</div>
      <div className="font-semibold text-gray-900 text-sm">{baslik}</div>
      <div className="text-xs text-gray-500 mt-0.5">{aciklama}</div>
    </a>
  )
}