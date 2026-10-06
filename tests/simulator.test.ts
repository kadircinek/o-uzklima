import { describe, expect, it } from "vitest";
import { ekranBoyutu, guvenliYol, modelCoz, sigdirmaOlcegi, uygulamaPenceresi, yonCoz } from "@/lib/simulator";

describe("iPad Pro simülatörü", () => {
  it("yön değişince en ve boy yer değiştirir", () => {
    expect(ekranBoyutu("13", "dikey")).toEqual({ en: 1032, boy: 1376 });
    expect(ekranBoyutu("13", "yatay")).toEqual({ en: 1376, boy: 1032 });
    expect(ekranBoyutu("11", "yatay")).toEqual({ en: 1210, boy: 834 });
  });

  it("uygulama penceresinden durum çubuğu ve alt pay düşülür", () => {
    expect(uygulamaPenceresi("11", "dikey")).toEqual({ en: 834, boy: 1166 });
  });

  it("cihaz alana sığdırılır, büyütülmez", () => {
    expect(sigdirmaOlcegi("13", "yatay", { en: 3000, boy: 3000 })).toBe(1);
    // 1376+36 = 1412 genişlik; 706 px alana yarı ölçekte sığar
    expect(sigdirmaOlcegi("13", "yatay", { en: 706, boy: 2000 })).toBe(0.5);
    // Yükseklik daha dar: 1032+36 = 1068; 534 px → 0.5
    expect(sigdirmaOlcegi("13", "yatay", { en: 2000, boy: 534 })).toBe(0.5);
    expect(sigdirmaOlcegi("11", "dikey", { en: 10, boy: 10 })).toBe(0.2);
  });

  it("yalnızca uygulama içi yollar açılır", () => {
    expect(guvenliYol("/gorevler?tur=bekliyorum")).toBe("/gorevler?tur=bekliyorum");
    expect(guvenliYol(undefined)).toBe("/");
    expect(guvenliYol("https://kotu.example")).toBe("/");
    expect(guvenliYol("//kotu.example")).toBe("/");
    expect(guvenliYol("/\\kotu.example")).toBe("/");
    expect(guvenliYol("/simulator")).toBe("/");
    expect(guvenliYol("/simulator?yol=/")).toBe("/");
    expect(guvenliYol("/simulatorler")).toBe("/simulatorler");
  });

  it("geçersiz model ve yon varsayılana döner", () => {
    expect(modelCoz("11")).toBe("11");
    expect(modelCoz("12.9")).toBe("13");
    expect(yonCoz("dikey")).toBe("dikey");
    expect(yonCoz(null)).toBe("yatay");
  });
});
