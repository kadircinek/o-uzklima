import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Oturum çerezlerini tazeler ve oturumu olmayanı giriş sayfasına yönlendirir.
// Asıl yetki denetimi sayfalarda/aksiyonlarda requireUser() ve veritabanında
// RLS ile yapılır; burası yalnızca iyimser bir kontroldür.

const ACIK_YOLLAR = ["/giris", "/kurulum", "/api/cron", "/api/push/action"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    if (pathname.startsWith("/kurulum") || pathname.startsWith("/api/")) return NextResponse.next();
    return NextResponse.redirect(new URL("/kurulum", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [k, v] of Object.entries(headers)) response.headers.set(k, v);
      },
    },
  });

  // getClaims() JWT'yi doğrular ve gerekirse oturumu yeniler.
  const { data } = await supabase.auth.getClaims();
  const girisYapmis = Boolean(data?.claims?.sub);

  if (!girisYapmis && !ACIK_YOLLAR.some((p) => pathname.startsWith(p))) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ hata: "Oturum gerekli" }, { status: 401 });
    }
    const giris = new URL("/giris", request.url);
    if (pathname !== "/") giris.searchParams.set("sonra", pathname + request.nextUrl.search);
    return NextResponse.redirect(giris);
  }

  return response;
}

export const config = {
  matcher: [
    // Statik dosyalar, ikonlar, manifest ve service worker hariç her şey
    "/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
