import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import type { PostmarkYuk } from "@/lib/eposta";
import { epostaIsle } from "@/lib/server/eposta";

// Postmark gelen e-posta webhook'u. Postmark'ta webhook adresi:
//   https://lifeos:<EPOSTA_WEBHOOK_ANAHTARI>@<uygulama>/api/eposta/gelen
// (adres içindeki kullanıcı adı/şifre Basic Auth olarak gönderilir).

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function esit(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function yetkili(request: NextRequest): boolean {
  const anahtar = process.env.EPOSTA_WEBHOOK_ANAHTARI;
  if (!anahtar) return false;
  const basic = request.headers.get("authorization")?.match(/^Basic\s+(.+)$/i)?.[1];
  if (basic) {
    const cozulmus = Buffer.from(basic, "base64").toString("utf8");
    const sifre = cozulmus.slice(cozulmus.indexOf(":") + 1);
    if (esit(sifre, anahtar)) return true;
  }
  const sorgu = request.nextUrl.searchParams.get("anahtar");
  return sorgu !== null && esit(sorgu, anahtar);
}

export async function POST(request: NextRequest) {
  if (!yetkili(request)) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  const yuk = (await request.json().catch(() => null)) as PostmarkYuk | null;
  if (!yuk || typeof yuk !== "object") return NextResponse.json({ hata: "Geçersiz istek" }, { status: 400 });
  // Reddedilen e-postalar için de 200 dönülür; aksi halde Postmark boşuna yeniden dener.
  return NextResponse.json(await epostaIsle(yuk));
}
