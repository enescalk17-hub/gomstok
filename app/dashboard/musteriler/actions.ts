'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function kaydet({ id, ad, telefon, eposta, adres, vergi_no, notlar }: any) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz erişim' }

  const { data: kullanici } = await supabase
    .from('kullanicilar').select('rol').eq('id', user.id).single()

  if (id && kullanici?.rol !== 'admin') {
    return { error: 'Müşteri düzenleme yetkiniz yok.' }
  }

  const payload = {
    ad,
    telefon: telefon || null,
    eposta: eposta || null,
    adres: adres || null,
    vergi_no: vergi_no || null,
    notlar: notlar || null,
  }

  const res = id
    ? await supabase.from('musteriler').update(payload).eq('id', id)
    : await supabase.from('musteriler').insert(payload)

  if (res.error) return { error: res.error.message }

  revalidatePath('/dashboard/musteriler')
  return { success: true }
}

export async function sil(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: kullanici } = await supabase
    .from('kullanicilar').select('rol').eq('id', user?.id).single()

  if (kullanici?.rol !== 'admin') return { error: 'Silme yetkiniz yok.' }

  const res = await supabase.from('musteriler').delete().eq('id', id)

  if (res.error) {
    if (res.error.code === '23503') {
      return { error: 'Bu müşteriye ait kumaş veya iş emri var; önce onları silin.' }
    }
    return { error: res.error.message }
  }

  revalidatePath('/dashboard/musteriler')
  return { success: true }
}