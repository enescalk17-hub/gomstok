import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import EkleModal from './EkleModal'
import SilButon from './SilButon'

export default async function KullanicilarPage() {
  const supabase = await createClient()

  // Kullanıcılar listesini çek
  const { data: kullanicilar } = await supabase
    .from('kullanicilar')
    .select(`
      id, ad_soyad, rol, lokasyon_id,
      lokasyon:lokasyonlar(ad)
    `)
    .order('ad_soyad')

  // Lokasyonları form için çek
  const { data: lokasyonlar } = await supabase
    .from('lokasyonlar')
    .select('id, ad, tip')
    .eq('aktif', true)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10 flex items-center justify-between">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-xl">←</Link>
            <div>
              <h1 className="font-semibold text-gray-900 text-sm">Personel Yönetimi</h1>
              <p className="text-xs text-gray-500">Sistem yetkileri ve kullanıcılar</p>
            </div>
          </div>
          <EkleModal lokasyonlar={lokasyonlar || []} />
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4">
          <p className="text-sm text-blue-800">
            <strong>Bilgi:</strong> Seçtiğiniz rollerin yetki alanı şu şekildedir:<br/>
            - <strong>Admin:</strong> Tüm menülere ve raporlara (bu sayfa dahil) erişebilir.<br/>
            - <strong>Atölye:</strong> Stok Girişi ve Transfer Gönderimi (Koli oluşturma) yapabilir.<br/>
            - <strong>Mağaza:</strong> Yoldaki kargoları teslim alabilir ve mağaza stoğunu görebilir.<br/>
            - <strong>Depo:</strong> Kargoları teslim alabilir, depo stoğunu görebilir ve Sayım yapabilir.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-medium">
              <tr>
                <th className="px-4 py-3">Ad Soyad</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Lokasyon</th>
                <th className="px-4 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {kullanicilar?.map((k: any) => (
                <tr key={k.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{k.ad_soyad}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-lg text-xs font-semibold
                      ${k.rol === 'admin' ? 'bg-purple-100 text-purple-700' :
                        k.rol === 'atolye' ? 'bg-blue-100 text-blue-700' :
                        k.rol === 'magaza' ? 'bg-green-100 text-green-700' :
                        'bg-amber-100 text-amber-700'}`}>
                      {k.rol.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {k.lokasyon?.ad || 'Atanmadı'}
                  </td>
                  <td className="px-4 py-3 text-right">
             <SilButon id={k.id} />
                  </td>
                </tr>
              ))}
              {kullanicilar?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    Henüz kullanıcı eklenmemiş.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
