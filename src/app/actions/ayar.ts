"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ASAMALAR, GOREV_TURLERI, type Kurallar } from "@/lib/domain";
import { IsHatasi } from "@/lib/server/ops";
import { kullaniciyaGonder, pushYapilandirildiMi } from "@/lib/server/push";
import { guvenli, type Sonuc } from "@/lib/server/sonuc";
import { requireUser } from "@/lib/supabase/server";

const Saat = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Saat SS:DD biçiminde olmalı");
const Gun = (en: number, ust: number) => z.number().int().min(en).max(ust);

const AsamaGorevi = z
  .object({
    tur: z.enum(GOREV_TURLERI),
    baslik: z.string().trim().min(1).max(200),
    gun: Gun(0, 365),
    is_gunu: z.boolean(),
  })
  .nullable();

const AyarFormu = z.object({
  ozet_saati: Saat,
  hatirlatma_saati: Saat,
  gunluk_bildirim_limiti: Gun(1, 50),
  sessiz_liste_gunu: Gun(0, 6),
  ek_tatiller: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(100),
  kurallar: z.object({
    bekleme_is_gunu: Gun(1, 60),
    teklif_is_gunu: Gun(1, 60),
    numune_gun: Gun(1, 180),
    odeme_on_gun: Gun(0, 60),
    takip_is_gunu: Gun(1, 60),
    sessiz_gun: Gun(1, 365),
    asama_gorevleri: z.object(Object.fromEntries(ASAMALAR.map((a) => [a, AsamaGorevi])) as Record<
      (typeof ASAMALAR)[number],
      typeof AsamaGorevi
    >),
  }) satisfies z.ZodType<Kurallar>,
});
export type AyarFormVerisi = z.infer<typeof AyarFormu>;

export async function ayarlariKaydet(form: AyarFormVerisi): Promise<Sonuc> {
  return guvenli(async () => {
    const { supabase, userId } = await requireUser();
    const f = AyarFormu.parse(form);
    const { error } = await supabase
      .from("settings")
      .upsert({ ...f, ek_tatiller: [...new Set(f.ek_tatiller)].sort(), user_id: userId });
    if (error) throw new IsHatasi(`Ayarlar kaydedilemedi: ${error.message}`);
    revalidatePath("/", "layout");
    return undefined;
  });
}

const Abonelik = z.object({
  endpoint: z.url().max(2000),
  keys: z.object({ p256dh: z.string().min(1).max(500), auth: z.string().min(1).max(500) }),
});

export async function pushAboneOl(abonelik: unknown, userAgent: string | null): Promise<Sonuc> {
  return guvenli(async () => {
    const { supabase, userId } = await requireUser();
    const a = Abonelik.parse(abonelik);
    // Aynı uç nokta (cihaz) daha önce kaydedildiyse güncelle.
    await supabase.from("push_subscriptions").delete().eq("endpoint", a.endpoint);
    const { error } = await supabase.from("push_subscriptions").insert({
      user_id: userId,
      endpoint: a.endpoint,
      p256dh: a.keys.p256dh,
      auth: a.keys.auth,
      user_agent: userAgent?.slice(0, 300) ?? null,
    });
    if (error) throw new IsHatasi(`Abonelik kaydedilemedi: ${error.message}`);
    revalidatePath("/ayarlar");
    return undefined;
  });
}

export async function pushAbonelikSil(endpoint: string): Promise<Sonuc> {
  return guvenli(async () => {
    const { supabase } = await requireUser();
    await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    revalidatePath("/ayarlar");
    return undefined;
  });
}

export async function pushDene(): Promise<Sonuc<number>> {
  return guvenli(async () => {
    const { supabase, userId } = await requireUser();
    if (!pushYapilandirildiMi()) throw new IsHatasi("VAPID anahtarları tanımlı değil (.env.example).");
    const ulasan = await kullaniciyaGonder(supabase, userId, {
      baslik: "LifeOS bildirimleri açık",
      govde: "Hatırlatmalar ve 08:30 özeti bu cihaza gelecek.",
      url: "/",
      etiket: "deneme",
    });
    if (ulasan === 0) throw new IsHatasi("Bildirim hiçbir cihaza ulaşmadı. Bu cihazda bildirimleri yeniden açmayı deneyin.");
    return ulasan;
  });
}
