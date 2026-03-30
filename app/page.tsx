import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/dashboard')
}
```

---

## 🧪 Test Kullanıcısı Oluştur

Supabase Dashboard'a git:
```
Authentication → Users → "Add user" → "Create new user"

Email:    admin@gomstok.com
Password: Gomstok2025!