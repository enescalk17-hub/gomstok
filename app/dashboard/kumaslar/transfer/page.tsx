import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import TransferForm from './TransferForm'

export default async function TransferEkrani() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: kullanici } = await supabase.from('kullanicilar').select('rol').eq('id', user?.id).single()
  
  if (kullanici?.rol !== 'admin' && kullanici?.rol !== 'depo') {
    return <div className="p-8 text-center">Bu sayfaya erisim yetkiniz yok. Sadece Depo ve Admin islem yapabilir.</div>
  }

  // Sadece Depodaki (veya transfer edilebilir) kumaşları çek.
  // Gerçek projede lokasyon.tip = 'depo' olan lokasyon id'ye göre sorgulamalıyız:
  const { data: depolar } = await supabase.from('lokasyonlar').select('id').eq('tip', 'depo')
  const depoIdList = depolar?.map(d => d.id) || []

  // kumaslar tablosundan çekelim (kumas_stok view'inde ID'ler varsa o da olur)
  const { data: kumaslar } = await supabase
    .from('kumaslar')
    .select(`
      id, kumas_barkod, renk, en_cm, miktar_metre,
      tur:kumas_turleri(ad),
      desen:kumas_desenleri(ad)
    `)
    .in('lokasyon_id', depoIdList)
    .gt('miktar_metre', 0)
    .order('olusturulma', { ascending: false })

  const { data: atolyeler } = await supabase.from('lokasyonlar').select('id, ad').eq('tip', 'atolye').eq('aktif', true)
  const { data: modeller } = await supabase.from('modeller').select('id, ad').eq('aktif', true)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10 flex items-center justify-between">
        <div className="max-w-2xl mx-auto w-full flex items-center gap-3">
          <Link href="/dashboard/kumaslar" className="text-gray-400 hover:text-gray-600 text-xl">←</Link>
          <div>
            <h1 className="font-semibold text-gray-900 text-sm">Depodan Atölyeye Transfer</h1>
            <p className="text-xs text-gray-500">Üretime kumaş sevkiyatı</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-sm text-blue-800">
            Buradan sevk edilen metraj, depo stoğundan düşülerek doğrudan atölye stoğuna (yeni top / kesilmiş metraj olarak) aktarılır.
          </p>
        </div>

        <TransferForm
          kumaslar={kumaslar || []}
          atolyeler={atolyeler || []}
          modeller={modeller || []}
        />
      </main>
    </div>
  )
}
