"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ALT_PAY,
  CERCEVE,
  DURUM_CUBUGU,
  IPAD_MODELLERI,
  ekranBoyutu,
  guvenliYol,
  sigdirmaOlcegi,
  type IpadModeli,
  type Yon,
} from "@/lib/simulator";
import { cx } from "./ui";

// Saat yalnızca tarayıcıda gösterilir; sunucu çıktısında boş kalır.
function saatAboneOl(bildir: () => void) {
  const id = setInterval(bildir, 10_000);
  return () => clearInterval(id);
}
const saatMetni = () => {
  const simdi = new Date();
  const saat = simdi.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const gun = simdi.toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "short" });
  return `${saat} ${gun}`;
};

function DurumCubugu() {
  const saat = useSyncExternalStore(saatAboneOl, saatMetni, () => "");
  return (
    <div
      className="flex shrink-0 items-center justify-between px-5 text-[13px] font-semibold text-ink"
      style={{ height: DURUM_CUBUGU }}
    >
      <span suppressHydrationWarning>{saat}</span>
      <span className="flex items-center gap-1.5" aria-hidden>
        <svg viewBox="0 0 16 12" className="h-3" fill="currentColor">
          <path d="M8 2.2c2.4 0 4.6.9 6.3 2.5l1.2-1.3A10.8 10.8 0 0 0 8 .4 10.8 10.8 0 0 0 .5 3.4l1.2 1.3A9 9 0 0 1 8 2.2Zm0 3.6c1.4 0 2.7.5 3.7 1.4l1.2-1.3A7.3 7.3 0 0 0 8 4a7.3 7.3 0 0 0-4.9 1.9l1.2 1.3c1-.9 2.3-1.4 3.7-1.4Zm0 3.6c-.6 0-1.2.2-1.6.6L8 11.6l1.6-1.6c-.4-.4-1-.6-1.6-.6Z" />
        </svg>
        <span className="font-medium">%100</span>
        <span className="relative h-3 w-6 rounded-[3px] border border-current p-[1.5px]">
          <span className="block h-full w-full rounded-[1.5px] bg-current" />
        </span>
      </span>
    </div>
  );
}

export function IpadSimulator({ yol, model: ilkModel, yon: ilkYon }: { yol: string; model: IpadModeli; yon: Yon }) {
  const [model, setModel] = useState(ilkModel);
  const [yon, setYon] = useState(ilkYon);
  const [alan, setAlan] = useState<{ en: number; boy: number } | null>(null);
  // Çerçevenin adresi yalnızca ilk açılışta verilir; sonrasında gezinme çerçevenin kendisinde.
  const [ilkYol] = useState(() => guvenliYol(yol));
  const [suankiYol, setSuankiYol] = useState(ilkYol);
  const alanRef = useRef<HTMLDivElement>(null);
  const cerceveRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const el = alanRef.current;
    if (!el) return;
    const g = new ResizeObserver(([k]) => setAlan({ en: k.contentRect.width, boy: k.contentRect.height }));
    g.observe(el);
    return () => g.disconnect();
  }, []);

  // Model, yön ve çerçevedeki sayfa adres çubuğunda dursun: yenileyince aynı yerden devam edilir.
  useEffect(() => {
    const p = new URLSearchParams({ model, yon });
    if (suankiYol !== "/") p.set("yol", suankiYol);
    window.history.replaceState(null, "", `/simulator?${p}`);
  }, [model, yon, suankiYol]);

  useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "r" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setYon((y) => (y === "dikey" ? "yatay" : "dikey"));
      }
    };
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, []);

  // Uygulama içi geçişler sayfayı yeniden yüklemez (onLoad gelmez); adresi kısa aralıkla okuruz.
  useEffect(() => {
    const id = setInterval(() => {
      try {
        const l = cerceveRef.current?.contentWindow?.location;
        if (l) setSuankiYol(guvenliYol(l.pathname + l.search));
      } catch {
        // Çerçeve başka bir kökene gittiyse adresi okunamaz; önemli değil.
      }
    }, 400);
    return () => clearInterval(id);
  }, []);
  const git = (hedef: string) => cerceveRef.current?.contentWindow?.location.assign(hedef);

  const ekran = ekranBoyutu(model, yon);
  const olcek = alan ? sigdirmaOlcegi(model, yon, alan) : 1;
  const dis = { en: ekran.en + 2 * CERCEVE, boy: ekran.boy + 2 * CERCEVE };

  return (
    <div className="flex h-dvh flex-col bg-[#dfe2e8] dark:bg-[#05060a]">
      <header className="flex flex-wrap items-center gap-2 border-b border-line bg-card px-4 py-2.5 text-sm">
        <span className="mr-auto flex items-center gap-2 font-semibold">
          <span className="grid size-6 place-items-center rounded-md bg-accent text-xs text-accent-ink">✓</span>
          iPad Pro simülatörü
        </span>
        <div className="flex rounded-lg border border-line p-0.5" role="group" aria-label="Model">
          {(Object.keys(IPAD_MODELLERI) as IpadModeli[]).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={model === m}
              onClick={() => setModel(m)}
              className={cx("rounded-md px-2.5 py-1", model === m ? "bg-accent text-accent-ink" : "text-muted hover:text-ink")}
            >
              {m} inç
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setYon((y) => (y === "dikey" ? "yatay" : "dikey"))}
          className="rounded-lg border border-line px-3 py-1.5 hover:bg-soft"
          title="Döndür (R)"
        >
          Döndür · {yon === "dikey" ? "Dikey" : "Yatay"}
        </button>
        <button type="button" onClick={() => git("/")} className="rounded-lg border border-line px-3 py-1.5 hover:bg-soft">
          Ana sayfa
        </button>
        <button
          type="button"
          onClick={() => cerceveRef.current?.contentWindow?.location.reload()}
          className="rounded-lg border border-line px-3 py-1.5 hover:bg-soft"
        >
          Yenile
        </button>
        <span className="w-12 text-right text-xs text-muted tabular-nums" title="Ekrana sığdırma ölçeği">
          %{Math.round(olcek * 100)}
        </span>
      </header>

      <div ref={alanRef} className="relative min-h-0 flex-1 p-4">
        <div className="absolute inset-4 grid place-items-center">
          <div style={{ width: dis.en * olcek, height: dis.boy * olcek }} className={cx(!alan && "invisible")}>
            <div
              data-cihaz={`${model}-${yon}`}
              style={{ width: dis.en, height: dis.boy, padding: CERCEVE, transform: `scale(${olcek})` }}
              className="relative origin-top-left rounded-[46px] bg-[#111214] shadow-2xl ring-1 ring-black/40 dark:ring-white/15"
            >
              {/* Ön kamera: iPad Pro'da yatay kenarın ortasında */}
              <span
                aria-hidden
                className={cx(
                  "absolute size-1.5 rounded-full bg-[#2a2d33]",
                  yon === "yatay" ? "top-1.5 left-1/2 -translate-x-1/2" : "top-1/2 left-1.5 -translate-y-1/2",
                )}
              />
              <div className="flex h-full w-full flex-col overflow-hidden rounded-[28px] bg-bg">
                <DurumCubugu />
                <iframe
                  ref={cerceveRef}
                  src={ilkYol}
                  title="LifeOS — iPad Pro"
                  allow="microphone; clipboard-write"
                  className="min-h-0 w-full flex-1 border-0 bg-bg"
                />
                <div className="grid shrink-0 place-items-center" style={{ height: ALT_PAY }} aria-hidden>
                  <span className="h-[5px] w-36 rounded-full bg-ink/80" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="px-4 pb-3 text-center text-xs text-muted">
        {IPAD_MODELLERI[model].ad} · {ekran.en}×{ekran.boy} · Ana ekrana eklenmiş uygulama görünümü. Dokunma ve Safari&apos;ye
        özgü davranışlar için gerçek iPad ya da Mac&apos;te <code>npm run ipad</code> (Xcode Simulator).
      </p>
    </div>
  );
}
