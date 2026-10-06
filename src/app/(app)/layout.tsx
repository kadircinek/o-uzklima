import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ayarlariGetir, bugun } from "@/lib/server/ops";
import { sayilar } from "@/lib/server/queries";
import { requireUser } from "@/lib/supabase/server";

export default async function UygulamaLayout({ children }: { children: React.ReactNode }) {
  const { supabase, userId, meta } = await requireUser();
  // Yöneticinin açtığı hesapta ilk girişte kendi şifresini belirlemeli.
  if (meta.sifre_degistirmeli) redirect("/sifre");
  const ayarlar = await ayarlariGetir(supabase, userId);
  const gun = bugun(ayarlar);
  return (
    <AppShell ayarlar={ayarlar} bugun={gun} userId={userId} sayilar={await sayilar(supabase, gun)}>
      {children}
    </AppShell>
  );
}
