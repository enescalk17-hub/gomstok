import TanimlamaListesi from '@/components/TanimlamaListesi'

export default function ModellerPage() {
  return <TanimlamaListesi
    tablo="modeller"
    baslik="Modeller"
    ikon="Model"
    kodAlani={true}
  />
}