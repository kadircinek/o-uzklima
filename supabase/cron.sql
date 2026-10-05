-- Hatırlatma motorunu her 5 dakikada bir tetikler.
--
-- Supabase SQL Editor'de BİR KEZ çalıştırın. Önce iki değeri değiştirin:
--   <UYGULAMA_ADRESI>  ör. https://lifeos.vercel.app   (sonunda / olmadan)
--   <CRON_SECRET>      Vercel'deki CRON_SECRET ortam değişkeniyle aynı değer
--
-- Değerler Supabase Vault'ta şifreli saklanır.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret('<UYGULAMA_ADRESI>', 'lifeos_app_url');
select vault.create_secret('<CRON_SECRET>', 'lifeos_cron_secret');

select cron.schedule(
  'lifeos-tick',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'lifeos_app_url') || '/api/cron/tick',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'lifeos_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
  $$
);

-- Kontrol:   select * from cron.job_run_details order by start_time desc limit 5;
--            select * from net._http_response order by created desc limit 5;
-- Kaldırma:  select cron.unschedule('lifeos-tick');
