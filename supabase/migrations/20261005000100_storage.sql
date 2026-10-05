-- Sesli notlar için özel depolama alanı. Dosyalar '<user_id>/<dosya>' yolunda
-- tutulur ve yalnızca sahibi okuyup yazabilir.

insert into storage.buckets (id, name, public)
values ('ses', 'ses', false)
on conflict (id) do nothing;

create policy "ses: sahibi okur" on storage.objects for select to authenticated
  using (bucket_id = 'ses' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "ses: sahibi yükler" on storage.objects for insert to authenticated
  with check (bucket_id = 'ses' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "ses: sahibi siler" on storage.objects for delete to authenticated
  using (bucket_id = 'ses' and (storage.foldername(name))[1] = (select auth.uid())::text);
