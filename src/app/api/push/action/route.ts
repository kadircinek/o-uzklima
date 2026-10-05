import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { ayarlariGetir, gorevErtele, gorevTamamla } from "@/lib/server/ops";
import { aksiyonImzasiDogru } from "@/lib/server/push";

// Bildirimdeki "Bitti" ve "Ertele" düğmeleri. Service worker oturum çerezi
// olmadan da çağırabilsin diye istek, bildirime eklenen imzayla doğrulanır.

const Govde = z.object({
  aksiyon: z.enum(["bitti", "ertele"]),
  gorev: z.uuid(),
  kullanici: z.uuid(),
  imza: z.string().min(10).max(200),
});

export async function POST(request: NextRequest) {
  const govde = Govde.safeParse(await request.json().catch(() => null));
  if (!govde.success) return NextResponse.json({ hata: "Geçersiz istek" }, { status: 400 });
  const { aksiyon, gorev, kullanici, imza } = govde.data;
  if (!aksiyonImzasiDogru(kullanici, gorev, imza)) {
    return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  }

  const db = createAdminClient();
  const ayarlar = await ayarlariGetir(db, kullanici);
  if (aksiyon === "bitti") await gorevTamamla(db, kullanici, gorev, ayarlar);
  else await gorevErtele(db, kullanici, gorev, "yarin", ayarlar);
  return NextResponse.json({ tamam: true });
}
