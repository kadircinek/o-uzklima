-- E-posta bağlantısı
--
-- Her kullanıcıya özel bir LifeOS adresi (Postmark gelen e-posta adresi +
-- kullanıcıya özel anahtar). Kullanıcı bir e-postayı bu adrese iletirse
-- gelen kutusuna düşer; müşteriye yazdığı e-postaya gizli kopya (BCC)
-- eklerse ilgili firmaya not olarak kaydedilir ve son temas güncellenir.

-- Kişisel adres anahtarı ve izinli gönderen adresleri
alter table public.settings
  add column eposta_anahtari text not null unique
    default lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
    check (eposta_anahtari ~ '^[a-z0-9]{8,32}$'),
  -- giriş e-postasına ek olarak kabul edilen gönderenler (ör. iş adresi)
  add column eposta_gondericiler text[] not null default '{}';

-- Firmayı e-posta adresinden tanımak için alan adları (ör. acme.com)
alter table public.companies
  add column eposta_alanlari text[] not null default '{}';

create index companies_eposta_alanlari_idx on public.companies using gin (eposta_alanlari);

-- Gelen kutusu kaydının kaynağı ve e-posta bilgileri
alter table public.inbox_items
  add column kaynak text not null default 'elle' check (kaynak in ('elle', 'eposta')),
  -- {yon, konu, kimden, kime, tarih, orijinal_gonderen, ekler}
  add column eposta jsonb;

-- Gelen e-postaların günlüğü (kurulumu denetlemek ve tekrarları önlemek için)
create table public.email_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete cascade,
  alinma timestamptz not null default now(),
  message_id text,
  gonderen text,
  konu text,
  -- gelen_kutusu | not | reddedildi
  sonuc text not null default 'isleniyor' check (sonuc in ('isleniyor', 'gelen_kutusu', 'not', 'reddedildi')),
  aciklama text
);

create unique index email_log_tekrar on public.email_log (user_id, message_id) where message_id is not null;
create index email_log_user_idx on public.email_log (user_id, alinma desc);

alter table public.email_log enable row level security;
-- günlüğü yalnızca sunucu (service role) yazar
create policy "sahibi okur" on public.email_log for select to authenticated
  using (user_id = (select auth.uid()));

-- Firma görünümü yeni sütunu içersin (view'lar * ifadesini oluşturulduğu anda açar)
drop view public.company_overview;
create view public.company_overview
with (security_invoker = true)
as
select
  c.*,
  (select count(*) from public.tasks t where t.company_id = c.id and t.durum <> 'bitti')::int as acik_gorev,
  (select count(*) from public.deals d
     where d.company_id = c.id and d.asama in ('talep', 'numune', 'teklif', 'muzakere'))::int as acik_firsat
from public.companies c;
