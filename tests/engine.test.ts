import { describe, expect, it } from "vitest";
import { VARSAYILAN_AYARLAR } from "@/lib/domain";
import {
  bugunGorunumu,
  hatirlatmaMetni,
  hatirlatmalariSec,
  ozetOlustur,
  ozetZamaniMi,
  sessizMusteriler,
  type MotorFirmasi,
  type MotorGorevi,
} from "@/lib/engine";

const A = VARSAYILAN_AYARLAR;
const bugun = "2026-10-05"; // Pazartesi

function gorev(p: Partial<MotorGorevi> & { id: string }): MotorGorevi {
  return { baslik: p.id, tur: "yapacagim", durum: "acik", vade: null, hatirlatma_zamani: null, ...p };
}

describe("günlük özet zamanı (iş günü 08:30)", () => {
  it("08:30'dan önce gönderilmez, sonra bir kez gönderilir", () => {
    expect(ozetZamaniMi(new Date("2026-10-05T05:29:00Z"), A, false)).toBe(false); // 08:29
    expect(ozetZamaniMi(new Date("2026-10-05T05:30:00Z"), A, false)).toBe(true); // 08:30
    expect(ozetZamaniMi(new Date("2026-10-05T09:00:00Z"), A, true)).toBe(false); // zaten gitti
  });

  it("hafta sonu ve tatilde gönderilmez", () => {
    expect(ozetZamaniMi(new Date("2026-10-10T06:00:00Z"), A, false)).toBe(false); // Cumartesi
    expect(ozetZamaniMi(new Date("2026-10-29T06:00:00Z"), A, false)).toBe(false); // 29 Ekim
  });

  it("özet saati ayarlardan değişir", () => {
    const a = { ...A, ozet_saati: "07:15" };
    expect(ozetZamaniMi(new Date("2026-10-05T04:15:00Z"), a, false)).toBe(true);
  });
});

describe("günde en fazla 6 bildirim", () => {
  const zamaniGelen = Array.from({ length: 8 }, (_, i) =>
    gorev({ id: `g${i}`, hatirlatma_zamani: `2026-10-05T06:0${7 - i}:00Z` }),
  );

  it("sınırı aşanlar özete aktarılır; en eski hatırlatma önce gider", () => {
    const { gonder, ozete } = hatirlatmalariSec(zamaniGelen, 2, A.gunluk_bildirim_limiti);
    expect(gonder.map((g) => g.id)).toEqual(["g7", "g6", "g5", "g4"]);
    expect(ozete).toHaveLength(4);
  });

  it("sınır dolduysa hiçbiri gönderilmez", () => {
    expect(hatirlatmalariSec(zamaniGelen, 6, 6).gonder).toHaveLength(0);
    expect(hatirlatmalariSec(zamaniGelen, 9, 6).gonder).toHaveLength(0);
  });
});

describe("Bugün ekranı", () => {
  const gorevler = [
    gorev({ id: "eski", vade: "2026-10-01" }),
    gorev({ id: "dun", vade: "2026-10-04", tur: "takip" }),
    gorev({ id: "bugun-bekle", vade: bugun, tur: "bekliyorum" }),
    gorev({ id: "bugun-yap", vade: bugun }),
    gorev({ id: "yarin-bekle", vade: "2026-10-06", tur: "bekliyorum" }),
    gorev({ id: "yarin-yap", vade: "2026-10-06" }),
    gorev({ id: "bitmis", vade: "2026-10-01", durum: "bitti" }),
    gorev({ id: "ertelenmis", vade: bugun, durum: "ertelendi", tur: "takip" }),
  ];

  it("gecikenler en üstte, sonra bugünküler; bitenler görünmez", () => {
    const g = bugunGorunumu(gorevler, bugun);
    expect(g.gecikenler.map((x) => x.id)).toEqual(["eski", "dun"]);
    expect(g.bugun.map((x) => x.id)).toEqual(["bugun-yap", "ertelenmis", "bugun-bekle"]);
    expect(g.bekleyenler.map((x) => x.id)).toEqual(["yarin-bekle"]);
  });

  it("özet: 5 öncelik, gecikenler işaretli", () => {
    const o = ozetOlustur(gorevler, [], bugun, A)!;
    expect(o.baslik).toBe("Günaydın · 2 gecikmiş, 3 bugün");
    expect(o.maddeler).toHaveLength(5);
    expect(o.maddeler[0]).toBe("⚠ 4 gün gecikti: eski");
    expect(o.govde.split("\n")[2]).toBe("3. bugun-yap");
  });

  it("yapacak iş yoksa özet gönderilmez", () => {
    expect(ozetOlustur([gorev({ id: "x", vade: "2026-10-09" })], [], bugun, A)).toBeNull();
  });

  it("sessiz müşteriler haftada bir (pazartesi) özete eklenir", () => {
    const sessiz = [{ id: "f", ad: "Acme", gun: 41 }];
    expect(ozetOlustur([], sessiz, bugun, A)?.maddeler).toEqual(["Sessiz müşteriler: Acme"]);
    expect(ozetOlustur([], sessiz, "2026-10-06", A)).toBeNull();
  });
});

describe("sessiz müşteri (30 gün temas yok)", () => {
  const f = (p: Partial<MotorFirmasi> & { id: string }): MotorFirmasi => ({
    ad: p.id,
    tur: "musteri",
    aktif: true,
    son_temas: null,
    created_at: "2026-01-01T00:00:00Z",
    ...p,
  });

  it("yalnızca aktif müşteriler, en sessiz önce", () => {
    const liste = sessizMusteriler(
      [
        f({ id: "31gun", son_temas: "2026-09-04T10:00:00Z" }),
        f({ id: "29gun", son_temas: "2026-09-06T10:00:00Z" }),
        f({ id: "60gun", son_temas: "2026-08-06T10:00:00Z" }),
        f({ id: "hic", son_temas: null }),
        f({ id: "yeni-hic", son_temas: null, created_at: "2026-10-01T00:00:00Z" }),
        f({ id: "tedarikci", tur: "tedarikci", son_temas: "2026-01-01T00:00:00Z" }),
        f({ id: "pasif", aktif: false, son_temas: "2026-01-01T00:00:00Z" }),
      ],
      bugun,
      A,
    );
    expect(liste.map((x) => x.id)).toEqual(["hic", "60gun", "31gun"]);
    expect(liste[2].gun).toBe(31);
  });
});

describe("bildirim metinleri", () => {
  it("bekliyorum: dürt", () => {
    const m = hatirlatmaMetni(gorev({ id: "x", baslik: "TDS gönderecek", tur: "bekliyorum", firma_adi: "Basechem" }), bugun);
    expect(m).toEqual({ baslik: "Hâlâ bekliyorsun · Basechem", govde: "TDS gönderecek — dürtmek ister misin?" });
  });

  it("vadesi yaklaşan ödeme", () => {
    const m = hatirlatmaMetni(gorev({ id: "x", baslik: "Ödeme", tur: "takip", vade: "2026-10-08" }), bugun);
    expect(m.baslik).toBe("Yaklaşıyor (8 Eki Per)");
  });
});
