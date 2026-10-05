// Claude'un gelen kutusu girdisi için döndürdüğü sabit JSON biçimi.
// PRD: {tur, baslik, firma, kisi, urun, tarih, hatirlatma, guven}
// Ek alanlar: olay (hangi hatırlatma kuralı), tekrar (yinelenen görev),
// ozet + aksiyonlar (toplantı / sesli not özeti).

import { z } from "zod";
import { isDateStr } from "../dates";
import { GIRDI_TURLERI, OLAYLAR, type GirdiTuru, type Olay } from "../domain";
import { tekrarCoz } from "../rules";

export const AKSIYON_TURLERI = ["gorev", "takip", "bekleme"] as const;

export const AyristirmaSemasi = z.object({
  tur: z.enum(GIRDI_TURLERI),
  baslik: z.string(),
  firma: z.string().nullable(),
  kisi: z.string().nullable(),
  urun: z.string().nullable(),
  tarih: z.string().nullable(),
  hatirlatma: z.string().nullable(),
  guven: z.number(),
  olay: z.enum(OLAYLAR),
  tekrar: z.string().nullable(),
  ozet: z.string().nullable(),
  aksiyonlar: z.array(
    z.object({
      tur: z.enum(AKSIYON_TURLERI),
      baslik: z.string(),
      tarih: z.string().nullable(),
    }),
  ),
});

export type HamAyristirma = z.infer<typeof AyristirmaSemasi>;

export type Aksiyon = { tur: (typeof AKSIYON_TURLERI)[number]; baslik: string; tarih: string | null };

export type Ayristirma = {
  tur: GirdiTuru;
  baslik: string;
  firma: string | null;
  kisi: string | null;
  urun: string | null;
  tarih: string | null;
  /** Yerel saat, 'YYYY-MM-DDTHH:MM' */
  hatirlatma: string | null;
  guven: number;
  olay: Olay;
  tekrar: string | null;
  ozet: string | null;
  aksiyonlar: Aksiyon[];
};

/** Güven bu eşiğin altındaysa onay kartı uyarıyla gösterilir. */
export const DUSUK_GUVEN = 0.7;

const HATIRLATMA_RE = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d)$/;

function temiz(s: string | null | undefined): string | null {
  const t = s?.trim();
  return t ? t : null;
}

/**
 * Model çıktısını uygulamanın güvenebileceği biçime getirir: boş metinler
 * null olur, geçersiz tarih/tekrar alanları atılır ve güven düşürülür.
 */
export function ayristirmayiDuzelt(ham: HamAyristirma, hamMetin: string): Ayristirma {
  let guven = Number.isFinite(ham.guven) ? Math.min(1, Math.max(0, ham.guven)) : 0.5;

  let tarih = temiz(ham.tarih);
  if (tarih && !isDateStr(tarih)) {
    tarih = null;
    guven = Math.min(guven, 0.5);
  }

  let hatirlatma = temiz(ham.hatirlatma);
  if (hatirlatma) {
    const m = HATIRLATMA_RE.exec(hatirlatma);
    if (!m || !isDateStr(m[1])) {
      hatirlatma = null;
      guven = Math.min(guven, 0.5);
    }
  }

  let tekrar = temiz(ham.tekrar)?.toLowerCase() ?? null;
  if (tekrar && !tekrarCoz(tekrar)) {
    tekrar = null;
    guven = Math.min(guven, 0.5);
  }

  let tur = ham.tur;
  let olay = ham.olay;
  // Ödeme olayı her zaman vade türündedir; vade türünde tarih şarttır.
  if (olay === "odeme_vadesi") tur = "vade";
  // Teklif/numune gönderimi her zaman bir takiptir (kural olaya bağlı).
  if ((olay === "teklif_gonderildi" || olay === "numune_gonderildi") && tur !== "not") tur = "takip";
  if (tur === "vade" && !tarih) guven = Math.min(guven, 0.4);
  if (tur === "not") olay = "yok";

  const aksiyonlar = (ham.aksiyonlar ?? [])
    .map((a) => ({ tur: a.tur, baslik: a.baslik.trim(), tarih: isDateStr(a.tarih) ? a.tarih : null }))
    .filter((a) => a.baslik.length > 0);

  return {
    tur,
    baslik: temiz(ham.baslik) ?? hamMetin.trim().slice(0, 120),
    firma: temiz(ham.firma),
    kisi: temiz(ham.kisi),
    urun: temiz(ham.urun),
    tarih,
    hatirlatma,
    guven,
    olay,
    tekrar,
    ozet: temiz(ham.ozet),
    aksiyonlar,
  };
}

/** Claude kullanılamadığında elle doldurulacak varsayılan kart. */
export function bosAyristirma(hamMetin: string): Ayristirma {
  return {
    tur: "gorev",
    baslik: hamMetin.trim().split("\n")[0].slice(0, 120),
    firma: null,
    kisi: null,
    urun: null,
    tarih: null,
    hatirlatma: null,
    guven: 0,
    olay: "yok",
    tekrar: null,
    ozet: null,
    aksiyonlar: [],
  };
}
