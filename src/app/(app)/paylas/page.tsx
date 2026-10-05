import { HizliGirisiAc } from "@/components/hizli-giris-dugmesi";
import { SayfaBasligi } from "@/components/ui";

// Web Share Target: telefonda başka bir uygulamadan "Paylaş → LifeOS"
// seçilince metin buraya gelir ve hızlı giriş penceresi açılır.

export const metadata = { title: "Paylaş" };

export default async function PaylasSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ baslik?: string; metin?: string; adres?: string }>;
}) {
  const p = await searchParams;
  const metin = [p.baslik, p.metin, p.adres]
    .filter((x): x is string => Boolean(x?.trim()))
    .filter((x, i, a) => a.indexOf(x) === i)
    .join("\n")
    .slice(0, 20_000);

  return (
    <>
      <SayfaBasligi baslik="Paylaşılan içerik" alt="Hızlı giriş penceresinde düzenleyip ekleyebilirsin." />
      <HizliGirisiAc metin={metin} />
    </>
  );
}
