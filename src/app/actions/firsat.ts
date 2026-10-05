"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ASAMALAR } from "@/lib/domain";
import { asamaDegistir, ayarlariGetir, firsatOlustur, IsHatasi } from "@/lib/server/ops";
import { guvenli, type Sonuc } from "@/lib/server/sonuc";
import { requireUser } from "@/lib/supabase/server";

const Id = z.uuid();

const FirsatFormu = z.object({
  company_id: z.uuid("Firma seçin"),
  urun: z.string().trim().min(1, "Ürün boş olamaz").max(200),
  asama: z.enum(ASAMALAR),
  tahmini_miktar_ton: z.number().nonnegative().nullable(),
  tahmini_tutar: z.number().nonnegative().nullable(),
  para_birimi: z.string().trim().min(1).max(10),
});
export type FirsatFormVerisi = z.infer<typeof FirsatFormu>;

export async function firsatKaydet(id: string | null, form: FirsatFormVerisi): Promise<Sonuc<string>> {
  return guvenli(async () => {
    const { supabase, userId } = await requireUser();
    const f = FirsatFormu.parse(form);
    const ayarlar = await ayarlariGetir(supabase, userId);
    if (!id) {
      const yeniId = await firsatOlustur(supabase, userId, f, ayarlar);
      revalidatePath("/", "layout");
      return yeniId;
    }
    const { asama, ...alanlar } = f;
    const { error } = await supabase.from("deals").update(alanlar).eq("id", Id.parse(id));
    if (error) throw new IsHatasi(`Fırsat kaydedilemedi: ${error.message}`);
    await asamaDegistir(supabase, userId, id, asama, ayarlar);
    revalidatePath("/", "layout");
    return id;
  });
}

/** Aşama panosunda aşama değişimi: ilgili takip görevi otomatik oluşur. */
export async function firsatAsamasi(id: string, asama: string): Promise<Sonuc> {
  return guvenli(async () => {
    const { supabase, userId } = await requireUser();
    await asamaDegistir(supabase, userId, Id.parse(id), z.enum(ASAMALAR).parse(asama), await ayarlariGetir(supabase, userId));
    revalidatePath("/", "layout");
    return undefined;
  });
}

export async function firsatSil(id: string): Promise<Sonuc> {
  return guvenli(async () => {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("deals").delete().eq("id", Id.parse(id));
    if (error) throw new IsHatasi(`Silinemedi: ${error.message}`);
    revalidatePath("/", "layout");
    return undefined;
  });
}
