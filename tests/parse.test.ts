import { describe, expect, it } from "vitest";
import { eslestir, normalizeAd } from "@/lib/match";
import { ayristirmayiDuzelt, type HamAyristirma } from "@/lib/parse/schema";
import { firmaDizini, kullaniciMesaji } from "@/lib/parse/prompt";

const ham = (p: Partial<HamAyristirma>): HamAyristirma => ({
  tur: "gorev",
  baslik: "Başlık",
  firma: null,
  kisi: null,
  urun: null,
  tarih: null,
  hatirlatma: null,
  guven: 0.9,
  olay: "yok",
  tekrar: null,
  ozet: null,
  aksiyonlar: [],
  ...p,
});

describe("ayrıştırma çıktısının düzeltilmesi", () => {
  it("geçerli çıktıyı korur", () => {
    const a = ayristirmayiDuzelt(ham({ tarih: "2026-10-08", hatirlatma: "2026-10-07T14:00", tekrar: "aylik:5" }), "x");
    expect(a).toMatchObject({ tarih: "2026-10-08", hatirlatma: "2026-10-07T14:00", tekrar: "aylik:5", guven: 0.9 });
  });

  it("geçersiz tarih/hatırlatma/tekrar atılır ve güven düşer", () => {
    const a = ayristirmayiDuzelt(ham({ tarih: "2026-02-30", hatirlatma: "yarın", tekrar: "her ay" }), "x");
    expect(a).toMatchObject({ tarih: null, hatirlatma: null, tekrar: null });
    expect(a.guven).toBeLessThanOrEqual(0.5);
  });

  it("boş metinler null olur, başlık boşsa ham metin kullanılır", () => {
    const a = ayristirmayiDuzelt(ham({ baslik: "  ", firma: " ", urun: "Lucon " }), "Ali'yi ara");
    expect(a).toMatchObject({ baslik: "Ali'yi ara", firma: null, urun: "Lucon" });
  });

  it("ödeme olayı vade türüne çevrilir; tarihsiz vade düşük güvenlidir", () => {
    const a = ayristirmayiDuzelt(ham({ tur: "takip", olay: "odeme_vadesi" }), "x");
    expect(a.tur).toBe("vade");
    expect(a.guven).toBeLessThanOrEqual(0.4);
  });

  it("güven 0-1 aralığına sıkıştırılır", () => {
    expect(ayristirmayiDuzelt(ham({ guven: 7 }), "x").guven).toBe(1);
    expect(ayristirmayiDuzelt(ham({ guven: -1 }), "x").guven).toBe(0);
  });

  it("toplantı aksiyonlarında geçersiz tarih ve boş başlık temizlenir", () => {
    const a = ayristirmayiDuzelt(
      ham({
        tur: "not",
        ozet: "Görüşüldü.",
        aksiyonlar: [
          { tur: "gorev", baslik: "Fiyat gönder", tarih: "2026-10-09" },
          { tur: "bekleme", baslik: "TDS", tarih: "sonra" },
          { tur: "takip", baslik: " ", tarih: null },
        ],
      }),
      "x",
    );
    expect(a.aksiyonlar).toEqual([
      { tur: "gorev", baslik: "Fiyat gönder", tarih: "2026-10-09" },
      { tur: "bekleme", baslik: "TDS", tarih: null },
    ]);
  });
});

describe("firma eşleştirme", () => {
  const firmalar = [
    { id: "1", ad: "Acme Plastik San. ve Tic. A.Ş." },
    { id: "2", ad: "LG Chem" },
    { id: "3", ad: "ExxonMobil Chemical" },
    { id: "4", ad: "Öztürk Ambalaj" },
    { id: "5", ad: "Öztürk Kimya" },
  ];

  it("ad normalize edilir", () => {
    expect(normalizeAd("Acme Plastik San. ve Tic. A.Ş.")).toBe("acme plastik");
    expect(normalizeAd("ŞIŞECAM")).toBe("sisecam");
  });

  it("tam ve kısmi eşleşme", () => {
    expect(eslestir("acme plastik", firmalar)).toMatchObject({ kayit: { id: "1" }, kesin: true });
    expect(eslestir("LG CHEM", firmalar)).toMatchObject({ kayit: { id: "2" }, kesin: true });
    expect(eslestir("ExxonMobil", firmalar)).toMatchObject({ kayit: { id: "3" }, kesin: false });
    expect(eslestir("ozturk ambalaj", firmalar)).toMatchObject({ kayit: { id: "4" }, kesin: true });
  });

  it("belirsiz veya ilgisiz adlar eşleşmez", () => {
    expect(eslestir("Öztürk", firmalar)).toBeNull(); // iki aday
    expect(eslestir("LG", firmalar)?.kayit.id).toBe("2");
    expect(eslestir("Basechem", firmalar)).toBeNull();
    expect(eslestir("Acm", firmalar)).toBeNull(); // kelime ortasından eşleşmez
    expect(eslestir(null, firmalar)).toBeNull();
  });
});

describe("istem", () => {
  it("firma dizini sıralı ve deterministik", () => {
    const a = firmaDizini([
      { ad: "Zeta", tur: "musteri", kisiler: ["Veli", "Ali"] },
      { ad: "Basechem", tur: "tedarikci", kisiler: [] },
    ]);
    expect(a).toBe("Firma dizini (ad | tür | kişiler):\n- Basechem | Tedarikçi\n- Zeta | Müşteri | Ali, Veli");
  });

  it("kullanıcı mesajı bugünü ve modu içerir", () => {
    expect(kullaniciMesaji("not", "2026-10-05", 1, true)).toBe(
      "Bugün: 2026-10-05 Pazartesi\nMod: toplantı (özet ve aksiyonları çıkar)\n\nGirdi:\nnot",
    );
  });
});
