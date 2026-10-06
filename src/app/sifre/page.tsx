import Link from "next/link";
import { SifreFormu } from "@/components/sifre-formu";
import { requireUser } from "@/lib/supabase/server";

export const metadata = { title: "Şifre" };

export default async function SifrePage() {
  const { eposta, meta } = await requireUser();
  const ilkGiris = Boolean(meta.sifre_degistirmeli);
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-accent text-xl text-accent-ink">✓</span>
          <h1 className="text-2xl font-semibold tracking-tight">{ilkGiris ? "LifeOS'a hoş geldin" : "Şifreyi değiştir"}</h1>
          <p className="mt-1 text-sm text-muted">
            {ilkGiris ? "Devam etmeden önce kendi şifreni belirle." : eposta}
          </p>
        </div>
        <SifreFormu />
        {!ilkGiris && (
          <Link href="/ayarlar" className="mt-4 block text-center text-sm text-muted hover:text-ink">
            Vazgeç
          </Link>
        )}
      </div>
    </main>
  );
}
