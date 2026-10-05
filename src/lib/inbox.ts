// Gelen kutusu onay kartının veri modeli. Kart hem sunucuda (işleme) hem
// tarayıcıda (önizleme) kullanıldığı için burada sunucuya özel kod yok.

import { isDateStr, isTimeStr, zonedTime, type DateStr } from "./dates";
import type { Asama, Ayarlar, FirmaTuru, GirdiTuru, Olay } from "./domain";
import { eslestir } from "./match";
import type { Aksiyon, Ayristirma } from "./parse/schema";
import { gunHatirlatmasi, ilkTekrar, olayAsamasi, planla, tekrarCoz, type GorevPlani } from "./rules";

export type Secim<TYeni> = { mod: "yok" } | { mod: "mevcut"; id: string } | ({ mod: "yeni" } & TYeni);

export type OnayVerisi = {
  tur: GirdiTuru;
  baslik: string;
  olay: Olay;
  tarih: DateStr | null;
  /** Yerel saat 'YYYY-MM-DDTHH:MM' */
  hatirlatma: string | null;
  tekrar: string | null;
  urun: string | null;
  firma: Secim<{ ad: string; tur: FirmaTuru }>;
  kisi: Secim<{ ad: string }>;
  firsat: Secim<Record<never, never>>;
  ozet: string | null;
  aksiyonlar: Aksiyon[];
};

export type KartFirmasi = { id: string; ad: string; tur: FirmaTuru };
export type KartKisisi = { id: string; ad: string; company_id: string };
export type KartFirsati = { id: string; company_id: string; urun: string; asama: Asama };

export type KartBaglami = {
  firmalar: KartFirmasi[];
  kisiler: KartKisisi[];
  firsatlar: KartFirsati[];
};

/** Fırsat aşamalarının ilerleme sırası (kaybedildi hariç). */
const ILERLEME: Asama[] = ["talep", "numune", "teklif", "muzakere", "siparis"];
export function asamaIleriMi(eski: Asama, yeni: Asama): boolean {
  const i = ILERLEME.indexOf(eski);
  const j = ILERLEME.indexOf(yeni);
  return i >= 0 && j > i;
}

export function acikFirsatBul(
  firsatlar: KartFirsati[],
  companyId: string,
  urun: string | null,
): KartFirsati | null {
  const adaylar = firsatlar.filter(
    (f) => f.company_id === companyId && f.asama !== "siparis" && f.asama !== "kaybedildi",
  );
  if (!urun) return adaylar.length === 1 ? adaylar[0] : null;
  return eslestir(urun, adaylar.map((f) => ({ ...f, ad: f.urun })))?.kayit ?? null;
}

/** Ayrıştırma sonucundan kartın başlangıç durumunu kurar. */
export function varsayilanOnay(a: Ayristirma, baglam: KartBaglami): OnayVerisi {
  const firmaEs = eslestir(a.firma, baglam.firmalar);
  let firma: OnayVerisi["firma"] = { mod: "yok" };
  let kisi: OnayVerisi["kisi"] = { mod: "yok" };

  if (firmaEs) {
    firma = { mod: "mevcut", id: firmaEs.kayit.id };
  } else if (a.kisi && !a.firma) {
    // Yalnızca kişi adı geçtiyse kişinin kayıtlı olduğu tek firmayı bul.
    const kisiEs = eslestir(a.kisi, baglam.kisiler);
    if (kisiEs) {
      firma = { mod: "mevcut", id: kisiEs.kayit.company_id };
      kisi = { mod: "mevcut", id: kisiEs.kayit.id };
    }
  } else if (a.firma) {
    firma = { mod: "yeni", ad: a.firma, tur: "musteri" };
  }

  if (firma.mod === "mevcut" && kisi.mod === "yok" && a.kisi) {
    const companyId = firma.id;
    const kisiEs = eslestir(a.kisi, baglam.kisiler.filter((k) => k.company_id === companyId));
    kisi = kisiEs ? { mod: "mevcut", id: kisiEs.kayit.id } : { mod: "yeni", ad: a.kisi };
  } else if (firma.mod === "yeni" && a.kisi) {
    kisi = { mod: "yeni", ad: a.kisi };
  }

  let firsat: OnayVerisi["firsat"] = { mod: "yok" };
  const asama = olayAsamasi(a.olay);
  if (firma.mod === "mevcut") {
    // Ürün söylenmediyse yalnızca teklif/numune olaylarında tek açık fırsata bağla.
    const f = a.urun || asama ? acikFirsatBul(baglam.firsatlar, firma.id, a.urun) : null;
    if (f) firsat = { mod: "mevcut", id: f.id };
    else if (asama && a.urun) firsat = { mod: "yeni" };
  } else if (firma.mod === "yeni" && asama && a.urun) {
    firsat = { mod: "yeni" };
  }

  return {
    tur: a.tur,
    baslik: a.baslik,
    olay: a.olay,
    tarih: a.tarih,
    hatirlatma: a.hatirlatma,
    tekrar: a.tekrar,
    urun: a.urun,
    firma,
    kisi,
    firsat,
    ozet: a.ozet,
    aksiyonlar: a.aksiyonlar,
  };
}

export function hatirlatmaAni(yerel: string | null, ayarlar: Ayarlar): Date | null {
  if (!yerel) return null;
  const [gun, saat] = yerel.split("T");
  if (!isDateStr(gun) || !isTimeStr(saat)) return null;
  return zonedTime(gun, saat, ayarlar.saat_dilimi);
}

/**
 * Türle çelişen olayı temizler: kart Görev'e çevrildiyse "teklif gönderildi"
 * kuralı ve fırsat aşaması uygulanmamalı.
 */
export function olayiDuzelt(o: OnayVerisi): OnayVerisi {
  const olay: Olay =
    o.tur === "vade" ? "odeme_vadesi" : o.tur === "takip" && o.olay !== "odeme_vadesi" ? o.olay : "yok";
  return olay === o.olay ? o : { ...o, olay };
}

/** Onaylanan kayıttan oluşacak görevin planı (not türünde null). */
export function onayPlani(onay: OnayVerisi, bugun: DateStr, ayarlar: Ayarlar): GorevPlani | null {
  const o = olayiDuzelt(onay);
  if (o.tur === "not") return null;
  const plan = planla(
    { girdi: o.tur, olay: o.olay, tarih: o.tarih, hatirlatma: hatirlatmaAni(o.hatirlatma, ayarlar), bugun },
    ayarlar,
  );
  const tekrar = tekrarCoz(o.tekrar);
  if (tekrar && !plan.vade) {
    plan.vade = ilkTekrar(tekrar, bugun, ayarlar.ek_tatiller);
    plan.hatirlatma_zamani ??= gunHatirlatmasi(plan.vade, ayarlar);
    plan.kural ??= "vade";
  }
  return plan;
}

/** Kartın kaydedilebilir olup olmadığı; değilse kullanıcıya gösterilecek neden. */
export function onayEksigi(o: OnayVerisi): string | null {
  if (!o.baslik.trim()) return "Başlık boş olamaz.";
  if (o.tarih && !isDateStr(o.tarih)) return "Tarih geçersiz.";
  if (o.tur === "vade" && !o.tarih) return "Ödeme vadesi için tarih gerekli.";
  if (o.firma.mod === "yeni" && !o.firma.ad.trim()) return "Yeni firma adı boş olamaz.";
  if (o.kisi.mod !== "yok" && o.firma.mod === "yok") return "Kişi için bir firma seçin.";
  if (o.firsat.mod !== "yok" && o.firma.mod === "yok") return "Fırsat için bir firma seçin.";
  if (o.firsat.mod === "yeni" && !o.urun?.trim()) return "Yeni fırsat için ürün gerekli.";
  if (o.tekrar && !tekrarCoz(o.tekrar)) return "Tekrar kuralı geçersiz.";
  return null;
}
