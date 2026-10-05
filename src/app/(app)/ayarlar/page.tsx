import { cikisYap } from "@/app/actions/oturum";
import { AyarFormu, PushAyari } from "@/components/ayarlar";
import { IceAktarDugmesi } from "@/components/firma";
import { Buton, Kart, Rozet, SayfaBasligi } from "@/components/ui";
import { formatDateTime } from "@/lib/dates";
import { claudeYapilandirildiMi } from "@/lib/server/claude";
import { ayarlariGetir } from "@/lib/server/ops";
import { pushYapilandirildiMi } from "@/lib/server/push";
import { requireUser } from "@/lib/supabase/server";

export const metadata = { title: "Ayarlar" };

export default async function AyarlarSayfasi() {
  const { supabase, userId } = await requireUser();
  const [ayarlar, cihazlar, sonOzet, kullanici] = await Promise.all([
    ayarlariGetir(supabase, userId),
    supabase.from("push_subscriptions").select("id", { count: "exact", head: true }),
    supabase.from("notification_log").select("gonderim").order("gonderim", { ascending: false }).limit(1).maybeSingle(),
    supabase.auth.getUser(),
  ]);

  const durum = (ok: boolean, evet: string, hayir: string) => <Rozet tur={ok ? "basari" : "uyari"}>{ok ? evet : hayir}</Rozet>;

  return (
    <>
      <SayfaBasligi baslik="Ayarlar" alt={kullanici.data.user?.email} />
      <div className="space-y-6">
        <section className="space-y-2">
          <h2 className="px-1 text-sm font-semibold text-muted">Bildirim izni</h2>
          <PushAyari
            vapidAnahtari={pushYapilandirildiMi() ? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY! : null}
            cihazSayisi={cihazlar.count ?? 0}
          />
        </section>

        <AyarFormu ayarlar={ayarlar} />

        <section className="space-y-2">
          <h2 className="px-1 text-sm font-semibold text-muted">Veri ve kurulum</h2>
          <Kart className="divide-y divide-line">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-[15px]">Firma listesini içe aktar</p>
                <p className="text-xs text-muted">Excel (.xlsx) veya CSV; Business Central dışa aktarımı olur</p>
              </div>
              <IceAktarDugmesi />
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <p className="text-[15px]">Claude ayrıştırma</p>
              {durum(claudeYapilandirildiMi(), "Bağlı", "API anahtarı yok")}
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <p className="text-[15px]">Web Push</p>
              {durum(pushYapilandirildiMi(), "Hazır", "VAPID anahtarı yok")}
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-[15px]">Hatırlatma motoru</p>
                <p className="text-xs text-muted">Supabase cron her 5 dakikada /api/cron/tick çağırır</p>
              </div>
              {durum(
                Boolean(process.env.CRON_SECRET),
                sonOzet.data ? `Son bildirim ${formatDateTime(new Date(sonOzet.data.gonderim), ayarlar.saat_dilimi)}` : "Hazır",
                "CRON_SECRET yok",
              )}
            </div>
          </Kart>
        </section>

        <form action={cikisYap} className="flex justify-center pt-2">
          <Buton type="submit" tur="hayalet">
            Çıkış yap
          </Buton>
        </form>
      </div>
    </>
  );
}
