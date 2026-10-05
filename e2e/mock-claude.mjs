// Uçtan uca testler için Claude API taklidi. İsteğin biçimini doğrular
// (model, yapılandırılmış çıktı şeması, efor, yedek model başlığı) ve PRD
// senaryolarına göre sabit ayrıştırma sonuçları döner.
//
//   node e2e/mock-claude.mjs            → 127.0.0.1:4010
//   Uygulamayı ANTHROPIC_BASE_URL=http://127.0.0.1:4010 ile başlatın.

import http from "node:http";

const gun = (bugun, ekle) => {
  const d = new Date(bugun + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + ekle);
  return d.toISOString().slice(0, 10);
};
const sonrakiHaftaGunu = (bugun, hedef) => {
  const d = new Date(bugun + "T00:00:00Z");
  let f = (hedef - d.getUTCDay() + 7) % 7;
  if (f === 0) f = 7;
  return gun(bugun, f);
};

export function cevap(girdi, bugun, toplanti) {
  const t = { tur: "gorev", baslik: girdi.slice(0, 60), firma: null, kisi: null, urun: null, tarih: null, hatirlatma: null, guven: 0.9, olay: "yok", tekrar: null, ozet: null, aksiyonlar: [] };
  if (toplanti) {
    return {
      ...t,
      tur: "not",
      baslik: "Acme ziyareti",
      firma: "Acme Plastik",
      kisi: "Ayşe",
      ozet: "Acme ile Vistamaxx ihtiyacı görüşüldü; Q1 için 20 ton potansiyel.",
      aksiyonlar: [
        { tur: "gorev", baslik: "Vistamaxx fiyatı gönder", tarih: gun(bugun, 2) },
        { tur: "bekleme", baslik: "Yıllık tüketim tahmini", tarih: null },
      ],
    };
  }
  if (/teklifi gitti/i.test(girdi)) return { ...t, tur: "takip", olay: "teklif_gonderildi", baslik: "Lucon teklifine dönüş geldi mi?", firma: "ACME plastik", urun: "Lucon" };
  if (/numunesi kargolandı/i.test(girdi)) return { ...t, tur: "takip", olay: "numune_gonderildi", baslik: "Vistamaxx numunesi için geri bildirim iste", firma: "Yıldız Ambalaj", urun: "Vistamaxx" };
  if (/perşembe fiyat/i.test(girdi)) return { ...t, baslik: "Ali'ye fiyat dön", kisi: "Ali", tarih: sonrakiHaftaGunu(bugun, 4) };
  if (/TDS bekliyorum/i.test(girdi)) return { ...t, tur: "bekleme", baslik: "TDS gelecek", firma: "Basechem" };
  if (/vadeli ödeme/i.test(girdi)) return { ...t, tur: "vade", olay: "odeme_vadesi", baslik: "Ödeme vadesi", firma: "Zeta Kimya", tarih: gun(bugun, 40) };
  const ay = /her ay (\d+)/i.exec(girdi);
  if (ay) return { ...t, baslik: "Stok raporu", tekrar: `aylik:${Number(ay[1])}` };
  if (/hatalı tarih/i.test(girdi)) return { ...t, tarih: "2026-02-31", guven: 0.95 };
  return { ...t, guven: 0.4 };
}

export function istekHatalari(req, b) {
  const h = [];
  if (!req.url.startsWith("/v1/messages")) h.push("url " + req.url);
  if (b.model !== (process.env.ANTHROPIC_MODEL || "claude-opus-5-5")) h.push("model " + b.model);
  if (!String(req.headers["anthropic-beta"] ?? "").includes("server-side-fallback-2026-07-01")) h.push("beta başlığı");
  if (b.fallbacks !== "default") h.push("fallbacks");
  if (b.output_config?.effort !== "low") h.push("effort");
  const sema = b.output_config?.format?.schema;
  if (b.output_config?.format?.type !== "json_schema" || !sema?.properties?.guven || !sema?.properties?.aksiyonlar) h.push("şema");
  if (b.thinking || b.temperature !== undefined) h.push("yasak parametre");
  if (!Array.isArray(b.system) || !b.system[1]?.cache_control) h.push("system/cache");
  if (!/Bugün: \d{4}-\d{2}-\d{2}/.test(b.messages?.[0]?.content ?? "")) h.push("bugün");
  return h;
}

export const istekler = [];

export function baslat(port = 4010) {
  return new Promise((coz) => {
    const sunucu = http.createServer((req, res) => {
      let govde = "";
      req.on("data", (c) => (govde += c));
      req.on("end", () => {
        let b = {};
        try {
          b = JSON.parse(govde);
        } catch {
          /* aşağıda hata olarak döner */
        }
        const hatalar = istekHatalari(req, b);
        const mesaj = b.messages?.[0]?.content ?? "";
        istekler.push({ hatalar, mesaj });
        if (hatalar.length) {
          res.writeHead(400, { "content-type": "application/json" });
          return res.end(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: hatalar.join(", ") } }));
        }
        const bugun = /Bugün: (\d{4}-\d{2}-\d{2})/.exec(mesaj)[1];
        const girdi = mesaj.split("Girdi:\n")[1] ?? "";
        const cikti = cevap(girdi, bugun, mesaj.includes("Mod: toplantı"));
        res.writeHead(200, { "content-type": "application/json", "request-id": "req_mock" });
        res.end(
          JSON.stringify({
            id: "msg_mock",
            type: "message",
            role: "assistant",
            model: b.model,
            content: [{ type: "text", text: JSON.stringify(cikti) }],
            stop_reason: "end_turn",
            stop_sequence: null,
            usage: { input_tokens: 100, output_tokens: 50 },
          }),
        );
      });
    });
    sunucu.listen(port, "127.0.0.1", () => coz(sunucu));
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await baslat(Number(process.env.PORT ?? 4010));
  console.log("Claude taklidi: http://127.0.0.1:4010");
}
