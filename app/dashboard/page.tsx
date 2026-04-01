import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StokKartlari from './StokKartlari'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Stok özetini çek
  const { data: stokOzet } = await supabase
    .from('genel_stok_ozet')
    .select('*')

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
        <StokKartlari initialData={stokOzet || []} />

        {/* Menü Kartları */}
        <div className="grid grid-cols-2 gap-3">
          <MenuKart href="/dashboard/urunler"   ikon="📦" baslik="Ürünler"     aciklama="SKU & barkod yönetimi" />
          <MenuKart href="/dashboard/transfer"  ikon="🚚" baslik="Transfer"    aciklama="Koli oluştur & gönder" />
          <MenuKart href="/dashboard/stok"      ikon="📊" baslik="Stok"        aciklama="Lokasyon bazlı görünüm" />
          <MenuKart href="/dashboard/raporlar"  ikon="📈" baslik="Raporlar"    aciklama="Hareketler & analiz" />
          <MenuKart href="/dashboard/import"    ikon="📥" baslik="Import"      aciklama="Excel ile toplu ürün yükle" />
          <MenuKart href="/dashboard/kumaslar"  ikon="🧵" baslik="Kumaşlar"    aciklama="Kumaş stok takibi" />
          <MenuKart href="/dashboard/sayim"     ikon="📋" baslik="Sayım"       aciklama="Stok sayım ve doğrulama" />
        </div>

      </main>
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