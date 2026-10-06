// E-posta ile gelen kayıtların saf yardımcıları: Postmark gelen e-posta
// yükünü çözmek, iletilen e-postanın notunu ve orijinal göndereni ayırmak,
// gizli kopyayı (BCC) tanımak, adresleri firmalarla eşleştirmek.
// Testleri tests/eposta.test.ts içinde.

/** Firma eşleştirmede yok sayılan genel e-posta servisleri. */
export const GENEL_ALANLAR = new Set([
  "gmail.com", "googlemail.com", "hotmail.com", "hotmail.com.tr", "outlook.com", "outlook.com.tr", "live.com",
  "msn.com", "yahoo.com", "yahoo.com.tr", "icloud.com", "me.com", "mac.com", "yandex.com", "yandex.com.tr",
  "mail.ru", "aol.com", "proton.me", "protonmail.com", "gmx.de", "gmx.net", "web.de", "windowslive.com",
]);

const ADRES_RE = /[a-z0-9._%+'-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

/** "Ali Demir <Ali@Acme.com>" → "ali@acme.com" */
export function adresCoz(s: string | null | undefined): string | null {
  const m = ADRES_RE.exec(s ?? "");
  return m ? m[0].toLowerCase() : null;
}

export function alanAdi(adres: string): string {
  return adres.slice(adres.lastIndexOf("@") + 1).toLowerCase();
}

/** "Ali Demir <ali@acme.com>" → "Ali Demir" */
export function adSoyadCoz(s: string): string | null {
  const ad = s.replace(/<[^>]*>/, "").replace(/["']/g, "").trim();
  return ad && !ADRES_RE.test(ad) ? ad : null;
}

/** Kullanıcının kişisel LifeOS adresi: gelen adresin yerel kısmına +anahtar eklenir. */
export function kisiselAdres(gelenAdres: string, anahtar: string): string {
  const i = gelenAdres.indexOf("@");
  return `${gelenAdres.slice(0, i)}+${anahtar}${gelenAdres.slice(i)}`;
}

/** Bir adres bu kurulumun gelen adresine (herhangi bir +anahtar ile) mi gidiyor? Anahtarı döner. */
export function anahtarCoz(adres: string, gelenAdres: string): string | null {
  const a = adres.toLowerCase();
  const g = gelenAdres.toLowerCase();
  const yerel = g.slice(0, g.indexOf("@"));
  const alan = alanAdi(g);
  if (alanAdi(a) !== alan) return null;
  const aYerel = a.slice(0, a.indexOf("@"));
  if (!aYerel.startsWith(yerel + "+")) return null;
  const anahtar = aYerel.slice(yerel.length + 1);
  return /^[a-z0-9]{8,32}$/.test(anahtar) ? anahtar : null;
}

const ILETME_ONEKI = /^\s*((fw|fwd|[iİ]lt|tr|wg|rv|enc|doorst)\s*:\s*)+/i;
export function konuTemizle(konu: string | null | undefined): string {
  return (konu ?? "").replace(ILETME_ONEKI, "").trim();
}
export function iletiKonusuMu(konu: string | null | undefined): boolean {
  return ILETME_ONEKI.test(konu ?? "");
}

const VARLIKLAR: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'" };

/** Basit HTML → düz metin (yalnızca metin gövdesi olmayan e-postalar için). */
export function htmlMetne(html: string): string {
  return html
    .replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|table|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+|#39);/gi, (v, k: string) => {
      if (k.startsWith("#x")) return String.fromCodePoint(parseInt(k.slice(2), 16));
      if (k.startsWith("#") && k !== "#39") return String.fromCodePoint(Number(k.slice(1)));
      return VARLIKLAR[k.toLowerCase()] ?? v;
    })
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// İletilen e-postanın başladığı yeri gösteren işaretler (Outlook TR/EN, Gmail, Apple Mail)
const ILETI_ISARETLERI = [
  /^-{2,}\s*(forwarded message|original message|iletilen ileti|özgün ileti|orijinal ileti|ursprüngliche nachricht|message transféré)\s*-{2,}\s*$/im,
  /^begin forwarded message:\s*$/im,
  /^_{10,}\s*$/m,
];
const BASLIK = {
  kimden: /^\s*\*?(from|kimden|gönderen|von|de)\s*:\*?\s*(.+)$/im,
  konu: /^\s*\*?(subject|konu|betreff|objet)\s*:\*?\s*(.+)$/im,
  tarih: /^\s*\*?(date|sent|tarih|gönderildi|gönderim tarihi|gesendet|envoyé)\s*:\*?\s*(.+)$/im,
};

// Telefon/Outlook uygulamalarının otomatik imzaları nota karışmasın
const OTOMATIK_IMZA = /^\s*(sent from my \w+|iphone'umdan gönderildi|ipad'imden gönderildi|get outlook for \w+|ios için outlook'u edinin|android için outlook'u edinin)\.?\s*$/gim;
function imzalariAt(s: string): string {
  return s.replace(OTOMATIK_IMZA, "").trim();
}

export type IletiParcalari = {
  /** Kullanıcının iletirken eklediği not (yoksa boş) */
  not: string;
  /** Orijinal e-postanın göndereni */
  gonderen: { adres: string | null; ad: string | null } | null;
  konu: string | null;
  tarih: string | null;
  /** Orijinal e-postanın gövdesi (başlıklar hariç) */
  govde: string;
};

/** İletilen e-posta metnini kullanıcının notu ve orijinal ileti olarak ayırır. */
export function iletiAyristir(metin: string): IletiParcalari {
  const temiz = metin.replace(/\r\n/g, "\n");
  let bas = -1;
  for (const re of ILETI_ISARETLERI) {
    const m = re.exec(temiz);
    if (m && (bas < 0 || m.index < bas)) bas = m.index;
  }
  if (bas < 0) {
    // İşaretsiz Outlook iletisi: boş satırdan sonra "Kimden:" ile başlayan başlık bloğu
    const m = /(^|\n)\s*\n(?=\s*\*?(from|kimden|gönderen|von)\s*:)/i.exec(temiz);
    if (m) bas = m.index + m[0].length;
  }
  if (bas < 0) return { not: imzalariAt(temiz), gonderen: null, konu: null, tarih: null, govde: "" };

  const not = imzalariAt(temiz.slice(0, bas));
  // İşaret satırını at (başlık bloğu doğrudan "Kimden:" ile başlıyorsa koru)
  const blok = temiz
    .slice(bas)
    .replace(/^.*\n/, (ilk) => (BASLIK.kimden.test(ilk) ? ilk : ""))
    .replace(/^\s+/, "");
  // Başlıklar ilk boş satıra kadar sürer
  const bosSatir = blok.search(/\n\s*\n/);
  const basliklar = bosSatir >= 0 ? blok.slice(0, bosSatir) : blok;
  const govde = bosSatir >= 0 ? blok.slice(bosSatir).trim() : "";
  const kimden = BASLIK.kimden.exec(basliklar)?.[2]?.trim() ?? null;
  return {
    not,
    gonderen: kimden ? { adres: adresCoz(kimden), ad: adSoyadCoz(kimden) } : null,
    konu: BASLIK.konu.exec(basliklar)?.[2]?.trim() ?? null,
    tarih: BASLIK.tarih.exec(basliklar)?.[2]?.trim() ?? null,
    govde,
  };
}

// Yanıtlarda alıntılanan önceki yazışmanın başladığı yer
const YANIT_ISARETLERI = [
  /^on .{5,200} wrote:\s*$/im,
  /^.{5,200} tarihinde .{1,200} şunu yazdı:\s*$/im,
  /^am .{5,200} schrieb .{1,200}:\s*$/im,
];

/** Gönderenin kendi yazdığı kısım: alıntılanan/iletilen önceki yazışma ve otomatik imzalar atılır. */
export function kendiMetni(metin: string): string {
  const temiz = metin.replace(/\r\n/g, "\n");
  let son = temiz.length;
  for (const re of [...ILETI_ISARETLERI, ...YANIT_ISARETLERI]) {
    const m = re.exec(temiz);
    if (m && m.index < son) son = m.index;
  }
  const outlook = /(^|\n)\s*\n(?=\s*\*?(from|kimden|gönderen|von)\s*:)/i.exec(temiz);
  if (outlook && outlook.index < son) son = outlook.index;
  return imzalariAt(temiz.slice(0, son));
}

/** Kullanıcının kendi (şirket) alan adları: firma eşleştirmesinde dikkate alınmaz. */
export function kendiAlanlari(adresler: (string | null | undefined)[]): string[] {
  return [
    ...new Set(
      adresler
        .map((a) => adresCoz(a))
        .filter((a): a is string => Boolean(a))
        .map(alanAdi)
        .filter((a) => !GENEL_ALANLAR.has(a)),
    ),
  ];
}

/** Gelen kutusu kaydına iliştirilen e-posta bilgisi (inbox_items.eposta). */
export type GirdiEpostasi = {
  yon: "iletilen" | "gizli_kopya";
  konu: string;
  /** Firma eşleştirmesi ve alan adı öğrenme için karşı taraf adresleri */
  karsi_taraf: string[];
  /** İletilen e-postanın orijinal göndereni */
  orijinal_gonderen: { adres: string | null; ad: string | null } | null;
  tarih: string | null;
  ekler: string[];
};

// ---------------------------------------------------------------------------
// Postmark gelen e-posta yükü

type PostmarkAdres = { Email?: string; Name?: string; MailboxHash?: string };
export type PostmarkYuk = {
  FromFull?: PostmarkAdres;
  From?: string;
  ToFull?: PostmarkAdres[];
  CcFull?: PostmarkAdres[];
  BccFull?: PostmarkAdres[];
  OriginalRecipient?: string;
  MailboxHash?: string;
  Subject?: string;
  MessageID?: string;
  Date?: string;
  TextBody?: string;
  HtmlBody?: string;
  StrippedTextReply?: string;
  Attachments?: { Name?: string; ContentType?: string; ContentLength?: number }[];
};

export type GelenEposta = {
  kimden: { adres: string; ad: string | null };
  kime: string[];
  cc: string[];
  bcc: string[];
  orijinalAlici: string | null;
  anahtar: string | null;
  konu: string;
  metin: string;
  tarih: string | null;
  messageId: string | null;
  ekler: string[];
};

export function postmarkCoz(y: PostmarkYuk, gelenAdres: string): GelenEposta | null {
  const kimdenAdres = adresCoz(y.FromFull?.Email ?? y.From);
  if (!kimdenAdres) return null;
  const liste = (a?: PostmarkAdres[]) => (a ?? []).map((x) => adresCoz(x.Email)).filter((x): x is string => Boolean(x));
  const kime = liste(y.ToFull);
  const cc = liste(y.CcFull);
  const bcc = liste(y.BccFull);
  const orijinalAlici = adresCoz(y.OriginalRecipient);

  let anahtar = y.MailboxHash && /^[a-z0-9]{8,32}$/i.test(y.MailboxHash) ? y.MailboxHash.toLowerCase() : null;
  for (const a of [orijinalAlici, ...kime, ...cc, ...bcc]) {
    if (anahtar) break;
    if (a) anahtar = anahtarCoz(a, gelenAdres);
  }

  const metin = y.TextBody?.trim() ? y.TextBody : y.HtmlBody ? htmlMetne(y.HtmlBody) : "";
  return {
    kimden: { adres: kimdenAdres, ad: y.FromFull?.Name?.trim() || null },
    kime,
    cc,
    bcc,
    orijinalAlici,
    anahtar,
    konu: (y.Subject ?? "").trim(),
    metin: metin.replace(/\r\n/g, "\n"),
    tarih: y.Date ?? null,
    messageId: y.MessageID ?? null,
    ekler: (y.Attachments ?? []).map((e) => e.Name).filter((x): x is string => Boolean(x)),
  };
}

/**
 * LifeOS adresi Kime/Bilgi satırlarındaysa kullanıcı e-postayı bize iletmiştir;
 * hiçbirinde yoksa müşteriye giden bir e-postaya gizli kopya (BCC) eklenmiştir.
 */
export function yonBelirle(e: GelenEposta, gelenAdres: string): "iletilen" | "gizli_kopya" {
  const bize = (a: string) => anahtarCoz(a, gelenAdres) !== null || a === gelenAdres.toLowerCase();
  return [...e.kime, ...e.cc].some(bize) ? "iletilen" : "gizli_kopya";
}

// ---------------------------------------------------------------------------
// Firma eşleştirme

export type EslesecekFirma = { id: string; ad: string; eposta_alanlari: string[] };
export type EslesecekKisi = { company_id: string; eposta: string | null };

/**
 * Adreslerin ait olduğu firmalar: önce kayıtlı kişi e-postası, sonra firmanın
 * alan adları, sonra kişilerin (genel olmayan) alan adları. Kendi şirket
 * alan adlarımız ve genel servisler alan adı eşleştirmesinde yok sayılır.
 */
export function firmalariBul(
  adresler: string[],
  firmalar: EslesecekFirma[],
  kisiler: EslesecekKisi[],
  kendiAlanlarimiz: Iterable<string> = [],
): string[] {
  const haric = new Set([...GENEL_ALANLAR, ...[...kendiAlanlarimiz].map((a) => a.toLowerCase())]);
  const sonuc = new Set<string>();
  for (const ham of adresler) {
    const adres = ham.toLowerCase();
    const kisi = kisiler.find((k) => k.eposta?.toLowerCase().trim() === adres);
    if (kisi) {
      sonuc.add(kisi.company_id);
      continue;
    }
    const alan = alanAdi(adres);
    if (haric.has(alan)) continue;
    const altAlan = (kayitli: string) => alan === kayitli || alan.endsWith("." + kayitli);
    const firma = firmalar.find((f) => f.eposta_alanlari.some((x) => altAlan(x.toLowerCase())));
    if (firma) {
      sonuc.add(firma.id);
      continue;
    }
    const kisiAlani = kisiler.find((k) => k.eposta && alanAdi(k.eposta.toLowerCase().trim()) === alan);
    if (kisiAlani) sonuc.add(kisiAlani.company_id);
  }
  return [...sonuc];
}

/** Firmaya öğretilecek alan adları (genel servisler ve kendi alanlarımız hariç). */
export function ogrenilecekAlanlar(adresler: string[], kendiAlanlarimiz: Iterable<string> = []): string[] {
  const haric = new Set([...GENEL_ALANLAR, ...[...kendiAlanlarimiz].map((a) => a.toLowerCase())]);
  return [...new Set(adresler.map((a) => alanAdi(a.toLowerCase())).filter((a) => !haric.has(a)))];
}

export function alanAdlariniCoz(metin: string): string[] {
  return [
    ...new Set(
      metin
        .split(/[\s,;]+/)
        .map((x) => x.trim().toLowerCase().replace(/^@/, "").replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, ""))
        .filter((x) => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(x)),
    ),
  ];
}
