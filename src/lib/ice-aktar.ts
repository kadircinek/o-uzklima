// Excel/CSV firma listesindeki sütunları LifeOS alanlarına eşler.
// Business Central dışa aktarımlarındaki İngilizce/Türkçe başlıklar da tanınır.

import type { FirmaTuru } from "./domain";
import { normalizeAd } from "./match";

export type Alan = "ad" | "ulke" | "tur" | "segment" | "notlar";

const BASLIKLAR: Record<Alan, string[]> = {
  ad: ["ad", "firma", "firma adi", "firma adı", "unvan", "ünvan", "musteri", "müşteri", "musteri adi", "name", "company", "customer", "customer name", "vendor", "vendor name", "account"],
  ulke: ["ulke", "ülke", "country", "country region code", "country/region code", "country code", "ulke kodu"],
  tur: ["tur", "tür", "tip", "type", "kategori", "category"],
  segment: ["segment", "sektor", "sektör", "industry", "customer posting group", "musteri grubu", "grup", "group"],
  notlar: ["not", "notlar", "aciklama", "açıklama", "notes", "comment", "comments", "description"],
};

const anahtar = (s: string) => normalizeAd(s.replace(/[_./]+/g, " "));

/** Başlık satırından her alan için sütun indeksini tahmin eder. */
export function sutunlariTahminEt(basliklar: string[]): Partial<Record<Alan, number>> {
  const sonuc: Partial<Record<Alan, number>> = {};
  const normal = basliklar.map(anahtar);
  for (const alan of Object.keys(BASLIKLAR) as Alan[]) {
    const adaylar = BASLIKLAR[alan].map(anahtar);
    const i = normal.findIndex((b, j) => adaylar.includes(b) && !Object.values(sonuc).includes(j));
    if (i >= 0) sonuc[alan] = i;
  }
  if (sonuc.ad === undefined && basliklar.length > 0) sonuc.ad = 0;
  return sonuc;
}

/** Serbest metinden firma türü; tanınmazsa varsayılan. */
export function turuCoz(deger: string | null | undefined, varsayilan: FirmaTuru): FirmaTuru {
  const d = anahtar(deger ?? "");
  if (!d) return varsayilan;
  if (/(tedarik|supplier|vendor|satici)/.test(d)) return "tedarikci";
  if (/(aday|prospect|lead|potansiyel)/.test(d)) return "aday";
  if (/(musteri|customer|client)/.test(d)) return "musteri";
  return varsayilan;
}

export type IceAktarimOnizleme = {
  ad: string;
  ulke: string | null;
  tur: FirmaTuru;
  segment: string | null;
  notlar: string | null;
};

export function satirlariDonustur(
  satirlar: unknown[][],
  sutunlar: Partial<Record<Alan, number>>,
  varsayilanTur: FirmaTuru,
): IceAktarimOnizleme[] {
  const al = (s: unknown[], alan: Alan): string | null => {
    const i = sutunlar[alan];
    if (i === undefined) return null;
    const v = s[i];
    if (v === null || v === undefined) return null;
    const t = String(v).trim();
    return t ? t : null;
  };
  const sonuc: IceAktarimOnizleme[] = [];
  for (const s of satirlar) {
    const ad = al(s, "ad");
    if (!ad) continue;
    sonuc.push({
      ad: ad.replace(/\s+/g, " ").slice(0, 300),
      ulke: al(s, "ulke")?.slice(0, 100) ?? null,
      tur: turuCoz(al(s, "tur"), varsayilanTur),
      segment: al(s, "segment")?.slice(0, 200) ?? null,
      notlar: al(s, "notlar")?.slice(0, 10_000) ?? null,
    });
  }
  return sonuc;
}
