"use client";

import { tekrarCoz } from "@/lib/rules";
import { Girdi, Secici } from "./ui";

const HAFTA = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

/** Tekrar kuralı seçici: yok / her iş günü / haftalık / aylık / yıllık. */
export function TekrarSecici({ deger, degistir }: { deger: string | null; degistir: (v: string | null) => void }) {
  const k = tekrarCoz(deger);
  const tip = k?.tip ?? "yok";

  return (
    <div className="flex gap-2">
      <Secici
        value={tip}
        aria-label="Tekrar"
        className="flex-1"
        onChange={(e) => {
          const t = e.target.value;
          if (t === "yok") degistir(null);
          else if (t === "gunluk") degistir("gunluk");
          else if (t === "haftalik") degistir("haftalik:1");
          else if (t === "aylik") degistir(`aylik:${new Date().getDate()}`);
          else if (t === "yillik") {
            const d = new Date();
            degistir(`yillik:${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
          }
        }}
      >
        <option value="yok">Tekrar yok</option>
        <option value="gunluk">Her iş günü</option>
        <option value="haftalik">Her hafta</option>
        <option value="aylik">Her ay</option>
        <option value="yillik">Her yıl</option>
      </Secici>
      {k?.tip === "haftalik" && (
        <Secici value={k.gun} aria-label="Hafta günü" className="flex-1" onChange={(e) => degistir(`haftalik:${e.target.value}`)}>
          {HAFTA.map((g, i) => (
            <option key={g} value={i + 1}>
              {g}
            </option>
          ))}
        </Secici>
      )}
      {k?.tip === "aylik" && (
        <label className="flex flex-1 items-center gap-2 text-sm text-muted">
          <Girdi
            type="number"
            min={1}
            max={31}
            value={k.gun}
            aria-label="Ayın günü"
            onChange={(e) => {
              const n = Math.min(31, Math.max(1, Number(e.target.value) || 1));
              degistir(`aylik:${n}`);
            }}
          />
          <span className="whitespace-nowrap">. gün</span>
        </label>
      )}
      {k?.tip === "yillik" && (
        <Girdi
          type="date"
          aria-label="Yıllık gün"
          className="flex-1"
          value={`2024-${String(k.ay).padStart(2, "0")}-${String(k.gun).padStart(2, "0")}`}
          onChange={(e) => {
            const v = e.target.value;
            if (v) degistir(`yillik:${v.slice(5)}`);
          }}
        />
      )}
    </div>
  );
}
