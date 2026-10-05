import "server-only";
import { localParts } from "../dates";
import {
  hatirlatmaMetni,
  hatirlatmalariSec,
  ozetOlustur,
  ozetZamaniMi,
  sessizMusteriler,
  type MotorGorevi,
} from "../engine";
import { sonrakiHatirlatma } from "../rules";
import { createAdminClient } from "../supabase/admin";
import { ayarlariGetir, type Db } from "./ops";
import { aksiyonImzasi, kullaniciyaGonder } from "./push";

// Hatırlatma motoru. /api/cron/tick her 5 dakikada bir çağırır
// (supabase/cron.sql). Her çağrı:
//   1. İş günü özet saati geçtiyse ve bugün gönderilmediyse günlük özeti yollar.
//   2. Zamanı gelen hatırlatmaları günlük sınıra kadar yollar; fazlası özete kalır.
//   3. Her hatırlatmadan sonra görevin bir sonraki hatırlatmasını kurar
//      (ör. ödeme: 3 gün önce → vade günü).

export type TickSonucu = { kullanici: number; ozet: number; hatirlatma: number; ozete: number };

type GorevSatiri = {
  id: string;
  baslik: string;
  tur: MotorGorevi["tur"];
  durum: MotorGorevi["durum"];
  vade: string | null;
  hatirlatma_zamani: string | null;
  companies: { ad: string } | null;
};

const motorGorevi = (g: GorevSatiri): MotorGorevi => ({ ...g, firma_adi: g.companies?.ad ?? null });

export async function tick(simdi: Date = new Date()): Promise<TickSonucu> {
  const db = createAdminClient();
  const { data: kullanicilar, error } = await db.from("settings").select("user_id");
  if (error) throw new Error(`Kullanıcılar okunamadı: ${error.message}`);

  const sonuc: TickSonucu = { kullanici: 0, ozet: 0, hatirlatma: 0, ozete: 0 };
  for (const { user_id } of kullanicilar ?? []) {
    try {
      const s = await kullaniciTick(db, user_id, simdi);
      sonuc.kullanici++;
      sonuc.ozet += s.ozet;
      sonuc.hatirlatma += s.hatirlatma;
      sonuc.ozete += s.ozete;
    } catch (e) {
      console.error(`Tick hatası (${user_id})`, e);
    }
  }
  return sonuc;
}

async function kullaniciTick(db: Db, userId: string, simdi: Date) {
  const ayarlar = await ayarlariGetir(db, userId);
  const gun = localParts(simdi, ayarlar.saat_dilimi).date;
  const sonuc = { ozet: 0, hatirlatma: 0, ozete: 0 };

  const { data: gunluk, error: e0 } = await db
    .from("notification_log")
    .select("tur")
    .eq("user_id", userId)
    .eq("gun", gun);
  if (e0) throw e0;
  const ozetGonderildi = gunluk?.some((l) => l.tur === "ozet") ?? false;
  const gonderilenHatirlatma = gunluk?.filter((l) => l.tur === "hatirlatma").length ?? 0;

  // 1. Günlük özet
  if (ozetZamaniMi(simdi, ayarlar, ozetGonderildi)) {
    // Önce günü "özet gönderildi" olarak sahiplen; eşzamanlı ikinci çağrı
    // tekil indekse takılır ve özet iki kez gitmez.
    const { error: sahiplenme } = await db.from("notification_log").insert({ user_id: userId, tur: "ozet", gun });
    if (!sahiplenme) {
      const [{ data: gorevler, error: e1 }, { data: firmalar, error: e2 }] = await Promise.all([
        db
          .from("tasks")
          .select("id, baslik, tur, durum, vade, hatirlatma_zamani, companies(ad)")
          .eq("user_id", userId)
          .neq("durum", "bitti")
          .lte("vade", gun),
        db
          .from("companies")
          .select("id, ad, tur, aktif, son_temas, created_at")
          .eq("user_id", userId)
          .eq("tur", "musteri")
          .eq("aktif", true),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const ozet = ozetOlustur(
        (gorevler as GorevSatiri[]).map(motorGorevi),
        sessizMusteriler(firmalar ?? [], gun, ayarlar),
        gun,
        ayarlar,
      );
      if (ozet) {
        await kullaniciyaGonder(db, userId, { baslik: ozet.baslik, govde: ozet.govde, url: "/", etiket: "ozet" });
        sonuc.ozet = 1;
      }
    } else if (sahiplenme.code !== "23505") {
      throw sahiplenme;
    }
  }

  // 2. Zamanı gelen hatırlatmalar
  const { data: zamaniGelen, error: e3 } = await db
    .from("tasks")
    .select("id, baslik, tur, durum, vade, hatirlatma_zamani, companies(ad)")
    .eq("user_id", userId)
    .neq("durum", "bitti")
    .not("hatirlatma_zamani", "is", null)
    .lte("hatirlatma_zamani", simdi.toISOString())
    .order("hatirlatma_zamani")
    .limit(100);
  if (e3) throw e3;

  const { gonder, ozete } = hatirlatmalariSec(
    (zamaniGelen as GorevSatiri[]).map(motorGorevi),
    gonderilenHatirlatma,
    ayarlar.gunluk_bildirim_limiti,
  );

  for (const g of [...gonder, ...ozete]) {
    // Görevi sahiplen: hatırlatma zamanı değişmediyse bir sonrakine ilerlet.
    const sonraki = sonrakiHatirlatma(g, simdi, ayarlar);
    const { data: sahiplenen, error } = await db
      .from("tasks")
      .update({ hatirlatma_zamani: sonraki?.toISOString() ?? null })
      .eq("id", g.id)
      .eq("user_id", userId)
      .eq("hatirlatma_zamani", g.hatirlatma_zamani!)
      .select("id");
    if (error) throw error;
    if (!sahiplenen?.length) continue;

    if (!gonder.includes(g)) {
      sonuc.ozete++;
      continue;
    }
    const metin = hatirlatmaMetni(g, gun);
    const imza = aksiyonImzasi(userId, g.id);
    await kullaniciyaGonder(db, userId, {
      baslik: metin.baslik,
      govde: metin.govde,
      url: `/gorevler?gorev=${g.id}`,
      etiket: `gorev-${g.id}`,
      aksiyon: imza ? { gorev: g.id, kullanici: userId, imza } : undefined,
    });
    await db.from("notification_log").insert({ user_id: userId, task_id: g.id, tur: "hatirlatma", gun });
    sonuc.hatirlatma++;
  }

  return sonuc;
}
