import "server-only";
import {
  alanAdi,
  firmalariBul,
  iletiAyristir,
  kendiAlanlari,
  kendiMetni,
  kisiselAdres,
  konuTemizle,
  postmarkCoz,
  yonBelirle,
  anahtarCoz,
  type GelenEposta,
  type GirdiEpostasi,
  type PostmarkYuk,
} from "../eposta";
import { createAdminClient } from "../supabase/admin";
import { GIRDI_SECIMI, girdiAyristir, type GirdiKaydi } from "./girdi";
import type { Db } from "./ops";
import { kartBaglami } from "./queries";

// E-posta ile gelen kayıtlar. Postmark her gelen e-postayı
// /api/eposta/gelen adresine JSON olarak gönderir (README → E-posta).
//
//   İletilen e-posta (LifeOS adresi Kime/Bilgi'de) → gelen kutusu + Claude
//   Gizli kopya (LifeOS adresi BCC'de)             → ilgili firmaya not, son temas
//
// Yalnızca kullanıcının giriş e-postasından veya Ayarlar'da izin verdiği
// adreslerden gelen e-postalar kabul edilir.

export function gelenAdres(): string | null {
  const a = process.env.EPOSTA_GELEN_ADRESI?.trim().toLowerCase();
  return a && a.includes("@") ? a : null;
}

/** Kullanıcının kişisel LifeOS adresi; e-posta servisi kurulu değilse null. */
export function kullaniciAdresi(anahtar: string): string | null {
  const g = gelenAdres();
  return g && process.env.EPOSTA_WEBHOOK_ANAHTARI ? kisiselAdres(g, anahtar) : null;
}

export type EpostaSonucu = {
  sonuc: "gelen_kutusu" | "not" | "reddedildi" | "yinelenen";
  aciklama: string;
};
type Islendi = EpostaSonucu & { sonuc: "gelen_kutusu" | "not" };

const GOVDE_SINIRI = 6000;
const kisalt = (s: string, n: number) => (s.length > n ? s.slice(0, n).trimEnd() + "\n[…]" : s);

function tarihCoz(s: string | null | undefined): string | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function gunlukYaz(
  db: Db,
  kayit: { user_id: string | null; message_id?: string | null; gonderen?: string | null; konu?: string | null },
  sonuc: EpostaSonucu & { sonuc: "reddedildi" },
): Promise<EpostaSonucu> {
  await db.from("email_log").insert({ ...kayit, sonuc: sonuc.sonuc, aciklama: sonuc.aciklama });
  return sonuc;
}

export async function epostaIsle(yuk: PostmarkYuk): Promise<EpostaSonucu> {
  const gelen = gelenAdres();
  if (!gelen) throw new Error("EPOSTA_GELEN_ADRESI tanımlı değil");
  const db = createAdminClient();

  const e = postmarkCoz(yuk, gelen);
  if (!e) return gunlukYaz(db, { user_id: null, konu: yuk.Subject ?? null }, { sonuc: "reddedildi", aciklama: "Gönderen adresi okunamadı" });
  const temel = { message_id: e.messageId, gonderen: e.kimden.adres, konu: e.konu.slice(0, 300) };
  if (!e.anahtar) {
    return gunlukYaz(db, { user_id: null, ...temel }, { sonuc: "reddedildi", aciklama: "Alıcı adresinde kişisel anahtar yok" });
  }

  const { data: ayar } = await db
    .from("settings")
    .select("user_id, eposta_gondericiler")
    .eq("eposta_anahtari", e.anahtar)
    .maybeSingle();
  if (!ayar) return gunlukYaz(db, { user_id: null, ...temel }, { sonuc: "reddedildi", aciklama: "Bilinmeyen LifeOS adresi" });
  const userId = ayar.user_id;

  const { data: kullanici } = await db.auth.admin.getUserById(userId);
  const girisEpostasi = kullanici.user?.email?.toLowerCase() ?? null;
  const izinli = new Set([girisEpostasi, ...ayar.eposta_gondericiler.map((a) => a.toLowerCase())].filter(Boolean));
  if (!izinli.has(e.kimden.adres)) {
    return gunlukYaz(db, { user_id: userId, ...temel }, {
      sonuc: "reddedildi",
      aciklama: `${e.kimden.adres} izinli gönderenler arasında değil (Ayarlar → E-posta)`,
    });
  }

  // Aynı e-posta iki kez gelirse (Postmark yeniden denemesi) bir kez işlenir.
  const { data: gunluk, error: tekrar } = await db
    .from("email_log")
    .insert({ user_id: userId, ...temel, sonuc: "isleniyor" })
    .select("id")
    .single();
  if (tekrar) {
    if (tekrar.code === "23505") return { sonuc: "yinelenen", aciklama: "Bu e-posta daha önce işlendi" };
    throw tekrar;
  }

  try {
    const kendi = kendiAlanlari([girisEpostasi, ...ayar.eposta_gondericiler]);
    const sonuc =
      yonBelirle(e, gelen) === "iletilen"
        ? await iletileniIsle(db, userId, e, kendi)
        : await gizliKopyayiIsle(db, userId, e, gelen, izinli, kendi);
    await db.from("email_log").update({ sonuc: sonuc.sonuc, aciklama: sonuc.aciklama }).eq("id", gunluk.id);
    return sonuc;
  } catch (hata) {
    // Postmark yeniden denesin diye tekrar kaydını geri al.
    await db.from("email_log").delete().eq("id", gunluk.id);
    throw hata;
  }
}

async function gelenKutusunaEkle(
  db: Db,
  userId: string,
  hamMetin: string,
  eposta: GirdiEpostasi,
  kendiAlanlar: string[],
): Promise<void> {
  const { data, error } = await db
    .from("inbox_items")
    .insert({ user_id: userId, ham_metin: hamMetin, kaynak: "eposta", eposta })
    .select(GIRDI_SECIMI)
    .single();
  if (error) throw error;
  await girdiAyristir(db, userId, data as GirdiKaydi, {
    toplanti: false,
    baglam: await kartBaglami(db, userId),
    kendiAlanlar,
  });
}

async function iletileniIsle(db: Db, userId: string, e: GelenEposta, kendiAlanlar: string[]): Promise<Islendi> {
  const p = iletiAyristir(e.metin);
  const konu = p.konu ?? konuTemizle(e.konu);
  const gonderen = p.gonderen?.adres ? p.gonderen : null;
  const satirlar = [
    p.not,
    "",
    `[E-posta] ${konu}`.trim(),
    gonderen ? `Kimden: ${gonderen.ad ? `${gonderen.ad} <${gonderen.adres}>` : gonderen.adres}` : null,
    p.tarih ? `Tarih: ${p.tarih}` : null,
    e.ekler.length ? `Ekler: ${e.ekler.join(", ")}` : null,
    "",
    kisalt(kendiMetni(p.govde) || p.govde, GOVDE_SINIRI),
  ];
  const hamMetin = satirlar
    .filter((x) => x !== null)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  await gelenKutusunaEkle(
    db,
    userId,
    hamMetin || `[E-posta] ${konu}`,
    {
      yon: "iletilen",
      konu,
      karsi_taraf: gonderen?.adres ? [gonderen.adres] : [],
      orijinal_gonderen: gonderen,
      tarih: tarihCoz(e.tarih),
      ekler: e.ekler,
    },
    kendiAlanlar,
  );
  return { sonuc: "gelen_kutusu", aciklama: gonderen ? `Gelen kutusuna eklendi (${gonderen.adres})` : "Gelen kutusuna eklendi" };
}

async function gizliKopyayiIsle(
  db: Db,
  userId: string,
  e: GelenEposta,
  gelen: string,
  izinli: Set<string | null>,
  kendiAlanlar: string[],
): Promise<Islendi> {
  // Kendi adreslerimiz, LifeOS adresi ve şirket içi (kendi alan adımızdaki) alıcılar karşı taraf değildir.
  const bizim = (a: string) =>
    izinli.has(a) || anahtarCoz(a, gelen) !== null || a === gelen || kendiAlanlar.includes(alanAdi(a));
  const karsi = [...new Set([...e.kime, ...e.cc].filter((a) => !bizim(a)))];
  const konu = konuTemizle(e.konu) || "(konusuz)";
  const govde = kisalt(kendiMetni(e.metin), 3000);
  const ekler = e.ekler.length ? `Ekler: ${e.ekler.join(", ")}` : null;

  const { data: firmalar } = await db.from("companies").select("id, ad, eposta_alanlari").eq("user_id", userId);
  const { data: kisiler } = await db.from("contacts").select("company_id, eposta").eq("user_id", userId);
  const idler = firmalariBul(karsi, firmalar ?? [], kisiler ?? [], kendiAlanlar);

  if (idler.length === 0) {
    const hamMetin = [`[Gönderilen e-posta] ${konu}`, `Kime: ${karsi.join(", ") || "-"}`, ekler, "", govde]
      .filter((x) => x !== null)
      .join("\n")
      .trim();
    await gelenKutusunaEkle(
      db,
      userId,
      hamMetin,
      { yon: "gizli_kopya", konu, karsi_taraf: karsi, orijinal_gonderen: null, tarih: tarihCoz(e.tarih), ekler: e.ekler },
      kendiAlanlar,
    );
    return { sonuc: "gelen_kutusu", aciklama: "Alıcının firması bulunamadı; gelen kutusuna eklendi" };
  }

  const metin = [`Gönderilen e-posta: ${konu}`, `Kime: ${karsi.join(", ")}`, ekler, "", govde]
    .filter((x) => x !== null)
    .join("\n")
    .trim();
  const tarih = tarihCoz(e.tarih) ?? new Date().toISOString();
  // Not eklenince firmanın son teması tetikleyiciyle güncellenir.
  const { error } = await db.from("notes").insert(
    idler.map((company_id) => ({ user_id: userId, company_id, metin, ozet: `E-posta gönderildi: ${konu}`, tarih })),
  );
  if (error) throw error;
  const adlar = idler.map((id) => firmalar!.find((f) => f.id === id)!.ad);
  return { sonuc: "not", aciklama: `Firmaya not eklendi: ${adlar.join(", ")}` };
}
