-- Davranış testleri: tetikleyiciler, kısıtlar, RLS ve depolama politikaları.
-- supabase/tests/calistir.sh ile çalıştırılır; beklenmeyen durumda hata fırlatır.

create function pg_temp.bekle(ad text, kosul boolean) returns void language plpgsql as $$
begin
  if not coalesce(kosul, false) then raise exception 'BAŞARISIZ: %', ad; end if;
  raise notice 'OK: %', ad;
end $$;
grant execute on function pg_temp.bekle(text, boolean) to authenticated;

insert into auth.users values ('00000000-0000-0000-0000-00000000000b', 'b@x');
select pg_temp.bekle('her kullanıcıya ayar satırı (mevcut + yeni)', (select count(*) from public.settings) = 2);

-- Kullanıcı A
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
insert into public.companies (id, ad, tur) values ('10000000-0000-0000-0000-000000000001', 'Acme Plastik', 'musteri');
insert into public.contacts (id, company_id, ad) values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Ali');
insert into public.deals (id, company_id, urun, asama) values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Lucon', 'teklif');
insert into public.tasks (id, baslik, tur, vade, company_id, contact_id, deal_id, tekrar_kurali)
  values ('40000000-0000-0000-0000-000000000001', 'Ali''ye fiyat dön', 'yapacagim', '2026-10-08',
          '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'aylik:5');
select pg_temp.bekle('user_id varsayılan olarak oturum sahibi', (select user_id from public.companies) = '00000000-0000-0000-0000-00000000000a');
select pg_temp.bekle('son temas başta boş', (select son_temas from public.companies) is null);

insert into public.notes (metin, company_id, tarih) values ('Görüşme', '10000000-0000-0000-0000-000000000001', '2026-09-01T10:00:00Z');
select pg_temp.bekle('not eklenince son temas güncellenir', (select son_temas from public.companies) = '2026-09-01T10:00:00Z');
insert into public.notes (metin, company_id, tarih) values ('Eski not', '10000000-0000-0000-0000-000000000001', '2026-08-01T10:00:00Z');
select pg_temp.bekle('eski tarihli not son temas''ı geri götürmez', (select son_temas from public.companies) = '2026-09-01T10:00:00Z');
update public.tasks set durum = 'bitti', tamamlanma = '2026-10-05T09:00:00Z' where id = '40000000-0000-0000-0000-000000000001';
select pg_temp.bekle('görev bitince son temas güncellenir', (select son_temas from public.companies) = '2026-10-05T09:00:00Z');
select pg_temp.bekle('firma görünümü açık iş/fırsat sayar',
  (select acik_gorev = 0 and acik_firsat = 1 from public.company_overview));

do $$ begin
  insert into public.companies (ad) values ('acme plastik ');
  raise exception 'BAŞARISIZ: aynı firma adı (büyük/küçük harf) tekrar eklendi';
exception when unique_violation then raise notice 'OK: firma adı kullanıcı başına tekil';
end $$;

do $$ begin
  insert into public.tasks (baslik, tekrar_kurali) values ('x', 'aylik:32');
  raise exception 'BAŞARISIZ: geçersiz tekrar kuralı kabul edildi';
exception when check_violation then raise notice 'OK: tekrar kuralı denetimi';
end $$;

-- Kullanıcı B
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.bekle('B, A''nın verisini göremez',
  (select count(*) from public.companies) = 0 and (select count(*) from public.tasks) = 0
  and (select count(*) from public.notes) = 0 and (select count(*) from public.settings) = 1);
do $$ begin
  insert into public.tasks (baslik, company_id) values ('sızma', '10000000-0000-0000-0000-000000000001');
  raise exception 'BAŞARISIZ: B, A''nın firmasına görev bağladı';
exception when foreign_key_violation then raise notice 'OK: başka kullanıcının firmasına bağlanamaz';
end $$;
do $$ begin
  insert into public.companies (ad, user_id) values ('Sahte', '00000000-0000-0000-0000-00000000000a');
  raise exception 'BAŞARISIZ: B, A adına firma ekledi';
exception when insufficient_privilege then raise notice 'OK: RLS başka kullanıcı adına eklemeyi engeller';
end $$;
update public.companies set ad = 'ele geçirildi';
delete from public.tasks;
reset role;
select pg_temp.bekle('B, A''nın satırlarını değiştiremez/silemez',
  (select count(*) from public.companies where ad = 'ele geçirildi') = 0 and (select count(*) from public.tasks) = 1);

-- Firma silinince görev ve notlar kalır, bağlantı boşalır
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
delete from public.companies where id = '10000000-0000-0000-0000-000000000001';
select pg_temp.bekle('firma silinince görev firmasız kalır',
  (select company_id is null and deal_id is null and contact_id is null and user_id = '00000000-0000-0000-0000-00000000000a' from public.tasks));
select pg_temp.bekle('firma silinince notlar kalır', (select count(*) from public.notes) = 2);

-- Özet günde bir kez (sunucu / service role)
reset role;
insert into public.notification_log (user_id, tur, gun) values ('00000000-0000-0000-0000-00000000000a', 'ozet', '2026-10-05');
do $$ begin
  insert into public.notification_log (user_id, tur, gun) values ('00000000-0000-0000-0000-00000000000a', 'ozet', '2026-10-05');
  raise exception 'BAŞARISIZ: aynı gün ikinci özet';
exception when unique_violation then raise notice 'OK: günde tek özet';
end $$;

-- Depolama: ses dosyaları sahibinin klasöründe
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
insert into storage.objects (bucket_id, name) values ('ses', '00000000-0000-0000-0000-00000000000a/kayit.webm');
do $$ begin
  insert into storage.objects (bucket_id, name) values ('ses', '00000000-0000-0000-0000-00000000000b/kayit.webm');
  raise exception 'BAŞARISIZ: başkasının ses klasörüne yazıldı';
exception when insufficient_privilege then raise notice 'OK: ses klasörü sahibine özel';
end $$;
reset role;

-- E-posta bağlantısı
select pg_temp.bekle('her kullanıcıya farklı e-posta anahtarı',
  (select count(distinct eposta_anahtari) = 2 and bool_and(eposta_anahtari ~ '^[a-z0-9]{12}$') from public.settings));
insert into public.email_log (user_id, message_id, gonderen, sonuc)
  values ('00000000-0000-0000-0000-00000000000a', '<m1@x>', 'a@x', 'gelen_kutusu'),
         ('00000000-0000-0000-0000-00000000000b', '<m1@x>', 'b@x', 'not');
do $$ begin
  insert into public.email_log (user_id, message_id, sonuc) values ('00000000-0000-0000-0000-00000000000a', '<m1@x>', 'not');
  raise exception 'BAŞARISIZ: aynı e-posta iki kez kaydedildi';
exception when unique_violation then raise notice 'OK: aynı e-posta kullanıcı başına bir kez işlenir';
end $$;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.bekle('e-posta günlüğü yalnızca sahibine görünür', (select count(*) from public.email_log) = 1);
insert into public.companies (ad, eposta_alanlari) values ('Delta', '{delta.de}');
select pg_temp.bekle('firma görünümünde alan adları var', (select eposta_alanlari = '{delta.de}' from public.company_overview));
reset role;
