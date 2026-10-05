// Tarih yardımcıları. Uygulama içinde "gün" her zaman kullanıcının saat
// dilimindeki takvim günüdür ve 'YYYY-MM-DD' metni olarak taşınır; saat
// içeren anlar ise UTC Date nesnesidir.

export type DateStr = string; // YYYY-MM-DD
export type TimeStr = string; // HH:MM

export const VARSAYILAN_SAAT_DILIMI = "Europe/Istanbul";

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isDateStr(s: unknown): s is DateStr {
  if (typeof s !== "string") return false;
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

export function isTimeStr(s: unknown): s is TimeStr {
  return typeof s === "string" && TIME_RE.test(s);
}

function toUtcMidnight(d: DateStr): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

function fromUtcMidnight(d: Date): DateStr {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: DateStr, n: number): DateStr {
  const x = toUtcMidnight(d);
  x.setUTCDate(x.getUTCDate() + n);
  return fromUtcMidnight(x);
}

export function addMonthsClamped(d: DateStr, n: number, dayOfMonth?: number): DateStr {
  const [y, m, day] = d.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = daysInMonth(target.getUTCFullYear(), target.getUTCMonth() + 1);
  target.setUTCDate(Math.min(dayOfMonth ?? day, last));
  return fromUtcMidnight(target);
}

export function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

/** 0 = Pazar … 6 = Cumartesi */
export function weekday(d: DateStr): number {
  return toUtcMidnight(d).getUTCDay();
}

/** b - a, gün olarak */
export function diffDays(a: DateStr, b: DateStr): number {
  return Math.round((toUtcMidnight(b).getTime() - toUtcMidnight(a).getTime()) / 86_400_000);
}

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();
function partsFormatter(tz: string) {
  let f = partsFormatterCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    partsFormatterCache.set(tz, f);
  }
  return f;
}

/** Bir anın verilen saat dilimindeki takvim günü ve saati. */
export function localParts(at: Date, tz: string): { date: DateStr; time: TimeStr } {
  const parts = Object.fromEntries(partsFormatter(tz).formatToParts(at).map((p) => [p.type, p.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

export function todayIn(tz: string, now: Date = new Date()): DateStr {
  return localParts(now, tz).date;
}

function tzOffsetMs(at: Date, tz: string): number {
  const p = Object.fromEntries(partsFormatter(tz).formatToParts(at).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** Saat dilimindeki yerel gün + saati UTC ana çevirir. */
export function zonedTime(d: DateStr, t: TimeStr, tz: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  const [hh, mm] = t.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, day, hh, mm);
  let result = guess - tzOffsetMs(new Date(guess), tz);
  // Yaz saati geçişlerinde ofset değişmiş olabilir; bir kez daha düzelt.
  const second = guess - tzOffsetMs(new Date(result), tz);
  if (second !== result) result = second;
  return new Date(result);
}

const AYLAR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const AYLAR_UZUN = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
export const GUNLER = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const GUNLER_KISA = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

/** "8 Eki Per" */
export function formatShort(d: DateStr): string {
  const [, m, day] = d.split("-").map(Number);
  return `${day} ${AYLAR[m - 1]} ${GUNLER_KISA[weekday(d)]}`;
}

/** "15 Kasım" */
export function formatLong(d: DateStr): string {
  const [, m, day] = d.split("-").map(Number);
  return `${day} ${AYLAR_UZUN[m - 1]}`;
}

/** Bugüne göre okunur gün: "bugün", "yarın", "dün", "3 gün gecikti", "8 Eki Per" */
export function relativeDay(d: DateStr, today: DateStr): string {
  const n = diffDays(today, d);
  if (n === 0) return "bugün";
  if (n === 1) return "yarın";
  if (n === -1) return "dün";
  if (n < 0) return `${-n} gün gecikti`;
  return formatShort(d);
}

export function formatDateTime(at: Date, tz: string): string {
  const { date, time } = localParts(at, tz);
  return `${formatShort(date)} ${time}`;
}
