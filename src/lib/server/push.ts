import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import webpush, { WebPushError } from "web-push";
import type { Db } from "./ops";

export function pushYapilandirildiMi(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let vapidAyarlandi = false;
function vapid() {
  if (vapidAyarlandi) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:lifeos@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  vapidAyarlandi = true;
}

// Bildirimdeki "Bitti" / "Ertele" düğmeleri oturum olmadan da çalışsın diye
// her bildirime kullanıcı + göreve bağlı bir imza eklenir.
function imzaAnahtari(): string | null {
  const s = process.env.CRON_SECRET;
  return s ? `lifeos-push-aksiyon:${s}` : null;
}

export function aksiyonImzasi(userId: string, taskId: string): string | null {
  const anahtar = imzaAnahtari();
  if (!anahtar) return null;
  return createHmac("sha256", anahtar).update(`${userId}:${taskId}`).digest("base64url");
}

export function aksiyonImzasiDogru(userId: string, taskId: string, imza: string): boolean {
  const beklenen = aksiyonImzasi(userId, taskId);
  if (!beklenen) return false;
  const a = Buffer.from(beklenen);
  const b = Buffer.from(imza);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type PushYuku = {
  baslik: string;
  govde: string;
  /** Bildirime dokununca açılacak sayfa */
  url: string;
  /** Aynı etiketli bildirim öncekinin yerine geçer */
  etiket: string;
  /** Varsa bildirimde Bitti / Ertele / Aç düğmeleri gösterilir */
  aksiyon?: { gorev: string; kullanici: string; imza: string };
};

/** Kullanıcının tüm cihazlarına gönderir; süresi dolmuş abonelikleri siler. Ulaşan cihaz sayısını döner. */
export async function kullaniciyaGonder(db: Db, userId: string, yuk: PushYuku): Promise<number> {
  if (!pushYapilandirildiMi()) return 0;
  vapid();
  const { data: abonelikler } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (!abonelikler?.length) return 0;

  const govde = JSON.stringify(yuk);
  let ulasan = 0;
  await Promise.all(
    abonelikler.map(async (a) => {
      try {
        await webpush.sendNotification(
          { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
          govde,
          { TTL: 60 * 60 * 12, urgency: "normal" },
        );
        ulasan++;
      } catch (e) {
        if (e instanceof WebPushError && (e.statusCode === 404 || e.statusCode === 410)) {
          await db.from("push_subscriptions").delete().eq("id", a.id);
        } else {
          console.error("Push gönderilemedi", e);
        }
      }
    }),
  );
  return ulasan;
}
