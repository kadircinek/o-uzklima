"use client";

import { useEffect, useState, useTransition } from "react";
import { arkadasEkle, arkadasKaldir, arkadasSifresiniSifirla, type HesapBilgisi } from "@/app/actions/ekip";
import { formatDateTime } from "@/lib/dates";
import type { EkipUyesi } from "@/lib/server/ekip";
import { useBildirim } from "./bildirim";
import { Pencere } from "./pencere";
import { Buton, Etiket, Girdi, Hata, Kart, Rozet } from "./ui";

function kurulumMesaji(h: HesapBilgisi, adres: string): string {
  return [
    `Merhaba${h.ad ? " " + h.ad : ""}, LifeOS hesabın hazır.`,
    "",
    `1. iPhone'da Safari ile aç: ${adres}`,
    "2. Alttaki Paylaş düğmesi → Ana Ekrana Ekle",
    `3. Giriş: ${h.eposta}`,
    `   Geçici şifre: ${h.sifre}`,
    "",
    "İlk girişte kendi şifreni belirleyeceksin. Sonra Ayarlar'dan bildirimleri aç.",
  ].join("\n");
}

function HesapKarti({ hesap, kapat }: { hesap: HesapBilgisi; kapat: () => void }) {
  // Bu kart yalnızca tarayıcıda (hesap açıldıktan sonra) gösterilir.
  const [adres] = useState(() => window.location.origin);
  const [qr, setQr] = useState<string | null>(null);
  const bildir = useBildirim();

  useEffect(() => {
    let iptal = false;
    void import("qrcode").then((QR) =>
      QR.toDataURL(adres, { margin: 1, width: 320 }).then((u) => {
        if (!iptal) setQr(u);
      }),
    );
    return () => {
      iptal = true;
    };
  }, [adres]);

  const mesaj = kurulumMesaji(hesap, adres);

  return (
    <Pencere acik kapat={kapat} baslik="Hesap hazır">
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Geçici şifre yalnızca şimdi gösterilir. Mesajı kopyalayıp WhatsApp&apos;tan gönderebilir ya da QR kodu iPhone kamerasıyla
          okutabilirsin.
        </p>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <pre className="rounded-lg bg-soft px-3 py-2 text-[13px] whitespace-pre-wrap">{mesaj}</pre>
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element -- yerel olarak üretilen data: adresi
            <img src={qr} alt="Uygulama adresinin QR kodu" className="mx-auto size-40 rounded-lg border border-line bg-white p-1" />
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(mesaj)}`}
            target="_blank"
            rel="noopener"
            className="inline-flex h-10 items-center rounded-lg border border-line px-4 text-sm font-medium hover:bg-soft"
          >
            WhatsApp ile gönder
          </a>
          <Buton
            tur="birincil"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(mesaj);
                bildir("Mesaj kopyalandı");
              } catch {
                bildir("Kopyalanamadı; metni seçip kopyalayın", { tur: "hata" });
              }
            }}
          >
            Mesajı kopyala
          </Buton>
        </div>
      </div>
    </Pencere>
  );
}

export function EkipAyari({ uyeler, saatDilimi }: { uyeler: EkipUyesi[]; saatDilimi: string }) {
  const [form, setForm] = useState({ ad: "", eposta: "" });
  const [hesap, setHesap] = useState<HesapBilgisi | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, baslat] = useTransition();
  const bildir = useBildirim();

  return (
    <div className="space-y-3">
      <Kart className="space-y-3 px-4 py-3">
        <div>
          <p className="text-[15px]">Arkadaşına hesap aç</p>
          <p className="text-xs text-muted">
            Herkesin görevleri, firmaları ve e-postaları kendine özeldir; hesap açmak veri paylaşmak değildir.
          </p>
        </div>
        <form
          className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            setHata(null);
            baslat(async () => {
              const r = await arkadasEkle(form);
              if (!r.ok) return setHata(r.hata);
              setForm({ ad: "", eposta: "" });
              setHesap(r.veri);
            });
          }}
        >
          <Etiket ad="Ad">
            <Girdi value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} placeholder="Ayşe" />
          </Etiket>
          <Etiket ad="E-posta">
            <Girdi
              type="email"
              required
              value={form.eposta}
              onChange={(e) => setForm({ ...form, eposta: e.target.value })}
              placeholder="ayse@buteo.com.tr"
            />
          </Etiket>
          <Buton type="submit" tur="birincil" disabled={bekliyor}>
            Hesap aç
          </Buton>
        </form>
        <Hata>{hata}</Hata>
      </Kart>

      <Kart>
        <ul className="divide-y divide-line">
          {uyeler.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px]">
                  {u.ad ?? u.eposta}
                  {u.ad && <span className="text-sm text-muted"> · {u.eposta}</span>}
                </p>
                <p className="text-xs text-muted">
                  {u.son_giris ? `Son giriş ${formatDateTime(new Date(u.son_giris), saatDilimi)}` : "Henüz giriş yapmadı"}
                </p>
              </div>
              {u.sifre_degistirmeli && <Rozet tur="uyari">Geçici şifre</Rozet>}
              {u.ben ? (
                <Rozet tur="vurgu">Sen · yönetici</Rozet>
              ) : (
                <div className="flex gap-1">
                  <Buton
                    kucuk
                    tur="hayalet"
                    disabled={bekliyor}
                    onClick={() =>
                      baslat(async () => {
                        const r = await arkadasSifresiniSifirla(u.id);
                        if (!r.ok) return bildir(r.hata, { tur: "hata" });
                        setHesap(r.veri);
                      })
                    }
                  >
                    Şifre sıfırla
                  </Buton>
                  <Buton
                    kucuk
                    tur="tehlike"
                    disabled={bekliyor}
                    onClick={() =>
                      confirm(`${u.eposta} kaldırılsın mı? Bu kişinin tüm LifeOS verisi silinir.`) &&
                      baslat(async () => {
                        const r = await arkadasKaldir(u.id);
                        bildir(r.ok ? "Hesap kaldırıldı" : r.hata, { tur: r.ok ? "bilgi" : "hata" });
                      })
                    }
                  >
                    Kaldır
                  </Buton>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Kart>

      {hesap && <HesapKarti hesap={hesap} kapat={() => setHesap(null)} />}
    </div>
  );
}
