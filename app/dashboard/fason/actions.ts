'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Fason irsaliye numarası üret: FAS-2026-0001
async function irsaliyeNoUret(supabase: any): Promise<string> {
  const yil = new Date().getFullYear()
  const { count } = await supabase
    .from('fason_is_emirleri')
    .select('*', { count: 'exact', head: true })
    .like('irsaliye_no', `FAS-${yil}-%`)
  const sira = String((count || 0) + 1).padStart(4, '0')
  return `FAS-${yil}-${sira}`
}

export async function isEmriOlustur(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz erişim' }

  const payload = {
    musteri_id: formData.get('musteri_id') as string,
    kumas_id: (formData.get('kumas_id') as string) || null,
    model_tanimi: formData.get('model_tanimi') as string,
    hedef_adet: parseInt(formData.get('hedef_adet') as string),
    teslim_alinan_metre: formData.get('teslim_alinan_metre')
      ? parseFloat(formData.get('teslim_alinan_metre') as string)
      : null,
    baslangic_tarihi: (formData.get('baslangic_tarihi') as string) || null,
    notlar: (formData.get('notlar') as string) || null,
    durum: 'bekliyor',
    stoka_girmesin: true,
  }

  if (!payload.musteri_id || !payload.model_tanimi || !payload.hedef_adet) {
    return { error: 'Müşteri, model ve hedef adet zorunludur.' }
  }

  const { error } = await supabase.from('fason_is_emirleri').insert(payload)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/fason')
  return { success: true }
}

export async function durumGuncelle(id: string, durum: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz erişim' }

  const { error } = await supabase
    .from('fason_is_emirleri')
    .update({ durum, guncellendi: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/fason')
  return { success: true }
}

export async function teslimEt(id: string, formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz erişim' }

  const irsaliyeNo = await irsaliyeNoUret(supabase)

  const bedenDagilimi: Record<string, number> = {}
  const bedenler = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']
  for (const b of bedenler) {
    const val = formData.get(`beden_${b}`)
    if (val && parseInt(val as string) > 0) {
      bedenDagilimi[b] = parseInt(val as string)
    }
  }

  const payload = {
    durum: 'teslim_edildi',
    irsaliye_no: irsaliyeNo,
    uretilen_adet: parseInt(formData.get('uretilen_adet') as string) || 0,
    fire_adet: parseInt(formData.get('fire_adet') as string) || 0,
    kullanilan_metre: formData.get('kullanilan_metre')
      ? parseFloat(formData.get('kullanilan_metre') as string)
      : null,
    fire_metre: formData.get('fire_metre')
      ? parseFloat(formData.get('fire_metre') as string)
      : null,
    beden_dagilimi: Object.keys(bedenDagilimi).length > 0 ? bedenDagilimi : null,
    bitis_tarihi: new Date().toISOString().split('T')[0],
    guncellendi: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('fason_is_emirleri')
    .update(payload)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/fason')
  return { success: true, irsaliyeNo }
}

export async function isEmriSil(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: kullanici } = await supabase
    .from('kullanicilar').select('rol').eq('id', user?.id).single()

  if (kullanici?.rol !== 'admin') return { error: 'Silme yetkiniz yok.' }

  const { error } = await supabase.from('fason_is_emirleri').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/fason')
  return { success: true }
}
