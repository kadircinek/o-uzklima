import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import { supabaseUrl } from "./env";

/**
 * RLS'i atlayan yönetici istemcisi. Yalnızca kullanıcı oturumu olmayan
 * sunucu işlerinde (cron, bildirim aksiyonları) ve her sorguda user_id
 * filtresiyle kullanılmalıdır.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY tanımlı değil (.env.example dosyasına bakın)");
  return createClient<Database>(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type AdminClient = ReturnType<typeof createAdminClient>;
