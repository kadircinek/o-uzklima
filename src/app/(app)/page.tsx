import Link from "next/link";
import { GorevSatiri } from "@/components/gorev";
import { HizliGirisDugmesi, HizliGirisiAc } from "@/components/hizli-giris-dugmesi";
import { Bolum, Bos, Kart, Rozet, SayfaBasligi } from "@/components/ui";
import { formatLong, GUNLER, weekday } from "@/lib/dates";
import { bugunGorunumu, sessizMusteriler } from "@/lib/engine";
import { hasHolidayData, isBusinessDay } from "@/lib/holidays";
import { ayarlariGetir, bugun } from "@/lib/server/ops";
import { acikGorevler, aktifMusteriler, islenmemisGirdiler } from "@/lib/server/queries";
import { requireUser } from "@/lib/supabase/server";

export const metadata = { title: "Bugün" };

export default async function BugunSayfasi({ searchParams }: { searchParams: Promise<{ ekle?: string }> }) {
  const { ekle } = await searchParams;
  const { supabase, userId } = await requireUser();
  const ayarlar = await ayarlariGetir(supabase, userId);
  const gun = bugun(ayarlar);
  const [gorevler, musteriler, gelen] = await Promise.all([
    acikGorevler(supabase),
    aktifMusteriler(supabase),
    islenmemisGirdiler(supabase),
  ]);

  const g = bugunGorunumu(gorevler, gun);
  const sessiz = sessizMusteriler(musteriler, gun, ayarlar);
  const satir = (t: (typeof gorevler)[number]) => (
    <GorevSatiri key={t.id} gorev={t} bugun={gun} saatDilimi={ayarlar.saat_dilimi} turGoster />
  );
  const hepsiTemiz = g.gecikenler.length === 0 && g.bugun.length === 0;

  return (
    <>
      {ekle === "1" && <HizliGirisiAc metin="" />}
      <SayfaBasligi
        baslik="Bugün"
        alt={
          <>
            {formatLong(gun)} {GUNLER[weekday(gun)]}
            {!isBusinessDay(gun, ayarlar.ek_tatiller) && " · tatil"}
          </>
        }
      />

      <div className="space-y-6">
        {gelen.length > 0 && (
          <Link
            href="/gelen-kutusu"
            className="flex items-center justify-between rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent"
          >
            <span>
              Gelen kutusunda <strong>{gelen.length}</strong> işlenmemiş kayıt var
            </span>
            <span aria-hidden>→</span>
          </Link>
        )}

        {g.gecikenler.length > 0 && (
          <Bolum baslik="Gecikenler" sayi={g.gecikenler.length} ton="tehlike">
            <Kart>
              <ul className="divide-y divide-line">{g.gecikenler.map(satir)}</ul>
            </Kart>
          </Bolum>
        )}

        <Bolum baslik="Bugün" sayi={g.bugun.length}>
          {g.bugun.length > 0 ? (
            <Kart>
              <ul className="divide-y divide-line">{g.bugun.map(satir)}</ul>
            </Kart>
          ) : (
            <Bos>
              {hepsiTemiz ? "Bugün için bekleyen iş yok. " : "Bugüne vadeli iş yok. "}
              <HizliGirisDugmesi>Aklına geleni ekle</HizliGirisDugmesi>
            </Bos>
          )}
        </Bolum>

        <Bolum
          baslik="Bekliyorum"
          sayi={g.bekleyenler.length}
          aksiyon={
            <Link href="/gorevler?tur=bekliyorum" className="text-xs text-muted hover:text-ink">
              Tümü
            </Link>
          }
        >
          {g.bekleyenler.length > 0 ? (
            <Kart>
              <ul className="divide-y divide-line">{g.bekleyenler.slice(0, 8).map(satir)}</ul>
            </Kart>
          ) : (
            <Bos>Kimseden bir şey beklemiyorsun.</Bos>
          )}
        </Bolum>

        <Bolum baslik={`Sessiz müşteriler (${ayarlar.kurallar.sessiz_gun}+ gün)`} sayi={sessiz.length}>
          {sessiz.length > 0 ? (
            <Kart>
              <ul className="divide-y divide-line">
                {sessiz.slice(0, 10).map((f) => (
                  <li key={f.id}>
                    <Link href={`/firmalar/${f.id}`} className="flex items-center justify-between px-3 py-2.5 hover:bg-soft">
                      <span className="text-[15px]">{f.ad}</span>
                      <Rozet tur="uyari">{f.gun === null ? "hiç temas yok" : `${f.gun} gün`}</Rozet>
                    </Link>
                  </li>
                ))}
              </ul>
              {sessiz.length > 10 && (
                <Link href="/firmalar?sessiz=1" className="block border-t border-line px-3 py-2 text-center text-sm text-muted hover:text-ink">
                  +{sessiz.length - 10} firma daha
                </Link>
              )}
            </Kart>
          ) : (
            <Bos>Tüm aktif müşterilerle son {ayarlar.kurallar.sessiz_gun} günde temas var.</Bos>
          )}
        </Bolum>

        {!hasHolidayData(Number(gun.slice(0, 4))) && (
          <p className="text-xs text-muted">
            {gun.slice(0, 4)} yılının dini bayram tarihleri takvimde yok; Ayarlar → Ek tatil günleri bölümünden ekleyebilirsin.
          </p>
        )}
      </div>
    </>
  );
}
