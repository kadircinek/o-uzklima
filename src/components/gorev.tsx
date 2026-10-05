"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { baglamGetir } from "@/app/actions/girdi";
import {
  gorevBitir,
  gorevGeriAl,
  gorevKaydetAksiyon,
  gorevSil,
  goreviErtele,
  type GorevFormVerisi,
} from "@/app/actions/gorev";
import { formatShort, localParts, relativeDay, type DateStr } from "@/lib/dates";
import { ASAMA_ETIKET, GOREV_TURLERI, GOREV_TURU_ETIKET, type GorevTuru } from "@/lib/domain";
import type { KartFirmasi } from "@/lib/inbox";
import { ERTELEME_ETIKET, ERTELEME_SECENEKLERI, kuralEtiketi, tekrarEtiketi } from "@/lib/rules";
import type { GorevListeSatiri } from "@/lib/server/queries";
import { useBildirim } from "./bildirim";
import { IkonCop, IkonSaat, IkonTekrar, IkonTik } from "./icons";
import { Pencere } from "./pencere";
import { TekrarSecici } from "./tekrar-secici";
import { Buton, cx, Etiket, Girdi, Hata, Rozet, Secici } from "./ui";

export function GorevSatiri({
  gorev,
  bugun,
  saatDilimi,
  firmaGoster = true,
  turGoster = false,
}: {
  gorev: GorevListeSatiri;
  bugun: DateStr;
  saatDilimi: string;
  firmaGoster?: boolean;
  turGoster?: boolean;
}) {
  const [gizli, setGizli] = useState(false);
  const [duzenle, setDuzenle] = useState(false);
  const [bekliyor, baslat] = useTransition();
  const bildir = useBildirim();
  const bitti = gorev.durum === "bitti";

  function bitir() {
    setGizli(true);
    baslat(async () => {
      const r = await gorevBitir(gorev.id);
      if (!r.ok) {
        setGizli(false);
        return bildir(r.hata, { tur: "hata" });
      }
      bildir(gorev.tekrar_kurali ? "Bitti · bir sonraki oluşturuldu" : "Bitti", {
        geriAl: gorev.tekrar_kurali
          ? undefined
          : () => {
              setGizli(false);
              void gorevGeriAl(gorev.id);
            },
      });
    });
  }

  function geriAc() {
    baslat(async () => {
      const r = await gorevGeriAl(gorev.id);
      if (!r.ok) bildir(r.hata, { tur: "hata" });
    });
  }

  if (gizli) return null;

  const gecikti = !bitti && gorev.vade !== null && gorev.vade < bugun;
  const hatirlatma = gorev.hatirlatma_zamani ? localParts(new Date(gorev.hatirlatma_zamani), saatDilimi) : null;

  return (
    <li id={`gorev-${gorev.id}`} className="flex items-start gap-3 px-3 py-2.5">
      <button
        type="button"
        onClick={bitti ? geriAc : bitir}
        disabled={bekliyor}
        aria-label={bitti ? "Yeniden aç" : "Bitti"}
        className={cx(
          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 transition",
          bitti ? "border-ok bg-ok text-white" : gecikti ? "border-danger hover:bg-danger-soft" : "border-line hover:border-accent hover:bg-accent-soft",
        )}
      >
        {bitti && <IkonTik className="size-3" />}
      </button>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setDuzenle(true)}
          className={cx("block w-full text-left text-[15px] leading-snug", bitti && "text-muted line-through")}
        >
          {gorev.baslik}
        </button>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          {turGoster && <Rozet>{GOREV_TURU_ETIKET[gorev.tur]}</Rozet>}
          {gorev.vade && !bitti && (
            <Rozet tur={gecikti ? "tehlike" : gorev.vade === bugun ? "uyari" : "notr"}>{relativeDay(gorev.vade, bugun)}</Rozet>
          )}
          {gorev.durum === "ertelendi" && <Rozet>Ertelendi</Rozet>}
          {firmaGoster && gorev.companies && (
            <Link href={`/firmalar/${gorev.companies.id}`} className="font-medium text-ink/80 hover:underline">
              {gorev.companies.ad}
            </Link>
          )}
          {gorev.deals && (
            <span>
              {gorev.deals.urun} · {ASAMA_ETIKET[gorev.deals.asama]}
            </span>
          )}
          {gorev.tekrar_kurali && (
            <span className="inline-flex items-center gap-0.5">
              <IkonTekrar className="size-3.5" />
              {tekrarEtiketi(gorev.tekrar_kurali)}
            </span>
          )}
          {hatirlatma && !bitti && (
            <span className="inline-flex items-center gap-0.5">
              <IkonSaat className="size-3.5" />
              {formatShort(hatirlatma.date)} {hatirlatma.time}
            </span>
          )}
        </div>
      </div>

      {!bitti && <ErteleMenusu gorevId={gorev.id} bugun={bugun} />}

      <GorevDuzenle acik={duzenle} kapat={() => setDuzenle(false)} gorev={gorev} saatDilimi={saatDilimi} />
    </li>
  );
}

export function ErteleMenusu({ gorevId, bugun }: { gorevId: string; bugun: DateStr }) {
  const [acik, setAcik] = useState(false);
  const [bekliyor, baslat] = useTransition();
  const bildir = useBildirim();
  const kutu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!acik) return;
    const disari = (e: MouseEvent) => {
      if (kutu.current && !kutu.current.contains(e.target as Node)) setAcik(false);
    };
    document.addEventListener("mousedown", disari);
    return () => document.removeEventListener("mousedown", disari);
  }, [acik]);

  function ertele(secim: string) {
    setAcik(false);
    baslat(async () => {
      const r = await goreviErtele(gorevId, secim);
      if (r.ok) bildir(`${formatShort(r.veri)} tarihine ertelendi`);
      else bildir(r.hata, { tur: "hata" });
    });
  }

  return (
    <div ref={kutu} className="relative shrink-0">
      <Buton kucuk tur="hayalet" onClick={() => setAcik((a) => !a)} disabled={bekliyor} aria-expanded={acik}>
        Ertele
      </Buton>
      {acik && (
        <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-line bg-card p-1 shadow-lg">
          {ERTELEME_SECENEKLERI.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => ertele(s)}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-soft"
            >
              {ERTELEME_ETIKET[s]}
            </button>
          ))}
          <label className="block px-3 py-2 text-sm text-muted">
            Tarih seç
            <Girdi
              type="date"
              min={bugun}
              className="mt-1 h-9"
              onChange={(e) => e.target.value && ertele(e.target.value)}
            />
          </label>
        </div>
      )}
    </div>
  );
}

function yerelHatirlatma(iso: string | null, tz: string): string | null {
  if (!iso) return null;
  const p = localParts(new Date(iso), tz);
  return `${p.date}T${p.time}`;
}

/** Görev ekleme/düzenleme penceresi. gorev null ise yeni görev. */
export function GorevDuzenle({
  acik,
  kapat,
  gorev,
  varsayilan,
  saatDilimi,
}: {
  acik: boolean;
  kapat: () => void;
  gorev: GorevListeSatiri | null;
  varsayilan?: { tur?: GorevTuru; company_id?: string | null };
  saatDilimi: string;
}) {
  return (
    <Pencere acik={acik} kapat={kapat} baslik={gorev ? "Görevi düzenle" : "Yeni görev"}>
      {acik && <GorevFormu gorev={gorev} varsayilan={varsayilan} kapat={kapat} saatDilimi={saatDilimi} />}
    </Pencere>
  );
}

function GorevFormu({
  gorev,
  varsayilan,
  kapat,
  saatDilimi,
}: {
  gorev: GorevListeSatiri | null;
  varsayilan?: { tur?: GorevTuru; company_id?: string | null };
  kapat: () => void;
  saatDilimi: string;
}) {
  const [f, setF] = useState<GorevFormVerisi>(() => ({
    baslik: gorev?.baslik ?? "",
    tur: gorev?.tur ?? varsayilan?.tur ?? "yapacagim",
    vade: gorev?.vade ?? null,
    hatirlatma: yerelHatirlatma(gorev?.hatirlatma_zamani ?? null, saatDilimi),
    tekrar_kurali: gorev?.tekrar_kurali ?? null,
    company_id: gorev?.company_id ?? varsayilan?.company_id ?? null,
  }));
  const [firmalar, setFirmalar] = useState<KartFirmasi[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, baslat] = useTransition();
  const bildir = useBildirim();

  useEffect(() => {
    let iptal = false;
    void baglamGetir().then((r) => {
      if (!iptal && r.ok) setFirmalar(r.veri.firmalar);
    });
    return () => {
      iptal = true;
    };
  }, []);

  const guncelle = (p: Partial<GorevFormVerisi>) => setF((x) => ({ ...x, ...p }));

  function kaydet() {
    setHata(null);
    baslat(async () => {
      // Vade değiştiyse eski hatırlatma yerine kurala göre yenisi hesaplanır.
      const vadeDegisti = gorev && gorev.vade !== f.vade;
      const hatirlatmaDegisti = yerelHatirlatma(gorev?.hatirlatma_zamani ?? null, saatDilimi) !== f.hatirlatma;
      const r = await gorevKaydetAksiyon(gorev?.id ?? null, {
        ...f,
        hatirlatma: vadeDegisti && !hatirlatmaDegisti ? null : f.hatirlatma,
      });
      if (!r.ok) return setHata(r.hata);
      bildir("Kaydedildi");
      kapat();
    });
  }

  function sil() {
    if (!gorev || !confirm("Görev silinsin mi?")) return;
    baslat(async () => {
      const r = await gorevSil(gorev.id);
      if (!r.ok) return setHata(r.hata);
      bildir("Silindi");
      kapat();
    });
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        kaydet();
      }}
    >
      <Etiket ad="Başlık">
        <Girdi value={f.baslik} onChange={(e) => guncelle({ baslik: e.target.value })} required autoFocus={!gorev} />
      </Etiket>
      <div className="grid gap-3 sm:grid-cols-2">
        <Etiket ad="Tür">
          <Secici value={f.tur} onChange={(e) => guncelle({ tur: e.target.value as GorevTuru })}>
            {GOREV_TURLERI.map((t) => (
              <option key={t} value={t}>
                {GOREV_TURU_ETIKET[t]}
              </option>
            ))}
          </Secici>
        </Etiket>
        <Etiket ad="Firma">
          <Secici
            value={f.company_id ?? ""}
            onChange={(e) => guncelle({ company_id: e.target.value || null })}
            disabled={!firmalar}
          >
            <option value="">—</option>
            {!firmalar && gorev?.companies && <option value={gorev.companies.id}>{gorev.companies.ad}</option>}
            {firmalar?.map((x) => (
              <option key={x.id} value={x.id}>
                {x.ad}
              </option>
            ))}
          </Secici>
        </Etiket>
        <Etiket ad="Vade">
          <Girdi type="date" value={f.vade ?? ""} onChange={(e) => guncelle({ vade: e.target.value || null })} />
        </Etiket>
        <Etiket ad="Hatırlatma">
          <Girdi
            type="datetime-local"
            value={f.hatirlatma ?? ""}
            onChange={(e) => guncelle({ hatirlatma: e.target.value || null })}
          />
        </Etiket>
        <Etiket ad="Tekrar" className="sm:col-span-2">
          <TekrarSecici deger={f.tekrar_kurali} degistir={(tekrar_kurali) => guncelle({ tekrar_kurali })} />
        </Etiket>
      </div>
      {gorev?.kural && (
        <p className="text-xs text-muted">
          {kuralEtiketi(gorev.kural)}
          {gorev.deals && ` · Fırsat: ${gorev.deals.urun} (${ASAMA_ETIKET[gorev.deals.asama]})`}
        </p>
      )}
      <Hata>{hata}</Hata>
      <div className="flex items-center gap-2 pt-1">
        {gorev && (
          <Buton tur="tehlike" kucuk onClick={sil} disabled={bekliyor} aria-label="Sil">
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
