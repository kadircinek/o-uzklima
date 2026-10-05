// Hatırlatma motoru: /api/cron/tick, günlük özet, günlük sınır, şifreli Web
// Push ve bildirimdeki Bitti/Ertele düğmeleri. Sahte bir push servisi
// (HTTPS) gelen bildirimleri çözer; uygulama NODE_EXTRA_CA_CERTS ile bu
// sertifikaya güvenecek şekilde başlatılmalıdır (e2e/calistir.sh).

import { createECDH, createHmac, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import https from "node:https";
import { createRequire } from "node:module";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ayarlariTamamla } from "@/lib/domain";
import { ozetZamaniMi } from "@/lib/engine";
import { ertelemeGunu, gunHatirlatmasi } from "@/lib/rules";
import { BUGUN, CRON_SECRET, db, kullaniciId, UYGULAMA } from "./yardimci";

const ece = createRequire(import.meta.url)("http_ece") as {
  decrypt(b: Buffer, o: { version: string; privateKey: ReturnType<typeof createECDH>; authSecret: Buffer }): Buffer;
};

type Yuk = { baslik: string; govde: string; etiket: string; aksiyon?: { gorev: string; kullanici: string; imza: string } };

const SERTIFIKA = process.env.E2E_PUSH_CERT ?? "e2e/.cikti/push-cert.pem";
const ANAHTAR = process.env.E2E_PUSH_KEY ?? "e2e/.cikti/push-key.pem";

const istemci = createECDH("prime256v1");
istemci.generateKeys();
const authSecret = randomBytes(16);
const gelenler: { yuk: Yuk; vapid: boolean }[] = [];
let durumKodu = 201;
let sunucu: https.Server;
let userId: string;

const tick = async () =>
  (await fetch(UYGULAMA + "/api/cron/tick", { method: "POST", headers: { Authorization: `Bearer ${CRON_SECRET}` } })).json();
const bekle = (ms: number) => new Promise((c) => setTimeout(c, ms));
const imza = (gorev: string) => createHmac("sha256", `lifeos-push-aksiyon:${CRON_SECRET}`).update(`${userId}:${gorev}`).digest("base64url");
const aksiyon = (govde: object) =>
  fetch(UYGULAMA + "/api/push/action", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(govde) });

async function gorevEkle(baslik: string, alanlar: Record<string, unknown> = {}) {
  const { data, error } = await db.from("tasks").insert({ user_id: userId, baslik, ...alanlar }).select("id").single();
  if (error) throw error;
  return data.id;
}

beforeAll(async () => {
  userId = await kullaniciId();
  sunucu = https
    .createServer({ key: readFileSync(ANAHTAR), cert: readFileSync(SERTIFIKA) }, (req, res) => {
      const parcalar: Buffer[] = [];
      req.on("data", (c) => parcalar.push(c));
      req.on("end", () => {
        const duz = ece.decrypt(Buffer.concat(parcalar), { version: "aes128gcm", privateKey: istemci, authSecret });
        gelenler.push({ yuk: JSON.parse(duz.toString()), vapid: String(req.headers.authorization ?? "").startsWith("vapid t=") });
        res.writeHead(durumKodu);
        res.end();
      });
    })
    .listen(4020, "127.0.0.1");

  await db.from("tasks").delete().eq("user_id", userId);
  await db.from("notification_log").delete().eq("user_id", userId);
  await db.from("push_subscriptions").delete().eq("user_id", userId);
  await db.from("push_subscriptions").insert({
    user_id: userId,
    endpoint: "https://127.0.0.1:4020/push/cihaz1",
    p256dh: istemci.getPublicKey().toString("base64url"),
    auth: authSecret.toString("base64url"),
  });
});

afterAll(() => {
  sunucu?.close();
});

describe("hatırlatma motoru", () => {
  it("cron gizli anahtar olmadan çalışmaz", async () => {
    expect((await fetch(UYGULAMA + "/api/cron/tick")).status).toBe(401);
  });

  it("özet (iş günü 08:30 sonrası) ve ödeme ön hatırlatması; sonraki hatırlatma vade günü", async () => {
    const vade = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10);
    const odeme = await gorevEkle("Ödeme vadesi", {
      tur: "takip",
      kural: "odeme",
      vade,
      hatirlatma_zamani: new Date(Date.now() - 60_000).toISOString(),
    });
    const gecmis = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);
    await gorevEkle("Geciken iş", { tur: "takip", vade: gecmis });
    await gorevEkle("Bugünkü iş", { vade: BUGUN });

    const ozetBekleniyor = ozetZamaniMi(new Date(), ayarlariTamamla(null), false);
    const r = await tick();
    expect(r).toMatchObject({ ozet: ozetBekleniyor ? 1 : 0, hatirlatma: 1 });
    await bekle(300);

    if (ozetBekleniyor) {
      const ozet = gelenler.find((g) => g.yuk.etiket === "ozet")!;
      expect(ozet.vapid).toBe(true);
      expect(ozet.yuk.baslik).toBe("Günaydın · 1 gecikmiş, 1 bugün");
      expect(ozet.yuk.govde).toBe("1. ⚠ 2 gün gecikti: Geciken iş\n2. Bugünkü iş");
    }
    const h = gelenler.find((g) => g.yuk.etiket === `gorev-${odeme}`)!;
    expect(h.yuk.baslik).toMatch(/^Yaklaşıyor/);
    expect(h.yuk.govde).toBe("Ödeme vadesi");
    expect(h.yuk.aksiyon?.imza).toBe(imza(odeme));

    const { data } = await db.from("tasks").select("hatirlatma_zamani").eq("id", odeme).single();
    expect(new Date(data!.hatirlatma_zamani!).toISOString()).toBe(gunHatirlatmasi(vade, ayarlariTamamla(null)).toISOString());
  });

  it("aynı gün ikinci çağrıda özet tekrar gitmez", async () => {
    expect(await tick()).toMatchObject({ ozet: 0, hatirlatma: 0 });
  });

  it("günde en fazla 6 hatırlatma; fazlası özete kalır, en eskiler önce gider", async () => {
    const idler: string[] = [];
    for (let i = 0; i < 8; i++) {
      idler.push(await gorevEkle(`Sınır ${i}`, { vade: BUGUN, hatirlatma_zamani: new Date(Date.now() - (10 - i) * 60_000).toISOString() }));
    }
    expect(await tick()).toMatchObject({ hatirlatma: 5, ozete: 3 });
    const { data: kalan } = await db.from("tasks").select("id").in("id", idler).not("hatirlatma_zamani", "is", null);
    expect(kalan).toEqual([]);
    const { data: log } = await db.from("notification_log").select("task_id").eq("user_id", userId).eq("tur", "hatirlatma");
    const gidenler = new Set(log!.map((l) => l.task_id));
    expect(idler.map((id) => gidenler.has(id))).toEqual([true, true, true, true, true, false, false, false]);
  });

  it("bildirimdeki Bitti ve Ertele düğmeleri (imzalı, oturumsuz)", async () => {
    const { data } = await db.from("tasks").select("id, baslik").eq("user_id", userId).in("baslik", ["Sınır 0", "Sınır 1"]).order("baslik");
    const [g0, g1] = data!;
    expect((await aksiyon({ aksiyon: "bitti", gorev: g0.id, kullanici: userId, imza: imza(g1.id) })).status).toBe(401);
    expect((await aksiyon({ aksiyon: "bitti", gorev: g0.id, kullanici: userId, imza: imza(g0.id) })).status).toBe(200);
    expect((await aksiyon({ aksiyon: "ertele", gorev: g1.id, kullanici: userId, imza: imza(g1.id) })).status).toBe(200);
    const { data: sonra } = await db.from("tasks").select("durum, vade").in("id", [g0.id, g1.id]).order("baslik");
    expect(sonra).toEqual([
      { durum: "bitti", vade: BUGUN },
      { durum: "ertelendi", vade: ertelemeGunu("yarin", BUGUN, ayarlariTamamla(null)) },
    ]);
  });

  it("süresi dolmuş abonelik (410) silinir", async () => {
    durumKodu = 410;
    await db.from("notification_log").delete().eq("user_id", userId).eq("tur", "hatirlatma");
    await gorevEkle("Abonelik testi", { hatirlatma_zamani: new Date(Date.now() - 60_000).toISOString() });
    await tick();
    const { count } = await db.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", userId);
    expect(count).toBe(0);
  });
});
