// Ayrıştırılan firma/kişi adını kayıtlı firmalarla eşleştirir.
// Büyük/küçük harf, Türkçe karakter, noktalama ve şirket türü ekleri
// (A.Ş., Ltd. Şti., GmbH, Inc. …) yok sayılır.

const HARF: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };

const EKLER = new Set([
  "as", "ltd", "sti", "limited", "sirketi", "san", "sanayi", "tic", "ticaret", "ve",
  "inc", "corp", "corporation", "co", "company", "llc", "gmbh", "ag", "kg", "sa", "plc", "bv", "nv", "srl", "spa", "pte", "pvt",
]);

export function normalizeAd(s: string): string {
  const kucuk = s.toLocaleLowerCase("tr").normalize("NFC");
  const sade = [...kucuk].map((c) => HARF[c] ?? c).join("").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const kelimeler = sade
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\ba s\b/g, "as") // "A.Ş." → "as"
    .trim()
    .split(" ")
    .filter(Boolean);
  // Sondaki şirket türü eklerini at; tek kelime kalana kadar.
  while (kelimeler.length > 1 && EKLER.has(kelimeler[kelimeler.length - 1])) kelimeler.pop();
  return kelimeler.join(" ");
}

export type Eslesme<T> = { kayit: T; kesin: boolean } | null;

/**
 * Önce tam (normalize) eşleşme, yoksa tek bir kayıtta önek/içerik eşleşmesi.
 * Birden çok aday varsa belirsizdir ve null döner.
 */
export function eslestir<T extends { ad: string }>(ad: string | null | undefined, kayitlar: T[]): Eslesme<T> {
  if (!ad) return null;
  const n = normalizeAd(ad);
  if (!n) return null;
  const tam = kayitlar.filter((k) => normalizeAd(k.ad) === n);
  if (tam.length === 1) return { kayit: tam[0], kesin: true };
  if (tam.length > 1) return null;

  const kelimeSinirli = (uzun: string, kisa: string) =>
    uzun === kisa || uzun.startsWith(kisa + " ") || uzun.endsWith(" " + kisa) || uzun.includes(" " + kisa + " ");
  const adaylar = kayitlar.filter((k) => {
    const m = normalizeAd(k.ad);
    if (!m) return false;
    return kelimeSinirli(m, n) || kelimeSinirli(n, m);
  });
  return adaylar.length === 1 ? { kayit: adaylar[0], kesin: false } : null;
}
