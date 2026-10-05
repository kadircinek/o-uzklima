// Supabase'in yeni (publishable/secret) ve eski (anon/service_role) anahtar
// adlarının ikisi de desteklenir.

export function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL tanımlı değil (.env.example dosyasına bakın)");
  return url;
}

export function supabasePublicKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY tanımlı değil (.env.example dosyasına bakın)");
  return key;
}
