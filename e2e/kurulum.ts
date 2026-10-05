import type { Server } from "node:http";
import { baslat } from "./mock-claude.mjs";
import { db, EPOSTA, SIFRE, UYGULAMA } from "./yardimci";

// Uçtan uca testlerden önce: Claude taklidini başlatır, test kullanıcısını
// oluşturur ve yalnızca bu kullanıcının verilerini sıfırlar.

let sunucu: Server | undefined;

export async function setup() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && !/127\.0\.0\.1|localhost/.test(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
    throw new Error("Uçtan uca testler yalnızca yerel Supabase'e karşı çalışır.");
  }
  sunucu = (await baslat(4010)) as Server;

  const yanit = await fetch(UYGULAMA + "/giris").catch(() => null);
  if (!yanit?.ok) throw new Error(`Uygulama ${UYGULAMA} adresinde çalışmıyor (e2e/calistir.sh).`);

  const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
  let id = data.users.find((u) => u.email === EPOSTA)?.id;
  if (!id) {
    const { data: yeni, error } = await db.auth.admin.createUser({ email: EPOSTA, password: SIFRE, email_confirm: true });
    if (error) throw error;
    id = yeni.user.id;
  }
  for (const t of ["notification_log", "push_subscriptions", "notes", "tasks", "deals", "contacts", "companies", "inbox_items"] as const) {
    const { error } = await db.from(t).delete().eq("user_id", id);
    if (error) throw error;
  }
  await db.from("settings").upsert({ user_id: id, kurallar: {}, ek_tatiller: [] });
  const { data: dosyalar } = await db.storage.from("ses").list(id);
  if (dosyalar?.length) await db.storage.from("ses").remove(dosyalar.map((f) => `${id}/${f.name}`));
}

export async function teardown() {
  sunucu?.close();
}
