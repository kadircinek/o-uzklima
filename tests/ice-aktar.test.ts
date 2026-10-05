import { describe, expect, it } from "vitest";
import { satirlariDonustur, sutunlariTahminEt, turuCoz } from "@/lib/ice-aktar";

describe("firma içe aktarma", () => {
  it("Türkçe başlıkları tanır", () => {
    expect(sutunlariTahminEt(["Firma Adı", "Ülke", "Tür", "Sektör", "Açıklama"])).toEqual({
      ad: 0,
      ulke: 1,
      tur: 2,
      segment: 3,
      notlar: 4,
    });
  });

  it("Business Central başlıklarını tanır", () => {
    expect(sutunlariTahminEt(["No.", "Name", "Country/Region Code", "Customer Posting Group"])).toEqual({
      ad: 1,
      ulke: 2,
      segment: 3,
    });
  });

  it("başlık tanınmazsa ilk sütun ad olur", () => {
    expect(sutunlariTahminEt(["Kolon A", "Kolon B"])).toEqual({ ad: 0 });
  });

  it("türü serbest metinden çözer", () => {
    expect(turuCoz("Tedarikçi", "musteri")).toBe("tedarikci");
    expect(turuCoz("Vendor", "musteri")).toBe("tedarikci");
    expect(turuCoz("prospect", "musteri")).toBe("aday");
    expect(turuCoz("", "aday")).toBe("aday");
    expect(turuCoz("bilinmeyen", "musteri")).toBe("musteri");
  });

  it("boş adlı satırları atlar, boşlukları temizler", () => {
    const s = satirlariDonustur(
      [
        ["  Acme   Plastik ", "TR", "Müşteri"],
        ["", "DE", ""],
        [null, null, null],
        ["LG Chem", "", "Supplier"],
      ],
      { ad: 0, ulke: 1, tur: 2 },
      "musteri",
    );
    expect(s).toEqual([
      { ad: "Acme Plastik", ulke: "TR", tur: "musteri", segment: null, notlar: null },
      { ad: "LG Chem", ulke: null, tur: "tedarikci", segment: null, notlar: null },
    ]);
  });
});
