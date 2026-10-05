// Hatırlatma motorunun saf kısmı: hangi bildirim ne zaman gider, günlük
// özet ne içerir, sessiz müşteri kimdir. Veritabanı ve push gönderimi
// src/lib/server/tick.ts içinde; bu dosya yalnızca karar verir.

import { diffDays, localParts, relativeDay, weekday, type DateStr } from "./dates";
import { isBusinessDay } from "./holidays";
import type { Ayarlar, FirmaTuru, GorevDurumu, GorevTuru } from "./domain";

export type MotorGorevi = {
  id: string;
  baslik: string;
  tur: GorevTuru;
  durum: GorevDurumu;
  vade: DateStr | null;
  hatirlatma_zamani: string | null;
  firma_adi?: string | null;
};

export type MotorFirmasi = {
  id: string;
  ad: string;
  tur: FirmaTuru;
  aktif: boolean;
  son_temas: string | null; // timestamptz
  created_at: string;
};

/** Özet bugün gönderilmeli mi? (iş günü, özet saati geçti, henüz gönderilmedi) */
export function ozetZamaniMi(simdi: Date, ayarlar: Ayarlar, bugunGonderildi: boolean): boolean {
  if (bugunGonderildi) return false;
  const { date, time } = localParts(simdi, ayarlar.saat_dilimi);
  return isBusinessDay(date, ayarlar.ek_tatiller) && time >= ayarlar.ozet_saati;
}

/**
 * Zamanı gelen hatırlatmalardan bugünkü sınır içinde gönderilecekleri seçer.
 * Fazlası özete aktarılır (Bugün ekranında ve ertesi sabahın özetinde görünür).
 */
export function hatirlatmalariSec<T extends Pick<MotorGorevi, "hatirlatma_zamani">>(
  zamaniGelenler: T[],
  bugunGonderilen: number,
  limit: number,
): { gonder: T[]; ozete: T[] } {
  const sirali = [...zamaniGelenler].sort((a, b) =>
    (a.hatirlatma_zamani ?? "").localeCompare(b.hatirlatma_zamani ?? ""),
  );
  const kalan = Math.max(0, limit - bugunGonderilen);
  return { gonder: sirali.slice(0, kalan), ozete: sirali.slice(kalan) };
}

const TUR_ONCELIK: Record<GorevTuru, number> = { yapacagim: 0, takip: 1, bekliyorum: 2 };

/** Açık işleri Bugün önceliğine göre sıralar: gecikenler (en eski önce), sonra bugünküler. */
export function oncelikSirala<T extends Pick<MotorGorevi, "vade" | "tur">>(gorevler: T[]): T[] {
  return [...gorevler].sort((a, b) => {
    const va = a.vade ?? "9999-12-31";
    const vb = b.vade ?? "9999-12-31";
    if (va !== vb) return va.localeCompare(vb);
    return TUR_ONCELIK[a.tur] - TUR_ONCELIK[b.tur];
  });
}

export type BugunGorunumu<T> = {
  gecikenler: T[];
  bugun: T[];
  bekleyenler: T[];
};

/** Bugün ekranının görev bölümleri. Açık (bitmemiş) görevler verilmelidir. */
export function bugunGorunumu<T extends Pick<MotorGorevi, "vade" | "tur" | "durum">>(
  gorevler: T[],
  bugun: DateStr,
): BugunGorunumu<T> {
  const acik = gorevler.filter((g) => g.durum !== "bitti");
  const gecikenler = oncelikSirala(acik.filter((g) => g.vade !== null && g.vade < bugun));
  const bugunku = oncelikSirala(acik.filter((g) => g.vade === bugun));
  // Vadesi gelmemiş bekleyenler de görünür: "kimden ne bekliyorum" listesi.
  const bekleyenler = oncelikSirala(
    acik.filter((g) => g.tur === "bekliyorum" && (g.vade === null || g.vade > bugun)),
  );
  return { gecikenler, bugun: bugunku, bekleyenler };
}

export type SessizFirma = { id: string; ad: string; gun: number | null };

/** Aktif müşterilerden son temasın üzerinden `sessiz_gun` geçenler (en sessiz önce). */
export function sessizMusteriler(firmalar: MotorFirmasi[], bugun: DateStr, ayarlar: Ayarlar): SessizFirma[] {
  const tz = ayarlar.saat_dilimi;
  const sinir = ayarlar.kurallar.sessiz_gun;
  const sonuc: SessizFirma[] = [];
  for (const f of firmalar) {
    if (f.tur !== "musteri" || !f.aktif) continue;
    const ref = f.son_temas ?? f.created_at;
    const gun = diffDays(localParts(new Date(ref), tz).date, bugun);
    if (gun >= sinir) sonuc.push({ id: f.id, ad: f.ad, gun: f.son_temas ? gun : null });
  }
  return sonuc.sort((a, b) => (b.gun ?? Infinity) - (a.gun ?? Infinity));
}

export type Ozet = { baslik: string; govde: string; maddeler: string[] };

/** Günlük özet: bugünün 5 önceliği + (haftada bir) sessiz müşteriler. */
export function ozetOlustur(
  gorevler: MotorGorevi[],
  sessizler: SessizFirma[],
  bugun: DateStr,
  ayarlar: Ayarlar,
): Ozet | null {
  const g = bugunGorunumu(gorevler, bugun);
  const oncelikler = [...g.gecikenler, ...g.bugun].slice(0, 5);
  const sessizGunu = weekday(bugun) === ayarlar.sessiz_liste_gunu % 7;
  const maddeler = oncelikler.map((t) => {
    const firma = t.firma_adi ? ` · ${t.firma_adi}` : "";
    const gecikme = t.vade && t.vade < bugun ? `⚠ ${relativeDay(t.vade, bugun)}: ` : "";
    return `${gecikme}${t.baslik}${firma}`;
  });
  if (sessizGunu && sessizler.length > 0) {
    const ilk = sessizler.slice(0, 3).map((s) => s.ad).join(", ");
    const fazla = sessizler.length > 3 ? ` +${sessizler.length - 3}` : "";
    maddeler.push(`Sessiz müşteriler: ${ilk}${fazla}`);
  }
  if (maddeler.length === 0) return null;

  const sayilar: string[] = [];
  if (g.gecikenler.length) sayilar.push(`${g.gecikenler.length} gecikmiş`);
  if (g.bugun.length) sayilar.push(`${g.bugun.length} bugün`);
  const baslik = sayilar.length ? `Günaydın · ${sayilar.join(", ")}` : "Günaydın";
  return {
    baslik,
    maddeler,
    govde: maddeler.map((m, i) => (i < oncelikler.length ? `${i + 1}. ${m}` : m)).join("\n"),
  };
}

/** Tek bir görev hatırlatmasının bildirim metni. */
export function hatirlatmaMetni(g: MotorGorevi, bugun: DateStr): { baslik: string; govde: string } {
  const firma = g.firma_adi ? ` · ${g.firma_adi}` : "";
  if (g.tur === "bekliyorum") {
    return { baslik: `Hâlâ bekliyorsun${firma}`, govde: `${g.baslik} — dürtmek ister misin?` };
  }
  const zaman = g.vade ? relativeDay(g.vade, bugun) : "bugün";
  const ust = g.vade && g.vade > bugun ? `Yaklaşıyor (${zaman})` : g.vade && g.vade < bugun ? `Gecikti (${zaman})` : "Bugün";
  return { baslik: `${ust}${firma}`, govde: g.baslik };
}
