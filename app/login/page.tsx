'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function girisYap(e: React.FormEvent) {
    e.preventDefault()
    setYukleniyor(true)
    setHata('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setHata('E-posta veya şifre hatalı.')
      setYukleniyor(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-sm p-8">
        
        {/* Logo / Başlık */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">👕</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">GömStok</h1>
          <p className="text-gray-500 text-sm mt-1">Stok Yönetim Sistemi</p>
        </div>

        {/* Form */}
        <form onSubmit={girisYap} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-posta
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@email.com"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 
                         focus:border-transparent text-gray-900 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 
                         focus:border-transparent text-gray-900 text-sm"
            />
          </div>

          {/* Hata mesajı */}
          {hata && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-red-600 text-sm">{hata}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={yukleniyor}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 
                       text-white font-medium py-3 rounded-xl transition-colors
                       flex items-center justify-center gap-2 text-sm"
          >
            {yukleniyor ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Giriş yapılıyor...
              </>
            ) : 'Giriş Yap'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          GömStok v1.0 — Tekstil Stok Yönetimi
        </p>
      </div>
    </div>
  )
}