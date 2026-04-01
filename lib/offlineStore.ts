import { get, set } from 'idb-keyval'
import { createClient } from '@/lib/supabase/client'

export type OfflineTaskType = 'SAYIM_EKLE' | 'STOK_GIRIS' | 'TRANSFER_KABUL' | 'KOLI_YENI'

export interface OfflineTask {
  id: string
  tip: OfflineTaskType
  payload: any
  zaman: string
}

const STORE_KEY = 'gomstok_offline_kuyruk'

export async function getOfflineKuyruk(): Promise<OfflineTask[]> {
  const kuyruk = await get<OfflineTask[]>(STORE_KEY)
  return kuyruk || []
}

export async function addOfflineTask(tip: OfflineTaskType, payload: any) {
  const kuyruk = await getOfflineKuyruk()
  const newTask: OfflineTask = {
    id: crypto.randomUUID(),
    tip,
    payload,
    zaman: new Date().toISOString()
  }
  kuyruk.push(newTask)
  await set(STORE_KEY, kuyruk)
  
  // Custom Event trigger for the UI to update the connection status indicator count
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offlineKuyrukGuncellendi'))
  }
}

export async function removeOfflineTask(id: string) {
  const kuyruk = await getOfflineKuyruk()
  const yeniKuyruk = kuyruk.filter(t => t.id !== id)
  await set(STORE_KEY, yeniKuyruk)
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offlineKuyrukGuncellendi'))
  }
}

export async function clearOfflineKuyruk() {
  await set(STORE_KEY, [])
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offlineKuyrukGuncellendi'))
  }
}

/**
 * Executes a single task against Supabase.
 * Returns true if successful, false if failed.
 */
export async function executeOfflineTask(task: OfflineTask, supabase: ReturnType<typeof createClient>): Promise<boolean> {
  try {
    switch (task.tip) {
      
      case 'SAYIM_EKLE': {
        const { urun_id, lokasyon_id, secilenSayim } = task.payload
        // Sayım işlemi simüle edimi: sayilan_stok update vs eklenebilir
        // Şimdilik sadece stok tablosuna hızlı müdahale örneği veya stok_hareketleri
        const { data: user } = await supabase.auth.getUser()
        
        // Mevcut stoğu öğren (Offline modda eldeki veriye güvenir)
        const { data: stoklar } = await supabase.from('stok').select('*').eq('urun_id', urun_id).eq('lokasyon_id', lokasyon_id)
        if (stoklar && stoklar.length > 0) {
           await supabase.from('stok').update({ miktar: secilenSayim }).eq('id', stoklar[0].id)
           await supabase.from('stok_hareketleri').insert({
              urun_id, lokasyon_id, hareket_tipi: 'sayim', 
              miktar: secilenSayim - stoklar[0].miktar, 
              yapan_id: user.user?.id, aciklama: 'Offline M3 Cihaz Hızlı Sayım'
           })
        } else {
           await supabase.from('stok').insert({ urun_id, lokasyon_id, miktar: secilenSayim })
           await supabase.from('stok_hareketleri').insert({
              urun_id, lokasyon_id, hareket_tipi: 'stok_giris', 
              miktar: secilenSayim, 
              yapan_id: user.user?.id, aciklama: 'Offline M3 Cihaz İlk Sayım'
           })
        }
        break;
      }
      
      // ... Diğer tipler eklenecek (TRANSFER_KABUL vb)

      default:
        console.warn('Bilinmeyen Offline Görev Tipi:', task.tip)
        break;
    }
    return true
  } catch (err) {
    console.error('Offline görev push hatası:', err)
    return false
  }
}
