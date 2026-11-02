-- Coach intelligent (API Claude) : compteur d'appels par personne et par jour.
-- La fonction Edge `coach-ai` (supabase/functions/coach-ai) appelle ai_take_quota avec la session de la personne
-- avant chaque appel à Claude. Les comptes n'ont aucun accès direct à la table.

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  calls int not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;

-- Compte un appel pour la personne connectée ; renvoie true tant que la limite du jour n'est pas dépassée (200 au plus).
create or replace function public.ai_take_quota(p_limit int default 60)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare n int;
begin
  if auth.uid() is null then return false; end if;
  insert into ai_usage(user_id, day, calls) values (auth.uid(), current_date, 1)
  on conflict (user_id, day) do update set calls = ai_usage.calls + 1
  returning calls into n;
  return n <= least(coalesce(p_limit, 60), 200);
end $$;

revoke all on function public.ai_take_quota(int) from public, anon;
grant execute on function public.ai_take_quota(int) to authenticated;
