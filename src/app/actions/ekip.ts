"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { geciciSifre, yoneticiMi } from "@/lib/server/ekip";
import { IsHatasi } from "@/lib/server/ops";
import { guvenli, type Sonuc } from "@/lib/server/sonuc";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";

async function yonetici() {
  const k = await requireUser();
  if (!yoneticiMi(k.eposta)) throw new IsHatasi("Bu işlem için yönetici olmalısınız.");
  return k;
}

export type HesapBilgisi = { eposta: string; ad: string | null; sifre: string };

/** Ofisteki bir arkadaşa hesap açar; geçici şifreyi bir kez gösterir. */
export async function arkadasEkle(form: { eposta: string; ad: string }): Promise<Sonuc<HesapBilgisi>> {
  return guvenli(async () => {
    await yonetici();
    const eposta = z.email("Geçerli bir e-posta adresi girin.").parse(form.eposta.trim().toLowerCase());
    const ad = z.string().trim().max(100).parse(form.ad) || null;
    const sifre = geciciSifre();
    const { error } = await createAdminClient().auth.admin.createUser({
      email: eposta,
      password: sifre,
      email_confirm: true,
      user_metadata: { ad, sifre_degistirmeli: true },
    });
    if (error) {
      if (/already|registered|exists/i.test(error.message)) throw new IsHatasi("Bu e-postayla bir hesap zaten var.");
      throw new IsHatasi(`Hesap açılamadı: ${error.message}`);
    }
    revalidatePath("/ayarlar");
    return { eposta, ad, sifre };
  });
}

/** Şifresini unutan arkadaşa yeni geçici şifre verir. */
export async function arkadasSifresiniSifirla(id: string): Promise<Sonuc<HesapBilgisi>> {
  return guvenli(async () => {
    const { userId } = await yonetici();
    const kullanici = z.uuid().parse(id);
    if (kullanici === userId) throw new IsHatasi("Kendi şifrenizi Ayarlar → Şifre bölümünden değiştirin.");
    const db = createAdminClient();
    const { data: mevcut } = await db.auth.admin.getUserById(kullanici);
    if (!mevcut.user) throw new IsHatasi("Kullanıcı bulunamadı.");
    const sifre = geciciSifre();
    const { error } = await db.auth.admin.updateUserById(kullanici, {
      password: sifre,
      user_metadata: { ...mevcut.user.user_metadata, sifre_degistirmeli: true },
    });
    if (error) throw new IsHatasi(`Şifre sıfırlanamadı: ${error.message}`);
    revalidatePath("/ayarlar");
    return { eposta: mevcut.user.email ?? "", ad: (mevcut.user.user_metadata?.ad as string) ?? null, sifre };
  });
}

/** Hesabı ve o kişinin tüm LifeOS verisini siler. */
export async function arkadasKaldir(id: string): Promise<Sonuc> {
  return guvenli(async () => {
    const { userId } = await yonetici();
    const kullanici = z.uuid().parse(id);
    if (kullanici === userId) throw new IsHatasi("Kendi hesabınızı kaldıramazsınız.");
    const { error } = await createAdminClient().auth.admin.deleteUser(kullanici);
    if (error) throw new IsHatasi(`Kaldırılamadı: ${error.message}`);
    revalidatePath("/ayarlar");
    return undefined;
  });
}
