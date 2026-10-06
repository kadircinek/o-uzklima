import { GelenKutusu } from "@/components/gelen-kutusu";
import { HizliGirisDugmesi } from "@/components/hizli-giris-dugmesi";
import { Bos, SayfaBasligi } from "@/components/ui";
import type { GirdiEpostasi } from "@/lib/eposta";
import { varsayilanOnay, type KartVerisi } from "@/lib/inbox";
import { AyristirmaSemasi, ayristirmayiDuzelt, bosAyristirma } from "@/lib/parse/schema";
import { ayarlariGetir, bugun } from "@/lib/server/ops";
import { islenmemisGirdiler, kartBaglami } from "@/lib/server/queries";
import { requireUser } from "@/lib/supabase/server";

export const metadata = { title: "Gelen kutusu" };

export default async function GelenKutusuSayfasi() {
  const { supabase, userId } = await requireUser();
  const [ayarlar, girdiler, baglam] = await Promise.all([
    ayarlariGetir(supabase, userId),
    islenmemisGirdiler(supabase),
    kartBaglami(supabase, userId),
  ]);

  const kartlar: KartVerisi[] = girdiler.map((g) => {
    const ham = AyristirmaSemasi.safeParse(g.ayristirma_json);
    const ayristirma = ham.success ? ayristirmayiDuzelt(ham.data, g.ham_metin) : bosAyristirma(g.ham_metin);
    const hata = ham.success ? null : (g.hata ?? "Henüz ayrıştırılmadı; kartı elle doldurun.");
    return {
      id: g.id,
      ham_metin: g.ham_metin,
      created_at: g.created_at,
      ses_dosyasi: g.ses_dosyasi,
      kaynak: g.kaynak,
      eposta: g.eposta as GirdiEpostasi | null,
      ayristirma,
      hata,
      onay: varsayilanOnay(ayristirma, baglam),
    };
  });

  return (
    <>
      <SayfaBasligi
        baslik="Gelen kutusu"
        alt={kartlar.length ? `${kartlar.length} işlenmemiş kayıt · gün sonunda boş kalsın` : "Hepsi işlendi"}
      />
      {kartlar.length === 0 ? (
        <Bos>
          Gelen kutusu boş. <HizliGirisDugmesi>Yeni kayıt ekle</HizliGirisDugmesi>
        </Bos>
      ) : (
        <GelenKutusu kartlar={kartlar} baglam={baglam} ayarlar={ayarlar} bugun={bugun(ayarlar)} />
      )}
    </>
  );
}
