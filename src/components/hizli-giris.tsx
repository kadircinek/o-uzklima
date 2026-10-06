"use client";

import { useRef, useState, useTransition } from "react";
import { girdiYakala } from "@/app/actions/girdi";
import type { DateStr } from "@/lib/dates";
import type { Ayarlar } from "@/lib/domain";
import type { KartBaglami, KartVerisi } from "@/lib/inbox";
import { createClient } from "@/lib/supabase/client";
import { useBildirim } from "./bildirim";
import { IkonMikrofon } from "./icons";
import { OnayKarti } from "./onay-karti";
import { Pencere } from "./pencere";
import { useSesliNot } from "./ses";
import { Buton, cx, Hata, MetinAlani } from "./ui";

/**
 * Hızlı giriş: tek metin kutusu (veya sesli not) → Claude ayrıştırır →
 * onay kartı. Kart kapatılırsa kayıt gelen kutusunda bekler.
 */
export function HizliGiris({
  acik,
  kapat,
  baslangicMetni,
  ayarlar,
  bugun,
  userId,
}: {
  acik: boolean;
  kapat: () => void;
  baslangicMetni: string;
  ayarlar: Ayarlar;
  bugun: DateStr;
  userId: string;
}) {
  return (
    <Pencere acik={acik} kapat={kapat} baslik="Hızlı giriş">
      {acik && (
        <HizliGirisIcerik baslangicMetni={baslangicMetni} ayarlar={ayarlar} bugun={bugun} userId={userId} kapat={kapat} />
      )}
    </Pencere>
  );
}

function HizliGirisIcerik({
  baslangicMetni,
  ayarlar,
  bugun,
  userId,
  kapat,
}: {
  baslangicMetni: string;
  ayarlar: Ayarlar;
  bugun: DateStr;
  userId: string;
  kapat: () => void;
}) {
  const [metin, setMetin] = useState(baslangicMetni);
  const [toplanti, setToplanti] = useState(false);
  const [kart, setKart] = useState<{ kart: KartVerisi; baglam: KartBaglami } | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, baslat] = useTransition();
  const ses = useRef<Blob | null>(null);
  const bildir = useBildirim();
  const alan = useRef<HTMLTextAreaElement>(null);

  const sesli = useSesliNot((parca) => setMetin((m) => (m.trim() ? `${m.trimEnd()} ${parca}` : parca)));

  async function mikrofon() {
    if (sesli.durum === "dinliyor") {
      ses.current = await sesli.dur();
      alan.current?.focus();
    } else {
      await sesli.basla();
    }
  }

  async function sesiYukle(): Promise<string | null> {
    const blob = ses.current;
    if (!blob) return null;
    const uzanti = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
    const yol = `${userId}/${crypto.randomUUID()}.${uzanti}`;
    const { error } = await createClient().storage.from("ses").upload(yol, blob, { contentType: blob.type });
    if (error) {
      bildir("Ses kaydı yüklenemedi; yalnızca metin kaydedildi.", { tur: "hata" });
      return null;
    }
    return yol;
  }

  function gonder() {
    if (!metin.trim() || bekliyor) return;
    setHata(null);
    baslat(async () => {
      if (sesli.durum === "dinliyor") ses.current = await sesli.dur();
      const sesDosyasi = await sesiYukle();
      const r = await girdiYakala(metin, { toplanti, sesDosyasi });
      if (!r.ok) return setHata(r.hata);
      ses.current = null;
      setKart(r.veri);
    });
  }

  if (kart) {
    return (
      <OnayKarti
        kart={kart.kart}
        baglam={kart.baglam}
        ayarlar={ayarlar}
        bugun={bugun}
        bitti={(s) => {
          if (s === "sonra") bildir("Gelen kutusunda bekliyor");
          kapat();
        }}
      />
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        gonder();
      }}
    >
      <div className="relative">
        <MetinAlani
          ref={alan}
          autoFocus
          rows={toplanti ? 8 : 3}
          value={metin}
          onChange={(e) => setMetin(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !toplanti && !e.nativeEvent.isComposing) {
              e.preventDefault();
              gonder();
            }
          }}
          placeholder={
            toplanti
              ? "Görüşme notunu yaz ya da anlat; özet ve aksiyonlar çıkarılır…"
              : "Ör. X firmasına Lucon teklifi gitti · Basechem'den TDS bekliyorum · Ali'ye perşembe fiyat dön"
          }
          className="pr-12 text-base"
          disabled={bekliyor}
        />
        {(sesli.destek.tanima || sesli.destek.kayit) && (
          <button
            type="button"
            onClick={mikrofon}
            disabled={bekliyor}
            aria-label={sesli.durum === "dinliyor" ? "Dinlemeyi durdur" : "Sesli not"}
            aria-pressed={sesli.durum === "dinliyor"}
            className={cx(
              "absolute right-2 top-2 rounded-full p-2 transition",
              sesli.durum === "dinliyor" ? "animate-pulse bg-danger text-white" : "text-muted hover:bg-soft hover:text-ink",
            )}
          >
            <IkonMikrofon />
          </button>
        )}
      </div>

      {sesli.durum === "dinliyor" && (
        <p className="text-sm text-muted">
          Dinliyorum…{" "}
          {sesli.araMetin && <span className="italic">{sesli.araMetin}</span>}
          {!sesli.destek.tanima && " (bu tarayıcı yazıya dökemiyor; ses kaydı saklanacak, metni siz yazın)"}
        </p>
      )}
      <Hata>{sesli.hata ?? hata}</Hata>

      <div className="flex items-center gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted select-none">
          <input
            type="checkbox"
            checked={toplanti}
            onChange={(e) => setToplanti(e.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          Toplantı notu
        </label>
        <div className="flex-1" />
        <span className="hidden text-xs text-muted sm:inline">{toplanti ? "" : "Enter: gönder · Shift+Enter: yeni satır"}</span>
        <Buton type="submit" tur="birincil" disabled={!metin.trim() || bekliyor}>
          {bekliyor ? "Ayrıştırılıyor…" : "Ekle"}
        </Buton>
      </div>
    </form>
  );
}
