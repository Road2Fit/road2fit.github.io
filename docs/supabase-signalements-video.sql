-- 4.38 : signalements d'une analyse vidéo fausse (bouton « Signaler une erreur » sous le rapport de la série).
-- Ce qui est envoyé : le squelette de la série (des chiffres : positions des points du corps), l'exercice, ce que
-- l'algorithme a compté et ce que la personne dit être juste. JAMAIS l'image ni la vidéo.
-- Chaque compte n'écrit et ne lit que ses propres signalements ; seul le propriétaire du projet les lit tous (pour corriger l'algorithme).
create table if not exists public.form_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  data jsonb not null,
  constraint form_flags_size check (octet_length(data::text) < 3000000)
);
alter table public.form_flags enable row level security;
revoke all on public.form_flags from anon, public;
grant select, insert, delete on public.form_flags to authenticated;
drop policy if exists form_flags_insert on public.form_flags;
create policy form_flags_insert on public.form_flags for insert to authenticated with check (user_id = auth.uid());
drop policy if exists form_flags_select on public.form_flags;
create policy form_flags_select on public.form_flags for select to authenticated using (user_id = auth.uid());
drop policy if exists form_flags_delete on public.form_flags;
create policy form_flags_delete on public.form_flags for delete to authenticated using (user_id = auth.uid());
create index if not exists form_flags_created on public.form_flags (created_at desc);
