"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adresCoz } from "@/lib/eposta";
import { IsHatasi } from "@/lib/server/ops";
import { guvenli, type Sonuc } from "@/lib/server/sonuc";
import { requireUser } from "@/lib/supabase/server";

/** Kişisel LifeOS adresini yeniler; eski adrese gelen e-postalar artık kabul edilmez. */
export async function epostaAdresiniYenile(): Promise<Sonuc> {
  return guvenli(async () => {
    const { supabase, userId } = await requireUser();
    const anahtar = randomBytes(8).toString("hex").slice(0, 12);
    const { error } = await supabase.from("settings").update({ eposta_anahtari: anahtar }).eq("user_id", userId);
    if (error) throw new IsHatasi(`Adres yenilenemedi: ${error.message}`);
    revalidatePath("/ayarlar");
    return undefined;
  });
}

async function gondericileriGuncelle(degistir: (liste: string[]) => string[]): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase.from("settings").select("eposta_gondericiler").eq("user_id", userId).single();
  if (error) throw new IsHatasi(`Ayarlar okunamadı: ${error.message}`);
  const yeni = [...new Set(degistir(data.eposta_gondericiler))].sort();
  const { error: e2 } = await supabase.from("settings").update({ eposta_gondericiler: yeni }).eq("user_id", userId);
  if (e2) throw new IsHatasi(`Kaydedilemedi: ${e2.message}`);
  revalidatePath("/ayarlar");
}

/** E-postaların kabul edileceği ek gönderen adresi (ör. iş e-postası). */
export async function epostaGondericiEkle(adres: string): Promise<Sonuc> {
  return guvenli(async () => {
    const a = adresCoz(z.string().max(300).parse(adres));
    if (!a) throw new IsHatasi("Geçerli bir e-posta adresi girin.");
    await gondericileriGuncelle((l) => (l.length >= 10 ? l : [...l, a]));
    return undefined;
  });
}

export async function epostaGondericiSil(adres: string): Promise<Sonuc> {
  return guvenli(async () => {
    const a = z.string().max(300).parse(adres).toLowerCase();
    await gondericileriGuncelle((l) => l.filter((x) => x !== a));
    return undefined;
  });
}
