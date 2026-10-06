"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { FIRMA_TURLERI, GIRDI_TURLERI, OLAYLAR } from "@/lib/domain";
import { olayiDuzelt, onayEksigi, type KartBaglami, type KartVerisi, type OnayVerisi } from "@/lib/inbox";
import { AKSIYON_TURLERI } from "@/lib/parse/schema";
import { GIRDI_SECIMI, girdiAyristir, type GirdiKaydi } from "@/lib/server/girdi";
import { ayarlariGetir, girdiIsle, IsHatasi, kendiAlanlariGetir, type IslemeSonucu } from "@/lib/server/ops";
import { kartBaglami } from "@/lib/server/queries";
import { guvenli, type Sonuc } from "@/lib/server/sonuc";
import { requireUser } from "@/lib/supabase/server";

const Metin = z.string().trim().min(1, "Boş kayıt eklenemez").max(20_000);

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
      .select(GIRDI_SECIMI)
      .single();
    if (error) throw new IsHatasi(`Kayıt eklenemedi: ${error.message}`);
    revalidatePath("/", "layout");
    const baglam = await kartBaglami(supabase, userId);
    const kart = await girdiAyristir(supabase, userId, data as GirdiKaydi, { toplanti: secenek.toplanti ?? false, baglam });
    return { kart, baglam };
  });
}

export async function girdiYenidenAyristir(id: string, toplanti = false): Promise<Sonuc<KartVerisi>> {
  return guvenli(async () => {
    const { supabase, userId, eposta } = await requireUser();
    const { data, error } = await supabase
      .from("inbox_items")
      .select(GIRDI_SECIMI)
      .eq("id", z.uuid().parse(id))
      .eq("durum", "islenmedi")
      .maybeSingle();
    if (error || !data) throw new IsHatasi("Kayıt bulunamadı.");
    const kart = await girdiAyristir(supabase, userId, data as GirdiKaydi, {
      toplanti,
      baglam: await kartBaglami(supabase, userId),
      kendiAlanlar: await kendiAlanlariGetir(supabase, userId, eposta),
    });
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
    const { supabase, userId, eposta } = await requireUser();
    const veri = olayiDuzelt(OnaySemasi.parse(onay) as OnayVerisi);
    const eksik = onayEksigi(veri);
    if (eksik) throw new IsHatasi(eksik);
    const ayarlar = await ayarlariGetir(supabase, userId);
    const sonuc = await girdiIsle(supabase, userId, z.uuid().parse(id), veri, ayarlar, {
      kendiAlanlar: await kendiAlanlariGetir(supabase, userId, eposta),
    });
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
    const { supabase, userId } = await requireUser();
    return kartBaglami(supabase, userId);
  });
}
