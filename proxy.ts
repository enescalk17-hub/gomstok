import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // 1. Giriş yapılmamışsa login'e yönlendir (login, auth hariç)
  if (!user && !path.startsWith('/login') && !path.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. Giriş yapılmışsa login'e gitmeye çalışırsa dashboard'a yönlendir
  if (user && path.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 3. Rol tabanlı erişim kontrolü (RBAC)
  if (user && path.startsWith('/dashboard') && path !== '/dashboard') {
    const { data: kullanici } = await supabase
      .from('kullanicilar')
      .select('rol')
      .eq('id', user.id)
      .single()

    const rol = kullanici?.rol || 'misafir'

    // Admin her şeye yetkili
    if (rol !== 'admin') {
      // İzin haritası (Spesifik olanlar yukarıda)
      const izinler: { path: string; roles: string[] }[] = [
        { path: '/dashboard/stok/giris', roles: ['atolye'] },
        { path: '/dashboard/transfer/yeni', roles: ['atolye'] },
        { path: '/dashboard/transfer/teslim', roles: ['magaza', 'depo'] },
        { path: '/dashboard/urunler', roles: [] }, // admin only
        { path: '/dashboard/import', roles: [] },
        { path: '/dashboard/kullanicilar', roles: [] },
        { path: '/dashboard/tedarikciler', roles: ['atolye', 'depo'] },
        { path: '/dashboard/kumaslar', roles: [] },
        { path: '/dashboard/raporlar', roles: [] },
        { path: '/dashboard/sayim', roles: ['depo'] },
        { path: '/dashboard/stok', roles: ['magaza', 'depo'] },
        { path: '/dashboard/transfer', roles: ['atolye', 'magaza', 'depo'] },
      ]

      const checkPath = izinler.find(p => path.startsWith(p.path))
      
      if (checkPath) {
        if (!checkPath.roles.includes(rol)) {
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      } else {
        // Tanımsız bir dashboard alt sayfası ise güvenliği sağla (admin hariç giremez)
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}