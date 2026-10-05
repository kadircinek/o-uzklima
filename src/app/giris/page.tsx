import { redirect } from "next/navigation";
import { GirisFormu } from "@/components/giris-formu";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Giriş" };

export default async function GirisSayfasi({ searchParams }: { searchParams: Promise<{ sonra?: string }> }) {
  const { sonra } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub) redirect("/");

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-accent text-xl text-accent-ink">✓</span>
          <h1 className="text-2xl font-semibold tracking-tight">LifeOS</h1>
          <p className="mt-1 text-sm text-muted">Aklına geleni 5 saniyede at, doğru zamanda geri gelsin.</p>
        </div>
        <GirisFormu sonra={sonra ?? "/"} />
      </div>
    </main>
  );
}
