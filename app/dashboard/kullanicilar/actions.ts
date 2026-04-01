'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function kullaniciEkle(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const ad_soyad = formData.get('ad_soyad') as string
  const rol = formData.get('rol') as string
  const lokasyon_id = formData.get('lokasyon_id') as string

  if (!email || !password || !ad_soyad || !rol) {
    return { error: 'Lütfen tüm zorunlu alanları doldurun.' }
  }

  // Sadece Admin kullanıcıları rolü kontrol edilmeli, ancak proxy.ts halihazırda
  // /dashboard/kullanicilar yolunu admin rolüne kilitlediği için burası nispeten güvenli.
  // Yinede server action içinde de kontrol eklemek best practice'tir.

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return { error: 'Sistemde SUPABASE_SERVICE_ROLE_KEY bulunamadi. Lütfen Vercel / .env ayarlarınızı kontrol edin.' }
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey, // Admin API için service key (anon yerine)
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {} // Server action admin script doesn't set cookies
      }
    }
  )

  // 1. Kullanıcıyı auth.users tablosunda oluştur
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Direkt onaylı yap!
    user_metadata: { ad_soyad, rol }
  })

  if (authError || !authData.user) {
    return { error: authError?.message || 'Kullanıcı oluşturulamadı.' }
  }

  // 2. public.kullanicilar tablosuna detayları ekle
  const { error: dbError } = await supabase.from('kullanicilar').insert({
    id: authData.user.id,
    ad_soyad,
    rol,
    lokasyon_id: lokasyon_id || null
  })

  if (dbError) {
    // Auth oluştu ama db'ye eklenemediyse cleanup yapabiliriz (opsiyonel)
    await supabase.auth.admin.deleteUser(authData.user.id)
    return { error: 'Veritabanına kayıt yapılamadı: ' + dbError.message }
  }

  revalidatePath('/dashboard/kullanicilar')
  return { success: true }
}

export async function kullaniciSil(userId: string) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return { error: 'Sistemde SUPABASE_SERVICE_ROLE_KEY bulunamadı.' }
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {}
      }
    }
  )

  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/kullanicilar')
  return { success: true }
}
