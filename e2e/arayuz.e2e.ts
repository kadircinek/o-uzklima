// Arayüz akışları: giriş, içe aktarma, PRD senaryolarının hızlı girişi,
// gelen kutusu, Bugün, Görevler, Fırsatlar, Firma ve Ayarlar ekranları.
// Beklenen tarihler uygulamanın kural fonksiyonlarıyla hesaplanır; böylece
// test hangi gün çalışırsa çalışsın geçerlidir.

import type { Browser, Locator, Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addDays, formatShort, weekday } from "@/lib/dates";
import { VARSAYILAN_AYARLAR } from "@/lib/domain";
import { addBusinessDays } from "@/lib/holidays";
import { ertelemeGunu, ilkTekrar, planla, tamamlaninceSonrakiVade, tekrarCoz } from "@/lib/rules";
import { BUGUN, db, EPOSTA, gorev, istanbul, kullaniciId, SIFRE, tarayici, UYGULAMA } from "./yardimci";

const A = VARSAYILAN_AYARLAR;
const CSV = new URL("./firmalar.csv", import.meta.url).pathname;
const AYIN_GUNU = Number(BUGUN.slice(8));

let b: Browser;
let page: Page;
let userId: string;
const konsolHatalari: string[] = [];

beforeAll(async () => {
  userId = await kullaniciId();
  b = await tarayici();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  page = await ctx.newPage();
  page.on("console", (m) => m.type() === "error" && konsolHatalari.push(m.text()));
  page.on("pageerror", (e) => konsolHatalari.push(String(e)));
});

afterAll(async () => {
  await b?.close();
});

async function hizliGiris(metin: string, { toplanti = false } = {}): Promise<Locator> {
  await page.goto(UYGULAMA + "/");
  await page.getByRole("button", { name: "Hızlı giriş" }).first().click();
  const d = page.locator("dialog[open]");
  const kutu = d.locator("textarea");
  await kutu.waitFor();
  if (toplanti) await d.getByLabel("Toplantı notu").check();
  await kutu.fill(metin);
  if (toplanti) await d.getByRole("button", { name: "Ekle" }).click();
  else await kutu.press("Enter");
  await d.getByRole("button", { name: "Onayla" }).waitFor({ timeout: 15_000 });
  return d;
}

async function onayla(d: Locator, mesaj = "Kaydedildi") {
  await d.getByRole("button", { name: "Onayla" }).click();
  await page.getByText(mesaj).first().waitFor();
}

async function firma(ad: string) {
  const { data } = await db.from("companies").select("*").eq("user_id", userId).ilike("ad", `${ad}%`).single();
  return data!;
}

describe("giriş", () => {
  it("oturumsuz kullanıcı girişe yönlenir, hatalı şifrede e-posta korunur", async () => {
    await page.goto(UYGULAMA + "/");
    expect(page.url()).toContain("/giris");
    await page.fill('input[name="eposta"]', EPOSTA);
    await page.fill('input[name="sifre"]', "yanlis");
    await page.click('button[type="submit"]');
    await page.getByText("E-posta veya şifre hatalı.").waitFor();
    expect(await page.inputValue('input[name="eposta"]')).toBe(EPOSTA);
    await page.fill('input[name="sifre"]', SIFRE);
    await page.click('button[type="submit"]');
    await page.getByRole("heading", { name: "Bugün", level: 1 }).waitFor();
  });
});

describe("firmalar: Excel/CSV içe aktarma", () => {
  it("Türkçe başlıklı, ; ayırıcılı CSV'yi aktarır; ikinci kez kopya oluşturmaz", async () => {
    await page.goto(UYGULAMA + "/firmalar");
    await page.getByRole("button", { name: "İçe aktar" }).click();
    await page.setInputFiles('input[type="file"]', CSV);
    await page.getByText("6 firma bulundu").waitFor();
    await page.getByRole("button", { name: "6 firmayı aktar" }).click();
    await page.getByText("6 firma eklendi").waitFor();
    expect((await firma("Basechem")).tur).toBe("tedarikci");

    await page.goto(UYGULAMA + "/firmalar");
    await page.getByRole("button", { name: "İçe aktar" }).click();
    await page.setInputFiles('input[type="file"]', CSV);
    await page.getByRole("button", { name: "6 firmayı aktar" }).click();
    await page.getByText("0 firma eklendi, 6 zaten vardı").waitFor();
    const { count } = await db.from("companies").select("id", { count: "exact", head: true }).eq("user_id", userId);
    expect(count).toBe(6);

    // 45 gün temassız eski müşteri (sessiz müşteri senaryosu)
    const eski = await firma("Eski Müşteri");
    await db
      .from("companies")
      .update({ son_temas: new Date(Date.now() - 45 * 86_400_000).toISOString(), created_at: new Date(Date.now() - 200 * 86_400_000).toISOString() })
      .eq("id", eski.id);
  });
});

describe("hızlı giriş: PRD senaryoları", () => {
  it("Teklif takibi → firma eşleşir, fırsat açılır, 3 iş günü sonra takip", async () => {
    const vade = addBusinessDays(BUGUN, A.kurallar.teklif_is_gunu);
    const d = await hizliGiris("Acme'ye Lucon teklifi gitti");
    expect(await d.locator("input[list^=firmalar]").inputValue()).toBe("Acme Plastik San. ve Tic. A.Ş.");
    expect(await d.locator("label", { hasText: "Fırsat" }).locator("select").inputValue()).toBe("yeni");
    expect(await d.getByText(`Vade ${formatShort(vade)}`).isVisible()).toBe(true);
    await onayla(d);

    const [t] = await gorev("Lucon teklifine dönüş geldi mi?");
    expect(t).toMatchObject({ tur: "takip", vade, kural: "asama:teklif" });
    const { data: deal } = await db.from("deals").select("asama").eq("id", t.deal_id!).single();
    expect(deal?.asama).toBe("teklif");
    expect((await firma("Acme")).son_temas?.slice(0, 10)).toBe(new Date().toISOString().slice(0, 10));
  });

  it("Numune → 14 gün sonra geri bildirim", async () => {
    await onayla(await hizliGiris("Yıldız Ambalaj'a Vistamaxx numunesi kargolandı"));
    const [t] = await gorev("Vistamaxx numunesi için geri bildirim iste");
    expect(t).toMatchObject({ vade: addDays(BUGUN, A.kurallar.numune_gun), kural: "asama:numune" });
  });

  it("Verilen söz → perşembe sabahı görev", async () => {
    const persembe = addDays(BUGUN, ((4 - weekday(BUGUN) + 7) % 7) || 7);
    await onayla(await hizliGiris("Ali'ye perşembe fiyat dönecektim"));
    const [t] = await gorev("Ali'ye fiyat dön");
    expect(t.tur).toBe("yapacagim");
    expect(t.vade).toBe(persembe);
    expect(istanbul(t.hatirlatma_zamani)?.slice(11)).toBe("09:00");
  });

  it("Beklenen şey → Bekliyorum, 5 iş günü sonra dürt", async () => {
    await onayla(await hizliGiris("Basechem'den TDS bekliyorum"));
    const [t] = await gorev("TDS gelecek");
    expect(t).toMatchObject({ tur: "bekliyorum", vade: addBusinessDays(BUGUN, A.kurallar.bekleme_is_gunu) });
  });

  it("Tahsilat/vade → 3 gün önce ön hatırlatma", async () => {
    const vade = addDays(BUGUN, 40);
    const plan = planla({ girdi: "vade", olay: "odeme_vadesi", tarih: vade, hatirlatma: null, bugun: BUGUN }, A);
    await onayla(await hizliGiris("Zeta Kimya'nın vadeli ödemesi"));
    const [t] = await gorev("Ödeme vadesi");
    expect(t).toMatchObject({ kural: "odeme", vade });
    expect(t.hatirlatma_zamani && new Date(t.hatirlatma_zamani).toISOString()).toBe(plan.hatirlatma_zamani!.toISOString());
  });

  it("Yinelenen iş → aylık tekrar", async () => {
    await onayla(await hizliGiris(`Her ay ${AYIN_GUNU}'inde stok raporu`));
    const [t] = await gorev("Stok raporu");
    expect(t.tekrar_kurali).toBe(`aylik:${AYIN_GUNU}`);
    expect(t.vade).toBe(ilkTekrar(tekrarCoz(`aylik:${AYIN_GUNU}`)!, BUGUN));
  });

  it("Toplantı notu → özet, aksiyonlar, firmaya bağlı not ve yeni kişi", async () => {
    const d = await hizliGiris("Acme ziyareti: Ayşe ile görüştük. Fiyat göndereceğim, yıllık tüketimi iletecekler.", { toplanti: true });
    expect(await d.locator("textarea").inputValue()).toMatch(/^Acme ile/);
    expect(await d.locator("input[type=checkbox]").count()).toBe(2);
    await onayla(d, "Not kaydedildi + 2 görev");
    const acme = await firma("Acme");
    const { data: notlar } = await db.from("notes").select("*").eq("company_id", acme.id);
    expect(notlar).toHaveLength(1);
    expect(notlar![0].deal_id).toBeNull(); // ürün söylenmedi → fırsata tahmini bağlama yok
    expect(await gorev("Vistamaxx fiyatı gönder")).toHaveLength(1);
    expect((await gorev("Yıllık tüketim tahmini"))[0].tur).toBe("bekliyorum");
    const { data: kisi } = await db.from("contacts").select("ad").eq("company_id", acme.id);
    expect(kisi?.map((k) => k.ad)).toEqual(["Ayşe"]);
  });

  it("Düşük güven ve geçersiz tarih → uyarılı kart, gelen kutusunda bekler", async () => {
    let d = await hizliGiris("bir şey hatırla");
    expect(await d.getByText("Emin değilim").isVisible()).toBe(true);
    await d.getByRole("button", { name: "Sonra" }).click();
    await page.getByText("Gelen kutusunda bekliyor").waitFor();

    d = await hizliGiris("hatalı tarih testi");
    expect(await d.getByText("Emin değilim").isVisible()).toBe(true);
    expect(await d.locator("input[type=date]").first().inputValue()).toBe("");
    await d.getByRole("button", { name: "Sonra" }).click();
  });
});

describe("gelen kutusu", () => {
  it("işlenmemiş kayıtları listeler, silinebilir", async () => {
    await page.goto(UYGULAMA + "/gelen-kutusu");
    expect(await page.locator("main li").count()).toBe(2);
    await page.locator("main li").first().getByRole("button", { name: "Aç" }).click();
    await page.locator("dialog[open]").getByRole("button", { name: "Sil" }).click();
    await page.getByText("Silindi").waitFor();
    await page.goto(UYGULAMA + "/gelen-kutusu");
    expect(await page.locator("main li").count()).toBe(1);
  });
});

describe("Bugün ekranı", () => {
  it("bugünkü işler, bekleyenler, sessiz müşteriler ve gelen kutusu uyarısı", async () => {
    await page.goto(UYGULAMA + "/");
    const metin = await page.locator("main").innerText();
    expect(metin).toContain("Stok raporu");
    expect(metin).toContain("TDS gelecek");
    expect(metin).toContain("Eski Müşteri Ltd.");
    expect(metin).toContain("45 gün");
    expect(metin).toContain("işlenmemiş kayıt");
  });
});

describe("görevler", () => {
  it("tekrarlayan görev bitince bir sonraki oluşur", async () => {
    await page.goto(UYGULAMA + "/gorevler");
    await page.locator("li", { hasText: "Stok raporu" }).getByRole("button", { name: "Bitti" }).click();
    await page.getByText("bir sonraki oluşturuldu").waitFor();
    const liste = await gorev("Stok raporu");
    const sonraki = tamamlaninceSonrakiVade(tekrarCoz(`aylik:${AYIN_GUNU}`)!, liste[0].vade, BUGUN);
    expect(liste.map((t) => [t.durum, t.vade])).toEqual([
      ["bitti", liste[0].vade],
      ["acik", sonraki],
    ]);
  });

  it("erteleme: yarın (iş gününe kayar)", async () => {
    const ali = page.locator("li", { hasText: "Ali'ye fiyat dön" });
    await ali.getByRole("button", { name: "Ertele" }).click();
    await ali.getByRole("button", { name: "Yarın" }).click();
    await page.getByText("tarihine ertelendi").waitFor();
    expect((await gorev("Ali'ye fiyat dön"))[0]).toMatchObject({ durum: "ertelendi", vade: ertelemeGunu("yarin", BUGUN, A) });
  });

  it("sekmeler ve görev düzenleme", async () => {
    await page.goto(UYGULAMA + "/gorevler?tur=takip");
    expect(await page.locator("main").innerText()).toContain("Lucon teklifine");
    await page.goto(UYGULAMA + "/gorevler");
    await page.getByRole("button", { name: "Vistamaxx fiyatı gönder" }).click();
    await page.locator("dialog[open]").getByLabel("Tekrar").selectOption("haftalik");
    await page.locator("dialog[open]").getByRole("button", { name: "Kaydet" }).click();
    await page.getByText("Kaydedildi").first().waitFor();
    expect((await gorev("Vistamaxx fiyatı gönder"))[0].tekrar_kurali).toBe("haftalik:1");
  });
});

describe("fırsatlar", () => {
  it("aşama değişince önceki aşama görevi kapanır, yenisi açılır", async () => {
    await page.goto(UYGULAMA + "/firsatlar");
    await page.locator("li", { hasText: "Lucon" }).getByRole("button", { name: "Müzakere →" }).click();
    await page.getByText("görev açıldı").waitFor();
    const { data: deal } = await db.from("deals").select("id").eq("user_id", userId).eq("urun", "Lucon").single();
    const { data: gorevler } = await db.from("tasks").select("kural, durum").eq("deal_id", deal!.id).like("kural", "asama:%").order("kural");
    expect(gorevler).toEqual([
      { kural: "asama:muzakere", durum: "acik" },
      { kural: "asama:teklif", durum: "bitti" },
    ]);
  });
});

describe("firma sayfası", () => {
  it("not, kişi, fırsat ve son temas görünür; not eklemek son teması günceller", async () => {
    await page.goto(UYGULAMA + "/firmalar");
    await page.getByRole("link", { name: /Acme Plastik/ }).click();
    await page.getByRole("heading", { name: /Acme Plastik/ }).waitFor();
    const metin = await page.locator("main").innerText();
    for (const parca of ["Acme ile Vistamaxx", "Ayşe", "Lucon", "Son temas bugün"]) expect(metin).toContain(parca);

    const eski = await firma("Eski Müşteri");
    await page.goto(UYGULAMA + "/firmalar/" + eski.id);
    await page.getByPlaceholder("Hızlı not ekle…").fill("Ziyaret edildi");
    await page.getByRole("button", { name: "Ekle", exact: true }).click();
    await page.getByText("Not eklendi").waitFor();
    expect((await firma("Eski Müşteri")).son_temas?.slice(0, 10)).toBe(new Date().toISOString().slice(0, 10));
  });
});

describe("ayarlar", () => {
  it("kural süresi kaydedilir", async () => {
    await page.goto(UYGULAMA + "/ayarlar");
    await page.locator("div.justify-between", { hasText: "Teklif gönderildi → cevap geldi mi?" }).locator("input[type=number]").fill("4");
    await page.getByRole("button", { name: "Ayarları kaydet" }).click();
    await page.getByText("Ayarlar kaydedildi").waitFor();
    const { data } = await db.from("settings").select("kurallar").eq("user_id", userId).single();
    expect((data?.kurallar as { teklif_is_gunu?: number }).teklif_is_gunu).toBe(4);
    await db.from("settings").update({ kurallar: {} }).eq("user_id", userId);
  });
});

describe("kısayollar ve paylaşım", () => {
  it("masaüstünde N kısayolu, ?ekle=1 ve paylaşım hedefi hızlı girişi açar", async () => {
    await page.setViewportSize({ width: 1280, height: 860 });
    await page.goto(UYGULAMA + "/");
    // Kısayol dinleyicisi sayfa etkileşimli olunca kurulur.
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("n");
    expect(await page.locator("dialog[open] textarea").isVisible()).toBe(true);
    await page.keyboard.press("Escape");

    await page.goto(UYGULAMA + "/paylas?metin=" + encodeURIComponent("WhatsApp: Basechem fiyat listesi"));
    await page.locator("dialog[open] textarea").waitFor();
    expect(await page.locator("dialog[open] textarea").inputValue()).toBe("WhatsApp: Basechem fiyat listesi");
    await page.keyboard.press("Escape");

    await page.goto(UYGULAMA + "/?ekle=1");
    await page.locator("dialog[open] textarea").waitFor();
  });

  it("tarayıcı konsolunda hata yok", () => {
    expect(konsolHatalari).toEqual([]);
  });
});
