-- Sécurité (4.55, 27/11/2026, demande de Gabin après une vidéo « ce qu'un hacker teste » sur les applis faites par IA).
-- Audit : RLS active partout, chaque ligne limitée à son propriétaire, aucune requête SQL construite à la main, aucun secret
-- dans l'appli ni dans l'historique git. Ce fichier corrige ce qui restait (conseiller sécurité de Supabase + audit, relu
-- par architect) :
--  1. quota du coach IA : ai_take_quota3 réservée à la clé de service (fonction Edge coach-ai) ; un appel refusé ne compte
--     plus ; compteur atomique (pas de dépassement avec des appels simultanés). En attendant l'étape 2, l'ancien compteur
--     ai_take_quota2 (appelable par les comptes) ne compte plus les refus et sa limite est figée à 60 par jour ;
--  2. fonctions de déclencheurs (code d'invitation, historique des sauvegardes, limite des erreurs) : plus appelables de
--     l'extérieur (/rest/v1/rpc/...) ;
--  3. limites par compte (anti-abus) : 40 signalements vidéo par jour et 300 en tout, 20 messages par jour, 1 000 photos
--     de 600 Ko au plus, 300 photos partagées ;
--  4. photos partagées entre amis : seulement de vraies images (data:image/jpeg|png|webp;base64), jamais une adresse
--     extérieure (pistage de l'adresse IP des amis) ni autre chose.
-- ÉTAPE 1 (tout ou rien) maintenant ; ÉTAPE 2 seulement quand les journaux de coach-ai montrent « quota_v3 ok ».

-- ======================= ÉTAPE 1 =======================
begin;

-- 1. quota du coach IA, appelé seulement par la fonction Edge (clé de service) pour la personne vérifiée par Supabase Auth
create or replace function public.ai_take_quota3(p_user uuid, p_limit int default 60)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare n int; total bigint; cap numeric; lim int := least(greatest(coalesce(p_limit, 60), 1), 200);
begin
  if p_user is null then return 'auth'; end if;
  select num into cap from app_settings where key = 'ai_monthly_calls';
  select coalesce(sum(calls), 0) into total from ai_usage where day >= date_trunc('month', current_date)::date;
  if cap is not null and total >= cap then return 'global'; end if;
  -- atomique : l'appel n'est compté que s'il reste de la place (un refus ne compte pas)
  insert into ai_usage(user_id, day, calls) values (p_user, current_date, 1)
  on conflict (user_id, day) do update set calls = ai_usage.calls + 1 where ai_usage.calls < lim
  returning calls into n;
  if n is null then return 'user'; end if;
  return 'ok';
end $fn$;
revoke all on function public.ai_take_quota3(uuid, int) from public, anon, authenticated;
grant execute on function public.ai_take_quota3(uuid, int) to service_role;

-- 1 bis. ancien compteur, encore appelable par les comptes jusqu'à l'étape 2 : limite figée à 60, refus non comptés
create or replace function public.ai_take_quota2(p_limit int default 60)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare n int; total bigint; cap numeric; lim int := least(greatest(coalesce(p_limit, 60), 1), 60);
begin
  if auth.uid() is null then return 'auth'; end if;
  select num into cap from app_settings where key = 'ai_monthly_calls';
  select coalesce(sum(calls), 0) into total from ai_usage where day >= date_trunc('month', current_date)::date;
  if cap is not null and total >= cap then return 'global'; end if;
  insert into ai_usage(user_id, day, calls) values (auth.uid(), current_date, 1)
  on conflict (user_id, day) do update set calls = ai_usage.calls + 1 where ai_usage.calls < lim
  returning calls into n;
  if n is null then return 'user'; end if;
  return 'ok';
end $fn$;
-- le tout premier compteur n'est plus utilisé
revoke all on function public.ai_take_quota(int) from public, anon, authenticated;

-- 2. fonctions de déclencheurs : jamais appelées directement (Postgres ne contrôle EXECUTE qu'à la création du déclencheur)
revoke all on function public.check_invite() from public, anon, authenticated;
revoke all on function public.keep_save_history() from public, anon, authenticated;
revoke all on function public.app_errors_limit() from public, anon, authenticated;

-- 3. limites par compte
create or replace function public.form_flags_limit() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  if (select count(*) from form_flags where user_id = new.user_id and created_at >= current_date) >= 40 then raise exception 'LIMIT_FLAGS'; end if;
  if (select count(*) from form_flags where user_id = new.user_id) >= 300 then raise exception 'LIMIT_FLAGS'; end if;
  return new;
end $fn$;
drop trigger if exists form_flags_limit on public.form_flags;
create trigger form_flags_limit before insert on public.form_flags for each row execute function public.form_flags_limit();

create or replace function public.feedback_limit() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  if (select count(*) from feedback where user_id = new.user_id and created_at >= current_date) >= 20 then raise exception 'LIMIT_FEEDBACK'; end if;
  return new;
end $fn$;
drop trigger if exists feedback_limit on public.feedback;
create trigger feedback_limit before insert on public.feedback for each row execute function public.feedback_limit();

create or replace function public.photos_limit() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  if exists (select 1 from photos where user_id = new.user_id and id = new.id) then return new; end if; -- mise à jour (upsert)
  if (select count(*) from photos where user_id = new.user_id) >= 1000 then raise exception 'LIMIT_PHOTOS'; end if;
  return new;
end $fn$;
drop trigger if exists photos_limit on public.photos;
create trigger photos_limit before insert on public.photos for each row execute function public.photos_limit();

create or replace function public.shared_photos_limit() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  if exists (select 1 from shared_photos where id = new.id) then return new; end if; -- mise à jour (upsert de « last » ou d'un tag)
  if (select count(*) from shared_photos where owner = new.owner) >= 300 then raise exception 'LIMIT_PHOTOS'; end if;
  return new;
end $fn$;
drop trigger if exists shared_photos_limit on public.shared_photos;
create trigger shared_photos_limit before insert on public.shared_photos for each row execute function public.shared_photos_limit();

revoke all on function public.form_flags_limit() from public, anon, authenticated;
revoke all on function public.feedback_limit() from public, anon, authenticated;
revoke all on function public.photos_limit() from public, anon, authenticated;
revoke all on function public.shared_photos_limit() from public, anon, authenticated;

-- une photo réelle pèse 50 à 150 Ko (compressée par l'appli) : 600 Ko au plus (avant : 3 Mo)
alter table public.photos drop constraint if exists photos_taille_max;
alter table public.photos add constraint photos_taille_max check (pg_column_size(data) < 600000);

-- 4. photos partagées : de vraies images seulement (même règle que isImageData dans l'appli)
alter table public.shared_photos drop constraint if exists shared_photos_data_image;
alter table public.shared_photos add constraint shared_photos_data_image
  check (data ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$');

commit;

-- ======================= ÉTAPE 2 (seulement quand les journaux de coach-ai montrent « quota_v3 ok ») =======================
-- revoke all on function public.ai_take_quota2(int) from public, anon, authenticated;
