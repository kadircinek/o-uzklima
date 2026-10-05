import Link from "next/link";
import { GorevAc, YeniGorevDugmesi } from "@/components/gorev-sayfasi";
import { GorevSatiri } from "@/components/gorev";
import { Bos, cx, Girdi, Kart, SayfaBasligi } from "@/components/ui";
import { GOREV_TURLERI, GOREV_TURU_ETIKET, type GorevTuru } from "@/lib/domain";
import { oncelikSirala } from "@/lib/engine";
import { ayarlariGetir, bugun } from "@/lib/server/ops";
import { acikGorevler, bitenGorevler } from "@/lib/server/queries";
import { requireUser } from "@/lib/supabase/server";

export const metadata = { title: "Görevler" };

type Durum = "acik" | "ertelendi" | "bitti";
const DURUMLAR: { d: Durum; ad: string }[] = [
  { d: "acik", ad: "Açık" },
  { d: "ertelendi", ad: "Ertelenen" },
  { d: "bitti", ad: "Biten" },
];

export default async function GorevlerSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ tur?: string; durum?: string; ara?: string; gorev?: string }>;
}) {
  const p = await searchParams;
  const tur: GorevTuru = GOREV_TURLERI.includes(p.tur as GorevTuru) ? (p.tur as GorevTuru) : "yapacagim";
  const durum: Durum = DURUMLAR.some((x) => x.d === p.durum) ? (p.durum as Durum) : "acik";
  const ara = (p.ara ?? "").trim().toLocaleLowerCase("tr");

  const { supabase, userId } = await requireUser();
  const ayarlar = await ayarlariGetir(supabase, userId);
  const gun = bugun(ayarlar);
  const [acik, biten] = await Promise.all([acikGorevler(supabase), durum === "bitti" ? bitenGorevler(supabase) : []]);

  const sayilar = Object.fromEntries(GOREV_TURLERI.map((t) => [t, acik.filter((g) => g.tur === t).length])) as Record<
    GorevTuru,
    number
  >;
  let liste = (durum === "bitti" ? biten : acik).filter((g) => g.tur === tur);
  if (durum === "ertelendi") liste = liste.filter((g) => g.durum === "ertelendi");
  if (ara) {
    liste = liste.filter((g) =>
      [g.baslik, g.companies?.ad, g.deals?.urun].some((x) => x?.toLocaleLowerCase("tr").includes(ara)),
    );
  }
  if (durum !== "bitti") liste = oncelikSirala(liste);
  const acilacak = p.gorev ? [...acik, ...biten].find((g) => g.id === p.gorev) : undefined;

  const href = (q: Record<string, string>) => {
    const s = new URLSearchParams({ tur, durum, ...(ara ? { ara: p.ara! } : {}), ...q });
    if (s.get("durum") === "acik") s.delete("durum");
    return `/gorevler?${s}`;
  };

  return (
    <>
      <SayfaBasligi baslik="Görevler" aksiyon={<YeniGorevDugmesi tur={tur} saatDilimi={ayarlar.saat_dilimi} />} />

      <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-soft p-1" role="tablist">
        {GOREV_TURLERI.map((t) => (
          <Link
            key={t}
            href={href({ tur: t })}
            role="tab"
            aria-selected={t === tur}
            className={cx(
              "rounded-lg px-2 py-2 text-center text-sm font-medium",
              t === tur ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            {GOREV_TURU_ETIKET[t]} <span className="font-normal text-muted">{sayilar[t]}</span>
          </Link>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {DURUMLAR.map((x) => (
            <Link
              key={x.d}
              href={href({ durum: x.d })}
              className={cx(
                "rounded-full border px-3 py-1 text-sm",
                x.d === durum ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:bg-soft",
              )}
            >
              {x.ad}
            </Link>
          ))}
        </div>
        <form className="ml-auto w-full sm:w-56" action="/gorevler">
          <input type="hidden" name="tur" value={tur} />
          {durum !== "acik" && <input type="hidden" name="durum" value={durum} />}
          <Girdi name="ara" defaultValue={p.ara ?? ""} placeholder="Ara: başlık, firma, ürün" className="h-9 text-sm" />
        </form>
      </div>

      {liste.length > 0 ? (
        <Kart>
          <ul className="divide-y divide-line">
            {liste.map((g) => (
              <GorevSatiri key={g.id} gorev={g} bugun={gun} saatDilimi={ayarlar.saat_dilimi} />
            ))}
          </ul>
        </Kart>
      ) : (
        <Bos>{ara ? "Aramaya uyan görev yok." : "Bu listede görev yok."}</Bos>
      )}

      {acilacak && <GorevAc gorev={acilacak} saatDilimi={ayarlar.saat_dilimi} />}
    </>
  );
}
