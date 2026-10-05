import { describe, expect, it } from "vitest";
import { addDays, relativeDay, todayIn, zonedTime } from "@/lib/dates";
import { addBusinessDays, isBusinessDay, onOrNextBusinessDay } from "@/lib/holidays";
import { ayarlariTamamla, VARSAYILAN_AYARLAR } from "@/lib/domain";
import {
  asamaGorevPlani,
  ertelemeGunu,
  ilkTekrar,
  planla,
  sonrakiHatirlatma,
  tamamlaninceSonrakiVade,
  tekrarCoz,
  tekrarEtiketi,
} from "@/lib/rules";

const A = VARSAYILAN_AYARLAR;
const iso = (d: Date | null) => d?.toISOString() ?? null;
// İstanbul UTC+3: yerel 09:00 = 06:00Z
const saat9 = (gun: string) => `${gun}T06:00:00.000Z`;

describe("tarih ve saat dilimi", () => {
  it("İstanbul yerel saatini UTC'ye çevirir", () => {
    expect(zonedTime("2026-10-08", "09:00", "Europe/Istanbul").toISOString()).toBe("2026-10-08T06:00:00.000Z");
    expect(zonedTime("2026-01-15", "08:30", "Europe/Istanbul").toISOString()).toBe("2026-01-15T05:30:00.000Z");
  });

  it("gece yarısına yakın anlarda doğru günü verir", () => {
    // 2026-10-05 22:30Z = İstanbul 6 Ekim 01:30
    expect(todayIn("Europe/Istanbul", new Date("2026-10-05T22:30:00Z"))).toBe("2026-10-06");
  });

  it("göreli gün metni", () => {
    expect(relativeDay("2026-10-05", "2026-10-05")).toBe("bugün");
    expect(relativeDay("2026-10-06", "2026-10-05")).toBe("yarın");
    expect(relativeDay("2026-10-02", "2026-10-05")).toBe("3 gün gecikti");
  });
});

describe("iş günü ve Türkiye tatilleri", () => {
  it("hafta sonu ve resmi tatiller iş günü değildir", () => {
    expect(isBusinessDay("2026-10-10")).toBe(false); // Cumartesi
    expect(isBusinessDay("2026-10-29")).toBe(false); // Cumhuriyet Bayramı
    expect(isBusinessDay("2026-05-27")).toBe(false); // Kurban Bayramı
    expect(isBusinessDay("2026-03-20")).toBe(false); // Ramazan Bayramı
    expect(isBusinessDay("2026-10-28")).toBe(true); // arife, yarım gün
    expect(isBusinessDay("2026-11-02", ["2026-11-02"])).toBe(false); // ek tatil
  });

  it("iş günü ekler, tatilleri atlar", () => {
    expect(addBusinessDays("2026-10-05", 3)).toBe("2026-10-08");
    expect(addBusinessDays("2026-10-27", 3)).toBe("2026-11-02"); // 29 Ekim atlanır
    expect(addBusinessDays("2026-05-22", 1)).toBe("2026-05-25");
    expect(addBusinessDays("2026-05-25", 2)).toBe("2026-06-01"); // 27-30 Mayıs bayram
  });

  it("tatile düşen gün sonraki iş gününe kayar", () => {
    expect(onOrNextBusinessDay("2026-10-29")).toBe("2026-10-30");
    expect(onOrNextBusinessDay("2026-11-15")).toBe("2026-11-16");
    expect(onOrNextBusinessDay("2026-10-30")).toBe("2026-10-30");
  });
});

describe("PRD senaryoları", () => {
  const bugun = "2026-10-05"; // Pazartesi

  it("Teklif takibi: 3 iş günü sonra 'cevap geldi mi?'", () => {
    const p = planla({ girdi: "takip", olay: "teklif_gonderildi", tarih: null, hatirlatma: null, bugun }, A);
    expect(p).toMatchObject({ tur: "takip", vade: "2026-10-08", kural: "teklif" });
    expect(iso(p.hatirlatma_zamani)).toBe(saat9("2026-10-08"));
  });

  it("Teklif takibi tatil haftasında tatili atlar", () => {
    const p = planla({ girdi: "takip", olay: "teklif_gonderildi", tarih: null, hatirlatma: null, bugun: "2026-10-27" }, A);
    expect(p.vade).toBe("2026-11-02");
  });

  it("Numune: 14 gün sonra geri bildirim; hafta sonuna düşerse hatırlatma pazartesi", () => {
    const p = planla({ girdi: "takip", olay: "numune_gonderildi", tarih: null, hatirlatma: null, bugun }, A);
    expect(p).toMatchObject({ tur: "takip", vade: "2026-10-19", kural: "numune" });

    const cmt = planla({ girdi: "takip", olay: "numune_gonderildi", tarih: "2026-10-10", hatirlatma: null, bugun }, A);
    expect(cmt.vade).toBe("2026-10-24"); // Cumartesi
    expect(iso(cmt.hatirlatma_zamani)).toBe(saat9("2026-10-26"));
  });

  it("Verilen söz: perşembe sabahı görev", () => {
    const p = planla({ girdi: "gorev", olay: "yok", tarih: "2026-10-08", hatirlatma: null, bugun }, A);
    expect(p).toMatchObject({ tur: "yapacagim", vade: "2026-10-08", kural: "vade" });
    expect(iso(p.hatirlatma_zamani)).toBe(saat9("2026-10-08"));
  });

  it("Tarihsiz görev hatırlatma üretmez", () => {
    const p = planla({ girdi: "gorev", olay: "yok", tarih: null, hatirlatma: null, bugun }, A);
    expect(p).toMatchObject({ tur: "yapacagim", vade: null, hatirlatma_zamani: null });
  });

  it("Beklenen şey: 5 iş günü sonra dürt", () => {
    const p = planla({ girdi: "bekleme", olay: "yok", tarih: null, hatirlatma: null, bugun }, A);
    expect(p).toMatchObject({ tur: "bekliyorum", vade: "2026-10-12", kural: "bekleme" });
    expect(iso(p.hatirlatma_zamani)).toBe(saat9("2026-10-12"));
  });

  it("Tahsilat: vadeden 3 gün önce ve vade günü (hafta sonu → pazartesi)", () => {
    const p = planla({ girdi: "vade", olay: "odeme_vadesi", tarih: "2026-11-15", hatirlatma: null, bugun }, A);
    expect(p).toMatchObject({ tur: "takip", vade: "2026-11-15", kural: "odeme" });
    expect(iso(p.hatirlatma_zamani)).toBe(saat9("2026-11-12"));

    const ikinci = sonrakiHatirlatma({ vade: "2026-11-15" }, p.hatirlatma_zamani!, A);
    expect(iso(ikinci)).toBe(saat9("2026-11-16"));
    expect(sonrakiHatirlatma({ vade: "2026-11-15" }, ikinci!, A)).toBeNull();
  });

  it("Ödeme ön hatırlatması vade gününe kayarsa tek hatırlatma kalır", () => {
    // Vade Pazartesi 2 Kasım; 3 gün önce = 30 Ekim Cuma (iş günü) → ayrı kalır
    const p = planla({ girdi: "vade", olay: "yok", tarih: "2026-11-02", hatirlatma: null, bugun }, A);
    expect(iso(p.hatirlatma_zamani)).toBe(saat9("2026-10-30"));
    // Vade Salı 3 Kasım, ön gün 1 → 2 Kasım Pazartesi
    const kisa = ayarlariTamamla({ kurallar: { ...A.kurallar, odeme_on_gun: 1 } });
    const q = planla({ girdi: "vade", olay: "yok", tarih: "2026-11-03", hatirlatma: null, bugun }, kisa);
    expect(iso(q.hatirlatma_zamani)).toBe(saat9("2026-11-02"));
    // Vade Pazartesi 16 Kasım, ön gün 1 → 15 Kasım Pazar → 16'ya kayar = vade günü → tek hatırlatma
    const r = planla({ girdi: "vade", olay: "yok", tarih: "2026-11-16", hatirlatma: null, bugun }, kisa);
    expect(iso(r.hatirlatma_zamani)).toBe(saat9("2026-11-16"));
  });

  it("Açıkça istenen hatırlatma kuralın önüne geçer", () => {
    const istenen = new Date("2026-10-06T11:00:00Z");
    const p = planla({ girdi: "takip", olay: "teklif_gonderildi", tarih: null, hatirlatma: istenen, bugun }, A);
    expect(p.vade).toBe("2026-10-08");
    expect(p.hatirlatma_zamani).toEqual(istenen);
  });

  it("Ayarlardan değiştirilen kural süresi kullanılır", () => {
    const a = ayarlariTamamla({ kurallar: { ...A.kurallar, teklif_is_gunu: 5 } });
    const p = planla({ girdi: "takip", olay: "teklif_gonderildi", tarih: null, hatirlatma: null, bugun }, a);
    expect(p.vade).toBe("2026-10-12");
  });
});

describe("erteleme", () => {
  it("yarın / 3 gün / haftaya iş gününe kayar", () => {
    expect(ertelemeGunu("yarin", "2026-10-09", A)).toBe("2026-10-12"); // Cuma → Pazartesi
    expect(ertelemeGunu("3gun", "2026-10-05", A)).toBe("2026-10-08");
    expect(ertelemeGunu("haftaya", "2026-10-22", A)).toBe("2026-10-30"); // 29 Ekim tatil
    expect(ertelemeGunu("2026-12-01", "2026-10-05", A)).toBe("2026-12-01");
    expect(() => ertelemeGunu("2026-13-01", "2026-10-05", A)).toThrow();
  });
});

describe("tekrarlayan görevler", () => {
  it("kural metnini çözer", () => {
    expect(tekrarCoz("aylik:5")).toEqual({ tip: "aylik", gun: 5 });
    expect(tekrarCoz("haftalik:1")).toEqual({ tip: "haftalik", gun: 1 });
    expect(tekrarCoz("yillik:02-30")).toBeNull();
    expect(tekrarCoz("her gün")).toBeNull();
    expect(tekrarEtiketi("aylik:5")).toBe("Her ayın 5'i");
  });

  it("Her ay 5'inde stok raporu", () => {
    const k = tekrarCoz("aylik:5")!;
    expect(ilkTekrar(k, "2026-10-05")).toBe("2026-10-05");
    expect(ilkTekrar(k, "2026-10-06")).toBe("2026-11-05");
    // Zamanında bitirilirse sonraki ay
    expect(tamamlaninceSonrakiVade(k, "2026-10-05", "2026-10-05")).toBe("2026-11-05");
    // Erken bitirilirse yine sonraki ay (aynı ay tekrar oluşmaz)
    expect(tamamlaninceSonrakiVade(k, "2026-10-05", "2026-10-03")).toBe("2026-11-05");
    // Çok geç bitirilirse birikmiş görev oluşmaz
    expect(tamamlaninceSonrakiVade(k, "2026-08-05", "2026-10-07")).toBe("2026-11-05");
  });

  it("ay sonu günleri kısa aylarda kırpılır", () => {
    const k = tekrarCoz("aylik:31")!;
    expect(tamamlaninceSonrakiVade(k, "2027-01-31", "2027-01-31")).toBe("2027-02-28");
    expect(tamamlaninceSonrakiVade(k, "2027-02-28", "2027-02-28")).toBe("2027-03-31");
  });

  it("haftalık, günlük ve yıllık", () => {
    expect(ilkTekrar(tekrarCoz("haftalik:1")!, "2026-10-06")).toBe("2026-10-12");
    expect(ilkTekrar(tekrarCoz("haftalik:7")!, "2026-10-06")).toBe("2026-10-11");
    expect(tamamlaninceSonrakiVade(tekrarCoz("gunluk")!, "2026-10-09", "2026-10-09")).toBe("2026-10-12");
    expect(tamamlaninceSonrakiVade(tekrarCoz("yillik:10-29")!, "2026-10-29", "2026-10-29")).toBe("2027-10-29");
  });
});

describe("fırsat aşaması görevleri", () => {
  it("aşama değişince doğru takip görevi planlanır", () => {
    expect(asamaGorevPlani("teklif", "2026-10-05", A)).toMatchObject({
      tur: "takip",
      vade: "2026-10-08",
      kural: "asama:teklif",
      baslik: "Teklife dönüş geldi mi?",
    });
    expect(asamaGorevPlani("numune", "2026-10-05", A)?.vade).toBe(addDays("2026-10-05", 14));
    expect(asamaGorevPlani("kaybedildi", "2026-10-05", A)).toBeNull();
  });
});
