import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// Kendi SMTP sunucunuza (Örn: Yandex, Gmail, SMTP2Go) bağlanmak için
// deno.land üzerinden SmtpClient kullanılır.
import { SmtpClient } from "https://deno.land/x/smtp/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const reqData = await req.json()
    // Yeni genel mail yapısı
    const genSubject = reqData.subject
    const genContent = reqData.content
    const genTo = reqData.to || reqData.alici_email || "magaza@gomstok.com"

    // Eski koli yapısı uyumluluk
    let finalSubject = genSubject
    let finalContent = genContent

    if (reqData.koli_no && !genSubject) {
       const formattedDate = new Date(reqData.tahmini_teslim).toLocaleString('tr-TR')
       finalSubject = `Yeni Sevkiyat: ${reqData.koli_no} Nolu Koli Yola Çıktı!`
       finalContent = `
        Merhaba,

        Tesisinize yeni bir sevkiyat yola çıkmıştır.

        İrsaliye / Koli No: ${reqData.koli_no}
        İçerik: ${reqData.toplam_adet} adet ürün
        Araç Plakası: ${reqData.plaka}
        Tahmini Varış: ${formattedDate}

        GömStok Lojistik Sistemi
       `
    }

    // SMTP İstemcisini oluştur (Supabase Secrets üzerinden beslenmelidir)
    const client = new SmtpClient()
    
    await client.connectTLS({
      hostname: Deno.env.get('SMTP_HOSTNAME') || "smtp.example.com",
      port: 465,
      username: Deno.env.get('SMTP_USERNAME') || "sistem@gomstok.com",
      password: Deno.env.get('SMTP_PASSWORD') || "gizliSifre123",
    });

    await client.send({
      from: "sistem@gomstok.com",
      to: genTo,
      subject: finalSubject || "GömStok Bildirim",
      content: finalContent || "İçerik bulunamadı.",
    });

    await client.close();

    return new Response(
      JSON.stringify({ message: "E-posta başarıyla gönderildi!" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
