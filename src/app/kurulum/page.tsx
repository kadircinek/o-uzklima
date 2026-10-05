import { redirect } from "next/navigation";

export const metadata = { title: "Kurulum" };
export const dynamic = "force-dynamic";

// Supabase ortam değişkenleri tanımlı değilken her istek buraya yönlenir.
export default function KurulumSayfasi() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    redirect("/");
  }
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">LifeOS kurulumu</h1>
      <p className="mt-2 text-muted">Uygulamanın çalışması için Supabase bağlantısı gerekli.</p>
      <ol className="mt-6 list-decimal space-y-3 pl-5 text-[15px] leading-relaxed">
        <li>supabase.com&apos;da bir proje oluşturun.</li>
        <li>
          <code className="rounded bg-soft px-1">supabase/migrations</code> klasöründeki SQL dosyalarını sırayla SQL Editor&apos;de
          çalıştırın.
        </li>
        <li>Authentication → Users bölümünden kendi kullanıcınızı (e-posta + şifre) ekleyin.</li>
        <li>
          <code className="rounded bg-soft px-1">.env.example</code> dosyasını <code className="rounded bg-soft px-1">.env.local</code>{" "}
          olarak kopyalayıp değerleri doldurun (Vercel&apos;de: Project → Settings → Environment Variables).
        </li>
        <li>Uygulamayı yeniden başlatın.</li>
      </ol>
      <p className="mt-6 text-sm text-muted">Ayrıntılar README.md dosyasında.</p>
    </main>
  );
}
