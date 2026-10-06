// Ekip: yönetici arkadaşına hesap açar; arkadaş ilk girişte kendi şifresini
// belirler ve yalnızca kendi verisini görür.

import type { Browser, Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ARKADAS_EPOSTA, db, girisYap, tarayici, UYGULAMA } from "./yardimci";

let b: Browser;
let yonetici: Page;
let geciciSifre = "";

async function sifreyiOku(p: Page): Promise<string> {
  const pre = p.locator("dialog[open] pre", { hasText: "Geçici şifre:" });
  await pre.waitFor();
  return /Geçici şifre: (\S+)/.exec(await pre.innerText())![1];
}

async function arkadas() {
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
  return data.users.find((u) => u.email === ARKADAS_EPOSTA);
}

beforeAll(async () => {
  b = await tarayici();
  yonetici = await (await b.newContext({ viewport: { width: 1280, height: 900 }, locale: "tr-TR" })).newPage();
  yonetici.on("dialog", (d) => void d.accept());
  await girisYap(yonetici);
});

afterAll(async () => {
  await b?.close();
});

describe("ekip", () => {
  it("yönetici arkadaşına hesap açar; kurulum mesajı ve QR kod gösterilir", async () => {
    await yonetici.goto(UYGULAMA + "/ayarlar");
    const ekip = yonetici.locator("#ekip");
    await ekip.getByPlaceholder("Ayşe").fill("Ayşe");
    await ekip.getByPlaceholder("ayse@buteo.com.tr").fill(ARKADAS_EPOSTA);
    await ekip.getByRole("button", { name: "Hesap aç" }).click();
    const d = yonetici.locator("dialog[open]");
    await d.getByRole("img", { name: "Uygulama adresinin QR kodu" }).waitFor();
    const mesaj = await d.locator("pre").innerText();
    expect(mesaj).toContain("Merhaba Ayşe, LifeOS hesabın hazır.");
    expect(mesaj).toContain(UYGULAMA);
    expect(mesaj).toContain("Ana Ekrana Ekle");
    geciciSifre = await sifreyiOku(yonetici);
    expect(geciciSifre).toMatch(/^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/);
    expect((await arkadas())?.user_metadata).toMatchObject({ ad: "Ayşe", sifre_degistirmeli: true });
    await d.getByRole("button", { name: "Kapat" }).click();

    await ekip.getByPlaceholder("ayse@buteo.com.tr").fill(ARKADAS_EPOSTA);
    await ekip.getByRole("button", { name: "Hesap aç" }).click();
    await ekip.getByText("Bu e-postayla bir hesap zaten var.").waitFor();
  });

  it("arkadaş ilk girişte şifresini belirler ve yalnızca kendi verisini görür", async () => {
    const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, locale: "tr-TR" })).newPage();
    await p.goto(UYGULAMA + "/giris");
    await p.fill('input[name="eposta"]', ARKADAS_EPOSTA);
    await p.fill('input[name="sifre"]', geciciSifre);
    await p.click('button[type="submit"]');
    await p.getByRole("heading", { name: "LifeOS'a hoş geldin" }).waitFor();

    // Şifre belirlenmeden uygulamaya girilemez
    await p.goto(UYGULAMA + "/gorevler");
    await p.getByRole("heading", { name: "LifeOS'a hoş geldin" }).waitFor();

    await p.fill('input[name="sifre"]', "arkadas-yeni-1");
    await p.fill('input[name="tekrar"]', "arkadas-yeni-2");
    await p.click('button[type="submit"]');
    await p.getByText("Şifreler aynı değil.").waitFor();
    await p.fill('input[name="sifre"]', "arkadas-yeni-1");
    await p.fill('input[name="tekrar"]', "arkadas-yeni-1");
    await p.click('button[type="submit"]');
    await p.getByRole("heading", { name: "Bugün", level: 1 }).waitFor();
    expect((await arkadas())?.user_metadata.sifre_degistirmeli).toBe(false);

    const metin = await p.locator("main").innerText();
    expect(metin).not.toContain("Stok raporu");
    expect(metin).not.toContain("TDS gelecek");

    await p.goto(UYGULAMA + "/ayarlar");
    await p.getByRole("heading", { name: "E-posta bağlantısı" }).waitFor();
    expect(await p.getByRole("heading", { name: "Ekip" }).count()).toBe(0);
    const { data: ayarlar } = await db.from("settings").select("user_id, eposta_anahtari");
    expect(new Set(ayarlar!.map((a) => a.eposta_anahtari)).size).toBe(ayarlar!.length);
    await p.context().close();
  });

  it("yönetici şifre sıfırlar ve hesabı kaldırır", async () => {
    await yonetici.goto(UYGULAMA + "/ayarlar");
    const satir = yonetici.locator("#ekip li", { hasText: ARKADAS_EPOSTA });
    await satir.getByText("Son giriş").waitFor();
    await satir.getByRole("button", { name: "Şifre sıfırla" }).click();
    const yeni = await sifreyiOku(yonetici);
    expect(yeni).not.toBe(geciciSifre);
    expect((await arkadas())?.user_metadata.sifre_degistirmeli).toBe(true);
    await yonetici.locator("dialog[open]").getByRole("button", { name: "Kapat" }).click();

    await satir.getByRole("button", { name: "Kaldır" }).click();
    await yonetici.getByText("Hesap kaldırıldı").waitFor();
    expect(await arkadas()).toBeUndefined();
  });
});
