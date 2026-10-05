"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { firsatAsamasi, firsatKaydet, firsatSil, type FirsatFormVerisi } from "@/app/actions/firsat";
import { baglamGetir } from "@/app/actions/girdi";
import type { DealRow } from "@/lib/database.types";
import { formatShort, relativeDay, type DateStr } from "@/lib/dates";
import { ASAMA_ETIKET, ASAMALAR, type Asama, type Ayarlar } from "@/lib/domain";
import type { KartFirmasi } from "@/lib/inbox";
import type { FirsatSatiri } from "@/lib/server/queries";
import { useBildirim } from "./bildirim";
import { IkonArti, IkonCop, IkonKalem } from "./icons";
import { Pencere } from "./pencere";
import { Buton, cx, Etiket, Girdi, Hata, Rozet, Secici } from "./ui";

// ---------------------------------------------------------------------------
// Aşama panosu

export function FirsatPanosu({
  firsatlar,
  bugun,
  ayarlar,
  kapalilariGoster,
}: {
  firsatlar: FirsatSatiri[];
  bugun: DateStr;
  ayarlar: Ayarlar;
  kapalilariGoster: boolean;
}) {
  const sutunlar: Asama[] = kapalilariGoster ? [...ASAMALAR] : ["talep", "numune", "teklif", "muzakere", "siparis"];
  const asamadakiler = (a: Asama) => firsatlar.filter((f) => f.asama === a);
  const tonaj = (liste: FirsatSatiri[]) => liste.reduce((t, f) => t + (Number(f.tahmini_miktar_ton) || 0), 0);
  const ozet = (liste: FirsatSatiri[]) => {
    const t = tonaj(liste);
    return `${liste.length}${t > 0 ? ` · ${t.toLocaleString("tr-TR")} t` : ""}`;
  };

  return (
    <>
      {/* Telefon: aşamalar alt alta, boş aşamalar tek satırda */}
      <div className="space-y-5 md:hidden">
        <div className="flex flex-wrap gap-1.5">
          {sutunlar.map((a) => (
            <Rozet key={a} tur={asamadakiler(a).length ? "vurgu" : "notr"}>
              {ASAMA_ETIKET[a]} {asamadakiler(a).length}
            </Rozet>
          ))}
        </div>
        {sutunlar
          .filter((a) => asamadakiler(a).length > 0)
          .map((a) => (
            <section key={a} className="space-y-2">
              <h2 className="flex items-center justify-between px-1 text-sm font-semibold text-muted">
                {ASAMA_ETIKET[a]}
                <span className="font-normal">{ozet(asamadakiler(a))}</span>
              </h2>
              <ul className="space-y-2">
                {asamadakiler(a).map((f) => (
                  <FirsatKarti key={f.id} firsat={f} bugun={bugun} ayarlar={ayarlar} />
                ))}
              </ul>
            </section>
          ))}
      </div>

      {/* Masaüstü: aşama panosu */}
      <div className="-mx-8 hidden overflow-x-auto px-8 pb-2 md:block">
        <div className="flex gap-3">
          {sutunlar.map((a) => {
            const liste = asamadakiler(a);
            return (
              <section key={a} className="w-60 shrink-0 rounded-xl bg-soft p-2 xl:w-auto xl:min-w-0 xl:flex-1">
                <h2 className="flex items-center justify-between px-1.5 pb-2 text-sm font-semibold">
                  {ASAMA_ETIKET[a]}
                  <span className="text-xs font-normal text-muted">{ozet(liste)}</span>
                </h2>
                <ul className="space-y-2">
                  {liste.map((f) => (
                    <FirsatKarti key={f.id} firsat={f} bugun={bugun} ayarlar={ayarlar} />
                  ))}
                  {liste.length === 0 && <li className="px-1.5 py-3 text-center text-xs text-muted">—</li>}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}

const SONRAKI: Partial<Record<Asama, Asama>> = {
  talep: "numune",
  numune: "teklif",
  teklif: "muzakere",
  muzakere: "siparis",
};

function FirsatKarti({ firsat: f, bugun, ayarlar }: { firsat: FirsatSatiri; bugun: DateStr; ayarlar: Ayarlar }) {
  const [bekliyor, baslat] = useTransition();
  const bildir = useBildirim();
  const sonraki = SONRAKI[f.asama];
  const gorev = f.acik_gorev[0];

  function asama(yeni: Asama) {
    baslat(async () => {
      const r = await firsatAsamasi(f.id, yeni);
      if (!r.ok) return bildir(r.hata, { tur: "hata" });
      const sablon = ayarlar.kurallar.asama_gorevleri[yeni];
      bildir(`${ASAMA_ETIKET[yeni]}${sablon ? ` · görev açıldı: ${sablon.baslik}` : ""}`);
    });
  }

  return (
    <li className={cx("rounded-lg border border-line bg-card p-2.5 shadow-sm", bekliyor && "opacity-60")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{f.urun}</p>
          {f.companies && (
            <Link href={`/firmalar/${f.companies.id}`} className="block truncate text-xs text-muted hover:underline">
              {f.companies.ad}
            </Link>
          )}
        </div>
        <FirsatDugmesi companyId={f.company_id} firsat={f} kucuk />
      </div>
      {(f.tahmini_miktar_ton || f.tahmini_tutar) && (
        <p className="mt-1 text-xs text-muted">
          {[
            f.tahmini_miktar_ton && `${f.tahmini_miktar_ton} t`,
            f.tahmini_tutar && `${Number(f.tahmini_tutar).toLocaleString("tr-TR")} ${f.para_birimi}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      {gorev && (
        <p className="mt-1.5 text-xs">
          <Rozet tur={gorev.vade && gorev.vade < bugun ? "tehlike" : "notr"}>
            {gorev.vade ? relativeDay(gorev.vade, bugun) : "tarihsiz"}
          </Rozet>{" "}
          <span className="text-muted">{gorev.baslik}</span>
        </p>
      )}
      <div className="mt-2 flex items-center gap-1.5">
        <Secici
          value={f.asama}
          disabled={bekliyor}
          onChange={(e) => asama(e.target.value as Asama)}
          className="h-8 flex-1 text-xs"
          aria-label="Aşama"
        >
          {ASAMALAR.map((a) => (
            <option key={a} value={a}>
              {ASAMA_ETIKET[a]}
            </option>
          ))}
        </Secici>
        {sonraki && (
          <Buton kucuk tur="ikincil" disabled={bekliyor} onClick={() => asama(sonraki)} title={`${ASAMA_ETIKET[sonraki]} aşamasına geçir`}>
            {ASAMA_ETIKET[sonraki]} →
          </Buton>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-muted">{formatShort(f.asama_tarihi)} tarihinden beri</p>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Fırsat formu

export function FirsatDugmesi({
  companyId,
  firsat,
  kucuk,
}: {
  companyId?: string;
  firsat?: DealRow;
  kucuk?: boolean;
}) {
  const [acik, setAcik] = useState(false);
  return (
    <>
      {firsat ? (
        <button
          type="button"
          onClick={() => setAcik(true)}
          aria-label="Fırsatı düzenle"
          className={cx("rounded-md text-muted hover:bg-soft hover:text-ink", kucuk ? "p-1" : "p-1.5")}
        >
          <IkonKalem className="size-4" />
        </button>
      ) : (
        <Buton kucuk onClick={() => setAcik(true)}>
          <IkonArti className="size-4" /> Fırsat
        </Buton>
      )}
      <Pencere acik={acik} kapat={() => setAcik(false)} baslik={firsat ? "Fırsatı düzenle" : "Yeni fırsat"}>
        {acik && <FirsatFormu companyId={companyId} firsat={firsat} kapat={() => setAcik(false)} />}
      </Pencere>
    </>
  );
}

function FirsatFormu({ companyId, firsat, kapat }: { companyId?: string; firsat?: DealRow; kapat: () => void }) {
  const [f, setF] = useState<FirsatFormVerisi>({
    company_id: firsat?.company_id ?? companyId ?? "",
    urun: firsat?.urun ?? "",
    asama: firsat?.asama ?? "talep",
    tahmini_miktar_ton: firsat?.tahmini_miktar_ton ?? null,
    tahmini_tutar: firsat?.tahmini_tutar ?? null,
    para_birimi: firsat?.para_birimi ?? "USD",
  });
  const [firmalar, setFirmalar] = useState<KartFirmasi[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, baslat] = useTransition();
  const bildir = useBildirim();
  const guncelle = (p: Partial<FirsatFormVerisi>) => setF((x) => ({ ...x, ...p }));
  const sayi = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

  useEffect(() => {
    if (companyId) return;
    let iptal = false;
    void baglamGetir().then((r) => !iptal && r.ok && setFirmalar(r.veri.firmalar));
    return () => {
      iptal = true;
    };
  }, [companyId]);

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        baslat(async () => {
          const r = await firsatKaydet(firsat?.id ?? null, f);
          if (!r.ok) return setHata(r.hata);
          bildir("Kaydedildi");
          kapat();
        });
      }}
    >
      {!companyId && (
        <Etiket ad="Firma">
          <Secici value={f.company_id} onChange={(e) => guncelle({ company_id: e.target.value })} required disabled={!firmalar}>
            <option value="">{firmalar ? "Firma seçin" : "Yükleniyor…"}</option>
            {firmalar?.map((x) => (
              <option key={x.id} value={x.id}>
                {x.ad}
              </option>
            ))}
          </Secici>
        </Etiket>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Etiket ad="Ürün">
          <Girdi value={f.urun} onChange={(e) => guncelle({ urun: e.target.value })} required autoFocus placeholder="Lucon, Vistamaxx…" />
        </Etiket>
        <Etiket ad="Aşama">
          <Secici value={f.asama} onChange={(e) => guncelle({ asama: e.target.value as Asama })}>
            {ASAMALAR.map((a) => (
              <option key={a} value={a}>
                {ASAMA_ETIKET[a]}
              </option>
            ))}
          </Secici>
        </Etiket>
        <Etiket ad="Tahmini miktar (ton)">
          <Girdi
            inputMode="decimal"
            value={f.tahmini_miktar_ton ?? ""}
            onChange={(e) => guncelle({ tahmini_miktar_ton: sayi(e.target.value) })}
          />
        </Etiket>
        <div className="grid grid-cols-[1fr_6rem] gap-2">
          <Etiket ad="Tahmini tutar">
            <Girdi inputMode="decimal" value={f.tahmini_tutar ?? ""} onChange={(e) => guncelle({ tahmini_tutar: sayi(e.target.value) })} />
          </Etiket>
          <Etiket ad="Para birimi">
            <Secici value={f.para_birimi} onChange={(e) => guncelle({ para_birimi: e.target.value })}>
              {["USD", "EUR", "TRY", "GBP"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Secici>
          </Etiket>
        </div>
      </div>
      {firsat && firsat.asama !== f.asama && (
        <p className="text-xs text-muted">Aşama değişince önceki aşamanın otomatik görevi kapanır, yenisi açılır.</p>
      )}
      <Hata>{hata}</Hata>
      <div className="flex items-center gap-2 pt-1">
        {firsat && (
          <Buton
            tur="tehlike"
            kucuk
            disabled={bekliyor}
            aria-label="Fırsatı sil"
            onClick={() => {
              if (!confirm("Fırsat silinsin mi? Bağlı görevler fırsatsız kalır.")) return;
              baslat(async () => {
                const r = await firsatSil(firsat.id);
                if (!r.ok) return setHata(r.hata);
                bildir("Silindi");
                kapat();
              });
            }}
          >
            <IkonCop className="size-4" />
          </Buton>
        )}
        <div className="flex-1" />
        <Buton onClick={kapat} disabled={bekliyor}>
          Vazgeç
        </Buton>
        <Buton type="submit" tur="birincil" disabled={bekliyor}>
          Kaydet
        </Buton>
      </div>
    </form>
  );
}
