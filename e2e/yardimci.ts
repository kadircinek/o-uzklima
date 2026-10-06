import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { chromium, type Browser, type Page } from "playwright";
import type { Database } from "@/lib/database.types";
import { todayIn } from "@/lib/dates";

// .env.local'deki değerleri yükle (ortamda tanımlı olanlar önceliklidir).
if (existsSync(".env.local")) {
  for (const satir of readFileSync(".env.local", "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(satir);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

export const UYGULAMA = process.env.E2E_APP_URL ?? "http://127.0.0.1:3000";
export const EPOSTA = "e2e@lifeos.test";
export const SIFRE = "e2e-sifre-12345";
export const ARKADAS_EPOSTA = "arkadas@lifeos.test";
export const CRON_SECRET = process.env.CRON_SECRET ?? "";
export const BUGUN = todayIn("Europe/Istanbul");

export const db = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)!,
  { auth: { persistSession: false } },
);

let onbellek: string | null = null;
export async function kullaniciId(): Promise<string> {
  if (onbellek) return onbellek;
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
  const u = data.users.find((x) => x.email === EPOSTA);
  if (!u) throw new Error("Test kullanıcısı yok (e2e/kurulum.ts)");
  return (onbellek = u.id);
}

export async function tarayici(secenek: { mikrofon?: boolean } = {}): Promise<Browser> {
  return chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: secenek.mikrofon ? ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] : [],
  });
}

export async function girisYap(page: Page): Promise<void> {
  await page.goto(UYGULAMA + "/giris");
  await page.fill('input[name="eposta"]', EPOSTA);
  await page.fill('input[name="sifre"]', SIFRE);
  await page.click('button[type="submit"]');
  await page.getByRole("heading", { name: "Bugün", level: 1 }).waitFor();
}

/** Tek bir görevi başlığıyla getirir. */
export async function gorev(baslik: string) {
  const { data, error } = await db
    .from("tasks")
    .select("*")
    .eq("user_id", await kullaniciId())
    .eq("baslik", baslik)
    .order("created_at");
  if (error) throw error;
  return data;
}

export const istanbul = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Europe/Istanbul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso))
    : null;
