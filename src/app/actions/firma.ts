"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { FIRMA_TURLERI } from "@/lib/domain";
import { normalizeAd } from "@/lib/match";
import { IsHatasi } from "@/lib/server/ops";
import { guvenli, type Sonuc } from "@/lib/server/sonuc";
import { requireUser } from "@/lib/supabase/server";

const Id = z.uuid();
const Bos = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);

const FirmaFormu = z.object({
  ad: z.string().trim().min(1, "Firma adı boş olamaz").max(300),
  ulke: z.string().max(100).nullable(),
  tur: z.enum(FIRMA_TURLERI),
  segment: z.string().max(200).nullable(),
  aktif: z.boolean(),
  notlar: z.string().max(10_000).nullable(),
});
export type FirmaFormVerisi = z.infer<typeof FirmaFormu>;

function benzersizHata(e: { code?: string; message: string }): never {
  if (e.code === "23505") throw new IsHatasi("Bu adla bir firma zaten var.");
  throw new IsHatasi(`Firma kaydedilemedi: ${e.message}`);
}

export async function firmaKaydet(id: string | null, form: FirmaFormVerisi): Promise<Sonuc<string>> {
  return guvenli(async () => {
    const { supabase, userId } = await requireUser();
    const f = FirmaFormu.parse(form);
    const kayit = { ...f, ulke: Bos(f.ulke), segment: Bos(f.segment), notlar: Bos(f.notlar) };
    if (id) {
      const { error } = await supabase.from("companies").update(kayit).eq("id", Id.parse(id));
      if (error) benzersizHata(error);
      revalidatePath("/", "layout");
      return id;
    }
    const { data, error } = await supabase
      .from("companies")
      .insert({ ...kayit, user_id: userId })
      .select("id")
      .single();
    if (error) benzersizHata(error);
    revalidatePath("/", "layout");
    return data.id;
  });
}

export async function firmaSil(id: string): Promise<Sonuc> {
  const sonuc = await guvenli(async () => {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("companies").delete().eq("id", Id.parse(id));
    if (error) throw new IsHatasi(`Silinemedi: ${error.message}`);
    revalidatePath("/", "layout");
    return undefined;
  });
  if (sonuc.ok) redirect("/firmalar");
  return sonuc;
}

const KisiFormu = z.object({
  ad: z.string().trim().min(1, "Ad boş olamaz").max(200),
  unvan: z.string().max(200).nullable(),
  eposta: z.string().max(300).nullable(),
  telefon: z.string().max(100).nullable(),
  dil: z.string().max(50).nullable(),
});
export type KisiFormVerisi = z.infer<typeof KisiFormu>;

export async function kisiKaydet(companyId: string, id: string | null, form: KisiFormVerisi): Promise<Sonuc> {
  return guvenli(async () => {
    const { supabase, userId } = await requireUser();
    const f = KisiFormu.parse(form);
    const kayit = { ad: f.ad, unvan: Bos(f.unvan), eposta: Bos(f.eposta), telefon: Bos(f.telefon), dil: Bos(f.dil) };
    const { error } = id
      ? await supabase.from("contacts").update(kayit).eq("id", Id.parse(id))
      : await supabase.from("contacts").insert({ ...kayit, company_id: Id.parse(companyId), user_id: userId });
    if (error) throw new IsHatasi(`Kişi kaydedilemedi: ${error.message}`);
    revalidatePath(`/firmalar/${companyId}`);
    return undefined;
  });
}

export async function kisiSil(companyId: string, id: string): Promise<Sonuc> {
  return guvenli(async () => {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("contacts").delete().eq("id", Id.parse(id));
    if (error) throw new IsHatasi(`Silinemedi: ${error.message}`);
    revalidatePath(`/firmalar/${companyId}`);
    return undefined;
  });
}

export async function notEkle(companyId: string, metin: string): Promise<Sonuc> {
  return guvenli(async () => {
    const { supabase, userId } = await requireUser();
    const m = z.string().trim().min(1, "Not boş olamaz").max(20_000).parse(metin);
    const { error } = await supabase.from("notes").insert({ metin: m, company_id: Id.parse(companyId), user_id: userId });
    if (error) throw new IsHatasi(`Not eklenemedi: ${error.message}`);
    revalidatePath("/", "layout");
    return undefined;
  });
}

export async function notSil(companyId: string, id: string): Promise<Sonuc> {
  return guvenli(async () => {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("notes").delete().eq("id", Id.parse(id));
    if (error) throw new IsHatasi(`Silinemedi: ${error.message}`);
    revalidatePath(`/firmalar/${companyId}`);
    return undefined;
  });
}

const IceAktarimSatiri = z.object({
  ad: z.string().trim().min(1).max(300),
  ulke: z.string().max(100).nullable(),
  tur: z.enum(FIRMA_TURLERI),
  segment: z.string().max(200).nullable(),
  notlar: z.string().max(10_000).nullable(),
});
export type IceAktarimSatiri = z.infer<typeof IceAktarimSatiri>;

/** Excel/CSV'den firma içe aktarma. Aynı adlı firmalar atlanır. */
export async function firmalariIceAktar(
  satirlar: IceAktarimSatiri[],
): Promise<Sonuc<{ eklenen: number; atlanan: number }>> {
  return guvenli(async () => {
    const { supabase, userId } = await requireUser();
    const liste = z.array(IceAktarimSatiri).max(10_000).parse(satirlar);
    const { data: mevcut, error } = await supabase.from("companies").select("ad").limit(20_000);
    if (error) throw new IsHatasi(`Firmalar okunamadı: ${error.message}`);
    // Veritabanındaki tekillik (lower(btrim(ad))) ile aynı anahtar.
    const anahtar = (ad: string) => ad.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr");
    const gorulen = new Set((mevcut ?? []).map((f) => anahtar(f.ad)));
    const benzer = new Set((mevcut ?? []).map((f) => normalizeAd(f.ad)));
    const yeni = [];
    for (const s of liste) {
      const k = anahtar(s.ad);
      if (gorulen.has(k) || benzer.has(normalizeAd(s.ad))) continue;
      gorulen.add(k);
      benzer.add(normalizeAd(s.ad));
      yeni.push({
        ad: s.ad.trim().replace(/\s+/g, " "),
        ulke: Bos(s.ulke),
        tur: s.tur,
        segment: Bos(s.segment),
        notlar: Bos(s.notlar),
        user_id: userId,
      });
    }
    for (let i = 0; i < yeni.length; i += 500) {
      const { error: e } = await supabase.from("companies").insert(yeni.slice(i, i + 500));
      if (e) throw new IsHatasi(`İçe aktarma ${i + 1}. satırda durdu: ${e.message}`);
    }
    revalidatePath("/", "layout");
    return { eklenen: yeni.length, atlanan: liste.length - yeni.length };
  });
}
