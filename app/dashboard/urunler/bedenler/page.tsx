import TanimlamaListesi from '@/components/TanimlamaListesi'

export default function BedenlerPage() {
  return <TanimlamaListesi
    tablo="bedenler"
    baslik="Bedenler"
    ikon="Beden"
    kodAlani={false}
  />
}