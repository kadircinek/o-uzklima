-- LifeOS başlangıç şeması
--
-- Altı ana tablo (PRD): inbox_items, companies, contacts, tasks, deals, notes.
-- Yardımcı tablolar: settings (kullanıcı ayarları), push_subscriptions,
-- notification_log (günlük bildirim sınırı ve özet tekrarını önlemek için).
--
-- Her satır bir kullanıcıya aittir (user_id) ve satır seviyesi güvenlik ile
-- yalnızca sahibi görür. Tablolar arası bağlantılar (company_id, user_id)
-- bileşik yabancı anahtarlarıyla kurulur; böylece bir kayıt başka bir
-- kullanıcının firmasına bağlanamaz.

-- ---------------------------------------------------------------------------
-- Ortak: updated_at

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- companies

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ad text not null check (length(btrim(ad)) > 0),
  ulke text,
  tur text not null default 'musteri' check (tur in ('musteri', 'tedarikci', 'aday')),
  segment text,
  aktif boolean not null default true,
  son_temas timestamptz,
  notlar text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create unique index companies_user_ad_key on public.companies (user_id, lower(btrim(ad)));

-- ---------------------------------------------------------------------------
-- contacts

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company_id uuid not null,
  ad text not null check (length(btrim(ad)) > 0),
  unvan text,
  eposta text,
  telefon text,
  dil text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (company_id, user_id) references public.companies (id, user_id) on delete cascade
);

create index contacts_company_idx on public.contacts (company_id);

-- ---------------------------------------------------------------------------
-- deals (hafif boru hattı)

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company_id uuid not null,
  urun text not null check (length(btrim(urun)) > 0),
  asama text not null default 'talep'
    check (asama in ('talep', 'numune', 'teklif', 'muzakere', 'siparis', 'kaybedildi')),
  tahmini_miktar_ton numeric(12, 2),
  tahmini_tutar numeric(14, 2),
  para_birimi text not null default 'USD',
  asama_tarihi date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (company_id, user_id) references public.companies (id, user_id) on delete cascade
);

create index deals_company_idx on public.deals (company_id);
create index deals_user_asama_idx on public.deals (user_id, asama);

-- ---------------------------------------------------------------------------
-- inbox_items (gelen kutusu)

create table public.inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ham_metin text not null,
  ses_dosyasi text,
  ayristirma_json jsonb,
  durum text not null default 'islenmedi' check (durum in ('islenmedi', 'islendi')),
  -- ayrıştırma başarısız olduysa nedeni (kart elle doldurulur)
  hata text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index inbox_items_user_durum_idx on public.inbox_items (user_id, durum, created_at desc);

-- ---------------------------------------------------------------------------
-- tasks (görevler ve takipler)

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  baslik text not null check (length(btrim(baslik)) > 0),
  tur text not null default 'yapacagim' check (tur in ('yapacagim', 'bekliyorum', 'takip')),
  durum text not null default 'acik' check (durum in ('acik', 'ertelendi', 'bitti')),
  vade date,
  hatirlatma_zamani timestamptz,
  -- gunluk | haftalik:<1-7> | aylik:<1-31> | yillik:<AA-GG>
  tekrar_kurali text check (
    tekrar_kurali is null
    or tekrar_kurali ~ '^(gunluk|haftalik:[1-7]|aylik:([1-9]|[12][0-9]|3[01])|yillik:(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01]))$'
  ),
  -- görevi üreten kural: vade, takip, teklif, numune, bekleme, odeme, asama:<aşama>
  kural text,
  company_id uuid,
  contact_id uuid,
  deal_id uuid,
  kaynak_inbox_id uuid,
  tamamlanma timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (company_id, user_id) references public.companies (id, user_id) on delete set null (company_id),
  foreign key (contact_id, user_id) references public.contacts (id, user_id) on delete set null (contact_id),
  foreign key (deal_id, user_id) references public.deals (id, user_id) on delete set null (deal_id),
  foreign key (kaynak_inbox_id, user_id) references public.inbox_items (id, user_id) on delete set null (kaynak_inbox_id)
);

create index tasks_user_durum_vade_idx on public.tasks (user_id, durum, vade);
create index tasks_hatirlatma_idx on public.tasks (hatirlatma_zamani)
  where durum <> 'bitti' and hatirlatma_zamani is not null;
create index tasks_company_idx on public.tasks (company_id);
create index tasks_deal_idx on public.tasks (deal_id);

-- ---------------------------------------------------------------------------
-- notes (toplantı ve sesli notlar)

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  metin text not null,
  ozet text,
  company_id uuid,
  deal_id uuid,
  kaynak_inbox_id uuid,
  tarih timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (company_id, user_id) references public.companies (id, user_id) on delete set null (company_id),
  foreign key (deal_id, user_id) references public.deals (id, user_id) on delete set null (deal_id),
  foreign key (kaynak_inbox_id, user_id) references public.inbox_items (id, user_id) on delete set null (kaynak_inbox_id)
);

create index notes_company_idx on public.notes (company_id, tarih desc);

-- ---------------------------------------------------------------------------
-- settings

create table public.settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  saat_dilimi text not null default 'Europe/Istanbul',
  ozet_saati time not null default '08:30',
  hatirlatma_saati time not null default '09:00',
  gunluk_bildirim_limiti integer not null default 6 check (gunluk_bildirim_limiti between 1 and 50),
  -- 0 = Pazar … 6 = Cumartesi
  sessiz_liste_gunu integer not null default 1 check (sessiz_liste_gunu between 0 and 6),
  ek_tatiller date[] not null default '{}',
  -- boş bırakılan anahtarlar uygulamadaki varsayılanları kullanır
  kurallar jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- push_subscriptions

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- ---------------------------------------------------------------------------
-- notification_log

create table public.notification_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete set null,
  tur text not null check (tur in ('hatirlatma', 'ozet')),
  -- kullanıcının saat dilimindeki gün
  gun date not null,
  gonderim timestamptz not null default now()
);

create index notification_log_user_gun_idx on public.notification_log (user_id, gun);
-- günde tek özet: eşzamanlı iki tetiklemede ikinci ekleme başarısız olur
create unique index notification_log_tek_ozet on public.notification_log (user_id, gun) where tur = 'ozet';

-- ---------------------------------------------------------------------------
-- updated_at tetikleyicileri

create trigger companies_updated_at before update on public.companies
  for each row execute function public.set_updated_at();
create trigger contacts_updated_at before update on public.contacts
  for each row execute function public.set_updated_at();
create trigger deals_updated_at before update on public.deals
  for each row execute function public.set_updated_at();
create trigger inbox_items_updated_at before update on public.inbox_items
  for each row execute function public.set_updated_at();
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
create trigger notes_updated_at before update on public.notes
  for each row execute function public.set_updated_at();
create trigger settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Son temas: firmaya bağlı bir not eklendiğinde veya bağlı bir görev
-- bittiğinde firmanın son_temas alanı ilerler (asla geri gitmez).

create or replace function public.firma_son_temas_not()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.company_id is not null then
    update public.companies
      set son_temas = greatest(coalesce(son_temas, new.tarih), new.tarih)
      where id = new.company_id and user_id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger notes_son_temas after insert or update of company_id, tarih on public.notes
  for each row execute function public.firma_son_temas_not();

create or replace function public.firma_son_temas_gorev()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  an timestamptz := coalesce(new.tamamlanma, now());
begin
  if new.durum = 'bitti'
     and new.company_id is not null
     and (tg_op = 'INSERT' or old.durum is distinct from 'bitti') then
    update public.companies
      set son_temas = greatest(coalesce(son_temas, an), an)
      where id = new.company_id and user_id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger tasks_son_temas after insert or update of durum on public.tasks
  for each row execute function public.firma_son_temas_gorev();

-- ---------------------------------------------------------------------------
-- Yeni kullanıcıya ayar satırı

create or replace function public.yeni_kullanici_ayarlari()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.settings (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_lifeos after insert on auth.users
  for each row execute function public.yeni_kullanici_ayarlari();

insert into public.settings (user_id)
  select id from auth.users
  on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Firma listesi görünümü (açık iş ve fırsat sayılarıyla)

create view public.company_overview
with (security_invoker = true)
as
select
  c.*,
  (select count(*) from public.tasks t where t.company_id = c.id and t.durum <> 'bitti')::int as acik_gorev,
  (select count(*) from public.deals d
     where d.company_id = c.id and d.asama in ('talep', 'numune', 'teklif', 'muzakere'))::int as acik_firsat
from public.companies c;

-- ---------------------------------------------------------------------------
-- Satır seviyesi güvenlik: yalnızca sahibi görür

alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.deals enable row level security;
alter table public.inbox_items enable row level security;
alter table public.tasks enable row level security;
alter table public.notes enable row level security;
alter table public.settings enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_log enable row level security;

create policy "sahibi" on public.companies for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "sahibi" on public.contacts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "sahibi" on public.deals for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "sahibi" on public.inbox_items for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "sahibi" on public.tasks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "sahibi" on public.notes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "sahibi" on public.settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "sahibi" on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- bildirim günlüğünü yalnızca sunucu (service role) yazar
create policy "sahibi okur" on public.notification_log for select to authenticated
  using (user_id = (select auth.uid()));
