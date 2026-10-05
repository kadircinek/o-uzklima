import Link from "next/link";
import { FirmaDugmesi, IceAktarDugmesi } from "@/components/firma";
import { Bos, cx, Girdi, Kart, Rozet, SayfaBasligi } from "@/components/ui";
import { diffDays, localParts } from "@/lib/dates";
import { FIRMA_TURLERI, FIRMA_TURU_ETIKET, type FirmaTuru } from "@/lib/domain";
import { sessizMusteriler } from "@/lib/engine";
import { ayarlariGetir, bugun } from "@/lib/server/ops";
import { firmaListesi } from "@/lib/server/queries";
import { requireUser } from "@/lib/supabase/server";

export const metadata = { title: "Firmalar" };

export default async function FirmalarSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ ara?: string; tur?: string; sessiz?: string; sira?: string }>;
}) {
  const p = await searchParams;
  const { supabase, userId } = await requireUser();
  const ayarlar = await ayarlariGetir(supabase, userId);
  const gun = bugun(ayarlar);
  const tumu = await firmaListesi(supabase);

  const tur = FIRMA_TURLERI.includes(p.tur as FirmaTuru) ? (p.tur as FirmaTuru) : null;
  const ara = (p.ara ?? "").trim().toLocaleLowerCase("tr");
  const sessizMi = p.sessiz === "1";
  const sira = p.sira === "temas" ? "temas" : "ad";

  const temasGunu = (son: string | null) => (son ? diffDays(localParts(new Date(son), ayarlar.saat_dilimi).date, gun) : null);
  let liste = tumu.map((f) => ({ ...f, gun: temasGunu(f.son_temas) }));
  if (tur) liste = liste.filter((f) => f.tur === tur);
  if (ara) liste = liste.filter((f) => [f.ad, f.ulke, f.segment].some((x) => x?.toLocaleLowerCase("tr").includes(ara)));
  const sessizler = new Set(sessizMusteriler(tumu, gun, ayarlar).map((f) => f.id));
  if (sessizMi) liste = liste.filter((f) => sessizler.has(f.id));
  if (sira === "temas") liste.sort((a, b) => (b.gun ?? Infinity) - (a.gun ?? Infinity));

  const href = (q: Record<string, string | null>) => {
    const s = new URLSearchParams();
    const tum = { ara: p.ara ?? null, tur, sessiz: sessizMi ? "1" : null, sira: sira === "ad" ? null : sira, ...q };
    for (const [k, v] of Object.entries(tum)) if (v) s.set(k, v);
    const q2 = s.toString();
    return q2 ? `/firmalar?${q2}` : "/firmalar";
  };
  const filtre = (aktif: boolean) =>
    cx("rounded-full border px-3 py-1 text-sm", aktif ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:bg-soft");

  return (
    <>
      <SayfaBasligi
        baslik="Firmalar"
        alt={`${tumu.length} firma`}
        aksiyon={
          <div className="flex gap-2">
            <IceAktarDugmesi />
            <FirmaDugmesi />
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href={href({ tur: null })} className={filtre(!tur)}>
          Tümü
        </Link>
        {FIRMA_TURLERI.map((t) => (
          <Link key={t} href={href({ tur: t })} className={filtre(tur === t)}>
            {FIRMA_TURU_ETIKET[t]}
          </Link>
        ))}
        <Link href={href({ sessiz: sessizMi ? null : "1" })} className={filtre(sessizMi)}>
          Sessiz
        </Link>
        <Link href={href({ sira: sira === "ad" ? "temas" : null })} className="text-sm text-muted hover:text-ink">
          Sıra: {sira === "ad" ? "ada göre" : "en uzun temassız"}
        </Link>
        <form className="ml-auto w-full sm:w-56" action="/firmalar">
          {tur && <input type="hidden" name="tur" value={tur} />}
          {sessizMi && <input type="hidden" name="sessiz" value="1" />}
          <Girdi name="ara" defaultValue={p.ara ?? ""} placeholder="Ara: ad, ülke, segment" className="h-9 text-sm" />
        </form>
      </div>

      {tumu.length === 0 ? (
        <Bos>Henüz firma yok. Excel/CSV ile içe aktararak başlayabilirsin.</Bos>
      ) : liste.length === 0 ? (
        <Bos>Filtreye uyan firma yok.</Bos>
      ) : (
        <Kart>
          <ul className="divide-y divide-line">
            {liste.map((f) => {
              const sessiz = sessizler.has(f.id);
              return (
                <li key={f.id}>
                  <Link href={`/firmalar/${f.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-soft">
                    <div className="min-w-0 flex-1">
                      <p className={cx("truncate text-[15px]", !f.aktif && "text-muted")}>{f.ad}</p>
                      <p className="truncate text-xs text-muted">
                        {[FIRMA_TURU_ETIKET[f.tur], f.ulke, f.segment, !f.aktif && "pasif"].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {f.acik_gorev > 0 && <Rozet>{f.acik_gorev} iş</Rozet>}
                      {f.acik_firsat > 0 && <Rozet tur="vurgu">{f.acik_firsat} fırsat</Rozet>}
                      <Rozet tur={sessiz ? "uyari" : "notr"}>{f.gun === null ? "temas yok" : f.gun === 0 ? "bugün" : `${f.gun} gün`}</Rozet>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Kart>
      )}
    </>
  );
}
