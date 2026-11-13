-- Phase 1 « 10 testeurs » (4.47, 13/11/2026) : suppression de compte, signalements, suivi des erreurs, budget global du coach IA.
-- À exécuter une fois sur le projet Supabase (rejouable : create or replace / if not exists).

-- ---------- 1. Supprimer son compte (RGPD : droit à l'effacement) ----------
-- Toutes les tables de la personne sont liées à auth.users avec « on delete cascade » : effacer le compte efface tout
-- (sauvegarde, historique des versions, photos, profil ami, amitiés, photos partagées, signalements, quota IA, erreurs).
-- Les exercices qu'elle a fait créer au catalogue commun restent (created_by passe à null : rien de personnel).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTH'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------- 2. Signaler un problème / proposer une idée ----------
create table if not exists public.feedback (
  id          bigint generated always as identity primary key,
  user_id     uuid default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  kind        text not null check (kind in ('bug', 'idee', 'autre')),
  message     text not null check (char_length(message) between 3 and 2000),
  app_version text check (char_length(app_version) <= 20),
  device      text check (char_length(device) <= 200),
  screen      text check (char_length(screen) <= 60)
);
alter table public.feedback enable row level security;
revoke all on public.feedback from anon, authenticated;
grant insert (kind, message, app_version, device, screen) on public.feedback to authenticated;
grant select on public.feedback to authenticated;
drop policy if exists feedback_insert on public.feedback;
create policy feedback_insert on public.feedback for insert to authenticated with check (user_id = auth.uid());
drop policy if exists feedback_select_own on public.feedback;
create policy feedback_select_own on public.feedback for select to authenticated using (user_id = auth.uid());

-- ---------- 3. Suivi des erreurs de l'appli (sans données personnelles : message, version, appareil, écran) ----------
create table if not exists public.app_errors (
  id          bigint generated always as identity primary key,
  user_id     uuid default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  message     text not null check (char_length(message) <= 500),
  stack       text check (char_length(stack) <= 4000),
  app_version text check (char_length(app_version) <= 20),
  device      text check (char_length(device) <= 200),
  screen      text check (char_length(screen) <= 60),
  count       int not null default 1 check (count between 1 and 100)
);
alter table public.app_errors enable row level security;
revoke all on public.app_errors from anon, authenticated;
-- écriture seulement (personne ne relit les erreurs depuis l'appli ; le propriétaire du projet les lit dans Supabase)
grant insert (message, stack, app_version, device, screen, count) on public.app_errors to anon, authenticated;
drop policy if exists app_errors_insert on public.app_errors;
create policy app_errors_insert on public.app_errors for insert to anon, authenticated
  with check ((auth.uid() is null and user_id is null) or user_id = auth.uid());

-- garde-fou contre les abus : au plus 300 erreurs par jour sans compte et 50 par compte (le reste est ignoré sans bruit)
create or replace function public.app_errors_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare n int;
begin
  select count(*) into n from app_errors
   where created_at >= current_date
     and ((new.user_id is null and user_id is null) or user_id = new.user_id);
  if (new.user_id is null and n >= 300) or (new.user_id is not null and n >= 50) then return null; end if;
  return new;
end $$;
drop trigger if exists app_errors_limit on public.app_errors;
create trigger app_errors_limit before insert on public.app_errors for each row execute function public.app_errors_limit();

-- ---------- 4. Budget global du coach IA (tous comptes confondus, par mois) ----------
create table if not exists public.app_settings (
  key   text primary key,
  num   numeric not null
);
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;
insert into public.app_settings (key, num) values ('ai_monthly_calls', 2000) on conflict (key) do nothing;

-- 'ok' | 'user' (limite du jour de la personne) | 'global' (budget du mois de toute l'appli atteint) | 'auth'
create or replace function public.ai_take_quota2(p_limit int default 60)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare n int; total bigint; cap numeric;
begin
  if auth.uid() is null then return 'auth'; end if;
  select num into cap from app_settings where key = 'ai_monthly_calls';
  select coalesce(sum(calls), 0) into total from ai_usage where day >= date_trunc('month', current_date)::date;
  if cap is not null and total >= cap then return 'global'; end if;
  insert into ai_usage(user_id, day, calls) values (auth.uid(), current_date, 1)
  on conflict (user_id, day) do update set calls = ai_usage.calls + 1
  returning calls into n;
  return case when n <= least(coalesce(p_limit, 60), 200) then 'ok' else 'user' end;
end $$;
revoke all on function public.ai_take_quota2(int) from public, anon;
grant execute on function public.ai_take_quota2(int) to authenticated;
