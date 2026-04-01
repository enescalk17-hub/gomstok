'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function kaydet({ id, ad, vergi_no, telefon, eposta, adres, tur }: any) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Yetkisiz erişim' }
  const { data: kullanici } = await supabase.from('kullanicilar').select('rol').eq('id', user.id).single()
  
  if (id) {
    // Düzenleme yetkisi sadece admin
    if (kullanici?.rol !== 'admin') return { error: 'Tedarikçi düzenleme yetkiniz yok.' }
  }

  const payload = {
    ad,
    vergi_no: vergi_no || null,
    telefon: telefon || null,
    eposta: eposta || null,
    adres: adres || null,
    tur
  }

  let res
  if (id) {
    res = await supabase.from('tedarikciler').update(payload).eq('id', id)
  } else {
    res = await supabase.from('tedarikciler').insert(payload)
  }

  if (res.error) return { error: res.error.message }
  
  revalidatePath('/dashboard/tedarikciler')
  return { success: true }
}

export async function sil(id: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  const { data: kullanici } = await supabase.from('kullanicilar').select('rol').eq('id', user?.id).single()
  
  if (kullanici?.rol !== 'admin') return { error: 'Silme yetkiniz yok.' }
  
  const res = await supabase.from('tedarikciler').delete().eq('id', id)
  
  if (res.error) {
     if (res.error.code === '23503') {
        return { error: 'Bu tedarikçi bazı ürün veya kumaşlarla eşleştiği için silinemez.' }
     }
     return { error: res.error.message }
  }
  
  revalidatePath('/dashboard/tedarikciler')
  return { success: true }
}
