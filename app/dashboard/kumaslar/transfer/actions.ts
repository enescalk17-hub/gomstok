'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function kumasTransferGit(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum bulunamadı' }

  const kumas_id = formData.get('kumas_id') as string
  const varis_lokasyon_id = formData.get('varis_lokasyon_id') as string
  const miktar_metre = parseFloat(formData.get('miktar_metre') as string)
  const hedef_model_id = formData.get('hedef_model_id') as string
  const hedef_tahmini_adet = formData.get('hedef_tahmini_adet') ? parseInt(formData.get('hedef_tahmini_adet') as string) : null
  const notlar = formData.get('notlar') as string

  if (!kumas_id || !varis_lokasyon_id || isNaN(miktar_metre) || miktar_metre <= 0) {
    return { error: 'Kumaş, varış ve miktar zorunludur.' }
  }

  // Orijinal kumaşı çek
  const { data: qKumas } = await supabase.from('kumaslar').select('*').eq('id', kumas_id).single()
  
  if (!qKumas) return { error: 'Kumaş bulunamadı.' }
  if (qKumas.miktar_metre < miktar_metre) return { error: `Yetersiz bakiye. Bu toptan maksimum ${qKumas.miktar_metre}m sevk edebilirsiniz.` }

  // 1. Yeni kayıt (Transfer giden parti - Atölyede gözükecek)
  const { data: yeniKumas, error: iErr } = await supabase.from('kumaslar').insert({
    tur_id: qKumas.tur_id,
    desen_id: qKumas.desen_id,
    renk: qKumas.renk,
    en_cm: qKumas.en_cm,
    miktar_metre: miktar_metre,
    kumas_barkod: qKumas.kumas_barkod,
    tedarikci_id: qKumas.tedarikci_id,
    lokasyon_id: varis_lokasyon_id,
    maliyet_metre: qKumas.maliyet_metre,
    notlar: 'Depodan transfer edildi. ' + (notlar || ''),
    parent_id: qKumas.id
  }).select('id').single()

  if (iErr) return { error: 'Yeni parça oluşturulamadı: ' + iErr.message }

  // 2. Ana kumaştan eksilt
  const yeniMetre = qKumas.miktar_metre - miktar_metre
  const { error: uErr } = await supabase.from('kumaslar').update({ miktar_metre: yeniMetre }).eq('id', kumas_id)
  
  if (uErr) return { error: 'Metraj düşülemedi: ' + uErr.message }

  // 3. Log ekle
  await supabase.from('kumas_hareketleri').insert({
    kumas_id: kumas_id,
    islem_tipi: 'sevk',
    miktar_metre: miktar_metre,
    cikis_lokasyon_id: qKumas.lokasyon_id,
    varis_lokasyon_id: varis_lokasyon_id,
    hedef_model_id: hedef_model_id || null,
    hedef_tahmini_adet: hedef_tahmini_adet,
    olusturan_id: user.id,
    notlar: notlar || null
  })

  revalidatePath('/dashboard/kumaslar/transfer')
  revalidatePath('/dashboard/kumaslar')
  return { success: true }
}
