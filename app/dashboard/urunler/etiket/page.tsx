'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Urun = {
  id: string
  barkod: string
  model_ad: string
  renk_ad: string
  beden_ad: string
}

export default function TopluEtiketSayfasi() {
  const supabase = createClient()
  
  const [modeller, setModeller] = useState<any[]>([])
  const [secilenModelId, setSecilenModelId] = useState<string>('')
  
  const [urunler, setUrunler] = useState<Urun[]>([])
  const [seciliUrunler, setSeciliUrunler] = useState<{[id: string]: number}>({})
  const [hepsiAdet, setHepsiAdet] = useState<number>(1)

  const [etiketTipi, setEtiketTipi] = useState<'gomlek' | 'kumas'>('gomlek')
  // Kumaş State'leri
  const [kumaslar, setKumaslar] = useState<any[]>([])
  
  const [rfidModu, setRfidModu] = useState(false)
  const [yazdirModu, setYazdirModu] = useState(false)
  const [hata, setHata] = useState('')

  useEffect(() => {
    async function getir() {
      if (etiketTipi === 'gomlek') {
         const { data } = await supabase.from('modeller').select('id, ad').order('ad')
         setModeller(data || [])
      } else {
         const { data: kData } = await supabase.from('kumaslar').select(`
            id, renk, miktar_metre, kumas_barkod, en,
            tur:kumas_turleri(ad),
            desen:kumas_desenleri(ad),
            tedarikci:tedarikciler(ad)
         `).order('id', { ascending: false })
         setKumaslar(kData || [])
         setSecilenModelId('') // Reset
      }
    }
    getir()
  }, [etiketTipi])

  useEffect(() => {
    if (etiketTipi === 'kumas') return; // Kumaş modunda modelle aranmaz
    
    if (!secilenModelId) {
      setUrunler([])
      return
    }
    async function urunleriGetir() {
      setHata('')
      const { data, error } = await supabase
        .from('urunler')
        .select(`
          id, barkod,
          model:modeller(ad),
          renk:renkler(ad),
          beden:bedenler(ad)
        `)
        .eq('model_id', secilenModelId)
        .eq('aktif', true)
        .order('barkod')
        
      if (error) {
        setHata('Ürünler getirilirken hata oluştu: ' + error.message)
        return
      }

      if (data) {
        const u = data.map((d: any) => ({
           id: d.id,
           barkod: d.barkod,
           model_ad: d.model?.ad || '',
           renk_ad: d.renk?.ad || '',
           beden_ad: d.beden?.ad || ''
        }))
        setUrunler(u)
        setSeciliUrunler({})
      }
    }
    urunleriGetir()
  }, [secilenModelId, etiketTipi])

  const topAdetUygula = () => {
     const yeni = { ...seciliUrunler }
     if (etiketTipi === 'gomlek') {
        urunler.forEach(u => yeni[u.id] = hepsiAdet)
     } else {
        kumaslar.forEach(k => yeni[k.id] = hepsiAdet)
     }
     setSeciliUrunler(yeni)
  }

  const handleAdetChange = (id: string, val: number) => {
     setSeciliUrunler(p => {
        const np = { ...p }
        if (val <= 0) delete np[id]
        else np[id] = val
        return np
     })
  }

  const yazdirilacakEtiketSayisi = Object.values(seciliUrunler).reduce((a, b) => a + b, 0)
  
  const handlePrint = () => {
    if (yazdirilacakEtiketSayisi === 0) return setHata("Lütfen en az 1 etiket adedi girin.")
    setHata("")
    setYazdirModu(true)
    setTimeout(() => {
      window.print()
      // Print ekranı kapandıktan sonra moddan çıkması için ufak bir bekleme (Tarayıcı bazen print block eder)
      // Ancak modern browserlarda .onbeforeprint falan daha sağlıklı olabilir. 
      // Şimdilik setTimeout + tıklama ile çıkış verelim.
    }, 500)
  }

  const kopyalaZPL = () => {
     if (yazdirilacakEtiketSayisi === 0) return setHata("Lütfen en az 1 etiket adedi girin.")
     
     let zplOutput = ""
     
     if (etiketTipi === 'gomlek') {
        urunler.forEach(u => {
           const adet = seciliUrunler[u.id]
           if (!adet) return
           for(let i=0; i<adet; i++){
                const rfidTag = rfidModu ? `^RS8\n^RFW,E,,,^FD${u.barkod}^FS\n` : ""
                zplOutput += `^XA\n${rfidTag}^CFA,20
^FO30,30^FDGOMSTOK^FS
^CFA,15
^FO30,60^FD${u.model_ad}^FS
^FO30,85^FD${u.renk_ad} - Beden: ${u.beden_ad}^FS
^BY2,2,60
^FO30,110^BC^FD${u.barkod}^FS
^XZ\n`
             }
        })
     } else {
        kumaslar.forEach(k => {
           const adet = seciliUrunler[k.id]
           if (!adet) return
           for(let i=0; i<adet; i++){
                const rfidTag = rfidModu ? `^RS8\n^RFW,E,,,^FD${k.kumas_barkod}^FS\n` : ""
                zplOutput += `^XA\n${rfidTag}^CFA,30
^FO50,50^FDGOMSTOK KUMAS^FS
^CFA,20
^FO50,100^FD${k.tur?.ad || ''} ${k.desen?.ad || ''}^FS
^FO50,140^FDRenk: ${k.renk}^FS
^BY3,3,100
^FO50,190^BC^FD${k.kumas_barkod}^FS
^XZ\n`
           }
        })
     }
     
     navigator.clipboard.writeText(zplOutput).then(() => {
        alert("ZPL şablonu kopyalandı! Notepad'e veya Zebra aracına yapıştırabilirsiniz.")
     }).catch(err => {
        alert("Kopyalama başarısız: " + err.message)
     })
  }

  // YAZDIRMA MODU EDRANI
  if (yazdirModu) {
     return (
        <div className="bg-white min-h-screen text-black">
           <style type="text/css">
            {`
              @media print {
                @page { size: ${etiketTipi === 'kumas' ? '100mm 50mm' : '50mm 30mm'}; margin: 0; }
                body { margin: 0; padding: 0; background: white; }
                .no-print { display: none !important; }
              }
              .etiket-sahnesi {
                 page-break-after: always;
                 overflow: hidden;
                 box-sizing: border-box;
                 display: flex;
                 flex-direction: column;
                 justify-content: center;
                 align-items: center;
                 background: white;
                 ${etiketTipi === 'kumas' ? 'width: 100mm; height: 50mm; padding: 5mm;' : 'width: 50mm; height: 30mm; padding: 2mm;'}
              }
            `}
           </style>
           
           <div className="no-print p-4 bg-gray-100 flex justify-between items-center fixed top-0 w-full shadow z-50">
              <span className="font-bold">Yazdırma Ekranı ({yazdirilacakEtiketSayisi} Adet)</span>
              <button onClick={() => setYazdirModu(false)} className="bg-red-600 text-white px-4 py-2 rounded">İptal / Geri Dön</button>
           </div>
           <div className="no-print pt-20"></div>

           {etiketTipi === 'gomlek' && urunler.map(u => {
              const adet = seciliUrunler[u.id] || 0
              const basimlar = []
              for(let i=0; i<adet; i++) {
                 basimlar.push(
                    <div key={`${u.id}-${i}`} className="etiket-sahnesi border border-dashed border-gray-300 print:border-none print:m-0 mb-4 mx-auto">
                        <div className="w-full text-center flex flex-col justify-between h-full">
                           <div className="text-[10pt] font-black uppercase tracking-widest mt-1">MOTİF SHIRTS</div>
                           <div className="text-[7pt] font-medium leading-tight truncate px-1">
                             {u.model_ad}
                           </div>
                           <div className="text-[8pt] font-bold">
                             {u.renk_ad} • {u.beden_ad}
                           </div>
                           <div className="flex-1 flex justify-center items-center mt-1">
                              <div className="text-[18pt] font-mono leading-none tracking-widest">*${u.barkod}*</div>
                           </div>
                           <div className="text-[6pt] font-mono tracking-widest mb-1">{u.barkod}</div>
                        </div>
                    </div>
                 )
              }
              return basimlar
           })}

           {etiketTipi === 'kumas' && kumaslar.map(k => {
              const adet = seciliUrunler[k.id] || 0
              const basimlar = []
              for(let i=0; i<adet; i++) {
                 basimlar.push(
                    <div key={`${k.id}-${i}`} className="etiket-sahnesi border border-dashed border-gray-300 print:border-none print:m-0 mb-4 mx-auto">
                        <div className="w-full text-left flex flex-col justify-between h-full">
                           <div className="text-[14pt] font-black uppercase mb-1">GÖMSTOK KUMAŞ</div>
                           <div className="text-[10pt]"><span className="font-bold">Tür:</span> {k.tur?.ad || ''} {k.desen?.ad || ''}</div>
                           <div className="text-[10pt]"><span className="font-bold">Renk:</span> {k.renk}</div>
                           <div className="text-[10pt]"><span className="font-bold">Tedarikçi:</span> {k.tedarikci?.ad || '-'}</div>
                           <div className="flex-1 flex justify-start items-center mt-2">
                              <div className="text-[20pt] font-mono leading-none tracking-widest">*${k.kumas_barkod}*</div>
                           </div>
                           <div className="text-[8pt] font-mono mt-1">{k.kumas_barkod}</div>
                        </div>
                    </div>
                 )
              }
              return basimlar
           })}
        </div>
     )
  }

  // NORMAL EKRAN
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
       <header className="bg-white border-b border-gray-200 px-4 py-4 shrink-0">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard/urunler" className="text-gray-400 hover:text-gray-600 text-xl">←</Link>
              <div>
                <h1 className="font-semibold text-gray-900 text-sm">Toplu Etiket Basımı</h1>
                <p className="text-xs text-gray-500">Zebra / ZPL Destekli Yazıcı Entegrasyonu</p>
              </div>
            </div>
          </div>
       </header>

       <main className="flex-1 max-w-4xl mx-auto w-full p-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             
             {/* SOL - Filtreleme */}
             <div className="md:col-span-1 space-y-4">
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                   <h3 className="font-medium text-sm mb-3 text-gray-800">1. Şablon Tipi</h3>
                   <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                         <input type="radio" value="gomlek" checked={etiketTipi === 'gomlek'} onChange={() => setEtiketTipi('gomlek')} className="focus:ring-blue-500" />
                         Standart Ürün (50x30mm)
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                         <input type="radio" value="kumas" checked={etiketTipi === 'kumas'} onChange={() => setEtiketTipi('kumas')} className="focus:ring-blue-500" />
                         Kumaş Topu (100x50mm)
                      </label>
                   </div>
                </div>

                <div className="bg-blue-50 rounded-2xl border border-blue-200 p-5">
                   <h3 className="font-medium text-sm mb-3 text-blue-800 flex items-center gap-2"><span>📡</span> RFID Entegrasyonu</h3>
                   <label className="flex items-center gap-3 text-sm text-blue-900 cursor-pointer">
                      <input type="checkbox" checked={rfidModu} onChange={(e) => setRfidModu(e.target.checked)} className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500" />
                      <div>
                         <span className="font-bold block">Çipe Kodla (RFID Burn)</span>
                         <span className="text-xs text-blue-700">Barkod numarasını, NFC/UHF etiketinin içine şifreler (ZPL ile).</span>
                      </div>
                   </label>
                </div>

                {etiketTipi === 'gomlek' && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-5">
                     <h3 className="font-medium text-sm mb-3 text-gray-800">2. Model Seçimi</h3>
                     <select 
                        value={secilenModelId}
                        onChange={e => setSecilenModelId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-blue-500 bg-gray-50">
                        <option value="">-- Lütfen Seçin --</option>
                        {modeller.map(m => (
                           <option key={m.id} value={m.id}>{m.ad}</option>
                        ))}
                     </select>
                  </div>
                )}

                {(urunler.length > 0 || kumaslar.length > 0) && (
                   <div className="bg-white rounded-2xl border border-gray-200 p-5">
                      <h3 className="font-medium text-sm mb-3 text-gray-800">Toplu Adet Atama</h3>
                      <div className="flex gap-2">
                         <input 
                           type="number" 
                           value={hepsiAdet} 
                           onChange={e => setHepsiAdet(parseInt(e.target.value) || 1)}
                           className="w-16 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-blue-500" />
                         <button onClick={topAdetUygula} className="flex-1 bg-gray-100 hover:bg-gray-200 text-sm font-medium rounded-xl text-gray-700">Tümüne Uygula</button>
                      </div>
                   </div>
                )}
             </div>

             {/* SAĞ - Ürün Listesi ve Önizleme */}
             <div className="md:col-span-2 space-y-4">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
                   <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex justify-between items-center shrink-0">
                      <span className="text-sm font-semibold text-gray-700">Ürün Listesi ({etiketTipi === 'gomlek' ? urunler.length : kumaslar.length})</span>
                      <span className="text-xs text-gray-500">Seçili: {yazdirilacakEtiketSayisi} etiket</span>
                   </div>
                   
                   <div className="flex-1 overflow-y-auto p-0">
                      {(etiketTipi === 'gomlek' && urunler.length === 0) ? (
                         <div className="h-full flex flex-col items-center justify-center text-gray-400">
                           <p className="mb-2 text-2xl">📋</p>
                           <p className="text-sm">Model seçtiğinizde veya modelinize ait ürün eklendiğinde burada listelenecektir.</p>
                         </div>
                      ) : (etiketTipi === 'kumas' && kumaslar.length === 0) ? (
                         <div className="h-full flex flex-col items-center justify-center text-gray-400">
                           <p className="mb-2 text-2xl">🧶</p>
                           <p className="text-sm">Sistemde hiç kumaş kaydı bulunmamaktadır.</p>
                         </div>
                      ) : (
                         <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-white text-gray-500 text-xs border-b border-gray-100 sticky top-0">
                               <tr>
                                  <th className="px-4 py-3 font-medium">{etiketTipi === 'gomlek' ? 'Beden' : 'Tür/Desen'}</th>
                                  <th className="px-4 py-3 font-medium">Renk</th>
                                  <th className="px-4 py-3 font-medium">Barkod</th>
                                  <th className="px-4 py-3 font-medium text-right w-24">Yazdır. Adet</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                               {etiketTipi === 'gomlek' && urunler.map(u => (
                                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                     <td className="px-4 py-3 font-bold font-mono text-xs">{u.beden_ad}</td>
                                     <td className="px-4 py-3 text-gray-700">{u.renk_ad}</td>
                                     <td className="px-4 py-3 font-mono text-gray-500 text-xs">{u.barkod}</td>
                                     <td className="px-4 py-3 text-right">
                                        <input 
                                          type="number"
                                          min="0"
                                          value={seciliUrunler[u.id] || ''}
                                          onChange={e => handleAdetChange(u.id, parseInt(e.target.value) || 0)}
                                          placeholder="0"
                                          className="w-16 px-2 py-1 text-right border border-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                                        />
                                     </td>
                                  </tr>
                               ))}
                               {etiketTipi === 'kumas' && kumaslar.map(k => (
                                  <tr key={k.id} className="hover:bg-gray-50 transition-colors">
                                     <td className="px-4 py-3 font-bold text-xs">{k.tur?.ad || ''} {k.desen?.ad || ''}</td>
                                     <td className="px-4 py-3 text-gray-700">{k.renk}</td>
                                     <td className="px-4 py-3 font-mono text-gray-500 text-xs">{k.kumas_barkod}</td>
                                     <td className="px-4 py-3 text-right">
                                        <input 
                                          type="number"
                                          min="0"
                                          value={seciliUrunler[k.id] || ''}
                                          onChange={e => handleAdetChange(k.id, parseInt(e.target.value) || 0)}
                                          placeholder="0"
                                          className="w-16 px-2 py-1 text-right border border-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                                        />
                                     </td>
                                  </tr>
                               ))}
                            </tbody>
                         </table>
                      )}
                   </div>
                </div>

                {/* Aksiyon Bar */}
                <div className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                   {hata ? <span className="text-red-500 text-sm">{hata}</span> : <span className="text-gray-500 text-sm">Zebra yazıcınızın varsayılan olduğundan emin olun.</span>}
                   
                   <div className="flex gap-2">
                     <button onClick={kopyalaZPL} className="px-4 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors shadow-sm">
                        Raw ZPL Kopyala
                     </button>
                     <button onClick={handlePrint} className="px-6 py-3 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm">
                        🖨️ Önizle & Yazdır ({yazdirilacakEtiketSayisi})
                     </button>
                   </div>
                </div>
             </div>
          </div>
       </main>
    </div>
  )
}
