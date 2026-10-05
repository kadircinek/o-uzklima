"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { IkonKapat } from "./icons";

/** Native <dialog> tabanlı pencere: telefonda alttan açılır, Esc ile kapanır. */
export function Pencere({
  acik,
  kapat,
  baslik,
  children,
  alt,
}: {
  acik: boolean;
  kapat: () => void;
  baslik: ReactNode;
  children: ReactNode;
  /** Altta sabit duran düğmeler */
  alt?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (acik && !d.open) d.showModal();
    if (!acik && d.open) d.close();
  }, [acik]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      onClose={kapat}
      onCancel={(e) => {
        e.preventDefault();
        kapat();
      }}
      onClick={(e) => {
        // Arka plana tıklayınca kapat
        if (e.target === ref.current) kapat();
      }}
    >
      {acik && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <h2 className="min-w-0 truncate text-base font-semibold">{baslik}</h2>
            <button
              type="button"
              onClick={kapat}
              className="rounded-lg p-1.5 text-muted hover:bg-soft hover:text-ink"
              aria-label="Kapat"
            >
              <IkonKapat />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
          {alt && <div className="pb-safe border-t border-line px-4 py-3">{alt}</div>}
        </div>
      )}
    </dialog>
  );
}
