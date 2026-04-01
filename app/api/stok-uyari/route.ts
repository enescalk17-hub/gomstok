import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    // Edge function veya RLS bypass için admin client kullanılmalıdır (Service Role Key)
    // Eğer yoksa anon key ile çağırır, public erişime veya view RLS'ine izin verildiyse çalışır.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Kritik Stokları Veritabanından Çek
    const { data: uyariListesi, error } = await supabase
      .from('kritik_stok_analizi')
      .select('*')
      .in('durum', ['tukendi', 'kritik', 'dusuk'])
      .order('durum', { ascending: false }) // kabaca siralama

    if (error) {
       return NextResponse.json({ error: "Veritabanı hatası veya görünüm eksik.", details: error }, { status: 500 })
    }

    if (!uyariListesi || uyariListesi.length === 0) {
       return NextResponse.json({ message: "Kritik stokta ürün yok." }, { status: 200 })
    }

    // 2. Acil (Tükendi) ve Kritik ürünleri ayır
    const tukendiListesi = uyariListesi.filter((u: any) => u.durum === 'tukendi')
    const kritikListesi = uyariListesi.filter((u: any) => u.durum === 'kritik')
    const dusukListesi = uyariListesi.filter((u: any) => u.durum === 'dusuk')

    if (tukendiListesi.length === 0 && kritikListesi.length === 0) {
       return NextResponse.json({ message: "Sadece düşük seviyede stoklar var, acil e-posta gerekmiyor." }, { status: 200 })
    }

    // 3. E-Posta Şablonunu Oluştur
    const tarihStr = new Date().toLocaleDateString('tr-TR')
    
    let emailContent = `Merhaba,\n\nAşağıdaki ürünler kritik stok seviyesine düşmüştür.\nÜretim planlamanızda öncelik verilmesi önerilir.\n\n`

    if (tukendiListesi.length > 0) {
       emailContent += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
       emailContent += `🔴 ACİL — TÜKENDİ (0 adet)\n`
       emailContent += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
       tukendiListesi.forEach((u: any) => {
          emailContent += `- ${u.model} ${u.renk} — ${u.beden} beden\n`
          emailContent += `  Mevcut: 0 | Tavsiye üretim: ${u.tavsiye_uretim_adedi} adet\n\n`
       })
    }

    if (kritikListesi.length > 0) {
       emailContent += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
       emailContent += `🟠 KRİTİK (Kritik seviyenin altında)\n`
       emailContent += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
       kritikListesi.forEach((u: any) => {
          emailContent += `- ${u.model} ${u.renk} — ${u.beden} beden\n`
          emailContent += `  Mevcut: ${u.toplam_stok} | Kritik: ${u.kritik_stok} | Tavsiye üretim: ${u.tavsiye_uretim_adedi} adet\n\n`
       })
    }

    emailContent += `\nGömStok Otomatik Bildirim Sistemi\nhttps://gomstok-eu83.vercel.app\n`

    const subject = `GömStok — Üretim Emri Talebi [${tarihStr}]`

    // 4. Supabase Send-Email Edge Function'u tetikle
    const { data: proxyRes, error: fnError } = await supabase.functions.invoke('send-email', {
       body: {
          subject: subject,
          content: emailContent,
          to: "uretim@gomstok.com" // Normalde ayarlardan alınır.
       }
    })

    if (fnError) {
       console.error("Mail gönderilemedi:", fnError)
       return NextResponse.json({ error: "E-posta Edge Function tetiklenemedi." }, { status: 500 })
    }

    return NextResponse.json({ message: "Üretim emri başarıyla iletildi.", count: tukendiListesi.length + kritikListesi.length }, { status: 200 })

  } catch (err: any) {
    return NextResponse.json({ error: "Sistem hatası", details: err.message }, { status: 500 })
  }
}
