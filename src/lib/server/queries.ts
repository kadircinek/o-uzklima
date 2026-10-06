import "server-only";
import type { CompanyOverviewRow, ContactRow, DealRow, InboxRow, NoteRow, TaskRow } from "../database.types";
import type { KartBaglami } from "../inbox";
import type { ServerClient } from "../supabase/server";
import type { Db } from "./ops";

// Sayfaların okuma sorguları. Kullanıcı oturumlu istemciyle çalışır; RLS
// yalnızca kullanıcının kendi satırlarını döndürür.

export type GorevListeSatiri = TaskRow & {
  companies: { id: string; ad: string } | null;
  deals: { id: string; urun: string; asama: DealRow["asama"] } | null;
};

const GOREV_SECIMI = "*, companies(id, ad), deals(id, urun, asama)";

function hata(e: { message: string } | null, ne: string) {
  if (e) throw new Error(`${ne}: ${e.message}`);
}

/** Bitmemiş tüm görevler (Bugün ekranı ve sayılar için). */
export async function acikGorevler(db: ServerClient): Promise<GorevListeSatiri[]> {
  const { data, error } = await db
    .from("tasks")
    .select(GOREV_SECIMI)
    .neq("durum", "bitti")
    .order("vade", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(1000);
  hata(error, "Görevler okunamadı");
  return (data ?? []) as unknown as GorevListeSatiri[];
}

export async function bitenGorevler(db: ServerClient, limit = 100): Promise<GorevListeSatiri[]> {
  const { data, error } = await db
    .from("tasks")
    .select(GOREV_SECIMI)
    .eq("durum", "bitti")
    .order("tamamlanma", { ascending: false })
    .limit(limit);
  hata(error, "Görevler okunamadı");
  return (data ?? []) as unknown as GorevListeSatiri[];
}

export async function aktifMusteriler(db: ServerClient) {
  const { data, error } = await db
    .from("companies")
    .select("id, ad, tur, aktif, son_temas, created_at")
    .eq("tur", "musteri")
    .eq("aktif", true);
  hata(error, "Firmalar okunamadı");
  return data ?? [];
}

export async function firmaListesi(db: ServerClient): Promise<CompanyOverviewRow[]> {
  const { data, error } = await db.from("company_overview").select("*").order("ad").limit(5000);
  hata(error, "Firmalar okunamadı");
  return data ?? [];
}

export type FirmaDetayi = {
  firma: CompanyOverviewRow;
  kisiler: ContactRow[];
  gorevler: GorevListeSatiri[];
  firsatlar: DealRow[];
  notlar: NoteRow[];
};

export async function firmaDetayi(db: ServerClient, id: string): Promise<FirmaDetayi | null> {
  const { data: firma, error } = await db.from("company_overview").select("*").eq("id", id).maybeSingle();
  hata(error, "Firma okunamadı");
  if (!firma) return null;
  const [kisiler, gorevler, firsatlar, notlar] = await Promise.all([
    db.from("contacts").select("*").eq("company_id", id).order("ad"),
    db
      .from("tasks")
      .select(GOREV_SECIMI)
      .eq("company_id", id)
      .order("durum")
      .order("vade", { ascending: true, nullsFirst: false })
      .limit(200),
    db.from("deals").select("*").eq("company_id", id).order("updated_at", { ascending: false }),
    db.from("notes").select("*").eq("company_id", id).order("tarih", { ascending: false }).limit(100),
  ]);
  hata(kisiler.error, "Kişiler okunamadı");
  hata(gorevler.error, "Görevler okunamadı");
  hata(firsatlar.error, "Fırsatlar okunamadı");
  hata(notlar.error, "Notlar okunamadı");
  return {
    firma,
    kisiler: kisiler.data ?? [],
    gorevler: (gorevler.data ?? []) as unknown as GorevListeSatiri[],
    firsatlar: firsatlar.data ?? [],
    notlar: notlar.data ?? [],
  };
}

export type FirsatSatiri = DealRow & {
  companies: { id: string; ad: string } | null;
  acik_gorev: { id: string; baslik: string; vade: string | null }[];
};

export async function firsatlar(db: ServerClient): Promise<FirsatSatiri[]> {
  const { data, error } = await db
    .from("deals")
    .select("*, companies(id, ad), tasks(id, baslik, vade, durum)")
    .order("asama_tarihi", { ascending: false })
    .limit(1000);
  hata(error, "Fırsatlar okunamadı");
  type Ham = DealRow & {
    companies: { id: string; ad: string } | null;
    tasks: { id: string; baslik: string; vade: string | null; durum: string }[];
  };
  return ((data ?? []) as unknown as Ham[]).map(({ tasks, ...d }) => ({
    ...d,
    acik_gorev: tasks
      .filter((t) => t.durum !== "bitti")
      .sort((a, b) => (a.vade ?? "9999").localeCompare(b.vade ?? "9999")),
  }));
}

export async function islenmemisGirdiler(db: ServerClient): Promise<InboxRow[]> {
  const { data, error } = await db
    .from("inbox_items")
    .select("*")
    .eq("durum", "islenmedi")
    .order("created_at", { ascending: false })
    .limit(200);
  hata(error, "Gelen kutusu okunamadı");
  return data ?? [];
}

export async function sayilar(db: ServerClient, bugun: string): Promise<{ gelen: number; geciken: number }> {
  const [gelen, geciken] = await Promise.all([
    db.from("inbox_items").select("id", { count: "exact", head: true }).eq("durum", "islenmedi"),
    db.from("tasks").select("id", { count: "exact", head: true }).neq("durum", "bitti").lt("vade", bugun),
  ]);
  return { gelen: gelen.count ?? 0, geciken: geciken.count ?? 0 };
}

/**
 * Onay kartındaki firma/kişi/fırsat seçimleri ve Claude'a gönderilen firma
 * dizini. E-posta işlerken yönetici istemcisiyle de çağrıldığı için
 * user_id ile açıkça filtrelenir.
 */
export async function kartBaglami(db: Db, userId: string): Promise<KartBaglami> {
  const [firmalar, kisiler, firsatlar] = await Promise.all([
    db.from("companies").select("id, ad, tur, eposta_alanlari").eq("user_id", userId).order("ad").limit(5000),
    db.from("contacts").select("id, ad, company_id, eposta").eq("user_id", userId).limit(10000),
    db
      .from("deals")
      .select("id, company_id, urun, asama")
      .eq("user_id", userId)
      .not("asama", "in", "(siparis,kaybedildi)")
      .limit(2000),
  ]);
  hata(firmalar.error, "Firmalar okunamadı");
  hata(kisiler.error, "Kişiler okunamadı");
  hata(firsatlar.error, "Fırsatlar okunamadı");
  return { firmalar: firmalar.data ?? [], kisiler: kisiler.data ?? [], firsatlar: firsatlar.data ?? [] };
}
