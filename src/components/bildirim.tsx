"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { cx } from "./ui";

type Mesaj = { id: number; metin: string; tur: "bilgi" | "hata"; geriAl?: () => void };
type Goster = (metin: string, secenek?: { tur?: Mesaj["tur"]; geriAl?: () => void }) => void;

const Baglam = createContext<Goster>(() => {});

/** Ekranın altında kısa süreli bilgi mesajları. */
export function BildirimSaglayici({ children }: { children: ReactNode }) {
  const [mesajlar, setMesajlar] = useState<Mesaj[]>([]);
  const sayac = useRef(0);

  const goster = useCallback<Goster>((metin, secenek = {}) => {
    const id = ++sayac.current;
    setMesajlar((m) => [...m.slice(-2), { id, metin, tur: secenek.tur ?? "bilgi", geriAl: secenek.geriAl }]);
    setTimeout(() => setMesajlar((m) => m.filter((x) => x.id !== id)), secenek.geriAl ? 6000 : 3500);
  }, []);

  return (
    <Baglam.Provider value={goster}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6"
        aria-live="polite"
      >
        {mesajlar.map((m) => (
          <div
            key={m.id}
            className={cx(
              "pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm shadow-lg",
              m.tur === "hata" ? "bg-danger text-white" : "bg-ink text-bg",
            )}
          >
            <span>{m.metin}</span>
            {m.geriAl && (
              <button
                type="button"
                className="font-semibold underline underline-offset-2"
                onClick={() => {
                  m.geriAl?.();
                  setMesajlar((x) => x.filter((y) => y.id !== m.id));
                }}
              >
                Geri al
              </button>
            )}
          </div>
        ))}
      </div>
    </Baglam.Provider>
  );
}

export function useBildirim(): Goster {
  return useContext(Baglam);
}
