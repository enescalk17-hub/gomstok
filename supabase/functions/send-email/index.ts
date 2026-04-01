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
    const { koli_no, toplam_adet, plaka, tahmini_teslim, alici_email } = await req.json()

    // SMTP İstemcisini oluştur (Supabase Secrets üzerinden beslenmelidir)
    // supabase secrets set SMTP_HOSTNAME=smtp.gmail.com
    const client = new SmtpClient()
    
    await client.connectTLS({
      hostname: Deno.env.get('SMTP_HOSTNAME') || "smtp.example.com",
      port: 465,
      username: Deno.env.get('SMTP_USERNAME') || "sistem@gomstok.com",
      password: Deno.env.get('SMTP_PASSWORD') || "gizliSifre123",
    });

    const formattedDate = new Date(tahmini_teslim).toLocaleString('tr-TR')

    await client.send({
      from: "sistem@gomstok.com",
      to: alici_email || "magaza@gomstok.com",
      subject: `Yeni Sevkiyat: ${koli_no} Nolu Koli Yola Çıktı!`,
      content: `
        Merhaba,

        Tesisinize yeni bir sevkiyat yola çıkmıştır.

        İrsaliye / Koli No: ${koli_no}
        İçerik: ${toplam_adet} adet ürün
        Araç Plakası: ${plaka}
        Tahmini Varış: ${formattedDate}

        GömStok Lojistik Sistemi
      `,
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
