import { describe, expect, it } from "vitest";
import { VARSAYILAN_AYARLAR } from "@/lib/domain";
import {
  acikFirsatBul,
  asamaIleriMi,
  hatirlatmaAni,
  olayiDuzelt,
  onayEksigi,
  onayPlani,
  varsayilanOnay,
  type KartBaglami,
  type OnayVerisi,
} from "@/lib/inbox";
import { ayristirmayiDuzelt, bosAyristirma, type Ayristirma } from "@/lib/parse/schema";

const A = VARSAYILAN_AYARLAR;
const bugun = "2026-10-05";

const baglam: KartBaglami = {
  firmalar: [
    { id: "f-acme", ad: "Acme Plastik San. ve Tic. A.Ş.", tur: "musteri" },
    { id: "f-base", ad: "Basechem", tur: "tedarikci" },
  ],
  kisiler: [
    { id: "k-ali", ad: "Ali Yılmaz", company_id: "f-acme" },
    { id: "k-ayse", ad: "Ayşe", company_id: "f-base" },
  ],
  firsatlar: [
    { id: "d-lucon", company_id: "f-acme", urun: "Lucon", asama: "numune" },
    { id: "d-eski", company_id: "f-acme", urun: "Exceed", asama: "siparis" },
  ],
};

const ayr = (p: Partial<Ayristirma>): Ayristirma => ({ ...bosAyristirma("x"), guven: 0.9, ...p });

describe("onay kartının başlangıç durumu", () => {
  it("kayıtlı firma, kişi ve ürüne uyan açık fırsat seçilir", () => {
    const o = varsayilanOnay(ayr({ tur: "takip", olay: "teklif_gonderildi", firma: "acme plastik", kisi: "Ali", urun: "LUCON" }), baglam);
    expect(o.firma).toEqual({ mod: "mevcut", id: "f-acme" });
    expect(o.kisi).toEqual({ mod: "mevcut", id: "k-ali" });
    expect(o.firsat).toEqual({ mod: "mevcut", id: "d-lucon" });
  });

  it("kayıtlı olmayan firma ve kişi 'yeni' olarak önerilir; teklif + ürün yeni fırsat önerir", () => {
    const o = varsayilanOnay(ayr({ tur: "takip", olay: "teklif_gonderildi", firma: "Yeni A.Ş.", kisi: "Can", urun: "Vistamaxx" }), baglam);
    expect(o.firma).toEqual({ mod: "yeni", ad: "Yeni A.Ş.", tur: "musteri" });
    expect(o.kisi).toEqual({ mod: "yeni", ad: "Can" });
    expect(o.firsat).toEqual({ mod: "yeni" });
  });

  it("yalnızca kişi adı geçerse kişinin firması bulunur", () => {
    const o = varsayilanOnay(ayr({ kisi: "Ayşe" }), baglam);
    expect(o.firma).toEqual({ mod: "mevcut", id: "f-base" });
    expect(o.kisi).toEqual({ mod: "mevcut", id: "k-ayse" });
  });

  it("ürün ve olay yoksa fırsata tahmini bağlama yapılmaz; kapalı fırsatlar aday değildir", () => {
    expect(varsayilanOnay(ayr({ tur: "not", firma: "Acme Plastik" }), baglam).firsat).toEqual({ mod: "yok" });
    expect(acikFirsatBul(baglam.firsatlar, "f-acme", "Exceed")).toBeNull();
    expect(acikFirsatBul(baglam.firsatlar, "f-acme", null)?.id).toBe("d-lucon");
  });
});

describe("tür ve olay tutarlılığı", () => {
  const onay = (p: Partial<OnayVerisi>): OnayVerisi => ({ ...varsayilanOnay(ayr({}), baglam), ...p });

  it("Görev'e çevrilen teklif takibi teklif kuralını kullanmaz", () => {
    const o = onay({ tur: "gorev", olay: "teklif_gonderildi" });
    expect(olayiDuzelt(o).olay).toBe("yok");
    expect(onayPlani(o, bugun, A)).toMatchObject({ tur: "yapacagim", vade: null });
  });

  it("vade türü her zaman ödeme kuralıdır", () => {
    expect(olayiDuzelt(onay({ tur: "vade", olay: "yok" })).olay).toBe("odeme_vadesi");
    expect(onayPlani(onay({ tur: "vade", tarih: "2026-11-15" }), bugun, A)?.kural).toBe("odeme");
  });

  it("modelin olayı türle çelişirse olay esas alınır", () => {
    const a = ayristirmayiDuzelt({ ...ayr({ tur: "gorev", olay: "numune_gonderildi" }) }, "x");
    expect(a.tur).toBe("takip");
  });

  it("tekrarlayan görevin ilk vadesi kuraldan gelir", () => {
    const p = onayPlani(onay({ tur: "gorev", tekrar: "aylik:5" }), bugun, A);
    expect(p).toMatchObject({ vade: "2026-10-05", kural: "vade" });
  });

  it("özel hatırlatma yerel saatten UTC'ye çevrilir", () => {
    expect(hatirlatmaAni("2026-10-06T14:30", A)?.toISOString()).toBe("2026-10-06T11:30:00.000Z");
    expect(hatirlatmaAni("2026-10-06", A)).toBeNull();
  });

  it("eksik alanlar onayı engeller", () => {
    expect(onayEksigi(onay({ baslik: " " }))).toBe("Başlık boş olamaz.");
    expect(onayEksigi(onay({ tur: "vade", tarih: null }))).toBe("Ödeme vadesi için tarih gerekli.");
    expect(onayEksigi(onay({ firma: { mod: "yok" }, kisi: { mod: "yeni", ad: "Can" } }))).toBe("Kişi için bir firma seçin.");
    expect(onayEksigi(onay({ firma: { mod: "mevcut", id: "f-acme" }, firsat: { mod: "yeni" }, urun: null }))).toBe(
      "Yeni fırsat için ürün gerekli.",
    );
    expect(onayEksigi(onay({}))).toBeNull();
  });
});

describe("fırsat aşaması ilerlemesi", () => {
  it("yalnızca ileri aşamaya geçiş ilerleme sayılır", () => {
    expect(asamaIleriMi("numune", "teklif")).toBe(true);
    expect(asamaIleriMi("teklif", "numune")).toBe(false);
    expect(asamaIleriMi("kaybedildi", "teklif")).toBe(false);
  });
});
