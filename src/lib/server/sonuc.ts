import "server-only";
import { z } from "zod";
import { AyristirmaHatasi } from "./claude";
import { IsHatasi } from "./ops";

export type Sonuc<T = undefined> = { ok: true; veri: T } | { ok: false; hata: string };

/** Server action gövdesini sarar: beklenen hataları kullanıcı mesajına çevirir. */
export async function guvenli<T>(fn: () => Promise<T>): Promise<Sonuc<T>> {
  try {
    return { ok: true, veri: await fn() };
  } catch (e) {
    if (e instanceof IsHatasi || e instanceof AyristirmaHatasi) return { ok: false, hata: e.message };
    if (e instanceof z.ZodError) return { ok: false, hata: "Geçersiz veri: " + e.issues.map((i) => i.message).join(", ") };
    // redirect()/notFound() Next.js tarafından fırlatılır; yutulmamalı.
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error(e);
    return { ok: false, hata: "Beklenmeyen bir hata oluştu." };
  }
}
