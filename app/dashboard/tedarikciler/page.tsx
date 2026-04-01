import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import FormModal from './FormModal'
import SilButon from './SilButon'

export default async function TedarikcilerPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: kullanici } = await supabase.from('kullanicilar').select('rol').eq('id', user?.id).single()
  
  const rol = kullanici?.rol || 'misafir'
  const isAdmin = rol === 'admin'

  const { data: tedarikciler } = await supabase
    .from('tedarikciler')
    .select('*')
    .order('tur')
    .order('ad')

  function turEtiket(t: string) {
    if (t === 'kumas') return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-semibold">Kumaşçı</span>
    if (t === 'fason') return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-md text-xs font-semibold">Fason</span>
    if (t === 'ip_dugme') return <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-md text-xs font-semibold">İplik/Düğme</span>
    if (t === 'ambalaj') return <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-md text-xs font-semibold">Ambalaj</span>
    return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs font-semibold">Diğer</span>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10 flex items-center justify-between">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-xl">←</Link>
            <div>
              <h1 className="font-semibold text-gray-900 text-sm">Tedarikçi Yönetimi</h1>
              <p className="text-xs text-gray-500">Kumaş, fason ve ürün tedarikçileri</p>
            </div>
          </div>
          <FormModal />
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        
        {!isAdmin && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4">
            <p className="text-sm text-blue-800">
              Mevcut listede aradığınız tedarikçiyi bulamazsanız, <strong>Yeni Tedarikçi Ekle</strong> butonu ile anında oluşturabilirsiniz. Kayıt düzeltme ve silme işlemleri için yöneticinize başvurun.
            </p>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-medium">
                <tr>
                  <th className="px-4 py-3">Firma Adı</th>
                  <th className="px-4 py-3">Tür</th>
                  <th className="px-4 py-3">İletişim & Vergi Info</th>
                  <th className="px-4 py-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tedarikciler?.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{t.ad}</td>
                    <td className="px-4 py-3">{turEtiket(t.tur)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {t.telefon && <div>📞 {t.telefon}</div>}
                      {t.eposta && <div>✉️ {t.eposta}</div>}
                      {t.vergi_no && <div className="text-gray-400 mt-1">Vergi No: {t.vergi_no}</div>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isAdmin ? (
                        <div className="flex items-center justify-end">
                          <FormModal mevcut={t} />
                          <SilButon id={t.id} />
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Salt Okunur</span>
                      )}
                    </td>
                  </tr>
                ))}
                {(!tedarikciler || tedarikciler.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      Veritabanında kayıtlı tedarikçi bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
