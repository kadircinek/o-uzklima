"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { girdiOnayla, sesAdresi, type KartVerisi } from "@/app/actions/girdi";
import { formatDateTime, formatShort, type DateStr } from "@/lib/dates";
import { GIRDI_TURU_ETIKET, OLAY_ETIKET, type Ayarlar } from "@/lib/domain";
import { onayEksigi, type KartBaglami } from "@/lib/inbox";
import { DUSUK_GUVEN } from "@/lib/parse/schema";
import { tekrarEtiketi } from "@/lib/rules";
import { useBildirim } from "./bildirim";
import { OnayKarti } from "./onay-karti";
import { Pencere } from "./pencere";
import { Buton, Kart, Rozet } from "./ui";

export function GelenKutusu({
  kartlar,
  baglam,
  ayarlar,
  bugun,
}: {
  kartlar: KartVerisi[];
  baglam: KartBaglami;
  ayarlar: Ayarlar;
  bugun: DateStr;
}) {
  const [acik, setAcik] = useState<KartVerisi | null>(null);
  const [gizli, setGizli] = useState<Set<string>>(new Set());
  const router = useRouter();

  const gizle = (id: string) => setGizli((s) => new Set(s).add(id));

  return (
    <>
      <ul className="space-y-3">
        {kartlar
          .filter((k) => !gizli.has(k.id))
          .map((k) => (
            <GirdiOgesi
              key={k.id}
              kart={k}
              baglam={baglam}
              saatDilimi={ayarlar.saat_dilimi}
              ac={() => setAcik(k)}
              islendi={() => gizle(k.id)}
            />
          ))}
      </ul>
      <Pencere acik={acik !== null} kapat={() => setAcik(null)} baslik="Kaydı onayla">
        {acik && (
          <OnayKarti
            key={acik.id}
            kart={acik}
            baglam={baglam}
            ayarlar={ayarlar}
            bugun={bugun}
            bitti={(s) => {
              if (s !== "sonra") gizle(acik.id);
              setAcik(null);
              router.refresh();
            }}
          />
        )}
      </Pencere>
    </>
  );
}

function GirdiOgesi({
  kart,
  baglam,
  saatDilimi,
  ac,
  islendi,
}: {
  kart: KartVerisi;
  baglam: KartBaglami;
  saatDilimi: string;
  ac: () => void;
  islendi: () => void;
}) {
  const [bekliyor, baslat] = useTransition();
  const bildir = useBildirim();
  const a = kart.ayristirma;
  const o = kart.onay;
  const firma =
    o.firma.mod === "mevcut"
      ? baglam.firmalar.find((f) => f.id === (o.firma as { id: string }).id)?.ad
      : o.firma.mod === "yeni"
        ? `${o.firma.ad} (yeni)`
        : null;
  // Tek dokunuşla onay yalnızca güvenilir ve eksiksiz kartlarda.
  const hizliOnay = !kart.hata && a.guven >= DUSUK_GUVEN && !onayEksigi(o);

  function onayla() {
    baslat(async () => {
      const r = await girdiOnayla(kart.id, o);
      if (!r.ok) return bildir(r.hata, { tur: "hata" });
      islendi();
      bildir("Kaydedildi");
    });
  }

  async function dinle() {
    if (!kart.ses_dosyasi) return;
    const r = await sesAdresi(kart.ses_dosyasi);
    if (r.ok) window.open(r.veri, "_blank", "noopener");
    else bildir(r.hata, { tur: "hata" });
  }

  return (
    <li>
      <Kart className="p-3">
        <div className="flex items-start justify-between gap-3">
          <button type="button" onClick={ac} className="min-w-0 flex-1 text-left">
            <p className="text-[15px] font-medium leading-snug">{kart.hata ? kart.ham_metin.slice(0, 160) : a.baslik}</p>
            {!kart.hata && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{kart.ham_metin}</p>}
          </button>
          <span className="shrink-0 text-xs text-muted">{formatDateTime(new Date(kart.created_at), saatDilimi)}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {kart.hata ? (
            <Rozet tur="uyari">Elle doldurulmalı</Rozet>
          ) : (
            <>
              <Rozet tur="vurgu">{GIRDI_TURU_ETIKET[a.tur]}</Rozet>
              {a.olay !== "yok" && a.tur !== "vade" && <Rozet>{OLAY_ETIKET[a.olay]}</Rozet>}
              {firma && <Rozet>{firma}</Rozet>}
              {a.urun && <Rozet>{a.urun}</Rozet>}
              {a.tarih && <Rozet>{formatShort(a.tarih)}</Rozet>}
              {a.tekrar && <Rozet>{tekrarEtiketi(a.tekrar)}</Rozet>}
              {a.aksiyonlar.length > 0 && <Rozet>{a.aksiyonlar.length} aksiyon</Rozet>}
              {a.guven < DUSUK_GUVEN && <Rozet tur="uyari">Kontrol et</Rozet>}
            </>
          )}
          {kart.ses_dosyasi && (
            <button type="button" onClick={dinle} className="text-xs text-accent hover:underline">
              ▶ Ses kaydı
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <Buton kucuk onClick={ac} disabled={bekliyor}>
              {hizliOnay ? "Düzelt" : "Aç"}
            </Buton>
            {hizliOnay && (
              <Buton kucuk tur="birincil" onClick={onayla} disabled={bekliyor}>
                Onayla
              </Buton>
            )}
          </div>
        </div>
      </Kart>
    </li>
  );
}
