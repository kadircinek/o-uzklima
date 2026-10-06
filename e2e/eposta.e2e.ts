// E-posta bağlantısı: Postmark biçiminde gelen e-postalar /api/eposta/gelen
// adresine gönderilir. İletilen e-posta gelen kutusuna, gizli kopya firmaya
// not olarak düşer; izinsiz gönderenler ve tekrarlar reddedilir.

import type { Browser, Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { kisiselAdres, type PostmarkYuk } from "@/lib/eposta";
import { db, EPOSTA, girisYap, kullaniciId, tarayici, UYGULAMA } from "./yardimci";

const GELEN = process.env.EPOSTA_GELEN_ADRESI!;
const ANAHTAR = process.env.EPOSTA_WEBHOOK_ANAHTARI!;
const IS_ADRESI = "satis@buteo.example";

let b: Browser;
let page: Page;
let userId: string;
let adres: string;
let sayac = 0;

async function gonder(yuk: PostmarkYuk, anahtar = ANAHTAR) {
  const y = await fetch(`${UYGULAMA}/api/eposta/gelen`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Basic " + Buffer.from(`lifeos:${anahtar}`).toString("base64") },
    body: JSON.stringify(yuk),
  });
  return { durum: y.status, govde: (await y.json()) as { sonuc: string; aciklama: string } };
}

function yuk(p: { kimden: string; kime: string[]; cc?: string[]; bcc?: string[]; konu: string; metin: string; id?: string }): PostmarkYuk {
  const anahtar = adres.split("+")[1].split("@")[0];
  return {
    FromFull: { Email: p.kimden, Name: "Kullanıcı" },
    ToFull: p.kime.map((Email) => ({ Email })),
    CcFull: (p.cc ?? []).map((Email) => ({ Email })),
    BccFull: (p.bcc ?? []).map((Email) => ({ Email })),
    OriginalRecipient: adres,
    MailboxHash: anahtar,
    Subject: p.konu,
    MessageID: p.id ?? `e2e-${Date.now()}-${sayac++}`,
    Date: new Date().toUTCString(),
    TextBody: p.metin,
    Attachments: [],
  };
}

async function firma(ad: string) {
  const { data } = await db.from("companies").select("*").eq("user_id", userId).eq("ad", ad).single();
  return data!;
}

const ILETI = (kimden: string, konu: string, govde: string, not = "") =>
  [not, "", "________________________________", `Kimden: ${kimden}`, "Gönderildi: 6 Ekim 2026 Salı 10:00", `Konu: ${konu}`, "", govde].join("\n");

beforeAll(async () => {
  userId = await kullaniciId();
  const { data } = await db.from("settings").select("eposta_anahtari").eq("user_id", userId).single();
  adres = kisiselAdres(GELEN, data!.eposta_anahtari);
  const { error } = await db.from("companies").insert([
    { user_id: userId, ad: "Kuzey Kablo", tur: "musteri", eposta_alanlari: ["kuzey.example"] },
    { user_id: userId, ad: "Delta Polimer", tur: "musteri", eposta_alanlari: [] },
  ]);
  if (error) throw error;
  b = await tarayici();
  page = await (await b.newContext({ viewport: { width: 390, height: 844 }, locale: "tr-TR" })).newPage();
  page.on("dialog", (d) => void d.accept());
  await girisYap(page);
});

afterAll(async () => {
  await b?.close();
});

describe("e-posta bağlantısı", () => {
  it("yanlış webhook anahtarı reddedilir", async () => {
    const r = await gonder(yuk({ kimden: EPOSTA, kime: [adres], konu: "x", metin: "x" }), "yanlis");
    expect(r.durum).toBe(401);
  });

  it("Ayarlar kişisel adresi gösterir; iş adresi izinli gönderenlere eklenir", async () => {
    await page.goto(UYGULAMA + "/ayarlar");
    await page.getByText(adres).waitFor();
    await page.getByPlaceholder("ad@buteo.com.tr").fill(IS_ADRESI);
    await page.locator("#eposta").getByRole("button", { name: "Ekle" }).click();
    await page.getByText("Gönderen eklendi").waitFor();
    const { data } = await db.from("settings").select("eposta_gondericiler").eq("user_id", userId).single();
    expect(data!.eposta_gondericiler).toEqual([IS_ADRESI]);
  });

  it("iletilen e-posta gelen kutusuna düşer; firma gönderenin alan adından bulunur", async () => {
    const r = await gonder(
      yuk({
        kimden: EPOSTA,
        kime: [adres],
        konu: "İlt: Lucon teklif talebi",
        metin: ILETI("Mehmet Öz <mehmet@kuzey.example>", "Lucon teklif talebi", "60 ton Lucon için fiyat rica ederiz.", "perşembe dönüş yap"),
        id: "ileti-1",
      }),
    );
    expect(r.govde).toMatchObject({ sonuc: "gelen_kutusu" });
    const { data: girdi } = await db.from("inbox_items").select("*").eq("user_id", userId).eq("kaynak", "eposta").single();
    expect(girdi!.ham_metin).toMatch(/^perşembe dönüş yap\n\n\[E-posta\] Lucon teklif talebi\nKimden: Mehmet Öz <mehmet@kuzey.example>/);
    expect(girdi!.eposta).toMatchObject({ yon: "iletilen", karsi_taraf: ["mehmet@kuzey.example"] });
    expect((girdi!.ayristirma_json as { firma: string }).firma).toBe("Kuzey Kablo");

    await page.goto(UYGULAMA + "/gelen-kutusu");
    const oge = page.locator("main li", { hasText: "Lucon için teklif hazırla" });
    await oge.getByText("E-posta", { exact: true }).waitFor();
    await oge.getByRole("button", { name: "Onayla" }).click();
    await page.getByText("Kaydedildi").first().waitFor();
    const { data: gorev } = await db.from("tasks").select("company_id").eq("user_id", userId).eq("baslik", "Lucon için teklif hazırla").single();
    expect(gorev!.company_id).toBe((await firma("Kuzey Kablo")).id);
  });

  it("aynı e-posta tekrar gelirse bir kez işlenir", async () => {
    const r = await gonder(
      yuk({ kimden: EPOSTA, kime: [adres], konu: "İlt: Lucon teklif talebi", metin: ILETI("m@kuzey.example", "x", "y"), id: "ileti-1" }),
    );
    expect(r.govde.sonuc).toBe("yinelenen");
    const { count } = await db.from("inbox_items").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("kaynak", "eposta");
    expect(count).toBe(1);
  });

  it("onaylanan e-postanın alan adı firmaya öğretilir", async () => {
    await gonder(
      yuk({ kimden: IS_ADRESI, kime: [adres], konu: "Fwd: Exceed", metin: ILETI("Jonas <einkauf@delta.example>", "Exceed", "Bitte Angebot.") }),
    );
    await page.goto(UYGULAMA + "/gelen-kutusu");
    await page.locator("main li", { hasText: "E-postayı yanıtla" }).getByRole("button", { name: /Düzelt|Aç/ }).click();
    const d = page.locator("dialog[open]");
    await d.locator("input[list^=firmalar]").fill("Delta Polimer");
    await d.getByRole("button", { name: "Onayla" }).click();
    await page.getByText("Kaydedildi").first().waitFor();
    const delta = await firma("Delta Polimer");
    expect(delta.eposta_alanlari).toEqual(["delta.example"]);
    const { count } = await db.from("companies").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("ad", "Delta Polimer");
    expect(count).toBe(1);
  });

  it("gizli kopya (BCC) firmaya not olarak düşer ve son teması günceller", async () => {
    const r = await gonder(
      yuk({
        kimden: IS_ADRESI,
        kime: ["einkauf@delta.example"],
        cc: ["ayse@buteo.example"],
        bcc: [adres],
        konu: "Exceed fiyat teklifi",
        metin: "Merhaba, teklifimiz ektedir.\n\nOn Mon, Oct 5, 2026 Jonas <einkauf@delta.example> wrote:\n> eski yazışma",
      }),
    );
    expect(r.govde).toMatchObject({ sonuc: "not", aciklama: "Firmaya not eklendi: Delta Polimer" });
    const delta = await firma("Delta Polimer");
    const { data: notlar } = await db.from("notes").select("ozet, metin").eq("company_id", delta.id);
    expect(notlar).toEqual([
      {
        ozet: "E-posta gönderildi: Exceed fiyat teklifi",
        metin: "Gönderilen e-posta: Exceed fiyat teklifi\nKime: einkauf@delta.example\n\nMerhaba, teklifimiz ektedir.",
      },
    ]);
    expect(delta.son_temas?.slice(0, 10)).toBe(new Date().toISOString().slice(0, 10));
  });

  it("alıcının firması bilinmeyen gizli kopya gelen kutusuna düşer", async () => {
    const r = await gonder(yuk({ kimden: EPOSTA, kime: ["info@yeni-musteri.example"], bcc: [adres], konu: "Tanışma", metin: "Merhaba" }));
    expect(r.govde.sonuc).toBe("gelen_kutusu");
    await page.goto(UYGULAMA + "/gelen-kutusu");
    await page.getByText("Gönderilen e-posta", { exact: true }).first().waitFor();
  });

  it("izinsiz gönderen reddedilir", async () => {
    const once = (await db.from("inbox_items").select("id", { count: "exact", head: true }).eq("user_id", userId)).count;
    const r = await gonder(yuk({ kimden: "yabanci@spam.example", kime: [adres], konu: "Kampanya", metin: "Satın al" }));
    expect(r.govde).toMatchObject({ sonuc: "reddedildi" });
    expect(r.govde.aciklama).toContain("izinli gönderenler arasında değil");
    expect((await db.from("inbox_items").select("id", { count: "exact", head: true }).eq("user_id", userId)).count).toBe(once);
  });

  it("son gelen e-postalar Ayarlar'da listelenir; adres yenilenince eskisi çalışmaz", async () => {
    await page.goto(UYGULAMA + "/ayarlar");
    const bolum = page.locator("#eposta");
    await bolum.getByText("Firma notu").first().waitFor();
    await bolum.getByText("Reddedildi").first().waitFor();

    const eski = adres;
    await bolum.getByRole("button", { name: "Yeni adres oluştur" }).click();
    await page.getByText("Yeni adres oluşturuldu").waitFor();
    const { data } = await db.from("settings").select("eposta_anahtari").eq("user_id", userId).single();
    adres = kisiselAdres(GELEN, data!.eposta_anahtari);
    expect(adres).not.toBe(eski);
    await bolum.getByText(adres).waitFor();

    const anahtar = eski.split("+")[1].split("@")[0];
    const r = await gonder({ ...yuk({ kimden: EPOSTA, kime: [eski], konu: "x", metin: "x" }), MailboxHash: anahtar, OriginalRecipient: eski });
    expect(r.govde).toMatchObject({ sonuc: "reddedildi", aciklama: "Bilinmeyen LifeOS adresi" });
  });
});
