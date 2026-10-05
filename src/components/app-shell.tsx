"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { cikisYap } from "@/app/actions/oturum";
import type { DateStr } from "@/lib/dates";
import type { Ayarlar } from "@/lib/domain";
import { BildirimSaglayici } from "./bildirim";
import { HizliGiris } from "./hizli-giris";
import { IkonArti, IkonAyar, IkonBugun, IkonCikis, IkonFirma, IkonFirsat, IkonGelen, IkonGorev } from "./icons";
import { cx } from "./ui";

const HizliGirisBaglami = createContext<(metin?: string) => void>(() => {});
export const useHizliGiris = () => useContext(HizliGirisBaglami);

type Sayilar = { gelen: number; geciken: number };

const MENU = [
  { yol: "/", ad: "Bugün", ikon: IkonBugun, sayi: (s: Sayilar) => s.geciken, ton: "tehlike" as const },
  { yol: "/gelen-kutusu", ad: "Gelen", uzunAd: "Gelen kutusu", ikon: IkonGelen, sayi: (s: Sayilar) => s.gelen },
  { yol: "/gorevler", ad: "Görevler", ikon: IkonGorev },
  { yol: "/firmalar", ad: "Firmalar", ikon: IkonFirma },
  { yol: "/firsatlar", ad: "Fırsatlar", ikon: IkonFirsat },
];

function aktifMi(yol: string, pathname: string) {
  return yol === "/" ? pathname === "/" : pathname === yol || pathname.startsWith(yol + "/");
}

function yaziyorMu(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return Boolean(t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)));
}

export function AppShell({
  children,
  ayarlar,
  bugun,
  userId,
  sayilar,
}: {
  children: ReactNode;
  ayarlar: Ayarlar;
  bugun: DateStr;
  userId: string;
  sayilar: Sayilar;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [giris, setGiris] = useState<{ acik: boolean; metin: string; anahtar: number }>({
    acik: false,
    metin: "",
    anahtar: 0,
  });

  const ac = useCallback((metin = "") => setGiris((g) => ({ acik: true, metin, anahtar: g.anahtar + 1 })), []);
  const kapat = useCallback(() => {
    setGiris((g) => ({ ...g, acik: false }));
    router.refresh();
  }, [router]);

  // Klavye kısayolu: N veya Ctrl/Cmd+K
  useEffect(() => {
    function tus(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ac();
      } else if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === "n" && !yaziyorMu(e)) {
        e.preventDefault();
        ac();
      }
    }
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, [ac]);

  // Bildirimler için service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    }
  }, []);

  return (
    <BildirimSaglayici>
      <HizliGirisBaglami.Provider value={ac}>
        <div className="md:flex">
          {/* Masaüstü yan menü */}
          <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-card px-3 py-4 md:flex">
            <Link href="/" className="mb-5 flex items-center gap-2 px-2 text-lg font-semibold">
              <span className="grid size-7 place-items-center rounded-lg bg-accent text-accent-ink">✓</span>
              LifeOS
            </Link>
            <button
              type="button"
              onClick={() => ac()}
              className="mb-4 flex h-10 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-medium text-accent-ink hover:opacity-90"
            >
              <IkonArti className="size-4" />
              Hızlı giriş
              <kbd className="ml-auto rounded bg-white/20 px-1.5 text-xs">N</kbd>
            </button>
            <nav className="space-y-0.5">
              {MENU.map((m) => {
                const sayi = m.sayi?.(sayilar) ?? 0;
                return (
                  <Link
                    key={m.yol}
                    href={m.yol}
                    className={cx(
                      "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm",
                      aktifMi(m.yol, pathname) ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-soft hover:text-ink",
                    )}
                  >
                    <m.ikon />
                    {m.uzunAd ?? m.ad}
                    {sayi > 0 && (
                      <span
                        className={cx(
                          "ml-auto rounded-full px-1.5 text-xs font-semibold",
                          m.ton === "tehlike" ? "bg-danger-soft text-danger" : "bg-soft text-ink",
                        )}
                      >
                        {sayi}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-auto space-y-0.5">
              <Link
                href="/ayarlar"
                className={cx(
                  "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm",
                  aktifMi("/ayarlar", pathname) ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-soft hover:text-ink",
                )}
              >
                <IkonAyar />
                Ayarlar
              </Link>
              <form action={cikisYap}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-muted hover:bg-soft hover:text-ink"
                >
                  <IkonCikis />
                  Çıkış
                </button>
              </form>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            {/* Telefon üst çubuğu */}
            <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
              <Link href="/" className="flex h-12 items-center gap-2 font-semibold">
                <span className="grid size-6 place-items-center rounded-md bg-accent text-xs text-accent-ink">✓</span>
                LifeOS
              </Link>
              <Link href="/ayarlar" aria-label="Ayarlar" className="rounded-lg p-2 text-muted hover:bg-soft">
                <IkonAyar />
              </Link>
            </header>

            <main
              className={cx(
                "mx-auto px-4 pt-5 pb-32 md:px-8 md:pt-8 md:pb-12",
                // Aşama panosu geniş ekranda tüm sütunları göstersin
                pathname.startsWith("/firsatlar") ? "max-w-7xl" : "max-w-3xl",
              )}
            >
              {children}
            </main>
          </div>
        </div>

        {/* Hızlı giriş düğmesi: her ekranda sabit */}
        <button
          type="button"
          onClick={() => ac()}
          aria-label="Hızlı giriş"
          className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 grid size-14 place-items-center rounded-full bg-accent text-accent-ink shadow-lg shadow-accent/30 active:scale-95 md:right-8 md:bottom-8"
        >
          <IkonArti className="size-7" />
        </button>

        {/* Telefon alt menü */}
        <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-card/95 backdrop-blur md:hidden">
          {MENU.map((m) => {
            const sayi = m.sayi?.(sayilar) ?? 0;
            const aktif = aktifMi(m.yol, pathname);
            return (
              <Link
                key={m.yol}
                href={m.yol}
                className={cx("relative flex flex-col items-center gap-0.5 py-2 text-[11px]", aktif ? "text-accent" : "text-muted")}
              >
                <m.ikon className="size-6" />
                {m.ad}
                {sayi > 0 && (
                  <span
                    className={cx(
                      "absolute top-1 left-1/2 ml-2 min-w-4 rounded-full px-1 text-center text-[10px] leading-4 font-semibold",
                      m.ton === "tehlike" ? "bg-danger text-white" : "bg-ink text-bg",
                    )}
                  >
                    {sayi}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <HizliGiris
          key={giris.anahtar}
          acik={giris.acik}
          kapat={kapat}
          baslangicMetni={giris.metin}
          ayarlar={ayarlar}
          bugun={bugun}
          userId={userId}
        />
      </HizliGirisBaglami.Provider>
    </BildirimSaglayici>
  );
}
