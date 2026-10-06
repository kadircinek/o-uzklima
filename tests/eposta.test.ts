import { describe, expect, it } from "vitest";
import {
  adresCoz,
  alanAdlariniCoz,
  anahtarCoz,
  firmalariBul,
  htmlMetne,
  iletiAyristir,
  iletiKonusuMu,
  kisiselAdres,
  konuTemizle,
  ogrenilecekAlanlar,
  postmarkCoz,
  yonBelirle,
  type PostmarkYuk,
} from "@/lib/eposta";

const GELEN = "a1b2c3d4@inbound.postmarkapp.com";

describe("adresler", () => {
  it("adı ve büyük harfi ayıklar", () => {
    expect(adresCoz("Ali Demir <Ali.Demir@Acme.COM>")).toBe("ali.demir@acme.com");
    expect(adresCoz("yok")).toBeNull();
  });

  it("kişisel adres ve anahtar", () => {
    expect(kisiselAdres(GELEN, "k7f3x9m2p1")).toBe("a1b2c3d4+k7f3x9m2p1@inbound.postmarkapp.com");
    expect(anahtarCoz("A1B2C3D4+K7F3X9M2P1@inbound.postmarkapp.com", GELEN)).toBe("k7f3x9m2p1");
    expect(anahtarCoz("a1b2c3d4@inbound.postmarkapp.com", GELEN)).toBeNull();
    expect(anahtarCoz("baska+k7f3x9m2p1@inbound.postmarkapp.com", GELEN)).toBeNull();
    expect(anahtarCoz("a1b2c3d4+k7f3x9m2p1@evil.com", GELEN)).toBeNull();
  });

  it("alan adı listesini çözer", () => {
    expect(alanAdlariniCoz("acme.com, @Acme.com.tr https://www.delta-polimer.de/iletisim yanlış")).toEqual([
      "acme.com",
      "acme.com.tr",
      "delta-polimer.de",
    ]);
  });
});

describe("konu", () => {
  it("iletme öneklerini temizler", () => {
    expect(konuTemizle("FW: İlt: Lucon teklif talebi")).toBe("Lucon teklif talebi");
    expect(konuTemizle("TR: Fwd: numune")).toBe("numune");
    expect(konuTemizle("RE: fiyat")).toBe("RE: fiyat");
    expect(iletiKonusuMu("Fwd: x")).toBe(true);
    expect(iletiKonusuMu("Teklif")).toBe(false);
  });
});

describe("iletilen e-postayı ayırma", () => {
  it("Outlook (Türkçe)", () => {
    const p = iletiAyristir(
      [
        "perşembe dönüş yap",
        "",
        "iOS için Outlook'u edinin",
        "________________________________",
        "Kimden: Ali Demir <ali.demir@acme.com>",
        "Gönderildi: 5 Ekim 2026 Pazartesi 10:00",
        "Kime: Kadir Çinek <kadir@buteo.com.tr>",
        "Konu: Lucon teklif talebi",
        "",
        "Merhaba Kadir Bey,",
        "60 ton Lucon için fiyat rica ederiz.",
      ].join("\n"),
    );
    expect(p.not).toBe("perşembe dönüş yap");
    expect(p.gonderen).toEqual({ adres: "ali.demir@acme.com", ad: "Ali Demir" });
    expect(p.konu).toBe("Lucon teklif talebi");
    expect(p.tarih).toBe("5 Ekim 2026 Pazartesi 10:00");
    expect(p.govde).toBe("Merhaba Kadir Bey,\n60 ton Lucon için fiyat rica ederiz.");
  });

  it("Outlook (İngilizce, Original Message)", () => {
    const p = iletiAyristir(
      "-----Original Message-----\r\nFrom: Jonas Weber <j.weber@delta.de>\r\nSent: Monday\r\nSubject: Exceed price\r\n\r\nHello",
    );
    expect(p.not).toBe("");
    expect(p.gonderen?.adres).toBe("j.weber@delta.de");
    expect(p.konu).toBe("Exceed price");
    expect(p.govde).toBe("Hello");
  });

  it("Gmail", () => {
    const p = iletiAyristir(
      "Takip et\n\n---------- Forwarded message ---------\nFrom: Lisa Wang <lisa@basechem.cn>\nDate: Mon, Oct 5, 2026\nSubject: TDS\nTo: <kadir@buteo.com.tr>\n\n\nPlease find attached.",
    );
    expect(p.not).toBe("Takip et");
    expect(p.gonderen?.adres).toBe("lisa@basechem.cn");
    expect(p.govde).toBe("Please find attached.");
  });

  it("iPhone Mail (işaretsiz Türkçe başlık)", () => {
    const p = iletiAyristir(
      "Yarın ara\n\niPhone'umdan gönderildi\n\nKimden: Mehmet Öz <mehmet@yildizambalaj.com.tr>\nTarih: 5 Ekim 2026 11:02:13 GMT+3\nKime: kadir@buteo.com.tr\nKonu: Numune\n\nNumune ulaştı.",
    );
    expect(p.not).toBe("Yarın ara");
    expect(p.gonderen?.adres).toBe("mehmet@yildizambalaj.com.tr");
    expect(p.konu).toBe("Numune");
    expect(p.govde).toBe("Numune ulaştı.");
  });

  it("iletme işareti yoksa tamamı not", () => {
    expect(iletiAyristir("Sadece bir not\nSent from my iPhone")).toEqual({
      not: "Sadece bir not",
      gonderen: null,
      konu: null,
      tarih: null,
      govde: "",
    });
  });
});

describe("HTML gövde", () => {
  it("etiketleri ve varlıkları çözer", () => {
    expect(htmlMetne("<html><head><style>p{}</style></head><body><p>Merhaba&nbsp;Kadir</p><div>60 &lt;ton&gt; &amp; fiyat&#39;ı<br>teşekkürler</div></body></html>")).toBe(
      "Merhaba Kadir\n60 <ton> & fiyat'ı\nteşekkürler",
    );
  });
});

describe("Postmark yükü", () => {
  const yuk: PostmarkYuk = {
    FromFull: { Email: "Kadir@Buteo.com.tr", Name: "Kadir Çinek" },
    ToFull: [{ Email: "ali.demir@acme.com", Name: "Ali" }],
    CcFull: [],
    BccFull: [{ Email: "a1b2c3d4+k7f3x9m2p1@inbound.postmarkapp.com", MailboxHash: "k7f3x9m2p1" }],
    OriginalRecipient: "a1b2c3d4+k7f3x9m2p1@inbound.postmarkapp.com",
    MailboxHash: "k7f3x9m2p1",
    Subject: "Lucon teklifi",
    MessageID: "abc-123",
    TextBody: "",
    HtmlBody: "<p>Teklifimiz ektedir.</p>",
    Attachments: [{ Name: "teklif.pdf" }],
  };

  it("alanları çözer, metin yoksa HTML'i kullanır", () => {
    const e = postmarkCoz(yuk, GELEN)!;
    expect(e).toMatchObject({
      kimden: { adres: "kadir@buteo.com.tr", ad: "Kadir Çinek" },
      kime: ["ali.demir@acme.com"],
      anahtar: "k7f3x9m2p1",
      konu: "Lucon teklifi",
      metin: "Teklifimiz ektedir.",
      messageId: "abc-123",
      ekler: ["teklif.pdf"],
    });
  });

  it("MailboxHash yoksa anahtar alıcı adresinden bulunur", () => {
    const e = postmarkCoz({ ...yuk, MailboxHash: "", BccFull: [] }, GELEN)!;
    expect(e.anahtar).toBe("k7f3x9m2p1");
  });

  it("gizli kopya ile iletilen ayırt edilir", () => {
    expect(yonBelirle(postmarkCoz(yuk, GELEN)!, GELEN)).toBe("gizli_kopya");
    const ilet = postmarkCoz({ ...yuk, ToFull: [{ Email: "a1b2c3d4+k7f3x9m2p1@inbound.postmarkapp.com" }] }, GELEN)!;
    expect(yonBelirle(ilet, GELEN)).toBe("iletilen");
  });

  it("göndereni olmayan yük reddedilir", () => {
    expect(postmarkCoz({ Subject: "x" }, GELEN)).toBeNull();
  });
});

describe("firma eşleştirme", () => {
  const firmalar = [
    { id: "acme", ad: "Acme", eposta_alanlari: ["acme.com"] },
    { id: "delta", ad: "Delta", eposta_alanlari: [] },
  ];
  const kisiler = [
    { company_id: "delta", eposta: "j.weber@delta.de" },
    { company_id: "acme", eposta: "ali@gmail.com" },
  ];

  it("kişi e-postası, firma alan adı ve kişi alan adıyla eşleşir", () => {
    expect(firmalariBul(["ali@gmail.com"], firmalar, kisiler)).toEqual(["acme"]);
    expect(firmalariBul(["satis@tr.acme.com"], firmalar, kisiler)).toEqual(["acme"]);
    expect(firmalariBul(["einkauf@delta.de"], firmalar, kisiler)).toEqual(["delta"]);
  });

  it("genel servisler ve kendi alanımız alan adıyla eşleşmez", () => {
    expect(firmalariBul(["biri@gmail.com"], firmalar, kisiler)).toEqual([]);
    expect(firmalariBul(["ayse@buteo.com.tr"], [...firmalar, { id: "b", ad: "Buteo", eposta_alanlari: ["buteo.com.tr"] }], kisiler, ["buteo.com.tr"])).toEqual([]);
  });

  it("birden çok alıcı birden çok firma", () => {
    expect(firmalariBul(["a@acme.com", "b@delta.de", "c@acme.com"], firmalar, kisiler).sort()).toEqual(["acme", "delta"]);
  });

  it("öğrenilecek alan adları", () => {
    expect(ogrenilecekAlanlar(["a@acme.com", "b@gmail.com", "c@buteo.com.tr", "d@ACME.com"], ["buteo.com.tr"])).toEqual(["acme.com"]);
  });
});
