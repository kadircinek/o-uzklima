import { addDays, weekday, type DateStr } from "./dates";

// Türkiye resmi tatilleri. Sabit günler her yıl aynıdır; dini bayramlar
// Diyanet takvimine göre yıllık değişir. Listede olmayan yıllar için
// Ayarlar → "Ek tatil günleri" alanına tarih eklenebilir.
// Arife günleri yarım gün olduğu için iş günü sayılır.

const SABIT = ["01-01", "04-23", "05-01", "05-19", "07-15", "08-30", "10-29"];

const DINI: Record<number, string[]> = {
  2025: [
    // Ramazan Bayramı
    "03-30", "03-31", "04-01",
    // Kurban Bayramı
    "06-06", "06-07", "06-08", "06-09",
  ],
  2026: ["03-20", "03-21", "03-22", "05-27", "05-28", "05-29", "05-30"],
  2027: ["03-09", "03-10", "03-11", "05-16", "05-17", "05-18", "05-19"],
};

export function isHoliday(d: DateStr, ekTatiller: readonly string[] = []): boolean {
  const year = Number(d.slice(0, 4));
  const md = d.slice(5);
  return SABIT.includes(md) || (DINI[year]?.includes(md) ?? false) || ekTatiller.includes(d);
}

export function isBusinessDay(d: DateStr, ekTatiller: readonly string[] = []): boolean {
  const w = weekday(d);
  return w !== 0 && w !== 6 && !isHoliday(d, ekTatiller);
}

/** Gün iş günüyse kendisi, değilse sonraki ilk iş günü. */
export function onOrNextBusinessDay(d: DateStr, ekTatiller: readonly string[] = []): DateStr {
  let x = d;
  for (let i = 0; i < 30 && !isBusinessDay(x, ekTatiller); i++) x = addDays(x, 1);
  return x;
}

/** d'den sonra n iş günü ilerler (d'nin kendisi sayılmaz). */
export function addBusinessDays(d: DateStr, n: number, ekTatiller: readonly string[] = []): DateStr {
  let x = d;
  let left = n;
  while (left > 0) {
    x = addDays(x, 1);
    if (isBusinessDay(x, ekTatiller)) left--;
  }
  return x;
}

export function hasHolidayData(year: number): boolean {
  return year in DINI;
}
