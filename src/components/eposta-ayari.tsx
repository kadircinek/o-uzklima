"use client";

import { useState, useTransition } from "react";
import { epostaAdresiniYenile, epostaGondericiEkle, epostaGondericiSil } from "@/app/actions/eposta";
import type { EmailLogRow } from "@/lib/database.types";
import { formatDateTime } from "@/lib/dates";
import { useBildirim } from "./bildirim";
import { IkonKapat } from "./icons";
import { Buton, Girdi, Hata, Kart, Rozet } from "./ui";

const SONUC: Record<EmailLogRow["sonuc"], { ad: string; tur: "basari" | "vurgu" | "tehlike" | "notr" }> = {
  gelen_kutusu: { ad: "Gelen kutusu", tur: "vurgu" },
  not: { ad: "Firma notu", tur: "basari" },
  reddedildi: { ad: "Reddedildi", tur: "tehlike" },
  isleniyor: { ad: "İşleniyor", tur: "notr" },
};

/** iPhone rehberine "LifeOS" kişisi olarak eklemek için vCard. */
function vcard(adres: string): string {
  return `data:text/vcard;charset=utf-8,${encodeURIComponent(
    ["BEGIN:VCARD", "VERSION:3.0", "FN:LifeOS", "N:;LifeOS;;;", `EMAIL;TYPE=INTERNET:${adres}`, "END:VCARD"].join("\r\n"),
  )}`;
}

export function EpostaAyari({
  adres,
  girisEpostasi,
  gondericiler,
  gunluk,
  saatDilimi,
  yonetici,
}: {
  /** Kişisel LifeOS adresi; sunucuda e-posta servisi kurulu değilse null */
  adres: string | null;
  girisEpostasi: string | null;
  gondericiler: string[];
  gunluk: EmailLogRow[];
  saatDilimi: string;
  yonetici: boolean;
}) {
  const [yeniAdres, setYeniAdres] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, baslat] = useTransition();
  const bildir = useBildirim();

  function calistir(fn: () => Promise<{ ok: true } | { ok: false; hata: string }>, basari?: string) {
    setHata(null);
    baslat(async () => {
      const r = await fn();
      if (!r.ok) return setHata(r.hata);
      if (basari) bildir(basari);
    });
  }

  async function kopyala() {
    if (!adres) return;
    try {
      await navigator.clipboard.writeText(adres);
      bildir("Adres kopyalandı");
    } catch {
      bildir("Kopyalanamadı; adresi seçip kopyalayın", { tur: "hata" });
    }
  }

  if (!adres) {
    return (
      <Kart className="space-y-2 px-4 py-3 text-sm">
        <p className="text-warn">E-posta servisi henüz kurulmadı.</p>
        {yonetici ? (
          <p className="text-muted">
            Postmark&apos;ta bir sunucu açıp gelen e-posta adresini <code className="rounded bg-soft px-1">EPOSTA_GELEN_ADRESI</code>,
            webhook şifresini <code className="rounded bg-soft px-1">EPOSTA_WEBHOOK_ANAHTARI</code> olarak tanımlayın (README → E-posta).
          </p>
        ) : (
          <p className="text-muted">Yöneticiniz kurduğunda kişisel LifeOS adresiniz burada görünecek.</p>
        )}
      </Kart>
    );
  }

  return (
    <div className="space-y-3">
      <Kart className="space-y-3 px-4 py-3">
        <div>
          <p className="text-xs font-medium text-muted">Kişisel LifeOS adresin</p>
          <p className="mt-1 rounded-lg bg-soft px-3 py-2 font-mono text-[13px] break-all select-all">{adres}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Buton kucuk tur="birincil" onClick={kopyala}>
            Kopyala
          </Buton>
          <a
            href={vcard(adres)}
            download="LifeOS.vcf"
            className="inline-flex h-8 items-center rounded-lg border border-line px-2.5 text-sm font-medium hover:bg-soft"
          >
            Rehbere ekle
          </a>
          <Buton
            kucuk
            tur="hayalet"
            disabled={bekliyor}
            onClick={() =>
              confirm("Yeni adres oluşturulsun mu? Eski adrese gelen e-postalar artık kabul edilmez.") &&
              calistir(epostaAdresiniYenile, "Yeni adres oluşturuldu")
            }
          >
            Yeni adres oluştur
          </Buton>
        </div>
        <p className="text-xs text-muted">
          Adresi rehbere &quot;LifeOS&quot; adıyla kaydedersen Kime alanına &quot;Life&quot; yazman yeter.
        </p>
      </Kart>

      <Kart className="divide-y divide-line text-sm">
        <div className="px-4 py-3">
          <p className="font-medium">İlet → gelen kutusu</p>
          <p className="mt-0.5 text-muted">
            Takip etmek istediğin e-postayı bu adrese ilet. En üste kısa bir not yazabilirsin (&quot;perşembe dönüş yap&quot;). Claude
            göndereni firmayla eşleştirir, görevi çıkarır; sen onaylarsın.
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="font-medium">Gizli kopya (BCC) → firma notu</p>
          <p className="mt-0.5 text-muted">
            Müşteriye yazarken bu adresi Bcc&apos;ye ekle: e-posta firmaya not olarak düşer, son temas güncellenir. iPhone Mail&apos;de
            Bcc alanı için &quot;Bilgi/Gizli, Kimden&quot; satırına dokun.
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="font-medium">Kendine not</p>
          <p className="mt-0.5 text-muted">Bu adrese doğrudan yazdığın e-posta hızlı giriş gibi gelen kutusuna düşer.</p>
        </div>
      </Kart>

      <Kart className="space-y-3 px-4 py-3">
        <div>
          <p className="text-[15px]">Kabul edilen gönderenler</p>
          <p className="text-xs text-muted">
            Yalnızca bu adreslerden gelen e-postalar işlenir. İş e-postanı (ör. ad@buteo.com.tr) buraya ekle.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {girisEpostasi && <Rozet>{girisEpostasi} (giriş)</Rozet>}
          {gondericiler.map((g) => (
            <span key={g} className="inline-flex items-center gap-1 rounded-md bg-soft px-2 py-0.5 text-xs">
              {g}
              <button
                type="button"
                aria-label={`${g} adresini kaldır`}
                disabled={bekliyor}
                onClick={() => calistir(() => epostaGondericiSil(g))}
                className="text-muted hover:text-danger"
              >
                <IkonKapat className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!yeniAdres.trim()) return;
            calistir(async () => {
              const r = await epostaGondericiEkle(yeniAdres);
              if (r.ok) setYeniAdres("");
              return r;
            }, "Gönderen eklendi");
          }}
        >
          <Girdi
            type="email"
            value={yeniAdres}
            onChange={(e) => setYeniAdres(e.target.value)}
            placeholder="ad@buteo.com.tr"
            className="h-9 text-sm"
          />
          <Buton type="submit" kucuk disabled={bekliyor || !yeniAdres.trim()}>
            Ekle
          </Buton>
        </form>
        <Hata>{hata}</Hata>
      </Kart>

      <Kart>
        <p className="border-b border-line px-4 py-2.5 text-sm font-medium">Son gelen e-postalar</p>
        {gunluk.length === 0 ? (
          <p className="px-4 py-4 text-center text-sm text-muted">Henüz e-posta gelmedi. Denemek için adresine bir e-posta ilet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {gunluk.map((g) => (
              <li key={g.id} className="px-4 py-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">{g.konu || "(konusuz)"}</span>
                  <Rozet tur={SONUC[g.sonuc].tur}>{SONUC[g.sonuc].ad}</Rozet>
                </div>
                <p className="truncate text-xs text-muted">
                  {formatDateTime(new Date(g.alinma), saatDilimi)} · {g.gonderen}
                  {g.aciklama && ` · ${g.aciklama}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Kart>
    </div>
  );
}
