import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { tick } from "@/lib/server/tick";

// Supabase pg_cron (supabase/cron.sql) veya başka bir zamanlayıcı her
// 5 dakikada bir çağırır: Authorization: Bearer <CRON_SECRET>

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function yetkili(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const gelen = Buffer.from(request.headers.get("authorization") ?? "");
  const beklenen = Buffer.from(`Bearer ${secret}`);
  return gelen.length === beklenen.length && timingSafeEqual(gelen, beklenen);
}

async function calistir(request: NextRequest) {
  if (!yetkili(request)) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  const sonuc = await tick();
  return NextResponse.json(sonuc);
}

export const GET = calistir;
export const POST = calistir;
