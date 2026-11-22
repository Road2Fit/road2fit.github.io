-- Séance à deux (4.51, 22/11/2026, demande de Gabin) : un ami invite un ami MUTUEL (ils se sont ajoutés l'un l'autre)
-- à une séance commune un jour précis. L'invité accepte ou refuse sur son compte ; s'il accepte, SON appli calcule le
-- plan commun (mêmes exercices, mêmes séries et répétitions, charges propres à chacun) et l'enregistre ici ; l'appli de
-- l'invitant le lit. Rien d'autre n'est partagé.
--
-- Ce qui passe par le serveur :
--  - part (invitant) : ses exercices possibles (identifiants du catalogue), les exercices du catalogue à éviter à cause
--    d'une douleur signalée (la liste seulement, pas la zone ; on peut toutefois la deviner), son type d'objectif
--    (puissance / hypertrophie / endurance / auto), son niveau déclaré, salle ou maison et son matériel. JAMAIS de
--    charges, d'historique ni de poids. La part est effacée dès que l'invité répond ou que l'un des deux annule ;
--  - plan (calculé par l'invité) : liste d'exercices du catalogue avec séries, répétitions et repos.
-- Accès : AUCUN droit direct sur la table ; seulement les fonctions ci-dessous (security definer), qui vérifient que
-- l'appelant est l'une des deux personnes. Les invitations passées depuis plus de 30 jours sont effacées.

create table if not exists public.duo_sessions (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  date date not null,
  theme text not null default 'auto' check (theme in ('auto', 'full', 'upper', 'lower', 'push', 'pull')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  part jsonb not null default '{}'::jsonb check (octet_length(part::text) <= 20000),
  plan jsonb check (plan is null or octet_length(plan::text) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_user <> to_user)
);
create index if not exists duo_sessions_from on public.duo_sessions (from_user, date);
create index if not exists duo_sessions_to on public.duo_sessions (to_user, date);
-- une seule invitation en cours par paire et par jour (même envoyée deux fois au même instant)
create unique index if not exists duo_sessions_pair_day on public.duo_sessions (least(from_user, to_user), greatest(from_user, to_user), date)
  where status in ('pending', 'accepted');
alter table public.duo_sessions enable row level security;
revoke all on public.duo_sessions from public, anon, authenticated;

-- Inviter un ami mutuel. Erreurs : DUO_AUTH, DUO_NOT_MUTUAL, DUO_DATE, DUO_TOO_MANY, DUO_PART
create or replace function public.duo_invite(p_to uuid, p_date date, p_theme text, p_part jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  new_id uuid;
begin
  if me is null then raise exception 'DUO_AUTH'; end if;
  if p_to is null or p_to = me
     or not exists (select 1 from public.friendships where owner = me and friend_user = p_to)
     or not exists (select 1 from public.friendships where owner = p_to and friend_user = me) then
    raise exception 'DUO_NOT_MUTUAL';
  end if;
  if p_date is null or p_date < current_date - 1 or p_date > current_date + 30 then raise exception 'DUO_DATE'; end if;
  if p_part is null or jsonb_typeof(p_part) <> 'object' or octet_length(p_part::text) > 20000
     or coalesce(nullif(p_theme, ''), 'auto') not in ('auto', 'full', 'upper', 'lower', 'push', 'pull') then raise exception 'DUO_PART'; end if;
  delete from public.duo_sessions where date < current_date - 30;
  if (select count(*) from public.duo_sessions where from_user = me and status = 'pending') >= 10
     or (select count(*) from public.duo_sessions where from_user = me and created_at > now() - interval '1 day') >= 20 then
    raise exception 'DUO_TOO_MANY';
  end if;
  -- une seule invitation en cours entre ces deux personnes pour ce jour : la nouvelle remplace l'ancienne
  update public.duo_sessions set status = 'cancelled', part = '{}'::jsonb, updated_at = now()
    where date = p_date and status in ('pending', 'accepted')
      and ((from_user = me and to_user = p_to) or (from_user = p_to and to_user = me));
  insert into public.duo_sessions (from_user, to_user, date, theme, part)
    values (me, p_to, p_date, coalesce(nullif(p_theme, ''), 'auto'), p_part)
    returning id into new_id;
  return new_id;
end;
$$;

-- Mes séances à deux (envoyées et reçues), avec le prénom publié de l'autre (s'il partage encore son profil)
create or replace function public.duo_list()
returns table (id uuid, mine boolean, other uuid, other_name text, date date, theme text, status text, part jsonb, plan jsonb, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select d.id, d.from_user = auth.uid(),
         case when d.from_user = auth.uid() then d.to_user else d.from_user end,
         coalesce(p.summary->>'name', ''), d.date, d.theme, d.status,
         case when d.to_user = auth.uid() then d.part else '{}'::jsonb end, d.plan, d.updated_at
  from public.duo_sessions d
  left join public.profiles p on p.user_id = case when d.from_user = auth.uid() then d.to_user else d.from_user end and p.share
  where (d.from_user = auth.uid() or d.to_user = auth.uid()) and d.date >= current_date - 7
    and (d.status in ('pending', 'accepted') or d.updated_at > now() - interval '8 days')
  order by d.date, d.created_at
  limit 50;
$$;

-- Répondre à une invitation reçue (accepter avec le plan commun, ou refuser). Erreurs : DUO_AUTH, DUO_NOT_FOUND, DUO_PLAN
create or replace function public.duo_answer(p_id uuid, p_accept boolean, p_plan jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'DUO_AUTH'; end if;
  if p_accept and (p_plan is null or jsonb_typeof(p_plan) <> 'object' or octet_length(p_plan::text) > 4000
     or jsonb_typeof(p_plan->'ex') is distinct from 'array' or jsonb_array_length(p_plan->'ex') not between 1 and 6) then raise exception 'DUO_PLAN'; end if;
  update public.duo_sessions d
     set status = case when p_accept then 'accepted' else 'declined' end,
         plan = case when p_accept then p_plan else null end,
         part = '{}'::jsonb,
         updated_at = now()
   where d.id = p_id and d.to_user = me and d.status = 'pending' and d.date >= current_date - 1
     and (not p_accept or (exists (select 1 from public.friendships where owner = me and friend_user = d.from_user)
                           and exists (select 1 from public.friendships where owner = d.from_user and friend_user = me)));
  if not found then raise exception 'DUO_NOT_FOUND'; end if;
end;
$$;

-- Annuler (l'une ou l'autre des deux personnes, invitation en attente ou acceptée)
create or replace function public.duo_cancel(p_id uuid) returns void
language sql security definer set search_path = public as $$
  update public.duo_sessions set status = 'cancelled', part = '{}'::jsonb, updated_at = now()
   where id = p_id and (from_user = auth.uid() or to_user = auth.uid()) and status in ('pending', 'accepted');
$$;

revoke all on function public.duo_invite(uuid, date, text, jsonb), public.duo_list(), public.duo_answer(uuid, boolean, jsonb), public.duo_cancel(uuid) from public, anon;
grant execute on function public.duo_invite(uuid, date, text, jsonb), public.duo_list(), public.duo_answer(uuid, boolean, jsonb), public.duo_cancel(uuid) to authenticated;
