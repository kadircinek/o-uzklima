"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { GOREV_TURLERI } from "@/lib/domain";
import { hatirlatmaAni } from "@/lib/inbox";
import { ERTELEME_SECENEKLERI, tekrarCoz } from "@/lib/rules";
import {
  ayarlariGetir,
  gorevErtele,
  gorevGeriAc,
  gorevKaydet,
  gorevTamamla,
  IsHatasi,
} from "@/lib/server/ops";
import { guvenli, type Sonuc } from "@/lib/server/sonuc";
import { requireUser } from "@/lib/supabase/server";

const Id = z.uuid();

export async function gorevBitir(id: string): Promise<Sonuc> {
  return guvenli(async () => {
    const { supabase, userId } = await requireUser();
    await gorevTamamla(supabase, userId, Id.parse(id), await ayarlariGetir(supabase, userId));
    revalidatePath("/", "layout");
    return undefined;
  });
}

export async function gorevGeriAl(id: string): Promise<Sonuc> {
  return guvenli(async () => {
    const { supabase, userId } = await requireUser();
    await gorevGeriAc(supabase, userId, Id.parse(id));
    revalidatePath("/", "layout");
    return undefined;
  });
}

const Erteleme = z.union([z.enum(ERTELEME_SECENEKLERI), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]);

export async function goreviErtele(id: string, secim: string): Promise<Sonuc<string>> {
  return guvenli(async () => {
    const { supabase, userId } = await requireUser();
    const ayarlar = await ayarlariGetir(supabase, userId);
    let gun: string;
    try {
      gun = await gorevErtele(supabase, userId, Id.parse(id), Erteleme.parse(secim), ayarlar);
    } catch (e) {
      if (e instanceof Error && e.message === "Geçersiz erteleme tarihi") throw new IsHatasi(e.message);
      throw e;
    }
    revalidatePath("/", "layout");
    return gun;
  });
}

const GorevFormu = z.object({
  baslik: z.string().trim().min(1, "Başlık boş olamaz").max(500),
  tur: z.enum(GOREV_TURLERI),
  vade: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  hatirlatma: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).nullable(),
  tekrar_kurali: z.string().max(40).nullable(),
  company_id: z.uuid().nullable(),
});

export type GorevFormVerisi = z.infer<typeof GorevFormu>;

export async function gorevKaydetAksiyon(id: string | null, form: GorevFormVerisi): Promise<Sonuc<string>> {
  return guvenli(async () => {
    const { supabase, userId } = await requireUser();
    const f = GorevFormu.parse(form);
    if (f.tekrar_kurali && !tekrarCoz(f.tekrar_kurali)) throw new IsHatasi("Tekrar kuralı geçersiz.");
    const ayarlar = await ayarlariGetir(supabase, userId);
    const sonuc = await gorevKaydet(
      supabase,
      userId,
      id ? Id.parse(id) : null,
      { ...f, hatirlatma: hatirlatmaAni(f.hatirlatma, ayarlar) },
      ayarlar,
    );
    revalidatePath("/", "layout");
    return sonuc;
  });
}

export async function gorevSil(id: string): Promise<Sonuc> {
  return guvenli(async () => {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("tasks").delete().eq("id", Id.parse(id));
    if (error) throw new IsHatasi(`Silinemedi: ${error.message}`);
    revalidatePath("/", "layout");
    return undefined;
  });
}
