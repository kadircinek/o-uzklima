"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { FIRMA_TURLERI, GIRDI_TURLERI, OLAYLAR } from "@/lib/domain";
import { olayiDuzelt, onayEksigi, varsayilanOnay, type KartBaglami, type OnayVerisi } from "@/lib/inbox";
import { AKSIYON_TURLERI, bosAyristirma, type Ayristirma } from "@/lib/parse/schema";
import { ayristir, AyristirmaHatasi, claudeYapilandirildiMi } from "@/lib/server/claude";
import { ayarlariGetir, bugun, girdiIsle, IsHatasi, type IslemeSonucu } from "@/lib/server/ops";
import { kartBaglami } from "@/lib/server/queries";
import { guvenli, type Sonuc } from "@/lib/server/sonuc";
import { requireUser, type ServerClient } from "@/lib/supabase/server";

export type KartVerisi = {
  id: string;
  ham_metin: string;
  created_at: string;
  ses_dosyasi: string | null;
  ayristirma: Ayristirma;
  /** Ayrıştırma yapılamadıysa nedeni; kart elle doldurulur */
  hata: string | null;
  onay: OnayVerisi;
};

const Metin = z.string().trim().min(1, "Boş kayıt eklenemez").max(20_000);

async function ayristirVeKaydet(
  db: ServerClient,
  userId: string,
  kayit: { id: string; ham_metin: string; created_at: string; ses_dosyasi: string | null },
  toplanti: boolean,
  baglam: KartBaglami,
): Promise<KartVerisi> {
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
        toplanti,
        firmalar: baglam.firmalar.map((f) => ({ ad: f.ad, tur: f.tur, kisiler: kisiler.get(f.id) ?? [] })),
      });
    } catch (e) {
      if (!(e instanceof AyristirmaHatasi)) console.error(e);
      ayristirma = bosAyristirma(kayit.ham_metin);
      hata = e instanceof AyristirmaHatasi ? e.message : "Ayrıştırma başarısız oldu; kartı elle doldurun.";
    }
  }
  await db
    .from("inbox_items")
    .update({ ayristirma_json: hata ? null : ayristirma, hata })
    .eq("id", kayit.id)
    .eq("user_id", userId);
  return { ...kayit, ayristirma, hata, onay: varsayilanOnay(ayristirma, baglam) };
}

/** Hızlı giriş: kaydı gelen kutusuna atar ve Claude ile ayrıştırır. */
export async function girdiYakala(
  metin: string,
  secenek: { toplanti?: boolean; sesDosyasi?: string | null } = {},
): Promise<Sonuc<{ kart: KartVerisi; baglam: KartBaglami }>> {
  return guvenli(async () => {
    const { supabase, userId } = await requireUser();
    const ham = Metin.parse(metin);
    const ses = secenek.sesDosyasi && secenek.sesDosyasi.startsWith(`${userId}/`) ? secenek.sesDosyasi : null;
    const { data, error } = await supabase
      .from("inbox_items")
      .insert({ ham_metin: ham, ses_dosyasi: ses, user_id: userId })
      .select("id, ham_metin, created_at, ses_dosyasi")
      .single();
    if (error) throw new IsHatasi(`Kayıt eklenemedi: ${error.message}`);
    revalidatePath("/", "layout");
    const baglam = await kartBaglami(supabase);
    const kart = await ayristirVeKaydet(supabase, userId, data, secenek.toplanti ?? false, baglam);
    return { kart, baglam };
  });
}

export async function girdiYenidenAyristir(id: string, toplanti = false): Promise<Sonuc<KartVerisi>> {
  return guvenli(async () => {
    const { supabase, userId } = await requireUser();
    const { data, error } = await supabase
      .from("inbox_items")
      .select("id, ham_metin, created_at, ses_dosyasi")
      .eq("id", z.uuid().parse(id))
      .eq("durum", "islenmedi")
      .maybeSingle();
    if (error || !data) throw new IsHatasi("Kayıt bulunamadı.");
    const kart = await ayristirVeKaydet(supabase, userId, data, toplanti, await kartBaglami(supabase));
    revalidatePath("/gelen-kutusu");
    return kart;
  });
}

const Secim = <T extends z.ZodRawShape>(yeni: T) =>
  z.discriminatedUnion("mod", [
    z.object({ mod: z.literal("yok") }),
    z.object({ mod: z.literal("mevcut"), id: z.uuid() }),
    z.object({ mod: z.literal("yeni"), ...yeni }),
  ]);

const Tarih = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();

const OnaySemasi = z.object({
  tur: z.enum(GIRDI_TURLERI),
  baslik: z.string().trim().min(1).max(500),
  olay: z.enum(OLAYLAR),
  tarih: Tarih,
  hatirlatma: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).nullable(),
  tekrar: z.string().max(40).nullable(),
  urun: z.string().trim().max(200).nullable(),
  firma: Secim({ ad: z.string().trim().min(1).max(300), tur: z.enum(FIRMA_TURLERI) }),
  kisi: Secim({ ad: z.string().trim().min(1).max(200) }),
  firsat: Secim({}),
  ozet: z.string().max(5000).nullable(),
  aksiyonlar: z
    .array(z.object({ tur: z.enum(AKSIYON_TURLERI), baslik: z.string().trim().min(1).max(500), tarih: Tarih }))
    .max(30),
}) satisfies z.ZodType<OnayVerisi>;

export async function girdiOnayla(id: string, onay: OnayVerisi): Promise<Sonuc<IslemeSonucu>> {
  return guvenli(async () => {
    const { supabase, userId } = await requireUser();
    const veri = olayiDuzelt(OnaySemasi.parse(onay) as OnayVerisi);
    const eksik = onayEksigi(veri);
    if (eksik) throw new IsHatasi(eksik);
    const ayarlar = await ayarlariGetir(supabase, userId);
    const sonuc = await girdiIsle(supabase, userId, z.uuid().parse(id), veri, ayarlar);
    revalidatePath("/", "layout");
    return sonuc;
  });
}

export async function girdiSil(id: string): Promise<Sonuc> {
  return guvenli(async () => {
    const { supabase } = await requireUser();
    const { data, error } = await supabase
      .from("inbox_items")
      .delete()
      .eq("id", z.uuid().parse(id))
      .select("ses_dosyasi")
      .maybeSingle();
    if (error) throw new IsHatasi(`Silinemedi: ${error.message}`);
    if (data?.ses_dosyasi) await supabase.storage.from("ses").remove([data.ses_dosyasi]);
    revalidatePath("/", "layout");
    return undefined;
  });
}

/** Ses kaydını dinlemek için kısa süreli imzalı adres. */
export async function sesAdresi(yol: string): Promise<Sonuc<string>> {
  return guvenli(async () => {
    const { supabase, userId } = await requireUser();
    if (!yol.startsWith(`${userId}/`)) throw new IsHatasi("Erişim yok.");
    const { data, error } = await supabase.storage.from("ses").createSignedUrl(yol, 600);
    if (error || !data) throw new IsHatasi("Ses dosyası açılamadı.");
    return data.signedUrl;
  });
}

export async function baglamGetir(): Promise<Sonuc<KartBaglami>> {
  return guvenli(async () => {
    const { supabase } = await requireUser();
    return kartBaglami(supabase);
  });
}
