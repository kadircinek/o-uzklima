"use client";

import { useEffect, useState, useTransition } from "react";
import { ayarlariKaydet, pushAbonelikSil, pushAboneOl, pushDene, type AyarFormVerisi } from "@/app/actions/ayar";
import { formatShort, GUNLER } from "@/lib/dates";
import { ASAMA_ETIKET, ASAMALAR, GOREV_TURLERI, GOREV_TURU_ETIKET, type AsamaGorevi, type Ayarlar, type GorevTuru } from "@/lib/domain";
import { useBildirim } from "./bildirim";
import { IkonKapat } from "./icons";
import { Buton, Girdi, Hata, Kart, Secici } from "./ui";

function SayiGirdisi({ deger, degistir, min, max }: { deger: number; degistir: (n: number) => void; min: number; max: number }) {
  return (
    <Girdi
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={deger}
      onChange={(e) => degistir(Math.min(max, Math.max(min, Math.round(Number(e.target.value) || min))))}
      className="w-20 text-center"
    />
  );
}

function Satir({ ad, aciklama, children }: { ad: string; aciklama?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[15px]">{ad}</p>
        {aciklama && <p className="text-xs text-muted">{aciklama}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2 text-sm text-muted">{children}</div>
    </div>
  );
}

export function AyarFormu({ ayarlar }: { ayarlar: Ayarlar }) {
  const [f, setF] = useState<AyarFormVerisi>({
    ozet_saati: ayarlar.ozet_saati,
    hatirlatma_saati: ayarlar.hatirlatma_saati,
    gunluk_bildirim_limiti: ayarlar.gunluk_bildirim_limiti,
    sessiz_liste_gunu: ayarlar.sessiz_liste_gunu,
    ek_tatiller: ayarlar.ek_tatiller,
    kurallar: ayarlar.kurallar,
  });
  const [yeniTatil, setYeniTatil] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, baslat] = useTransition();
  const bildir = useBildirim();
  const kural = (p: Partial<AyarFormVerisi["kurallar"]>) => setF((x) => ({ ...x, kurallar: { ...x.kurallar, ...p } }));
  const asamaGorevi = (a: (typeof ASAMALAR)[number], g: AsamaGorevi | null) =>
    kural({ asama_gorevleri: { ...f.kurallar.asama_gorevleri, [a]: g } });

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        setHata(null);
        baslat(async () => {
          const r = await ayarlariKaydet(f);
          if (!r.ok) return setHata(r.hata);
          bildir("Ayarlar kaydedildi");
        });
      }}
    >
      <section className="space-y-2">
        <h2 className="px-1 text-sm font-semibold text-muted">Bildirimler</h2>
        <Kart className="divide-y divide-line">
          <Satir ad="Günlük özet saati" aciklama="İş günleri; bugünün 5 önceliği">
            <Girdi type="time" value={f.ozet_saati} onChange={(e) => setF({ ...f, ozet_saati: e.target.value })} className="w-28" />
          </Satir>
          <Satir ad="Vade günü hatırlatma saati">
            <Girdi
              type="time"
              value={f.hatirlatma_saati}
              onChange={(e) => setF({ ...f, hatirlatma_saati: e.target.value })}
              className="w-28"
            />
          </Satir>
          <Satir ad="Günlük hatırlatma sınırı" aciklama="Fazlası özete ve Bugün ekranına kalır">
            <SayiGirdisi deger={f.gunluk_bildirim_limiti} min={1} max={50} degistir={(n) => setF({ ...f, gunluk_bildirim_limiti: n })} />
          </Satir>
          <Satir ad="Sessiz müşteri listesi" aciklama="Haftada bir özete eklenir">
            <Secici
              value={f.sessiz_liste_gunu}
              onChange={(e) => setF({ ...f, sessiz_liste_gunu: Number(e.target.value) })}
              className="w-36"
            >
              {[1, 2, 3, 4, 5, 6, 0].map((g) => (
                <option key={g} value={g}>
                  {GUNLER[g]}
                </option>
              ))}
            </Secici>
          </Satir>
        </Kart>
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-sm font-semibold text-muted">Hatırlatma kuralları</h2>
        <Kart className="divide-y divide-line">
          <Satir ad="Bekliyorum → dürt" aciklama="Oluşturulduktan sonra">
            <SayiGirdisi deger={f.kurallar.bekleme_is_gunu} min={1} max={60} degistir={(n) => kural({ bekleme_is_gunu: n })} />
            iş günü
          </Satir>
          <Satir ad="Teklif gönderildi → cevap geldi mi?">
            <SayiGirdisi deger={f.kurallar.teklif_is_gunu} min={1} max={60} degistir={(n) => kural({ teklif_is_gunu: n })} />
            iş günü
          </Satir>
          <Satir ad="Numune gönderildi → geri bildirim iste">
            <SayiGirdisi deger={f.kurallar.numune_gun} min={1} max={180} degistir={(n) => kural({ numune_gun: n })} />
            gün
          </Satir>
          <Satir ad="Ödeme vadesi → ön hatırlatma" aciklama="Ayrıca vade günü de hatırlatılır">
            <SayiGirdisi deger={f.kurallar.odeme_on_gun} min={0} max={60} degistir={(n) => kural({ odeme_on_gun: n })} />
            gün önce
          </Satir>
          <Satir ad="Tarihsiz takip">
            <SayiGirdisi deger={f.kurallar.takip_is_gunu} min={1} max={60} degistir={(n) => kural({ takip_is_gunu: n })} />
            iş günü
          </Satir>
          <Satir ad="Sessiz müşteri" aciklama="Aktif müşteride temas yoksa">
            <SayiGirdisi deger={f.kurallar.sessiz_gun} min={1} max={365} degistir={(n) => kural({ sessiz_gun: n })} />
            gün
          </Satir>
        </Kart>
        <p className="px-1 text-xs text-muted">
          Hafta sonuna ve resmi tatillere düşen hatırlatmalar sonraki iş gününe kayar.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-sm font-semibold text-muted">Fırsat aşaması değişince açılacak görev</h2>
        <Kart className="divide-y divide-line">
          {ASAMALAR.map((a) => {
            const g = f.kurallar.asama_gorevleri[a];
            return (
              <div key={a} className="space-y-2 px-4 py-3">
                <label className="flex items-center gap-2 text-[15px]">
                  <input
                    type="checkbox"
                    checked={g !== null}
                    onChange={(e) =>
                      asamaGorevi(a, e.target.checked ? { tur: "takip", baslik: `${ASAMA_ETIKET[a]} takibi`, gun: 3, is_gunu: true } : null)
                    }
                    className="size-4 accent-[var(--accent)]"
                  />
                  {ASAMA_ETIKET[a]}
                </label>
                {g && (
                  <div className="flex flex-wrap items-center gap-2 pl-6 text-sm text-muted">
                    <Girdi value={g.baslik} onChange={(e) => asamaGorevi(a, { ...g, baslik: e.target.value })} className="min-w-48 flex-1" />
                    <Secici value={g.tur} onChange={(e) => asamaGorevi(a, { ...g, tur: e.target.value as GorevTuru })} className="w-32">
                      {GOREV_TURLERI.map((t) => (
                        <option key={t} value={t}>
                          {GOREV_TURU_ETIKET[t]}
                        </option>
                      ))}
                    </Secici>
                    <SayiGirdisi deger={g.gun} min={0} max={365} degistir={(n) => asamaGorevi(a, { ...g, gun: n })} />
                    <Secici
                      value={g.is_gunu ? "is" : "takvim"}
                      onChange={(e) => asamaGorevi(a, { ...g, is_gunu: e.target.value === "is" })}
                      className="w-32"
                    >
                      <option value="is">iş günü sonra</option>
                      <option value="takvim">gün sonra</option>
                    </Secici>
                  </div>
                )}
              </div>
            );
          })}
        </Kart>
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-sm font-semibold text-muted">Ek tatil günleri</h2>
        <Kart className="space-y-3 px-4 py-3">
          <p className="text-xs text-muted">
            Resmi tatiller ve 2025–2027 dini bayramları takvimde var. Köprü günleri, şirket tatilleri veya sonraki yılların
            bayramlarını buradan ekle.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {f.ek_tatiller.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-md bg-soft px-2 py-1 text-sm">
                {formatShort(t)} {t.slice(0, 4)}
                <button
                  type="button"
                  aria-label="Kaldır"
                  onClick={() => setF({ ...f, ek_tatiller: f.ek_tatiller.filter((x) => x !== t) })}
                  className="text-muted hover:text-danger"
                >
                  <IkonKapat className="size-3.5" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Girdi type="date" value={yeniTatil} onChange={(e) => setYeniTatil(e.target.value)} className="w-44" />
            <Buton
              kucuk
              disabled={!yeniTatil}
              onClick={() => {
                if (!f.ek_tatiller.includes(yeniTatil)) setF({ ...f, ek_tatiller: [...f.ek_tatiller, yeniTatil].sort() });
                setYeniTatil("");
              }}
            >
              Ekle
            </Buton>
          </div>
        </Kart>
      </section>

      <Hata>{hata}</Hata>
      <div className="flex justify-end">
        <Buton type="submit" tur="birincil" disabled={bekliyor}>
          {bekliyor ? "Kaydediliyor…" : "Ayarları kaydet"}
        </Buton>
      </div>
    </form>
  );
}

function base64Dizi(base64: string): Uint8Array<ArrayBuffer> {
  const dolgu = "=".repeat((4 - (base64.length % 4)) % 4);
  const ham = atob((base64 + dolgu).replace(/-/g, "+").replace(/_/g, "/"));
  const dizi = new Uint8Array(new ArrayBuffer(ham.length));
  for (let i = 0; i < ham.length; i++) dizi[i] = ham.charCodeAt(i);
  return dizi;
}

type PushDurumu = "yukleniyor" | "desteklenmiyor" | "ios-kur" | "kapali" | "acik" | "engellendi";

export function PushAyari({ vapidAnahtari, cihazSayisi }: { vapidAnahtari: string | null; cihazSayisi: number }) {
  const [durum, setDurum] = useState<PushDurumu>("yukleniyor");
  const [abonelik, setAbonelik] = useState<PushSubscription | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, baslat] = useTransition();
  const bildir = useBildirim();

  useEffect(() => {
    let iptal = false;
    (async () => {
      let yeni: PushDurumu;
      let sub: PushSubscription | null = null;
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const kurulu = window.matchMedia("(display-mode: standalone)").matches;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        yeni = ios && !kurulu ? "ios-kur" : "desteklenmiyor";
      } else if (Notification.permission === "denied") {
        yeni = "engellendi";
      } else {
        const kayit = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
        sub = await kayit.pushManager.getSubscription();
        yeni = sub ? "acik" : "kapali";
      }
      if (!iptal) {
        setAbonelik(sub);
        setDurum(yeni);
      }
    })().catch(() => !iptal && setDurum("desteklenmiyor"));
    return () => {
      iptal = true;
    };
  }, []);

  function ac() {
    if (!vapidAnahtari) return;
    setHata(null);
    baslat(async () => {
      try {
        const izin = await Notification.requestPermission();
        if (izin !== "granted") {
          setDurum(izin === "denied" ? "engellendi" : "kapali");
          return;
        }
        const kayit = await navigator.serviceWorker.ready;
        const sub = await kayit.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64Dizi(vapidAnahtari) });
        const r = await pushAboneOl(JSON.parse(JSON.stringify(sub)), navigator.userAgent);
        if (!r.ok) return setHata(r.hata);
        setAbonelik(sub);
        setDurum("acik");
        const d = await pushDene();
        bildir(d.ok ? "Bildirimler açıldı" : d.hata, { tur: d.ok ? "bilgi" : "hata" });
      } catch {
        setHata("Bildirim aboneliği oluşturulamadı.");
      }
    });
  }

  function kapat() {
    baslat(async () => {
      if (abonelik) {
        await pushAbonelikSil(abonelik.endpoint);
        await abonelik.unsubscribe().catch(() => {});
      }
      setAbonelik(null);
      setDurum("kapali");
    });
  }

  function dene() {
    baslat(async () => {
      const r = await pushDene();
      bildir(r.ok ? "Deneme bildirimi gönderildi" : r.hata, { tur: r.ok ? "bilgi" : "hata" });
    });
  }

  return (
    <Kart className="space-y-3 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[15px]">Bu cihazda bildirimler</p>
          <p className="text-xs text-muted">
            {cihazSayisi > 0 ? `${cihazSayisi} cihaz kayıtlı` : "Kayıtlı cihaz yok"} · hatırlatmalar ve günlük özet
          </p>
        </div>
        {durum === "acik" ? (
          <div className="flex gap-2">
            <Buton kucuk onClick={dene} disabled={bekliyor}>
              Dene
            </Buton>
            <Buton kucuk tur="hayalet" onClick={kapat} disabled={bekliyor}>
              Kapat
            </Buton>
          </div>
        ) : durum === "kapali" ? (
          <Buton kucuk tur="birincil" onClick={ac} disabled={bekliyor || !vapidAnahtari}>
            Aç
          </Buton>
        ) : null}
      </div>
      {!vapidAnahtari && <p className="text-sm text-warn">Sunucuda VAPID anahtarları tanımlı değil (README → Bildirimler).</p>}
      {durum === "ios-kur" && (
        <p className="text-sm text-muted">
          iPhone&apos;da bildirim için önce Safari&apos;de Paylaş → <strong>Ana Ekrana Ekle</strong> ile LifeOS&apos;u kur, sonra uygulamadan
          bu sayfayı aç.
        </p>
      )}
      {durum === "desteklenmiyor" && <p className="text-sm text-muted">Bu tarayıcı web bildirimlerini desteklemiyor.</p>}
      {durum === "engellendi" && (
        <p className="text-sm text-muted">Bildirim izni engellenmiş. Tarayıcı/site ayarlarından LifeOS için bildirimlere izin ver.</p>
      )}
      <Hata>{hata}</Hata>
    </Kart>
  );
}
