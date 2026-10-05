"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type GirisDurumu = { hata: string | null; eposta?: string };

function guvenliYonlendirme(sonra: FormDataEntryValue | null): string {
  const s = typeof sonra === "string" ? sonra : "";
  // Yalnızca uygulama içi yollara dön (açık yönlendirmeyi engelle).
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : "/";
}

export async function girisYap(_onceki: GirisDurumu, form: FormData): Promise<GirisDurumu> {
  const eposta = String(form.get("eposta") ?? "").trim();
  const sifre = String(form.get("sifre") ?? "");
  if (!eposta || !sifre) return { hata: "E-posta ve şifre gerekli.", eposta };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: eposta, password: sifre });
  if (error) return { hata: "E-posta veya şifre hatalı.", eposta };
  redirect(guvenliYonlendirme(form.get("sonra")));
}

export async function cikisYap(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/giris");
}
