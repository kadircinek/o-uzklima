// Alan sabitleri, etiketler ve varsayılan ayarlar. Hem sunucu hem tarayıcı
// tarafında kullanılır; burada sunucuya özel kod olmamalı.

export const GOREV_TURLERI = ["yapacagim", "bekliyorum", "takip"] as const;
export type GorevTuru = (typeof GOREV_TURLERI)[number];
export const GOREV_TURU_ETIKET: Record<GorevTuru, string> = {
  yapacagim: "Yapacağım",
  bekliyorum: "Bekliyorum",
  takip: "Takip et",
};

export const GOREV_DURUMLARI = ["acik", "ertelendi", "bitti"] as const;
export type GorevDurumu = (typeof GOREV_DURUMLARI)[number];
export const GOREV_DURUMU_ETIKET: Record<GorevDurumu, string> = {
  acik: "Açık",
  ertelendi: "Ertelendi",
  bitti: "Bitti",
};

export const FIRMA_TURLERI = ["musteri", "tedarikci", "aday"] as const;
export type FirmaTuru = (typeof FIRMA_TURLERI)[number];
export const FIRMA_TURU_ETIKET: Record<FirmaTuru, string> = {
  musteri: "Müşteri",
  tedarikci: "Tedarikçi",
  aday: "Aday",
};

export const ASAMALAR = ["talep", "numune", "teklif", "muzakere", "siparis", "kaybedildi"] as const;
export type Asama = (typeof ASAMALAR)[number];
export const ASAMA_ETIKET: Record<Asama, string> = {
  talep: "Talep",
  numune: "Numune",
  teklif: "Teklif",
  muzakere: "Müzakere",
  siparis: "Sipariş",
  kaybedildi: "Kaybedildi",
};
export const ACIK_ASAMALAR: readonly Asama[] = ["talep", "numune", "teklif", "muzakere"];

/** Gelen kutusunda ayrıştırılan kayıt türü (PRD: görev, takip, bekleme, vade, not). */
export const GIRDI_TURLERI = ["gorev", "takip", "bekleme", "vade", "not"] as const;
export type GirdiTuru = (typeof GIRDI_TURLERI)[number];
export const GIRDI_TURU_ETIKET: Record<GirdiTuru, string> = {
  gorev: "Görev",
  takip: "Takip",
  bekleme: "Bekleme",
  vade: "Vade / ödeme",
  not: "Not",
};

/** Hatırlatma kuralını tetikleyen olay. */
export const OLAYLAR = ["yok", "teklif_gonderildi", "numune_gonderildi", "odeme_vadesi"] as const;
export type Olay = (typeof OLAYLAR)[number];
export const OLAY_ETIKET: Record<Olay, string> = {
  yok: "—",
  teklif_gonderildi: "Teklif gönderildi",
  numune_gonderildi: "Numune gönderildi",
  odeme_vadesi: "Ödeme vadesi",
};

export type AsamaGorevi = {
  tur: GorevTuru;
  baslik: string;
  /** Aşama tarihinden sonra kaç gün */
  gun: number;
  /** true ise gün sayısı iş günü olarak hesaplanır */
  is_gunu: boolean;
};

export type Kurallar = {
  /** Bekliyorum: oluşturulduktan kaç iş günü sonra dürt */
  bekleme_is_gunu: number;
  /** Teklif gönderildi: kaç iş günü sonra "cevap geldi mi?" */
  teklif_is_gunu: number;
  /** Numune gönderildi: kaç gün sonra geri bildirim iste */
  numune_gun: number;
  /** Ödeme vadesi: kaç gün önce ön hatırlatma */
  odeme_on_gun: number;
  /** Tarihsiz genel takip: kaç iş günü sonra */
  takip_is_gunu: number;
  /** Aktif müşteride kaç gün temas yoksa "sessiz" */
  sessiz_gun: number;
  /** Fırsat aşaması değişince açılacak görev; null = görev açma */
  asama_gorevleri: Record<Asama, AsamaGorevi | null>;
};

export type Ayarlar = {
  saat_dilimi: string;
  /** Günlük özet saati (iş günleri) */
  ozet_saati: string;
  /** Vadeli görevlerin hatırlatma saati */
  hatirlatma_saati: string;
  /** Günde en fazla kaç hatırlatma bildirimi (özet hariç; fazlası özete kalır) */
  gunluk_bildirim_limiti: number;
  /** Sessiz müşteri listesinin özete eklendiği gün (1 = Pazartesi) */
  sessiz_liste_gunu: number;
  /** Takvimde olmayan ek tatil günleri (YYYY-MM-DD) */
  ek_tatiller: string[];
  kurallar: Kurallar;
};

export const VARSAYILAN_KURALLAR: Kurallar = {
  bekleme_is_gunu: 5,
  teklif_is_gunu: 3,
  numune_gun: 14,
  odeme_on_gun: 3,
  takip_is_gunu: 3,
  sessiz_gun: 30,
  asama_gorevleri: {
    talep: { tur: "yapacagim", baslik: "Talebi değerlendir, numune/teklif hazırla", gun: 2, is_gunu: true },
    numune: { tur: "takip", baslik: "Numune geri bildirimi iste", gun: 14, is_gunu: false },
    teklif: { tur: "takip", baslik: "Teklife dönüş geldi mi?", gun: 3, is_gunu: true },
    muzakere: { tur: "takip", baslik: "Müzakereyi takip et", gun: 5, is_gunu: true },
    siparis: { tur: "yapacagim", baslik: "Sipariş teyidi ve teslimat planı", gun: 1, is_gunu: true },
    kaybedildi: null,
  },
};

export const VARSAYILAN_AYARLAR: Ayarlar = {
  saat_dilimi: "Europe/Istanbul",
  ozet_saati: "08:30",
  hatirlatma_saati: "09:00",
  gunluk_bildirim_limiti: 6,
  sessiz_liste_gunu: 1,
  ek_tatiller: [],
  kurallar: VARSAYILAN_KURALLAR,
};

/** Veritabanından gelen (eksik olabilecek) ayarları varsayılanlarla birleştirir. */
export function ayarlariTamamla(raw: Partial<Ayarlar> | null | undefined): Ayarlar {
  const k = (raw?.kurallar ?? {}) as Partial<Kurallar>;
  return {
    ...VARSAYILAN_AYARLAR,
    ...(raw ?? {}),
    ozet_saati: (raw?.ozet_saati ?? VARSAYILAN_AYARLAR.ozet_saati).slice(0, 5),
    hatirlatma_saati: (raw?.hatirlatma_saati ?? VARSAYILAN_AYARLAR.hatirlatma_saati).slice(0, 5),
    ek_tatiller: raw?.ek_tatiller ?? [],
    kurallar: {
      ...VARSAYILAN_KURALLAR,
      ...k,
      asama_gorevleri: { ...VARSAYILAN_KURALLAR.asama_gorevleri, ...(k.asama_gorevleri ?? {}) },
    },
  };
}
