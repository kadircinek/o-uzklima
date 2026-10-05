@AGENTS.md

# LifeOS

Kişisel iş takibi PWA'sı (Next.js 16 App Router, Supabase, Claude API). Ayrıntılar README.md'de.

- Kod içi adlar ve arayüz metinleri Türkçe (ASCII tanımlayıcılar: `gorev`, `firma`, `vade`…). Yeni kod bu dili izlemeli.
- Saf iş kuralları `src/lib/` altında (rules, engine, dates, holidays, inbox, match) ve `tests/` ile birim testli.
  Kural değişikliğinde önce testi güncelleyin.
- Veritabanına erişen kod `src/lib/server/` ve `src/app/actions/` içinde; her sorgu `user_id` ile filtrelenir
  (yönetici istemcisi RLS'i atlar).
- Şema değişikliği yeni bir `supabase/migrations/*.sql` dosyasıyla yapılır ve `src/lib/database.types.ts` güncellenir.
- Kontroller: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`; uçtan uca: `npm run test:e2e` (Docker).
