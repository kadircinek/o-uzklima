// iPad Pro simülatörü: uygulama aynı kökenden bir çerçevede iPad Pro
// ölçülerinde açılır; model ve yön değişir, gezinilen sayfa adreste kalır.

import type { Browser, Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EPOSTA, SIFRE, tarayici, UYGULAMA } from "./yardimci";

let b: Browser;
let page: Page;

const cerceve = () => page.frameLocator('iframe[title="LifeOS — iPad Pro"]');
const pencere = () =>
  page.locator('iframe[title="LifeOS — iPad Pro"]').evaluate((f: HTMLIFrameElement) => ({
    en: f.contentWindow!.innerWidth,
    boy: f.contentWindow!.innerHeight,
  }));

beforeAll(async () => {
  b = await tarayici();
  page = await (await b.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR" })).newPage();
});

afterAll(async () => {
  await b?.close();
});

describe("iPad Pro simülatörü", () => {
  it("oturumsuz açılır; uygulama çerçevede giriş ister ve giriş çerçevede yapılır", async () => {
    const yanit = await page.goto(UYGULAMA + "/simulator");
    expect(yanit!.headers()["x-frame-options"]).toBe("SAMEORIGIN");
    const c = cerceve();
    await c.locator('input[name="eposta"]').fill(EPOSTA);
    await c.locator('input[name="sifre"]').fill(SIFRE);
    await c.locator('button[type="submit"]').click();
    await c.getByRole("heading", { name: "Bugün", level: 1 }).waitFor();
    // Varsayılan: 13 inç yatay; uygulama durum çubuğu ve alt pay dışındaki alanı görür
    expect(await page.locator("[data-cihaz]").getAttribute("data-cihaz")).toBe("13-yatay");
    expect(await pencere()).toEqual({ en: 1376, boy: 1032 - 24 - 20 });
  });

  it("döndürülür ve model değişir; çerçevedeki uygulama yeni ölçüye uyar", async () => {
    await page.getByRole("button", { name: /Döndür/ }).click();
    await page.locator('[data-cihaz="13-dikey"]').waitFor();
    expect((await pencere()).en).toBe(1032);

    await page.getByRole("button", { name: "11 inç" }).click();
    await page.locator('[data-cihaz="11-dikey"]').waitFor();
    expect(await pencere()).toEqual({ en: 834, boy: 1210 - 44 });
    await page.waitForURL(/model=11&yon=dikey/);

    await page.keyboard.press("r");
    await page.locator('[data-cihaz="11-yatay"]').waitFor();
  });

  it("çerçevede gezilen sayfa adreste kalır; yenileyince aynı sayfa açılır", async () => {
    await cerceve().getByRole("link", { name: "Görevler" }).first().click();
    await cerceve().getByRole("heading", { name: "Görevler", level: 1 }).waitFor();
    await page.waitForURL(/yol=%2Fgorevler/);
    await page.reload();
    await cerceve().getByRole("heading", { name: "Görevler", level: 1 }).waitFor();
    expect(await page.locator("[data-cihaz]").getAttribute("data-cihaz")).toBe("11-yatay");

    await page.getByRole("button", { name: "Ana sayfa" }).click();
    await cerceve().getByRole("heading", { name: "Bugün", level: 1 }).waitFor();
  });

  it("çerçeveye dış adres ya da simülatörün kendisi verilemez", async () => {
    for (const yol of ["https://ornek.example", "//ornek.example", "/simulator"]) {
      await page.goto(`${UYGULAMA}/simulator?yol=${encodeURIComponent(yol)}`);
      expect(await page.locator('iframe[title="LifeOS — iPad Pro"]').getAttribute("src")).toBe("/");
    }
  });
});
