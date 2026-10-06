import "server-only";
import { firmalariBul, type GirdiEpostasi } from "../eposta";
import { varsayilanOnay, type KartBaglami, type KartVerisi } from "../inbox";
import { bosAyristirma, type Ayristirma } from "../parse/schema";
import { ayristir, AyristirmaHatasi, claudeYapilandirildiMi } from "./claude";
import { ayarlariGetir, bugun, type Db } from "./ops";

// Gelen kutusu kaydını Claude ile ayrıştırıp sonucu kaydeder. Hem hızlı
// girişten (kullanıcı oturumu) hem e-posta webhook'undan (yönetici istemcisi)
// çağrılır.

export type GirdiKaydi = {
  id: string;
  ham_metin: string;
  created_at: string;
  ses_dosyasi: string | null;
  kaynak: "elle" | "eposta";
  eposta: GirdiEpostasi | null;
};

export const GIRDI_SECIMI = "id, ham_metin, created_at, ses_dosyasi, kaynak, eposta";

export async function girdiAyristir(
  db: Db,
  userId: string,
  kayit: GirdiKaydi,
  secenek: { toplanti: boolean; baglam: KartBaglami; kendiAlanlar?: string[] },
): Promise<KartVerisi> {
  const { baglam } = secenek;
  let ayristirma: Ayristirma;
  let hata: string | null = null;
  if (!claudeYapilandirildiMi()) {
    ayristirma = bosAyristirma(kayit.ham_metin);
    hata = "Claude API anahtarı tanımlı değil; kartı elle doldurun.";
  } else {
    try {
      const ayarlar = await ayarlariGetir(db, userId);
      const kisiler = new Map<string, string[]>();
      for (const k of baglam.kisiler) kisiler.set(k.company_id, [...(kisiler.get(k.company_id) ?? []), k.ad]);
      ayristirma = await ayristir(kayit.ham_metin, {
        bugun: bugun(ayarlar),
        toplanti: secenek.toplanti,
        firmalar: baglam.firmalar.map((f) => ({
          ad: f.ad,
          tur: f.tur,
          kisiler: kisiler.get(f.id) ?? [],
          alanlar: f.eposta_alanlari,
        })),
      });
    } catch (e) {
      if (!(e instanceof AyristirmaHatasi)) console.error(e);
      ayristirma = bosAyristirma(kayit.ham_metin);
      hata = e instanceof AyristirmaHatasi ? e.message : "Ayrıştırma başarısız oldu; kartı elle doldurun.";
    }
  }

  // E-postadan geldiyse ve firma bulunamadıysa karşı tarafın adresinden tahmin et.
  if (!ayristirma.firma && kayit.eposta?.karsi_taraf.length) {
    const idler = firmalariBul(kayit.eposta.karsi_taraf, baglam.firmalar, baglam.kisiler, secenek.kendiAlanlar);
    if (idler.length === 1) ayristirma = { ...ayristirma, firma: baglam.firmalar.find((f) => f.id === idler[0])!.ad };
  }

  await db
    .from("inbox_items")
    .update({ ayristirma_json: hata ? null : ayristirma, hata })
    .eq("id", kayit.id)
    .eq("user_id", userId);
  return { ...kayit, ayristirma, hata, onay: varsayilanOnay(ayristirma, baglam) };
}
