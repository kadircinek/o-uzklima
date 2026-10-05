// Hatırlatma kuralları: bir girdiden görevin türünü, vadesini ve ilk
// hatırlatma zamanını hesaplar. Saf fonksiyonlardır; testleri
// tests/rules.test.ts içindedir.

import {
  addDays,
  addMonthsClamped,
  daysInMonth,
  isDateStr,
  weekday,
  zonedTime,
  type DateStr,
} from "./dates";
import { addBusinessDays, onOrNextBusinessDay } from "./holidays";
import { ASAMA_ETIKET, type Asama, type Ayarlar, type GirdiTuru, type GorevTuru, type Olay } from "./domain";

export type GorevPlani = {
  tur: GorevTuru;
  vade: DateStr | null;
  hatirlatma_zamani: Date | null;
  /** Görevi üreten kural; ör. 'teklif', 'odeme', 'asama:numune' */
  kural: string | null;
};

export type PlanGirdisi = {
  girdi: Exclude<GirdiTuru, "not">;
  olay: Olay;
  /** Kullanıcının söylediği tarih (yoksa null) */
  tarih: DateStr | null;
  /** Kullanıcının açıkça istediği hatırlatma anı (yoksa null) */
  hatirlatma: Date | null;
  bugun: DateStr;
};

/** Bir günün hatırlatma saati; hafta sonu/tatil ise sonraki iş gününe kayar. */
export function gunHatirlatmasi(gun: DateStr, ayarlar: Ayarlar): Date {
  const isGunu = onOrNextBusinessDay(gun, ayarlar.ek_tatiller);
  return zonedTime(isGunu, ayarlar.hatirlatma_saati, ayarlar.saat_dilimi);
}

/**
 * Vadeden önceki ön hatırlatma (ödeme vadesi için "3 gün önce").
 * Kaydırma sonrası vade günü hatırlatmasına çakışıyorsa null döner.
 */
export function onHatirlatma(vade: DateStr, gunOnce: number, ayarlar: Ayarlar): Date | null {
  if (gunOnce <= 0) return null;
  const on = gunHatirlatmasi(addDays(vade, -gunOnce), ayarlar);
  return on < gunHatirlatmasi(vade, ayarlar) ? on : null;
}

export function planla(g: PlanGirdisi, ayarlar: Ayarlar): GorevPlani {
  const k = ayarlar.kurallar;
  const baz = g.tarih ?? g.bugun;
  const ek = ayarlar.ek_tatiller;

  let tur: GorevTuru;
  let vade: DateStr | null;
  let kural: string | null;
  let ilk: Date | null;

  if (g.girdi === "vade" || g.olay === "odeme_vadesi") {
    tur = "takip";
    kural = "odeme";
    vade = g.tarih;
    ilk = vade ? (onHatirlatma(vade, k.odeme_on_gun, ayarlar) ?? gunHatirlatmasi(vade, ayarlar)) : null;
  } else if (g.olay === "teklif_gonderildi") {
    tur = "takip";
    kural = "teklif";
    vade = addBusinessDays(baz, k.teklif_is_gunu, ek);
    ilk = gunHatirlatmasi(vade, ayarlar);
  } else if (g.olay === "numune_gonderildi") {
    tur = "takip";
    kural = "numune";
    vade = addDays(baz, k.numune_gun);
    ilk = gunHatirlatmasi(vade, ayarlar);
  } else if (g.girdi === "bekleme") {
    tur = "bekliyorum";
    kural = "bekleme";
    vade = g.tarih ?? addBusinessDays(g.bugun, k.bekleme_is_gunu, ek);
    ilk = gunHatirlatmasi(vade, ayarlar);
  } else if (g.girdi === "takip") {
    tur = "takip";
    kural = "takip";
    vade = g.tarih ?? addBusinessDays(g.bugun, k.takip_is_gunu, ek);
    ilk = gunHatirlatmasi(vade, ayarlar);
  } else {
    tur = "yapacagim";
    kural = g.tarih ? "vade" : null;
    vade = g.tarih;
    ilk = vade ? gunHatirlatmasi(vade, ayarlar) : null;
  }

  // Açıkça istenen hatırlatma kurala göre hesaplananın önüne geçer.
  return { tur, vade, kural, hatirlatma_zamani: g.hatirlatma ?? ilk };
}

/**
 * Bir hatırlatma gönderildikten sonraki hatırlatma. Vadesi olan görevlerde
 * vade günü hatırlatması henüz geçmediyse o döner (ör. ödeme: 3 gün önce →
 * vade günü). Diğer durumlarda null.
 */
export function sonrakiHatirlatma(
  gorev: { vade: DateStr | null },
  gonderilen: Date,
  ayarlar: Ayarlar,
): Date | null {
  if (!gorev.vade) return null;
  const vadeGunu = gunHatirlatmasi(gorev.vade, ayarlar);
  return vadeGunu > gonderilen ? vadeGunu : null;
}

// ---------------------------------------------------------------------------
// Erteleme

export const ERTELEME_SECENEKLERI = ["yarin", "3gun", "haftaya"] as const;
export type ErtelemeSecenegi = (typeof ERTELEME_SECENEKLERI)[number];
export const ERTELEME_ETIKET: Record<ErtelemeSecenegi, string> = {
  yarin: "Yarın",
  "3gun": "3 gün",
  haftaya: "Haftaya",
};

/** Erteleme hedef günü (iş gününe kaydırılmış). */
export function ertelemeGunu(secim: ErtelemeSecenegi | DateStr, bugun: DateStr, ayarlar: Ayarlar): DateStr {
  const ek = ayarlar.ek_tatiller;
  if (secim === "yarin") return onOrNextBusinessDay(addDays(bugun, 1), ek);
  if (secim === "3gun") return onOrNextBusinessDay(addDays(bugun, 3), ek);
  if (secim === "haftaya") return onOrNextBusinessDay(addDays(bugun, 7), ek);
  if (!isDateStr(secim)) throw new Error("Geçersiz erteleme tarihi");
  return secim;
}

// ---------------------------------------------------------------------------
// Tekrarlayan görevler
//
// Biçim:  gunluk | haftalik:<1-7> | aylik:<1-31> | yillik:<AA-GG>
// (haftalik: 1 = Pazartesi … 7 = Pazar; gunluk iş günlerinde tekrar eder)

export type TekrarKurali =
  | { tip: "gunluk" }
  | { tip: "haftalik"; gun: number }
  | { tip: "aylik"; gun: number }
  | { tip: "yillik"; ay: number; gun: number };

export function tekrarCoz(s: string | null | undefined): TekrarKurali | null {
  if (!s) return null;
  const t = s.trim().toLowerCase();
  if (t === "gunluk") return { tip: "gunluk" };
  let m = /^haftalik:([1-7])$/.exec(t);
  if (m) return { tip: "haftalik", gun: +m[1] };
  m = /^aylik:([1-9]|[12]\d|3[01])$/.exec(t);
  if (m) return { tip: "aylik", gun: +m[1] };
  m = /^yillik:(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(t);
  if (m && +m[2] <= daysInMonth(2024, +m[1])) return { tip: "yillik", ay: +m[1], gun: +m[2] };
  return null;
}

const HAFTA_GUNU = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const AY_ADI = ["", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

export function tekrarEtiketi(s: string | null | undefined): string | null {
  const k = tekrarCoz(s);
  if (!k) return null;
  switch (k.tip) {
    case "gunluk":
      return "Her iş günü";
    case "haftalik":
      return `Her ${HAFTA_GUNU[k.gun]}`;
    case "aylik":
      return `Her ayın ${k.gun}'i`;
    case "yillik":
      return `Her yıl ${k.gun} ${AY_ADI[k.ay]}`;
  }
}

/** Kurala uyan, verilen günden kesinlikle sonraki ilk gün. */
export function sonrakiTekrar(kural: TekrarKurali, sonra: DateStr, ekTatiller: readonly string[] = []): DateStr {
  switch (kural.tip) {
    case "gunluk":
      return addBusinessDays(sonra, 1, ekTatiller);
    case "haftalik": {
      const hedef = kural.gun % 7; // 7 (Pazar) → 0
      let fark = (hedef - weekday(sonra) + 7) % 7;
      if (fark === 0) fark = 7;
      return addDays(sonra, fark);
    }
    case "aylik": {
      const buAy = addMonthsClamped(sonra, 0, kural.gun);
      return buAy > sonra ? buAy : addMonthsClamped(sonra, 1, kural.gun);
    }
    case "yillik": {
      const yil = Number(sonra.slice(0, 4));
      for (const y of [yil, yil + 1, yil + 2]) {
        const gun = Math.min(kural.gun, daysInMonth(y, kural.ay));
        const aday = `${y}-${String(kural.ay).padStart(2, "0")}-${String(gun).padStart(2, "0")}`;
        if (aday > sonra) return aday;
      }
      throw new Error("unreachable");
    }
  }
}

/** Yeni tekrarlayan görevin ilk vadesi: bugün kurala uyuyorsa bugün. */
export function ilkTekrar(kural: TekrarKurali, bugun: DateStr, ekTatiller: readonly string[] = []): DateStr {
  if (kural.tip === "gunluk") return onOrNextBusinessDay(bugun, ekTatiller);
  return sonrakiTekrar(kural, addDays(bugun, -1), ekTatiller);
}

/** Tamamlanan tekrarlayan görevin bir sonraki vadesi. */
export function tamamlaninceSonrakiVade(
  kural: TekrarKurali,
  vade: DateStr | null,
  bugun: DateStr,
  ekTatiller: readonly string[] = [],
): DateStr {
  const sonra = vade && vade > bugun ? vade : bugun;
  return sonrakiTekrar(kural, sonra, ekTatiller);
}

// ---------------------------------------------------------------------------
// Fırsat aşamaları

export function asamaGorevPlani(
  asama: Asama,
  asamaTarihi: DateStr,
  ayarlar: Ayarlar,
): (GorevPlani & { baslik: string }) | null {
  const t = ayarlar.kurallar.asama_gorevleri[asama];
  if (!t) return null;
  const vade = t.is_gunu ? addBusinessDays(asamaTarihi, t.gun, ayarlar.ek_tatiller) : addDays(asamaTarihi, t.gun);
  return {
    tur: t.tur,
    vade,
    kural: `asama:${asama}`,
    hatirlatma_zamani: gunHatirlatmasi(vade, ayarlar),
    baslik: t.baslik,
  };
}

const KURAL_ETIKET: Record<string, string> = {
  vade: "Vade günü hatırlatması",
  takip: "Genel takip",
  teklif: "Teklif sonrası takip",
  numune: "Numune geri bildirimi",
  bekleme: "Bekleme dürtmesi",
  odeme: "Ödeme vadesi (önce + vade günü)",
};

export function kuralEtiketi(kural: string): string {
  if (kural.startsWith("asama:")) {
    const a = kural.slice(6) as Asama;
    return `Fırsat aşaması: ${ASAMA_ETIKET[a] ?? a}`;
  }
  return KURAL_ETIKET[kural] ?? kural;
}

/** Olayın karşılık geldiği fırsat aşaması. */
export function olayAsamasi(olay: Olay): Asama | null {
  if (olay === "teklif_gonderildi") return "teklif";
  if (olay === "numune_gonderildi") return "numune";
  return null;
}
