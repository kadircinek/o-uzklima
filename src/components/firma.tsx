"use client";

import { useState, useTransition } from "react";
import {
  firmaKaydet,
  firmaSil,
  firmalariIceAktar,
  kisiKaydet,
  kisiSil,
  notEkle,
  notSil,
  type FirmaFormVerisi,
  type KisiFormVerisi,
} from "@/app/actions/firma";
import type { CompanyRow, ContactRow, NoteRow } from "@/lib/database.types";
import { formatDateTime } from "@/lib/dates";
import { FIRMA_TURLERI, FIRMA_TURU_ETIKET, type FirmaTuru } from "@/lib/domain";
import { satirlariDonustur, sutunlariTahminEt, type Alan, type IceAktarimOnizleme } from "@/lib/ice-aktar";
import { useBildirim } from "./bildirim";
import { IkonArti, IkonCop, IkonKalem } from "./icons";
import { Pencere } from "./pencere";
import { Buton, Etiket, Girdi, Hata, MetinAlani, Secici } from "./ui";

// ---------------------------------------------------------------------------
// Firma formu

export function FirmaDugmesi({ firma, etiket }: { firma?: CompanyRow; etiket?: string }) {
  const [acik, setAcik] = useState(false);
  return (
    <>
      <Buton kucuk onClick={() => setAcik(true)}>
        {firma ? <IkonKalem className="size-4" /> : <IkonArti className="size-4" />}
        {etiket ?? (firma ? "Düzenle" : "Firma")}
      </Buton>
      <Pencere acik={acik} kapat={() => setAcik(false)} baslik={firma ? "Firmayı düzenle" : "Yeni firma"}>
        {acik && <FirmaFormu firma={firma} kapat={() => setAcik(false)} />}
      </Pencere>
    </>
  );
}

function FirmaFormu({ firma, kapat }: { firma?: CompanyRow; kapat: () => void }) {
  const [f, setF] = useState<FirmaFormVerisi>({
    ad: firma?.ad ?? "",
    ulke: firma?.ulke ?? null,
    tur: firma?.tur ?? "musteri",
    segment: firma?.segment ?? null,
    aktif: firma?.aktif ?? true,
    notlar: firma?.notlar ?? null,
  });
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, baslat] = useTransition();
  const bildir = useBildirim();
  const guncelle = (p: Partial<FirmaFormVerisi>) => setF((x) => ({ ...x, ...p }));

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        baslat(async () => {
          const r = await firmaKaydet(firma?.id ?? null, f);
          if (!r.ok) return setHata(r.hata);
          bildir("Kaydedildi");
          kapat();
        });
      }}
    >
      <Etiket ad="Firma adı">
        <Girdi value={f.ad} onChange={(e) => guncelle({ ad: e.target.value })} required autoFocus />
      </Etiket>
      <div className="grid gap-3 sm:grid-cols-3">
        <Etiket ad="Tür">
          <Secici value={f.tur} onChange={(e) => guncelle({ tur: e.target.value as FirmaTuru })}>
            {FIRMA_TURLERI.map((t) => (
              <option key={t} value={t}>
                {FIRMA_TURU_ETIKET[t]}
              </option>
            ))}
          </Secici>
        </Etiket>
        <Etiket ad="Ülke">
          <Girdi value={f.ulke ?? ""} onChange={(e) => guncelle({ ulke: e.target.value || null })} />
        </Etiket>
        <Etiket ad="Segment">
          <Girdi value={f.segment ?? ""} onChange={(e) => guncelle({ segment: e.target.value || null })} />
        </Etiket>
      </div>
      <Etiket ad="Notlar">
        <MetinAlani rows={3} value={f.notlar ?? ""} onChange={(e) => guncelle({ notlar: e.target.value || null })} />
      </Etiket>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={f.aktif}
          onChange={(e) => guncelle({ aktif: e.target.checked })}
          className="size-4 accent-[var(--accent)]"
        />
        Aktif (müşteriyse sessiz müşteri takibine girer)
      </label>
      <Hata>{hata}</Hata>
      <div className="flex items-center gap-2 pt-1">
        {firma && (
          <Buton
            tur="tehlike"
            kucuk
            disabled={bekliyor}
            aria-label="Firmayı sil"
            onClick={() => {
              if (!confirm(`${firma.ad} silinsin mi? Kişileri ve fırsatları da silinir; görev ve notlar firmasız kalır.`)) return;
              baslat(async () => {
                const r = await firmaSil(firma.id);
                if (r && !r.ok) setHata(r.hata);
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

// ---------------------------------------------------------------------------
// Kişiler

export function KisiListesi({ companyId, kisiler }: { companyId: string; kisiler: ContactRow[] }) {
  const [duzenlenen, setDuzenlenen] = useState<ContactRow | "yeni" | null>(null);
  return (
    <>
      <ul className="divide-y divide-line">
        {kisiler.map((k) => (
          <li key={k.id} className="flex items-center gap-3 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[15px]">
                {k.ad}
                {k.unvan && <span className="text-sm text-muted"> · {k.unvan}</span>}
              </p>
              <p className="flex flex-wrap gap-x-3 text-sm text-muted">
                {k.eposta && (
                  <a href={`mailto:${k.eposta}`} className="hover:text-accent">
                    {k.eposta}
                  </a>
                )}
                {k.telefon && (
                  <a href={`tel:${k.telefon}`} className="hover:text-accent">
                    {k.telefon}
                  </a>
                )}
                {k.dil && <span>{k.dil}</span>}
              </p>
            </div>
            <Buton kucuk tur="hayalet" onClick={() => setDuzenlenen(k)} aria-label="Düzenle">
              <IkonKalem className="size-4" />
            </Buton>
          </li>
        ))}
        <li className="px-3 py-2">
          <Buton kucuk tur="hayalet" onClick={() => setDuzenlenen("yeni")}>
            <IkonArti className="size-4" /> Kişi ekle
          </Buton>
        </li>
      </ul>
      <Pencere acik={duzenlenen !== null} kapat={() => setDuzenlenen(null)} baslik={duzenlenen === "yeni" ? "Yeni kişi" : "Kişiyi düzenle"}>
        {duzenlenen !== null && (
          <KisiFormu
            companyId={companyId}
            kisi={duzenlenen === "yeni" ? null : duzenlenen}
            kapat={() => setDuzenlenen(null)}
          />
        )}
      </Pencere>
    </>
  );
}

function KisiFormu({ companyId, kisi, kapat }: { companyId: string; kisi: ContactRow | null; kapat: () => void }) {
  const [f, setF] = useState<KisiFormVerisi>({
    ad: kisi?.ad ?? "",
    unvan: kisi?.unvan ?? null,
    eposta: kisi?.eposta ?? null,
    telefon: kisi?.telefon ?? null,
    dil: kisi?.dil ?? null,
  });
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, baslat] = useTransition();
  const guncelle = (p: Partial<KisiFormVerisi>) => setF((x) => ({ ...x, ...p }));

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        baslat(async () => {
          const r = await kisiKaydet(companyId, kisi?.id ?? null, f);
          if (!r.ok) return setHata(r.hata);
          kapat();
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Etiket ad="Ad">
          <Girdi value={f.ad} onChange={(e) => guncelle({ ad: e.target.value })} required autoFocus />
        </Etiket>
        <Etiket ad="Unvan">
          <Girdi value={f.unvan ?? ""} onChange={(e) => guncelle({ unvan: e.target.value || null })} />
        </Etiket>
        <Etiket ad="E-posta">
          <Girdi type="email" value={f.eposta ?? ""} onChange={(e) => guncelle({ eposta: e.target.value || null })} />
        </Etiket>
        <Etiket ad="Telefon">
          <Girdi type="tel" value={f.telefon ?? ""} onChange={(e) => guncelle({ telefon: e.target.value || null })} />
        </Etiket>
        <Etiket ad="Dil">
          <Girdi value={f.dil ?? ""} placeholder="TR, EN…" onChange={(e) => guncelle({ dil: e.target.value || null })} />
        </Etiket>
      </div>
      <Hata>{hata}</Hata>
      <div className="flex items-center gap-2 pt-1">
        {kisi && (
          <Buton
            tur="tehlike"
            kucuk
            disabled={bekliyor}
            aria-label="Kişiyi sil"
            onClick={() => {
              if (!confirm(`${kisi.ad} silinsin mi?`)) return;
              baslat(async () => {
                const r = await kisiSil(companyId, kisi.id);
                if (!r.ok) return setHata(r.hata);
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

// ---------------------------------------------------------------------------
// Notlar

export function HizliNot({ companyId }: { companyId: string }) {
  const [metin, setMetin] = useState("");
  const [bekliyor, baslat] = useTransition();
  const bildir = useBildirim();
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!metin.trim()) return;
        baslat(async () => {
          const r = await notEkle(companyId, metin);
          if (!r.ok) return bildir(r.hata, { tur: "hata" });
          setMetin("");
          bildir("Not eklendi");
        });
      }}
    >
      <MetinAlani
        rows={1}
        value={metin}
        onChange={(e) => setMetin(e.target.value)}
        placeholder="Hızlı not ekle…"
        className="min-h-10 flex-1 resize-y"
      />
      <Buton type="submit" tur="birincil" disabled={bekliyor || !metin.trim()}>
        Ekle
      </Buton>
    </form>
  );
}

export function NotListesi({ companyId, notlar, saatDilimi }: { companyId: string; notlar: NoteRow[]; saatDilimi: string }) {
  const [bekliyor, baslat] = useTransition();
  return (
    <ul className="divide-y divide-line">
      {notlar.map((n) => (
        <li key={n.id} className="group px-3 py-2.5">
          <div className="flex items-center justify-between gap-2 text-xs text-muted">
            <span>{formatDateTime(new Date(n.tarih), saatDilimi)}</span>
            <button
              type="button"
              disabled={bekliyor}
              onClick={() => confirm("Not silinsin mi?") && baslat(async () => void (await notSil(companyId, n.id)))}
              className="opacity-0 transition group-hover:opacity-100 hover:text-danger focus:opacity-100"
              aria-label="Notu sil"
            >
              <IkonCop className="size-4" />
            </button>
          </div>
          {n.ozet && <p className="mt-1 text-[15px] font-medium">{n.ozet}</p>}
          <p className={n.ozet ? "mt-1 text-sm whitespace-pre-wrap text-muted" : "mt-1 text-[15px] whitespace-pre-wrap"}>
            {n.ozet && n.metin.length > 400 ? n.metin.slice(0, 400) + "…" : n.metin}
          </p>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Excel / CSV içe aktarma

const ALAN_ETIKET: Record<Alan, string> = { ad: "Firma adı", ulke: "Ülke", tur: "Tür", segment: "Segment", notlar: "Notlar" };

async function dosyaOku(dosya: File): Promise<unknown[][]> {
  if (/\.(xlsx|xlsm)$/i.test(dosya.name)) {
    const { readSheet } = await import("read-excel-file/browser");
    return (await readSheet(dosya)) as unknown[][];
  }
  const Papa = (await import("papaparse")).default;
  const oku = (encoding: string) =>
    new Promise<string[][]>((coz, reddet) =>
      Papa.parse<string[]>(dosya, { encoding, skipEmptyLines: true, complete: (r) => coz(r.data), error: reddet }),
    );
  const utf8 = await oku("UTF-8");
  // Türkçe Excel CSV'leri çoğunlukla Windows-1254 kodlamasıyla kaydeder.
  return utf8.some((s) => s.some((h) => h.includes("�"))) ? oku("windows-1254") : utf8;
}

export function IceAktarDugmesi() {
  const [acik, setAcik] = useState(false);
  return (
    <>
      <Buton kucuk onClick={() => setAcik(true)}>
        İçe aktar
      </Buton>
      <Pencere acik={acik} kapat={() => setAcik(false)} baslik="Excel / CSV'den firma aktar">
        {acik && <IceAktar kapat={() => setAcik(false)} />}
      </Pencere>
    </>
  );
}

function IceAktar({ kapat }: { kapat: () => void }) {
  const [satirlar, setSatirlar] = useState<unknown[][] | null>(null);
  const [basliklar, setBasliklar] = useState<string[]>([]);
  const [sutunlar, setSutunlar] = useState<Partial<Record<Alan, number>>>({});
  const [varsayilanTur, setVarsayilanTur] = useState<FirmaTuru>("musteri");
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, baslat] = useTransition();
  const bildir = useBildirim();

  async function sec(dosya: File | undefined) {
    if (!dosya) return;
    setHata(null);
    try {
      const veri = (await dosyaOku(dosya)).filter((s) => s.some((h) => h !== null && String(h).trim() !== ""));
      if (veri.length < 2) return setHata("Dosyada başlık satırı ve en az bir firma olmalı.");
      const b = veri[0].map((h) => String(h ?? "").trim());
      setBasliklar(b);
      setSutunlar(sutunlariTahminEt(b));
      setSatirlar(veri.slice(1));
    } catch {
      setHata("Dosya okunamadı. .xlsx veya .csv dosyası seçin.");
    }
  }

  const onizleme: IceAktarimOnizleme[] = satirlar ? satirlariDonustur(satirlar, sutunlar, varsayilanTur) : [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        İlk satır başlık olmalı. Business Central &quot;Müşteriler&quot; / &quot;Satıcılar&quot; listesinin Excel&apos;e aktarılmış hâli doğrudan
        kullanılabilir. Aynı adlı firmalar atlanır.
      </p>
      <input
        type="file"
        accept=".xlsx,.xlsm,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={(e) => sec(e.target.files?.[0])}
        className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-line file:bg-card file:px-3 file:py-2 file:text-sm"
      />
      {satirlar && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {(Object.keys(ALAN_ETIKET) as Alan[]).map((alan) => (
              <Etiket key={alan} ad={ALAN_ETIKET[alan]}>
                <Secici
                  value={sutunlar[alan] ?? ""}
                  onChange={(e) =>
                    setSutunlar((s) => ({ ...s, [alan]: e.target.value === "" ? undefined : Number(e.target.value) }))
                  }
                >
                  <option value="">—</option>
                  {basliklar.map((b, i) => (
                    <option key={i} value={i}>
                      {b || `Sütun ${i + 1}`}
                    </option>
                  ))}
                </Secici>
              </Etiket>
            ))}
            <Etiket ad="Tür sütunu yoksa">
              <Secici value={varsayilanTur} onChange={(e) => setVarsayilanTur(e.target.value as FirmaTuru)}>
                {FIRMA_TURLERI.map((t) => (
                  <option key={t} value={t}>
                    {FIRMA_TURU_ETIKET[t]}
                  </option>
                ))}
              </Secici>
            </Etiket>
          </div>
          <div className="max-h-56 overflow-auto rounded-lg border border-line">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-soft text-left text-xs text-muted">
                <tr>
                  <th className="px-2 py-1.5">Ad</th>
                  <th className="px-2 py-1.5">Ülke</th>
                  <th className="px-2 py-1.5">Tür</th>
                  <th className="px-2 py-1.5">Segment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {onizleme.slice(0, 50).map((s, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1">{s.ad}</td>
                    <td className="px-2 py-1">{s.ulke}</td>
                    <td className="px-2 py-1">{FIRMA_TURU_ETIKET[s.tur]}</td>
                    <td className="px-2 py-1">{s.segment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted">
            {onizleme.length} firma bulundu{onizleme.length > 50 && " (ilk 50 gösteriliyor)"}.
          </p>
        </>
      )}
      <Hata>{hata}</Hata>
      <div className="flex justify-end gap-2">
        <Buton onClick={kapat} disabled={bekliyor}>
          Vazgeç
        </Buton>
        <Buton
          tur="birincil"
          disabled={bekliyor || onizleme.length === 0}
          onClick={() =>
            baslat(async () => {
              const r = await firmalariIceAktar(onizleme);
              if (!r.ok) return setHata(r.hata);
              bildir(`${r.veri.eklenen} firma eklendi${r.veri.atlanan ? `, ${r.veri.atlanan} zaten vardı` : ""}`);
              kapat();
            })
          }
        >
          {bekliyor ? "Aktarılıyor…" : `${onizleme.length} firmayı aktar`}
        </Buton>
      </div>
    </div>
  );
}
