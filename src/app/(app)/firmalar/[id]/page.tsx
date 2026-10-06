import Link from "next/link";
import { notFound } from "next/navigation";
import { FirmaDugmesi, HizliNot, KisiListesi, NotListesi } from "@/components/firma";
import { FirsatDugmesi } from "@/components/firsat";
import { GorevSatiri } from "@/components/gorev";
import { YeniGorevDugmesi } from "@/components/gorev-sayfasi";
import { Bolum, Bos, Kart, Rozet, SayfaBasligi } from "@/components/ui";
import { diffDays, formatShort, localParts } from "@/lib/dates";
import { ACIK_ASAMALAR, ASAMA_ETIKET, FIRMA_TURU_ETIKET } from "@/lib/domain";
import { oncelikSirala } from "@/lib/engine";
import { ayarlariGetir, bugun } from "@/lib/server/ops";
import { firmaDetayi } from "@/lib/server/queries";
import { requireUser } from "@/lib/supabase/server";

export default async function FirmaSayfasi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, userId } = await requireUser();
  const ayarlar = await ayarlariGetir(supabase, userId);
  const gun = bugun(ayarlar);
  const d = await firmaDetayi(supabase, id);
  if (!d) notFound();

  const { firma } = d;
  const tz = ayarlar.saat_dilimi;
  const sonTemas = firma.son_temas ? diffDays(localParts(new Date(firma.son_temas), tz).date, gun) : null;
  const acik = oncelikSirala(d.gorevler.filter((g) => g.durum !== "bitti"));
  const yapilacak = acik.filter((g) => g.tur !== "bekliyorum");
  const bekleyen = acik.filter((g) => g.tur === "bekliyorum");
  const biten = d.gorevler.filter((g) => g.durum === "bitti").slice(0, 10);
  const satir = (g: (typeof acik)[number]) => (
    <GorevSatiri key={g.id} gorev={g} bugun={gun} saatDilimi={tz} firmaGoster={false} turGoster />
  );
  const sessiz = firma.tur === "musteri" && firma.aktif && (sonTemas === null || sonTemas >= ayarlar.kurallar.sessiz_gun);

  return (
    <>
      <Link href="/firmalar" className="mb-2 inline-block text-sm text-muted hover:text-ink">
        ← Firmalar
      </Link>
      <SayfaBasligi
        baslik={firma.ad}
        alt={
          <span className="flex flex-wrap items-center gap-1.5">
            <Rozet>{FIRMA_TURU_ETIKET[firma.tur]}</Rozet>
            {firma.ulke && <span>{firma.ulke}</span>}
            {firma.segment && <span>· {firma.segment}</span>}
            {!firma.aktif && <Rozet>Pasif</Rozet>}
            {firma.eposta_alanlari.map((a) => (
              <Rozet key={a}>@{a}</Rozet>
            ))}
            <Rozet tur={sessiz ? "uyari" : "notr"}>
              {sonTemas === null ? "Hiç temas yok" : sonTemas === 0 ? "Son temas bugün" : `Son temas ${sonTemas} gün önce`}
            </Rozet>
          </span>
        }
        aksiyon={<FirmaDugmesi firma={firma} />}
      />

      <div className="space-y-6">
        <HizliNot companyId={firma.id} />

        <Bolum
          baslik="Açık işler"
          sayi={yapilacak.length}
          aksiyon={<YeniGorevDugmesi companyId={firma.id} saatDilimi={tz} />}
        >
          {yapilacak.length ? (
            <Kart>
              <ul className="divide-y divide-line">{yapilacak.map(satir)}</ul>
            </Kart>
          ) : (
            <Bos>Bu firmaya açık iş yok.</Bos>
          )}
        </Bolum>

        {bekleyen.length > 0 && (
          <Bolum baslik="Bekliyorum" sayi={bekleyen.length}>
            <Kart>
              <ul className="divide-y divide-line">{bekleyen.map(satir)}</ul>
            </Kart>
          </Bolum>
        )}

        <Bolum baslik="Fırsatlar" sayi={d.firsatlar.length} aksiyon={<FirsatDugmesi companyId={firma.id} />}>
          {d.firsatlar.length ? (
            <Kart>
              <ul className="divide-y divide-line">
                {d.firsatlar.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[15px]">{f.urun}</p>
                      <p className="text-xs text-muted">
                        {[
                          f.tahmini_miktar_ton && `${f.tahmini_miktar_ton} ton`,
                          f.tahmini_tutar && `${Number(f.tahmini_tutar).toLocaleString("tr-TR")} ${f.para_birimi}`,
                          `${formatShort(f.asama_tarihi)}'den beri`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Rozet tur={ACIK_ASAMALAR.includes(f.asama) ? "vurgu" : f.asama === "siparis" ? "basari" : "notr"}>
                        {ASAMA_ETIKET[f.asama]}
                      </Rozet>
                      <FirsatDugmesi companyId={firma.id} firsat={f} />
                    </div>
                  </li>
                ))}
              </ul>
            </Kart>
          ) : (
            <Bos>Fırsat yok.</Bos>
          )}
        </Bolum>

        <Bolum baslik="Notlar" sayi={d.notlar.length}>
          {d.notlar.length ? (
            <Kart>
              <NotListesi companyId={firma.id} notlar={d.notlar} saatDilimi={tz} />
            </Kart>
          ) : (
            <Bos>Not yok. Yukarıdan hızlı not ekleyebilirsin.</Bos>
          )}
        </Bolum>

        <Bolum baslik="Kişiler" sayi={d.kisiler.length}>
          <Kart>
            <KisiListesi companyId={firma.id} kisiler={d.kisiler} />
          </Kart>
        </Bolum>

        {firma.notlar && (
          <Bolum baslik="Firma notları">
            <Kart className="px-3 py-2.5 text-sm whitespace-pre-wrap">{firma.notlar}</Kart>
          </Bolum>
        )}

        {biten.length > 0 && (
          <Bolum baslik="Son biten işler" sayi={biten.length}>
            <Kart>
              <ul className="divide-y divide-line">{biten.map(satir)}</ul>
            </Kart>
          </Bolum>
        )}
      </div>
    </>
  );
}
