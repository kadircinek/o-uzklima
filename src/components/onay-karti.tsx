"use client";

import { useMemo, useState, useTransition } from "react";
import { girdiOnayla, girdiSil, girdiYenidenAyristir, type KartVerisi } from "@/app/actions/girdi";
import { formatDateTime, formatShort, type DateStr } from "@/lib/dates";
import {
  ASAMA_ETIKET,
  FIRMA_TURLERI,
  FIRMA_TURU_ETIKET,
  GIRDI_TURLERI,
  GIRDI_TURU_ETIKET,
  GOREV_TURU_ETIKET,
  type Ayarlar,
  type FirmaTuru,
} from "@/lib/domain";
import { acikFirsatBul, olayiDuzelt, onayEksigi, onayPlani, type KartBaglami, type OnayVerisi } from "@/lib/inbox";
import { DUSUK_GUVEN, type Aksiyon } from "@/lib/parse/schema";
import { olayAsamasi, tekrarEtiketi } from "@/lib/rules";
import { useBildirim } from "./bildirim";
import { IkonCop } from "./icons";
import { TekrarSecici } from "./tekrar-secici";
import { Buton, cx, Etiket, Girdi, Hata, MetinAlani, Rozet, Secici } from "./ui";

export type KartSonucu = "onaylandi" | "sonra" | "silindi";

const ayniAd = (a: string, b: string) => a.trim().toLocaleLowerCase("tr") === b.trim().toLocaleLowerCase("tr");

export function OnayKarti({
  kart: ilkKart,
  baglam,
  ayarlar,
  bugun,
  bitti,
}: {
  kart: KartVerisi;
  baglam: KartBaglami;
  ayarlar: Ayarlar;
  bugun: DateStr;
  bitti: (s: KartSonucu) => void;
}) {
  const [kart, setKart] = useState(ilkKart);
  const [o, setO] = useState<OnayVerisi>(ilkKart.onay);
  const [secili, setSecili] = useState<boolean[]>(() => ilkKart.onay.aksiyonlar.map(() => true));
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, baslat] = useTransition();
  const bildir = useBildirim();

  const firmaAdi = (id: string) => baglam.firmalar.find((f) => f.id === id)?.ad ?? "";
  const [firmaMetni, setFirmaMetni] = useState(() =>
    o.firma.mod === "mevcut" ? firmaAdi(o.firma.id) : o.firma.mod === "yeni" ? o.firma.ad : "",
  );
  const kisiAdi = (id: string) => baglam.kisiler.find((k) => k.id === id)?.ad ?? "";
  const [kisiMetni, setKisiMetni] = useState(() =>
    o.kisi.mod === "mevcut" ? kisiAdi(o.kisi.id) : o.kisi.mod === "yeni" ? o.kisi.ad : "",
  );

  const guncelle = (p: Partial<OnayVerisi>) => setO((x) => ({ ...x, ...p }));
  const companyId = o.firma.mod === "mevcut" ? o.firma.id : null;
  const firmaKisileri = companyId ? baglam.kisiler.filter((k) => k.company_id === companyId) : [];
  const firmaFirsatlari = companyId ? baglam.firsatlar.filter((f) => f.company_id === companyId) : [];

  function firmaDegisti(metin: string, tur: FirmaTuru = o.firma.mod === "yeni" ? o.firma.tur : "musteri") {
    setFirmaMetni(metin);
    const bulunan = baglam.firmalar.find((f) => ayniAd(f.ad, metin));
    const firma: OnayVerisi["firma"] = !metin.trim()
      ? { mod: "yok" }
      : bulunan
        ? { mod: "mevcut", id: bulunan.id }
        : { mod: "yeni", ad: metin, tur };
    // Firma değişince kişi ve fırsat seçimini yeniden değerlendir.
    const kisi: OnayVerisi["kisi"] = kisiMetni.trim()
      ? (() => {
          const k = bulunan && baglam.kisiler.find((x) => x.company_id === bulunan.id && ayniAd(x.ad, kisiMetni));
          return k ? { mod: "mevcut", id: k.id } : { mod: "yeni", ad: kisiMetni };
        })()
      : { mod: "yok" };
    let firsat: OnayVerisi["firsat"] = { mod: "yok" };
    if (firma.mod !== "yok") {
      const eskiId = o.firsat.mod === "mevcut" ? o.firsat.id : null;
      if (eskiId && bulunan && baglam.firsatlar.some((f) => f.id === eskiId && f.company_id === bulunan.id)) firsat = o.firsat;
      else if (o.firsat.mod === "yeni") firsat = o.firsat;
      else if (bulunan) {
        const f = acikFirsatBul(baglam.firsatlar, bulunan.id, o.urun);
        if (f) firsat = { mod: "mevcut", id: f.id };
      }
    }
    guncelle({ firma, kisi: firma.mod === "yok" ? { mod: "yok" } : kisi, firsat });
  }

  function kisiDegisti(metin: string) {
    setKisiMetni(metin);
    if (!metin.trim()) return guncelle({ kisi: { mod: "yok" } });
    const k = firmaKisileri.find((x) => ayniAd(x.ad, metin));
    guncelle({ kisi: k ? { mod: "mevcut", id: k.id } : { mod: "yeni", ad: metin } });
  }

  const plan = useMemo(() => {
    try {
      return onayPlani(o, bugun, ayarlar);
    } catch {
      return null;
    }
  }, [o, bugun, ayarlar]);

  const gonderilecek: OnayVerisi = { ...o, aksiyonlar: o.aksiyonlar.filter((_, i) => secili[i]) };
  const eksik = onayEksigi(gonderilecek);
  const dusukGuven = !kart.hata && kart.ayristirma.guven < DUSUK_GUVEN;

  function onayla() {
    if (eksik) return setHata(eksik);
    setHata(null);
    baslat(async () => {
      const r = await girdiOnayla(kart.id, gonderilecek);
      if (!r.ok) return setHata(r.hata);
      const ek = r.veri.notId && r.veri.gorevSayisi ? ` + ${r.veri.gorevSayisi} görev` : "";
      bildir(o.tur === "not" ? `Not kaydedildi${ek}` : "Kaydedildi");
      bitti("onaylandi");
    });
  }

  function sil() {
    baslat(async () => {
      const r = await girdiSil(kart.id);
      if (!r.ok) return setHata(r.hata);
      bildir("Silindi");
      bitti("silindi");
    });
  }

  function yenidenAyristir(toplanti: boolean) {
    setHata(null);
    baslat(async () => {
      const r = await girdiYenidenAyristir(kart.id, toplanti);
      if (!r.ok) return setHata(r.hata);
      setKart(r.veri);
      setO(r.veri.onay);
      setSecili(r.veri.onay.aksiyonlar.map(() => true));
      setFirmaMetni(
        r.veri.onay.firma.mod === "mevcut" ? firmaAdi(r.veri.onay.firma.id) : r.veri.onay.firma.mod === "yeni" ? r.veri.onay.firma.ad : "",
      );
      setKisiMetni(
        r.veri.onay.kisi.mod === "mevcut" ? kisiAdi(r.veri.onay.kisi.id) : r.veri.onay.kisi.mod === "yeni" ? r.veri.onay.kisi.ad : "",
      );
    });
  }

  const olayAsama = olayAsamasi(o.olay);
  const firmaEtiketi = o.firma.mod === "yeni" ? "Firma (yeni)" : "Firma";

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onayla();
      }}
    >
      <blockquote className="line-clamp-3 rounded-lg bg-soft px-3 py-2 text-sm whitespace-pre-wrap text-muted" title={kart.ham_metin}>
        {kart.ham_metin}
      </blockquote>

      {kart.hata && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
          <span>{kart.hata}</span>
          <Buton kucuk tur="hayalet" onClick={() => yenidenAyristir(false)} disabled={bekliyor}>
            Yeniden dene
          </Buton>
        </div>
      )}
      {dusukGuven && (
        <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">Emin değilim — alanları kontrol edip onaylayın.</p>
      )}

      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tür">
        {GIRDI_TURLERI.map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={o.tur === t}
            onClick={() => guncelle(olayiDuzelt({ ...o, tur: t, olay: t === "takip" && o.tur !== "takip" ? "yok" : o.olay }))}
            className={cx(
              "rounded-full border px-3 py-1 text-sm",
              o.tur === t ? "border-accent bg-accent text-accent-ink" : "border-line text-muted hover:bg-soft",
            )}
          >
            {GIRDI_TURU_ETIKET[t]}
          </button>
        ))}
      </div>

      <Etiket ad="Başlık">
        <Girdi value={o.baslik} onChange={(e) => guncelle({ baslik: e.target.value })} required />
      </Etiket>

      {plan && (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-lg border border-accent/25 bg-accent-soft/50 px-3 py-2 text-sm">
          <Rozet tur="vurgu">{GOREV_TURU_ETIKET[plan.tur]}</Rozet>
          {plan.vade && <span>Vade {formatShort(plan.vade)}</span>}
          {plan.hatirlatma_zamani && (
            <span className="text-muted">· Hatırlatma {formatDateTime(plan.hatirlatma_zamani, ayarlar.saat_dilimi)}</span>
          )}
          {o.tekrar && <span className="text-muted">· {tekrarEtiketi(o.tekrar)}</span>}
          {!plan.vade && !plan.hatirlatma_zamani && <span className="text-muted">Tarihsiz — listede bekler</span>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Etiket ad={firmaEtiketi}>
          <Girdi list={`firmalar-${kart.id}`} value={firmaMetni} placeholder="—" onChange={(e) => firmaDegisti(e.target.value)} />
          <datalist id={`firmalar-${kart.id}`}>
            {baglam.firmalar.map((f) => (
              <option key={f.id} value={f.ad} />
            ))}
          </datalist>
        </Etiket>
        <Etiket ad={o.kisi.mod === "yeni" ? "Kişi (yeni)" : "Kişi"}>
          <Girdi
            list={`kisiler-${kart.id}`}
            value={kisiMetni}
            placeholder="—"
            disabled={o.firma.mod === "yok"}
            onChange={(e) => kisiDegisti(e.target.value)}
          />
          <datalist id={`kisiler-${kart.id}`}>
            {firmaKisileri.map((k) => (
              <option key={k.id} value={k.ad} />
            ))}
          </datalist>
        </Etiket>
        {o.firma.mod === "yeni" && (
          <Etiket ad="Yeni firmanın türü" className="col-span-2">
            <Secici value={o.firma.tur} onChange={(e) => firmaDegisti(firmaMetni, e.target.value as FirmaTuru)}>
              {FIRMA_TURLERI.map((t) => (
                <option key={t} value={t}>
                  {FIRMA_TURU_ETIKET[t]}
                </option>
              ))}
            </Secici>
          </Etiket>
        )}
        <Etiket ad="Ürün">
          <Girdi value={o.urun ?? ""} placeholder="—" onChange={(e) => guncelle({ urun: e.target.value || null })} />
        </Etiket>
        {o.tur === "takip" ? (
          <Etiket ad="Olay">
            <Secici value={o.olay} onChange={(e) => guncelle({ olay: e.target.value as OnayVerisi["olay"] })}>
              <option value="yok">Genel takip</option>
              <option value="teklif_gonderildi">Teklif gönderildi</option>
              <option value="numune_gonderildi">Numune gönderildi</option>
            </Secici>
          </Etiket>
        ) : (
          o.tur !== "not" && (
            <Etiket ad={o.tur === "vade" ? "Vade tarihi" : "Tarih"}>
              <Girdi type="date" value={o.tarih ?? ""} onChange={(e) => guncelle({ tarih: e.target.value || null })} />
            </Etiket>
          )
        )}
        {o.tur === "takip" && (
          <Etiket ad={olayAsama ? "Gönderim tarihi" : "Tarih"}>
            <Girdi type="date" value={o.tarih ?? ""} onChange={(e) => guncelle({ tarih: e.target.value || null })} />
          </Etiket>
        )}
        {o.firma.mod !== "yok" && (
          <Etiket ad="Fırsat" className={o.tur === "takip" ? "" : "col-span-2"}>
            <Secici
              value={o.firsat.mod === "mevcut" ? o.firsat.id : o.firsat.mod}
              onChange={(e) => {
                const v = e.target.value;
                guncelle({ firsat: v === "yok" ? { mod: "yok" } : v === "yeni" ? { mod: "yeni" } : { mod: "mevcut", id: v } });
              }}
            >
              <option value="yok">Bağlama</option>
              {firmaFirsatlari.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.urun} · {ASAMA_ETIKET[f.asama]}
                </option>
              ))}
              <option value="yeni" disabled={!o.urun?.trim()}>
                + Yeni{o.urun?.trim() ? `: ${o.urun.trim()}${olayAsama ? ` (${ASAMA_ETIKET[olayAsama]})` : ""}` : " (ürün girin)"}
              </option>
            </Secici>
          </Etiket>
        )}
      </div>

      {o.tur !== "not" && (
        <details className="group rounded-lg border border-line" open={Boolean(o.hatirlatma || o.tekrar)}>
          <summary className="cursor-pointer list-none px-3 py-2 text-sm text-muted select-none group-open:border-b group-open:border-line">
            Özel hatırlatma ve tekrar
          </summary>
          <div className="grid gap-3 p-3 sm:grid-cols-2">
            <Etiket ad="Özel hatırlatma">
              <Girdi
                type="datetime-local"
                value={o.hatirlatma ?? ""}
                onChange={(e) => guncelle({ hatirlatma: e.target.value || null })}
              />
            </Etiket>
            <Etiket ad="Tekrar">
              <TekrarSecici deger={o.tekrar} degistir={(tekrar) => guncelle({ tekrar })} />
            </Etiket>
          </div>
        </details>
      )}

      {o.tur === "not" && (
        <div className="space-y-3">
          <Etiket ad="Özet">
            <MetinAlani rows={3} value={o.ozet ?? ""} onChange={(e) => guncelle({ ozet: e.target.value || null })} />
          </Etiket>
          {o.aksiyonlar.length > 0 ? (
            <fieldset className="space-y-2">
              <legend className="mb-1 text-xs font-medium text-muted">Aksiyonlar (seçilenler görev olur)</legend>
              {o.aksiyonlar.map((a, i) => (
                <AksiyonSatiri
                  key={i}
                  aksiyon={a}
                  secili={secili[i]}
                  sec={(v) => setSecili((s) => s.map((x, j) => (j === i ? v : x)))}
                  degistir={(yeni) => guncelle({ aksiyonlar: o.aksiyonlar.map((x, j) => (j === i ? yeni : x)) })}
                />
              ))}
            </fieldset>
          ) : (
            <Buton kucuk tur="hayalet" onClick={() => yenidenAyristir(true)} disabled={bekliyor}>
              Toplantı notu olarak özetle ve aksiyonları çıkar
            </Buton>
          )}
        </div>
      )}

      <Hata>{hata}</Hata>

      {/* Düğmeler kaydırırken altta sabit kalır: tek dokunuşla onay */}
      <div className="pb-safe sticky -bottom-4 -mx-4 flex items-center gap-2 border-t border-line bg-card px-4 py-3">
        <Buton tur="tehlike" kucuk onClick={sil} disabled={bekliyor} aria-label="Sil">
          <IkonCop className="size-4" />
        </Buton>
        <div className="flex-1" />
        <Buton onClick={() => bitti("sonra")} disabled={bekliyor}>
          Sonra
        </Buton>
        <Buton type="submit" tur="birincil" disabled={bekliyor} autoFocus>
          {bekliyor ? "Kaydediliyor…" : "Onayla"}
        </Buton>
      </div>
    </form>
  );
}

function AksiyonSatiri({
  aksiyon,
  secili,
  sec,
  degistir,
}: {
  aksiyon: Aksiyon;
  secili: boolean;
  sec: (v: boolean) => void;
  degistir: (a: Aksiyon) => void;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1.5 rounded-lg border border-line p-2">
      <input
        type="checkbox"
        checked={secili}
        onChange={(e) => sec(e.target.checked)}
        className="size-4 accent-[var(--accent)]"
        aria-label="Görev olarak ekle"
      />
      <Girdi value={aksiyon.baslik} onChange={(e) => degistir({ ...aksiyon, baslik: e.target.value })} aria-label="Başlık" />
      <div />
      <div className="flex gap-2">
        <Secici
          value={aksiyon.tur}
          onChange={(e) => degistir({ ...aksiyon, tur: e.target.value as Aksiyon["tur"] })}
          className="flex-1"
          aria-label="Tür"
        >
          <option value="gorev">Görev</option>
          <option value="takip">Takip</option>
          <option value="bekleme">Bekleme</option>
        </Secici>
        <Girdi
          type="date"
          value={aksiyon.tarih ?? ""}
          onChange={(e) => degistir({ ...aksiyon, tarih: e.target.value || null })}
          className="flex-1"
          aria-label="Tarih"
        />
      </div>
    </div>
  );
}
