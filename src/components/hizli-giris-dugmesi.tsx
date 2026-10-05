"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useHizliGiris } from "./app-shell";

/** Metin içinde hızlı giriş penceresini açan bağlantı görünümlü düğme. */
export function HizliGirisDugmesi({ children, metin }: { children: ReactNode; metin?: string }) {
  const ac = useHizliGiris();
  return (
    <button type="button" onClick={() => ac(metin)} className="font-medium text-accent hover:underline">
      {children}
    </button>
  );
}

/**
 * Sayfa açılınca hızlı girişi verilen metinle açar ve Bugün ekranına geçer
 * (ana ekran kısayolu ?ekle=1 ve paylaşım hedefi /paylas). Pencere
 * yerleşimde (layout) olduğu için yönlendirmeden sonra da açık kalır.
 */
export function HizliGirisiAc({ metin }: { metin: string }) {
  const ac = useHizliGiris();
  const router = useRouter();
  useEffect(() => {
    ac(metin);
    router.replace("/");
  }, [ac, metin, router]);
  return null;
}
