import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import FormModal from './FormModal'
import SilButon from './SilButon'

export default async function MusterilerPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: kullanici } = await supabase
    .from('kullanicilar').select('rol').eq('id', user?.id).single()

  const isAdmin = kullanici?.rol === 'admin'

  const { data: musteriler } = await supabase
    .from('musteriler')
    .select('*')
    .eq('aktif', true)
    .order('ad')

  // İş emirleri sayısı her müşteri için
  const { data: isEmirleri } = await supabase
    .from('fason_is_emirleri')
    .select('musteri_id, durum')

  function isEmriSayisi(musteriId: string) {
    const emirler = isEmirleri?.filter(e => e.musteri_id === musteriId) || []
    const aktif = emirler.filter(e => e.durum !== 'teslim_edildi' && e.durum !== 'iptal').length
    return { toplam: emirler.length, aktif }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-xl">←</Link>
            <div>
              <h1 className="font-semibold text-gray-900 text-sm">Fason Müşterileri</h1>
              <p className="text-xs text-gray-500">B2B kumaş getiren firmalar</p>
            </div>
          </div>
          <FormModal />
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-sm text-amber-800">
            Bu sayfadaki müşteriler <strong>bize fason iş getiren B2B firmalardır</strong> —
            kumaşlarını depoya getirir, biz diker, teslim ederiz. Normal mağaza tedarikçilerinden
            (<Link href="/dashboard/tedarikciler" className="underline">Tedarikçiler</Link>) ayrı yönetilir.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-medium">
                <tr>
                  <th className="px-4 py-3">Firma Adı</th>
                  <th className="px-4 py-3">İletişim</th>
                  <th className="px-4 py-3">Vergi No</th>
                  <th className="px-4 py-3 text-center">İş Emirleri</th>
                  <th className="px-4 py-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {musteriler?.map(m => {
                  const { toplam, aktif } = isEmriSayisi(m.id)
                  return (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{m.ad}</p>
                        {m.notlar && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{m.notlar}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {m.telefon && <div>📞 {m.telefon}</div>}
                        {m.eposta && <div>✉️ {m.eposta}</div>}
                        {m.adres && <div className="text-gray-400 truncate max-w-[160px]">📍 {m.adres}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                        {m.vergi_no || '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link href={`/dashboard/fason?musteri=${m.id}`}
                          className="inline-flex flex-col items-center">
                          {aktif > 0 && (
                            <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-bold">
                              {aktif} Aktif
                            </span>
                          )}
                          {toplam > 0 && (
                            <span className="text-gray-400 text-xs mt-0.5">{toplam} toplam</span>
                          )}
                          {toplam === 0 && (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isAdmin ? (
                          <div className="flex items-center justify-end">
                            <FormModal mevcut={m} />
                            <SilButon id={m.id} />
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Salt Okunur</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {(!musteriler || musteriler.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                      <p className="text-3xl mb-2">🏢</p>
                      <p>Henüz fason müşterisi eklenmemiş.</p>
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