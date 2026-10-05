import { AppShell } from "@/components/app-shell";
import { ayarlariGetir, bugun } from "@/lib/server/ops";
import { sayilar } from "@/lib/server/queries";
import { requireUser } from "@/lib/supabase/server";

export default async function UygulamaLayout({ children }: { children: React.ReactNode }) {
  const { supabase, userId } = await requireUser();
  const ayarlar = await ayarlariGetir(supabase, userId);
  const gun = bugun(ayarlar);
  return (
    <AppShell ayarlar={ayarlar} bugun={gun} userId={userId} sayilar={await sayilar(supabase, gun)}>
      {children}
    </AppShell>
  );
}
