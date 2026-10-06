import "server-only";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { todayIn, type DateStr } from "../dates";
import type { Database, TaskRow } from "../database.types";
import { ayarlariTamamla, type Asama, type Ayarlar, type FirmaTuru, type GorevTuru } from "../domain";
import { kendiAlanlari, ogrenilecekAlanlar, type GirdiEpostasi } from "../eposta";
import { asamaIleriMi, onayPlani, type OnayVerisi } from "../inbox";
import { normalizeAd } from "../match";
import {
  asamaGorevPlani,
  ertelemeGunu,
  gunHatirlatmasi,
  ilkTekrar,
  olayAsamasi,
  planla,
  tamamlaninceSonrakiVade,
  tekrarCoz,
  type ErtelemeSecenegi,
} from "../rules";

// Görev, fırsat ve gelen kutusu üzerindeki iş kuralları. Hem kullanıcı
// oturumlu istemciyle (server action) hem yönetici istemciyle (bildirim
// aksiyonları, cron) çağrılabilir; bu yüzden her sorgu user_id ile
// filtrelenir ve her ekleme user_id'yi açıkça yazar.

export type Db = SupabaseClient<Database>;

export class IsHatasi extends Error {}

function kontrol(error: PostgrestError | null, ne: string): void {
  if (error) throw new IsHatasi(`${ne}: ${error.message}`);
}

export async function ayarlariGetir(db: Db, userId: string): Promise<Ayarlar> {
  const { data, error } = await db.from("settings").select("*").eq("user_id", userId).maybeSingle();
  kontrol(error, "Ayarlar okunamadı");
  if (!data) return ayarlariTamamla(null);
  return ayarlariTamamla({
    saat_dilimi: data.saat_dilimi,
    ozet_saati: data.ozet_saati,
    hatirlatma_saati: data.hatirlatma_saati,
    gunluk_bildirim_limiti: data.gunluk_bildirim_limiti,
    sessiz_liste_gunu: data.sessiz_liste_gunu,
    ek_tatiller: data.ek_tatiller,
    kurallar: (data.kurallar ?? {}) as Partial<Ayarlar["kurallar"]> as Ayarlar["kurallar"],
  });
}

export function bugun(ayarlar: Ayarlar): DateStr {
  return todayIn(ayarlar.saat_dilimi);
}

type GorevEkle = Database["public"]["Tables"]["tasks"]["Insert"];

async function gorevEkle(db: Db, userId: string, alanlar: GorevEkle): Promise<string> {
  const { data, error } = await db
    .from("tasks")
    .insert({ ...alanlar, user_id: userId })
    .select("id")
    .single();
  kontrol(error, "Görev eklenemedi");
  return data!.id;
}

async function gorevGetir(db: Db, userId: string, taskId: string): Promise<TaskRow> {
  const { data, error } = await db.from("tasks").select("*").eq("id", taskId).eq("user_id", userId).maybeSingle();
  kontrol(error, "Görev okunamadı");
  if (!data) throw new IsHatasi("Görev bulunamadı.");
  return data;
}

/** Görevi bitirir; tekrarlayan görevse bir sonrakini oluşturur. */
export async function gorevTamamla(db: Db, userId: string, taskId: string, ayarlar: Ayarlar): Promise<void> {
  const g = await gorevGetir(db, userId, taskId);
  if (g.durum === "bitti") return;

  const { data: guncellenen, error } = await db
    .from("tasks")
    .update({ durum: "bitti", tamamlanma: new Date().toISOString(), hatirlatma_zamani: null })
    .eq("id", taskId)
    .eq("user_id", userId)
    .neq("durum", "bitti")
    .select("id");
  kontrol(error, "Görev güncellenemedi");
  // Aynı anda iki kez "Bitti"ye basılırsa tekrar görevi bir kez oluşur.
  if (!guncellenen?.length) return;

  const tekrar = tekrarCoz(g.tekrar_kurali);
  if (tekrar) {
    const vade = tamamlaninceSonrakiVade(tekrar, g.vade, bugun(ayarlar), ayarlar.ek_tatiller);
    await gorevEkle(db, userId, {
      baslik: g.baslik,
      tur: g.tur,
      vade,
      hatirlatma_zamani: gunHatirlatmasi(vade, ayarlar).toISOString(),
      tekrar_kurali: g.tekrar_kurali,
      kural: g.kural,
      company_id: g.company_id,
      contact_id: g.contact_id,
      deal_id: g.deal_id,
    });
  }
}

export async function gorevGeriAc(db: Db, userId: string, taskId: string): Promise<void> {
  const { error } = await db
    .from("tasks")
    .update({ durum: "acik", tamamlanma: null })
    .eq("id", taskId)
    .eq("user_id", userId);
  kontrol(error, "Görev açılamadı");
}

export async function gorevErtele(
  db: Db,
  userId: string,
  taskId: string,
  secim: ErtelemeSecenegi | DateStr,
  ayarlar: Ayarlar,
): Promise<DateStr> {
  const gun = ertelemeGunu(secim, bugun(ayarlar), ayarlar);
  const { error } = await db
    .from("tasks")
    .update({ durum: "ertelendi", vade: gun, hatirlatma_zamani: gunHatirlatmasi(gun, ayarlar).toISOString() })
    .eq("id", taskId)
    .eq("user_id", userId);
  kontrol(error, "Görev ertelenemedi");
  return gun;
}

// ---------------------------------------------------------------------------
// Fırsatlar

/** Aşamaya ait otomatik görevi açar (kural tanımlıysa). */
async function asamaGoreviAc(
  db: Db,
  userId: string,
  deal: { id: string; company_id: string; urun: string },
  asama: Asama,
  tarih: DateStr,
  ayarlar: Ayarlar,
): Promise<void> {
  const plan = asamaGorevPlani(asama, tarih, ayarlar);
  if (!plan) return;
  await gorevEkle(db, userId, {
    baslik: `${deal.urun}: ${plan.baslik}`,
    tur: plan.tur,
    vade: plan.vade,
    hatirlatma_zamani: plan.hatirlatma_zamani?.toISOString() ?? null,
    kural: plan.kural,
    company_id: deal.company_id,
    deal_id: deal.id,
  });
}

/**
 * Fırsat aşamasını değiştirir. Önceki aşamanın otomatik görevi kapanır ve
 * (gorevAc ise) yeni aşamanın takip görevi oluşur.
 */
export async function asamaDegistir(
  db: Db,
  userId: string,
  dealId: string,
  yeni: Asama,
  ayarlar: Ayarlar,
  secenek: { gorevAc?: boolean; tarih?: DateStr } = {},
): Promise<void> {
  const { data: deal, error } = await db
    .from("deals")
    .select("id, company_id, urun, asama")
    .eq("id", dealId)
    .eq("user_id", userId)
    .maybeSingle();
  kontrol(error, "Fırsat okunamadı");
  if (!deal) throw new IsHatasi("Fırsat bulunamadı.");
  if (deal.asama === yeni) return;

  const tarih = secenek.tarih ?? bugun(ayarlar);
  const { error: e1 } = await db
    .from("deals")
    .update({ asama: yeni, asama_tarihi: tarih })
    .eq("id", dealId)
    .eq("user_id", userId);
  kontrol(e1, "Fırsat güncellenemedi");

  const { error: e2 } = await db
    .from("tasks")
    .update({ durum: "bitti", tamamlanma: new Date().toISOString(), hatirlatma_zamani: null })
    .eq("user_id", userId)
    .eq("deal_id", dealId)
    .eq("kural", `asama:${deal.asama}`)
    .neq("durum", "bitti");
  kontrol(e2, "Önceki aşama görevi kapatılamadı");

  if (secenek.gorevAc ?? true) await asamaGoreviAc(db, userId, deal, yeni, tarih, ayarlar);
}

export async function firsatOlustur(
  db: Db,
  userId: string,
  alanlar: {
    company_id: string;
    urun: string;
    asama: Asama;
    tahmini_miktar_ton?: number | null;
    tahmini_tutar?: number | null;
    para_birimi?: string;
  },
  ayarlar: Ayarlar,
  secenek: { gorevAc?: boolean; tarih?: DateStr } = {},
): Promise<string> {
  const tarih = secenek.tarih ?? bugun(ayarlar);
  const { data, error } = await db
    .from("deals")
    .insert({ ...alanlar, urun: alanlar.urun.trim(), asama_tarihi: tarih, user_id: userId })
    .select("id, company_id, urun")
    .single();
  kontrol(error, "Fırsat eklenemedi");
  if (secenek.gorevAc ?? true) await asamaGoreviAc(db, userId, data!, alanlar.asama, tarih, ayarlar);
  return data!.id;
}

// ---------------------------------------------------------------------------
// Firma ve kişi

function ilikeKacis(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function firmaBulVeyaOlustur(db: Db, userId: string, ad: string, tur: FirmaTuru): Promise<string> {
  const temiz = ad.trim().replace(/\s+/g, " ");
  const { data, error } = await db
    .from("companies")
    .insert({ ad: temiz, tur, user_id: userId })
    .select("id")
    .single();
  if (!error) return data.id;
  if (error.code !== "23505") kontrol(error, "Firma eklenemedi");
  // Aynı adla (büyük/küçük harf farkıyla) zaten var.
  const { data: var_, error: e2 } = await db
    .from("companies")
    .select("id, ad")
    .eq("user_id", userId)
    .ilike("ad", ilikeKacis(temiz));
  kontrol(e2, "Firma okunamadı");
  const bulunan = var_?.find((f) => f.ad.trim().toLocaleLowerCase("tr") === temiz.toLocaleLowerCase("tr")) ?? var_?.[0];
  if (!bulunan) throw new IsHatasi("Firma eklenemedi.");
  return bulunan.id;
}

export async function kisiBulVeyaOlustur(db: Db, userId: string, companyId: string, ad: string): Promise<string> {
  const { data: kisiler, error } = await db
    .from("contacts")
    .select("id, ad")
    .eq("user_id", userId)
    .eq("company_id", companyId);
  kontrol(error, "Kişiler okunamadı");
  const n = normalizeAd(ad);
  const var_ = kisiler?.find((k) => normalizeAd(k.ad) === n);
  if (var_) return var_.id;
  const { data, error: e2 } = await db
    .from("contacts")
    .insert({ company_id: companyId, ad: ad.trim(), user_id: userId })
    .select("id")
    .single();
  kontrol(e2, "Kişi eklenemedi");
  return data!.id;
}

/** Firmanın e-posta alan adlarına yenilerini ekler. */
export async function alanAdlariniOgret(db: Db, userId: string, companyId: string, alanlar: string[]): Promise<void> {
  if (!alanlar.length) return;
  const { data } = await db
    .from("companies")
    .select("eposta_alanlari")
    .eq("id", companyId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return;
  const yeni = [...new Set([...data.eposta_alanlari, ...alanlar])];
  if (yeni.length === data.eposta_alanlari.length) return;
  const { error } = await db.from("companies").update({ eposta_alanlari: yeni }).eq("id", companyId).eq("user_id", userId);
  kontrol(error, "Firma alan adları güncellenemedi");
}

/** Kullanıcının kendi (şirket) alan adları: giriş e-postası + izinli gönderen adresleri. */
export async function kendiAlanlariGetir(db: Db, userId: string, girisEpostasi: string | null): Promise<string[]> {
  const { data } = await db.from("settings").select("eposta_gondericiler").eq("user_id", userId).maybeSingle();
  return kendiAlanlari([girisEpostasi, ...(data?.eposta_gondericiler ?? [])]);
}

/** Firmayla dışarıya dönük bir temas oldu (teklif/numune gönderimi). */
async function sonTemasIlerlet(db: Db, userId: string, companyId: string): Promise<void> {
  const simdi = new Date().toISOString();
  const { error } = await db
    .from("companies")
    .update({ son_temas: simdi })
    .eq("id", companyId)
    .eq("user_id", userId)
    .or(`son_temas.is.null,son_temas.lt."${simdi}"`);
  kontrol(error, "Son temas güncellenemedi");
}

// ---------------------------------------------------------------------------
// Gelen kutusu

export type IslemeSonucu = { gorevSayisi: number; notId: string | null; companyId: string | null };

/** Onaylanan gelen kutusu kaydını görev/not/fırsat kayıtlarına dönüştürür. */
export async function girdiIsle(
  db: Db,
  userId: string,
  inboxId: string,
  onay: OnayVerisi,
  ayarlar: Ayarlar,
  secenek: { kendiAlanlar?: string[] } = {},
): Promise<IslemeSonucu> {
  // Kaydı "işlendi" olarak sahiplen: iki kez onaylanırsa ikincisi durur.
  const { data: sahiplenen, error } = await db
    .from("inbox_items")
    .update({ durum: "islendi" })
    .eq("id", inboxId)
    .eq("user_id", userId)
    .eq("durum", "islenmedi")
    .select("id, ham_metin, eposta")
    .maybeSingle();
  kontrol(error, "Kayıt güncellenemedi");
  if (!sahiplenen) throw new IsHatasi("Bu kayıt zaten işlenmiş.");

  try {
    const sonuc = await girdiKayitlariniOlustur(db, userId, sahiplenen, onay, ayarlar);
    // E-postadan gelen kayıt bir firmaya bağlandıysa karşı tarafın alan adını
    // firmaya öğret: sonraki e-postalar o firmayla kendiliğinden eşleşir.
    const eposta = sahiplenen.eposta as GirdiEpostasi | null;
    if (sonuc.companyId && eposta?.karsi_taraf.length) {
      await alanAdlariniOgret(db, userId, sonuc.companyId, ogrenilecekAlanlar(eposta.karsi_taraf, secenek.kendiAlanlar));
    }
    return sonuc;
  } catch (e) {
    await db.from("inbox_items").update({ durum: "islenmedi" }).eq("id", inboxId).eq("user_id", userId);
    throw e;
  }
}

async function girdiKayitlariniOlustur(
  db: Db,
  userId: string,
  kayit: { id: string; ham_metin: string },
  onay: OnayVerisi,
  ayarlar: Ayarlar,
): Promise<IslemeSonucu> {
  const gun = bugun(ayarlar);

  let companyId: string | null = null;
  if (onay.firma.mod === "mevcut") companyId = onay.firma.id;
  else if (onay.firma.mod === "yeni") companyId = await firmaBulVeyaOlustur(db, userId, onay.firma.ad, onay.firma.tur);

  let contactId: string | null = null;
  if (companyId && onay.kisi.mod === "mevcut") contactId = onay.kisi.id;
  else if (companyId && onay.kisi.mod === "yeni" && onay.kisi.ad.trim())
    contactId = await kisiBulVeyaOlustur(db, userId, companyId, onay.kisi.ad);

  const olayAsama = olayAsamasi(onay.olay);
  let dealId: string | null = null;
  let gorevKurali: string | null = null;
  if (companyId && onay.firsat.mod === "mevcut") {
    dealId = onay.firsat.id;
    const { data: deal } = await db
      .from("deals")
      .select("asama")
      .eq("id", dealId)
      .eq("user_id", userId)
      .maybeSingle();
    if (deal && olayAsama && (deal.asama === olayAsama || asamaIleriMi(deal.asama, olayAsama))) {
      // Kullanıcının kendi takip görevi oluşacağı için aşama şablon görevi açılmaz.
      await asamaDegistir(db, userId, dealId, olayAsama, ayarlar, { gorevAc: false, tarih: onay.tarih ?? gun });
      gorevKurali = `asama:${olayAsama}`;
    }
  } else if (companyId && onay.firsat.mod === "yeni" && onay.urun?.trim()) {
    const asama = olayAsama ?? "talep";
    dealId = await firsatOlustur(
      db,
      userId,
      { company_id: companyId, urun: onay.urun, asama },
      ayarlar,
      { gorevAc: false, tarih: onay.tarih ?? gun },
    );
    if (olayAsama) gorevKurali = `asama:${olayAsama}`;
  }

  if (companyId && olayAsama) await sonTemasIlerlet(db, userId, companyId);

  if (onay.tur === "not") {
    const { data: not, error } = await db
      .from("notes")
      .insert({
        user_id: userId,
        metin: kayit.ham_metin,
        ozet: onay.ozet?.trim() || null,
        company_id: companyId,
        deal_id: dealId,
        kaynak_inbox_id: kayit.id,
      })
      .select("id")
      .single();
    kontrol(error, "Not eklenemedi");

    let gorevSayisi = 0;
    for (const a of onay.aksiyonlar) {
      const plan = planla({ girdi: a.tur, olay: "yok", tarih: a.tarih, hatirlatma: null, bugun: gun }, ayarlar);
      await gorevEkle(db, userId, {
        baslik: a.baslik,
        tur: plan.tur,
        vade: plan.vade,
        hatirlatma_zamani: plan.hatirlatma_zamani?.toISOString() ?? null,
        kural: plan.kural,
        company_id: companyId,
        contact_id: contactId,
        deal_id: dealId,
        kaynak_inbox_id: kayit.id,
      });
      gorevSayisi++;
    }
    return { gorevSayisi, notId: not!.id, companyId };
  }

  const plan = onayPlani(onay, gun, ayarlar)!;
  await gorevEkle(db, userId, {
    baslik: onay.baslik.trim(),
    tur: plan.tur,
    vade: plan.vade,
    hatirlatma_zamani: plan.hatirlatma_zamani?.toISOString() ?? null,
    tekrar_kurali: tekrarCoz(onay.tekrar) ? onay.tekrar : null,
    kural: gorevKurali ?? plan.kural,
    company_id: companyId,
    contact_id: contactId,
    deal_id: dealId,
    kaynak_inbox_id: kayit.id,
  });
  return { gorevSayisi: 1, notId: null, companyId };
}

/** Görev formundan gelen alanlarla görev ekler/günceller (Görevler ekranı). */
export async function gorevKaydet(
  db: Db,
  userId: string,
  id: string | null,
  alanlar: {
    baslik: string;
    tur: GorevTuru;
    vade: DateStr | null;
    hatirlatma: Date | null;
    tekrar_kurali: string | null;
    company_id: string | null;
  },
  ayarlar: Ayarlar,
): Promise<string> {
  const tekrar = tekrarCoz(alanlar.tekrar_kurali);
  let vade = alanlar.vade;
  if (tekrar && !vade) vade = ilkTekrar(tekrar, bugun(ayarlar), ayarlar.ek_tatiller);
  const hatirlatma = alanlar.hatirlatma ?? (vade ? gunHatirlatmasi(vade, ayarlar) : null);
  const kayit = {
    baslik: alanlar.baslik.trim(),
    tur: alanlar.tur,
    vade,
    hatirlatma_zamani: hatirlatma && hatirlatma > new Date() ? hatirlatma.toISOString() : null,
    tekrar_kurali: tekrar ? alanlar.tekrar_kurali : null,
    company_id: alanlar.company_id,
  };
  if (!id) return gorevEkle(db, userId, kayit);
  const { error } = await db.from("tasks").update(kayit).eq("id", id).eq("user_id", userId);
  kontrol(error, "Görev kaydedilemedi");
  return id;
}
