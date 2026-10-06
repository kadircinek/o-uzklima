import "server-only";
import { randomInt } from "node:crypto";

// Ekip yönetimi: yönetici (YONETICI_EPOSTALARI) ofisteki arkadaşlarına hesap
// açar. Herkesin verisi kendine özeldir; hesap açmak veri paylaşmak değildir.

export function yoneticiMi(eposta: string | null | undefined): boolean {
  if (!eposta) return false;
  const liste = (process.env.YONETICI_EPOSTALARI ?? "")
    .split(/[\s,;]+/)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  return liste.includes(eposta.toLowerCase());
}

const HARFLER = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Okunması ve elle yazılması kolay geçici şifre (ör. "Kx7m-Pq2r-W9tz"). */
export function geciciSifre(): string {
  const parca = () => Array.from({ length: 4 }, () => HARFLER[randomInt(HARFLER.length)]).join("");
  return `${parca()}-${parca()}-${parca()}`;
}

export type EkipUyesi = {
  id: string;
  eposta: string;
  ad: string | null;
  son_giris: string | null;
  olusturma: string;
  sifre_degistirmeli: boolean;
  /** Oturumdaki kullanıcının kendisi */
  ben: boolean;
};
