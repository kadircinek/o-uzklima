// Sesli not: sahte mikrofonla kayıt → Supabase Storage → gelen kutusunda
// imzalı adresle dinleme → girdi silinince dosya da silinir.

import type { Browser } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, girisYap, kullaniciId, tarayici, UYGULAMA } from "./yardimci";

let b: Browser;
let userId: string;

beforeAll(async () => {
  userId = await kullaniciId();
  b = await tarayici({ mikrofon: true });
});

afterAll(async () => {
  await b?.close();
});

describe("sesli not", () => {
  it("kayıt yüklenir, dinlenir ve girdiyle birlikte silinir", async () => {
    const ctx = await b.newContext({ permissions: ["microphone"], viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const hatalar: string[] = [];
    page.on("pageerror", (e) => hatalar.push(String(e)));
    await girisYap(page);

    await page.getByRole("button", { name: "Hızlı giriş" }).first().click();
    const d = page.locator("dialog[open]");
    await d.getByRole("button", { name: "Sesli not" }).click();
    await d.getByText("Dinliyorum").waitFor();
    await page.waitForTimeout(1500);
    await d.getByRole("button", { name: "Dinlemeyi durdur" }).click();
    await d.locator("textarea").fill("Sesli not testi: Basechem'den TDS bekliyorum");
    await d.getByRole("button", { name: "Ekle" }).click();
    await d.getByRole("button", { name: "Onayla" }).waitFor();

    const { data: girdi } = await db.from("inbox_items").select("ses_dosyasi").eq("user_id", userId).like("ham_metin", "Sesli not testi%").single();
    const yol = girdi!.ses_dosyasi!;
    expect(yol).toMatch(new RegExp(`^${userId}/[0-9a-f-]{36}\\.(webm|ogg|m4a)$`));
    const dosyalar = async () => (await db.storage.from("ses").list(userId)).data?.map((f) => `${userId}/${f.name}`) ?? [];
    expect(await dosyalar()).toContain(yol);
    await d.getByRole("button", { name: "Sonra" }).click();

    await page.goto(UYGULAMA + "/gelen-kutusu");
    const [popup] = await Promise.all([page.waitForEvent("popup"), page.getByRole("button", { name: "▶ Ses kaydı" }).click()]);
    expect(popup.url()).toContain("/storage/v1/object/sign/ses/");
    const yanit = await ctx.request.get(popup.url());
    expect(yanit.ok()).toBe(true);
    expect((await yanit.body()).length).toBeGreaterThan(1000);
    await popup.close();

    await page.locator("main li", { hasText: "Sesli not testi" }).getByRole("button", { name: /Düzelt|Aç/ }).click();
    await page.locator("dialog[open]").getByRole("button", { name: "Sil" }).click();
    await page.getByText("Silindi").waitFor();
    await page.waitForTimeout(500);
    expect(await dosyalar()).not.toContain(yol);
    expect(hatalar).toEqual([]);
  });
});
