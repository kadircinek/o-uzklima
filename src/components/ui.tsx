// Ortak arayüz parçaları. Durum tutmazlar; hem sunucu hem istemci
// bileşenlerinde kullanılabilirler.

import type { ComponentProps, ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(" ");
}

type ButonTuru = "birincil" | "ikincil" | "hayalet" | "tehlike";
const BUTON: Record<ButonTuru, string> = {
  birincil: "bg-accent text-accent-ink hover:opacity-90",
  ikincil: "bg-card text-ink border border-line hover:bg-soft",
  hayalet: "text-muted hover:bg-soft hover:text-ink",
  tehlike: "text-danger hover:bg-danger-soft",
};

export function Buton({
  tur = "ikincil",
  kucuk,
  className,
  ...p
}: ComponentProps<"button"> & { tur?: ButonTuru; kucuk?: boolean }) {
  return (
    <button
      type="button"
      {...p}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        kucuk ? "h-8 px-2.5 text-sm" : "h-10 px-4 text-sm",
        BUTON[tur],
        className,
      )}
    />
  );
}

const ALAN =
  "w-full rounded-lg border border-line bg-card px-3 text-[15px] text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:opacity-60";

export function Girdi({ className, ...p }: ComponentProps<"input">) {
  return <input {...p} className={cx(ALAN, "h-10", className)} />;
}

export function Secici({ className, ...p }: ComponentProps<"select">) {
  return <select {...p} className={cx(ALAN, "h-10 pr-8", className)} />;
}

export function MetinAlani({ className, ...p }: ComponentProps<"textarea">) {
  return <textarea {...p} className={cx(ALAN, "py-2 leading-relaxed", className)} />;
}

export function Etiket({ ad, children, className }: { ad: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block space-y-1", className)}>
      <span className="text-xs font-medium text-muted">{ad}</span>
      {children}
    </label>
  );
}

type RozetTuru = "notr" | "vurgu" | "tehlike" | "uyari" | "basari";
const ROZET: Record<RozetTuru, string> = {
  notr: "bg-soft text-muted",
  vurgu: "bg-accent-soft text-accent",
  tehlike: "bg-danger-soft text-danger",
  uyari: "bg-warn-soft text-warn",
  basari: "bg-ok-soft text-ok",
};

export function Rozet({ tur = "notr", children, className }: { tur?: RozetTuru; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", ROZET[tur], className)}>
      {children}
    </span>
  );
}

export function Kart({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-xl border border-line bg-card", className)}>{children}</div>;
}

export function Bolum({
  baslik,
  sayi,
  ton,
  aksiyon,
  children,
}: {
  baslik: string;
  sayi?: number;
  ton?: "tehlike";
  aksiyon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2 className={cx("text-sm font-semibold", ton === "tehlike" ? "text-danger" : "text-muted")}>
          {baslik}
          {sayi !== undefined && <span className="ml-1.5 font-normal">{sayi}</span>}
        </h2>
        {aksiyon}
      </div>
      {children}
    </section>
  );
}

export function Bos({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">{children}</p>;
}

export function SayfaBasligi({ baslik, alt, aksiyon }: { baslik: string; alt?: ReactNode; aksiyon?: ReactNode }) {
  return (
    <header className="mb-5 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{baslik}</h1>
        {alt && <p className="mt-0.5 text-sm text-muted">{alt}</p>}
      </div>
      {aksiyon}
    </header>
  );
}

export function Hata({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{children}</p>;
}
