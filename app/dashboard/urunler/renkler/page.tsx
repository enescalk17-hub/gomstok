import TanimlamaListesi from '@/components/TanimlamaListesi'

export default function RenklerPage() {
  return <TanimlamaListesi
    tablo="renkler"
    baslik="Renkler"
    ikon="Renk"
    kodAlani={true}
  />
}