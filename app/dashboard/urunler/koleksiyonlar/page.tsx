import TanimlamaListesi from '@/components/TanimlamaListesi'

export default function KoleksiyonlarPage() {
  return <TanimlamaListesi
    tablo="koleksiyonlar"
    baslik="Koleksiyonlar"
    ikon="Koleksiyon"
    kodAlani={true}
  />
}