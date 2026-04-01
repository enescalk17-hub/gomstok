import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import PrintButton from './PrintButton'

export default async function FasonIrsaliyePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: emir, error } = await supabase
    .from('fason_is_emirleri')
    .select(`
      *,
      musteri:musteriler(*),
      kumas:kumaslar(kumas_barkod, renk, tur:kumas_turleri(ad))
    `)
    .eq('id', id)
    .single()

  if (error || !emir) return notFound()

  const fTarih = (d?: string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const fireMetre = emir.fire_metre ?? (
    emir.teslim_alinan_metre && emir.kullanilan_metre
      ? emir.teslim_alinan_metre - emir.kullanilan_metre
      : null
  )
  const fireAdet = emir.fire_adet ?? (emir.hedef_adet - (emir.uretilen_adet ?? emir.hedef_adet))
  const fireMetrePct = emir.teslim_alinan_metre && fireMetre != null
    ? ((fireMetre / emir.teslim_alinan_metre) * 100).toFixed(2)
    : null
  const fireAdetPct = emir.hedef_adet
    ? ((fireAdet / emir.hedef_adet) * 100).toFixed(2)
    : null

  const bedenDagilimi = emir.beden_dagilimi as Record<string, number> | null
  const bedenSatir = bedenDagilimi ? Object.entries(bedenDagilimi) : []

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white print:p-0 p-8 flex justify-center">

      {/* Ekranda görünen kontroller */}
      <div className="print:hidden fixed top-4 right-4 flex gap-3 z-10">
        <Link
          href="/dashboard/fason"
          className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-xl shadow-sm hover:bg-gray-50 font-medium">
          Geri Dön
        </Link>
        <PrintButton />
      </div>

      {/* A4 İRSALİYE */}
      <div className="bg-white w-full max-w-[210mm] min-h-[297mm] p-[15mm] shadow-lg print:shadow-none print:w-[210mm] text-gray-900 border border-gray-200 print:border-none mx-auto relative text-sm">

        {/* HEADER */}
        <div className="flex justify-between items-start border-b-2 border-black pb-5 mb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight">GÖMSTOK</h1>
            <p className="text-xs font-bold text-gray-600 tracking-wide mt-1 uppercase">MOTİF SHIRTS &amp; Manufaktur</p>
            <h2 className="text-lg font-semibold text-gray-800 tracking-widest mt-2">FASON TESLİM İRSALİYESİ</h2>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-black bg-gray-100 px-3 py-1 rounded inline-block">
              {emir.irsaliye_no || '—'}
            </p>
            <p className="text-gray-600 mt-2 font-medium">Tarih: {fTarih(emir.bitis_tarihi || emir.guncellendi)}</p>
          </div>
        </div>

        {/* TARAFLAR */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="p-4 border border-gray-300 rounded-lg">
            <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Üretici (Fason Atölye)</p>
            <p className="font-bold text-lg">GömStok / MOTİF SHIRTS</p>
            <p className="text-gray-600 mt-1 text-xs leading-relaxed">
              Atölye Adresi<br />
              Tel: —
            </p>
          </div>
          <div className="p-4 border border-gray-300 rounded-lg">
            <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Müşteri (Kumaş Sahibi)</p>
            <p className="font-bold text-lg">{emir.musteri?.ad}</p>
            {emir.musteri?.adres && (
              <p className="text-gray-700 mt-1 text-xs leading-relaxed whitespace-pre-line">{emir.musteri.adres}</p>
            )}
            {emir.musteri?.telefon && (
              <p className="text-gray-600 mt-2 font-mono text-xs">Tel: {emir.musteri.telefon}</p>
            )}
            {emir.musteri?.vergi_no && (
              <p className="text-gray-400 mt-1 text-xs">Vergi No: {emir.musteri.vergi_no}</p>
            )}
          </div>
        </div>

        {/* KUMAŞ BİLGİSİ */}
        <div className="mb-8 border border-gray-300 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <p className="text-xs font-bold text-gray-600 uppercase">Kumaş Bilgisi</p>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {emir.teslim_alinan_metre != null && (
                <tr>
                  <td className="px-4 py-2.5 text-gray-500 w-1/2">Teslim Alınan Kumaş</td>
                  <td className="px-4 py-2.5 font-semibold">{emir.teslim_alinan_metre} metre</td>
                </tr>
              )}
              {emir.kullanilan_metre != null && (
                <tr>
                  <td className="px-4 py-2.5 text-gray-500">Kullanılan Kumaş</td>
                  <td className="px-4 py-2.5 font-semibold">{emir.kullanilan_metre} metre</td>
                </tr>
              )}
              {fireMetre != null && (
                <tr>
                  <td className="px-4 py-2.5 text-gray-500">Fire Kumaş</td>
                  <td className="px-4 py-2.5 font-semibold text-red-600">
                    {fireMetre} metre {fireMetrePct ? `(%${fireMetrePct})` : ''}
                  </td>
                </tr>
              )}
              {emir.kumas && (
                <tr>
                  <td className="px-4 py-2.5 text-gray-500">Kumaş Referansı</td>
                  <td className="px-4 py-2.5 text-gray-600 font-mono text-xs">
                    {(emir.kumas as any)?.tur?.ad} — {(emir.kumas as any)?.renk}
                    {(emir.kumas as any)?.kumas_barkod && ` (${(emir.kumas as any).kumas_barkod})`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ÜRETİM SONUCU */}
        <div className="mb-8 border border-gray-300 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <p className="text-xs font-bold text-gray-600 uppercase">Üretim Sonucu</p>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-2.5 text-gray-500 w-1/2">Model</td>
                <td className="px-4 py-2.5 font-semibold">{emir.model_tanimi}</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-gray-500">Hedeflenen</td>
                <td className="px-4 py-2.5 font-semibold">{emir.hedef_adet} adet</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-gray-500">Üretilen</td>
                <td className="px-4 py-2.5 font-bold text-green-700 text-base">{emir.uretilen_adet ?? '—'} adet</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-gray-500">Hatalı / Fire Ürün</td>
                <td className="px-4 py-2.5 font-semibold text-red-600">
                  {fireAdet} adet {fireAdetPct ? `(%${fireAdetPct})` : ''}
                </td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-4 py-2.5 font-bold text-gray-700">Teslim Edilen</td>
                <td className="px-4 py-2.5 font-black text-xl text-gray-900">{emir.uretilen_adet ?? '—'} adet</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* BEDEN DAĞILIMI */}
        {bedenSatir.length > 0 && (
          <div className="mb-8">
            <p className="text-xs font-bold text-gray-500 uppercase mb-3">Beden Dağılımı</p>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-y-2 border-black">
                  {bedenSatir.map(([b]) => (
                    <th key={b} className="py-2 px-3 text-center font-bold">{b}</th>
                  ))}
                  <th className="py-2 px-3 text-right font-bold">Toplam</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  {bedenSatir.map(([b, a]) => (
                    <td key={b} className="py-3 px-3 text-center font-semibold text-lg">{a}</td>
                  ))}
                  <td className="py-3 px-3 text-right font-black text-xl">
                    {bedenSatir.reduce((s, [, a]) => s + a, 0)} adet
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* NOT */}
        {emir.notlar && (
          <div className="mb-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Notlar</p>
            <p className="text-sm text-gray-700">{emir.notlar}</p>
          </div>
        )}

        {/* İMZALAR */}
        <div className="grid grid-cols-2 gap-8 mt-16 pt-8 break-inside-avoid">
          <div className="text-center">
            <p className="font-bold text-gray-500 mb-12">TESLİM EDEN</p>
            <p className="border-t border-gray-400 mx-8 pt-2 text-sm text-gray-500">Ad Soyad / İmza</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-gray-500 mb-12">TESLİM ALAN</p>
            <p className="border-t border-gray-400 mx-8 pt-2 text-sm text-gray-500">Ad Soyad / İmza</p>
          </div>
        </div>

        <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-gray-400 font-mono print:block hidden">
          GömStok Fason Yönetimi — Çıktı: {new Date().toLocaleString('tr-TR')}
        </div>
      </div>
    </div>
  )
}
