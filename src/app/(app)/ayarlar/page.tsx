import Link from "next/link";
import { cikisYap } from "@/app/actions/oturum";
import { AyarFormu, PushAyari } from "@/components/ayarlar";
import { EkipAyari } from "@/components/ekip-ayari";
import { EpostaAyari } from "@/components/eposta-ayari";
import { IceAktarDugmesi } from "@/components/firma";
import { Buton, Kart, Rozet, SayfaBasligi } from "@/components/ui";
import { formatDateTime } from "@/lib/dates";
import { claudeYapilandirildiMi } from "@/lib/server/claude";
import { yoneticiMi, type EkipUyesi } from "@/lib/server/ekip";
import { kullaniciAdresi } from "@/lib/server/eposta";
import { ayarlariGetir } from "@/lib/server/ops";
import { pushYapilandirildiMi } from "@/lib/server/push";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";

async function ekipListesi(benId: string): Promise<EkipUyesi[]> {
  const { data, error } = await createAdminClient().auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`Kullanıcılar okunamadı: ${error.message}`);
  return data.users
    .map((u) => ({
      id: u.id,
      eposta: u.email ?? "",
      ad: (u.user_metadata?.ad as string | undefined) ?? null,
      son_giris: u.last_sign_in_at ?? null,
      olusturma: u.created_at,
      sifre_degistirmeli: Boolean(u.user_metadata?.sifre_degistirmeli),
      ben: u.id === benId,
    }))
    .sort((a, b) => Number(b.ben) - Number(a.ben) || a.eposta.localeCompare(b.eposta));
}

export const metadata = { title: "Ayarlar" };

export default async function AyarlarSayfasi() {
  const { supabase, userId, eposta } = await requireUser();
  const yonetici = yoneticiMi(eposta);
  const [ayarlar, cihazlar, sonOzet, epostaAyari, gunluk, uyeler] = await Promise.all([
    ayarlariGetir(supabase, userId),
    supabase.from("push_subscriptions").select("id", { count: "exact", head: true }),
    supabase.from("notification_log").select("gonderim").order("gonderim", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("settings").select("eposta_anahtari, eposta_gondericiler").eq("user_id", userId).single(),
    supabase.from("email_log").select("*").order("alinma", { ascending: false }).limit(10),
    yonetici ? ekipListesi(userId) : Promise.resolve([]),
  ]);

  const durum = (ok: boolean, evet: string, hayir: string) => <Rozet tur={ok ? "basari" : "uyari"}>{ok ? evet : hayir}</Rozet>;

  return (
    <>
      <SayfaBasligi baslik="Ayarlar" alt={eposta} />
      <div className="space-y-6">
        <section className="space-y-2">
          <h2 className="px-1 text-sm font-semibold text-muted">Bildirim izni</h2>
          <PushAyari
            vapidAnahtari={pushYapilandirildiMi() ? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY! : null}
            cihazSayisi={cihazlar.count ?? 0}
          />
        </section>

        <section className="space-y-2" id="eposta">
          <h2 className="px-1 text-sm font-semibold text-muted">E-posta bağlantısı</h2>
          <EpostaAyari
            adres={epostaAyari.data ? kullaniciAdresi(epostaAyari.data.eposta_anahtari) : null}
            girisEpostasi={eposta}
            gondericiler={epostaAyari.data?.eposta_gondericiler ?? []}
            gunluk={gunluk.data ?? []}
            saatDilimi={ayarlar.saat_dilimi}
            yonetici={yonetici}
          />
        </section>

        <AyarFormu ayarlar={ayarlar} />

        {yonetici && (
          <section className="space-y-2" id="ekip">
            <h2 className="px-1 text-sm font-semibold text-muted">Ekip</h2>
            <EkipAyari uyeler={uyeler} saatDilimi={ayarlar.saat_dilimi} />
          </section>
        )}

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
              <p className="text-[15px]">E-posta servisi</p>
              {durum(Boolean(process.env.EPOSTA_GELEN_ADRESI && process.env.EPOSTA_WEBHOOK_ANAHTARI), "Hazır", "Kurulmadı")}
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

        <div className="flex justify-center">
          <Link href="/sifre" className="text-sm text-muted hover:text-ink">
            Şifreyi değiştir
          </Link>
        </div>

        <form action={cikisYap} className="flex justify-center">
          <Buton type="submit" tur="hayalet">
            Çıkış yap
          </Buton>
        </form>
      </div>
    </>
  );
}
