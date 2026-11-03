-- Exercices créés par le coach intelligent, partagés avec tous les utilisateurs (catalogue commun).
-- Lecture : tout compte connecté. Écriture : seulement la fonction Edge `coach-ai` (clé de service, côté serveur),
-- après avoir fait décrire l'exercice par Claude : un compte ne peut ni ajouter, ni modifier, ni supprimer directement.
create table if not exists public.shared_exercises (
  id text primary key,                      -- « ai_muscle_up_leste »
  name_key text not null unique,            -- nom normalisé (sans accents, minuscules) : pas de doublon
  data jsonb not null,                      -- fiche de l'exercice (nom, groupe, muscle, mesure, charges de départ…)
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.shared_exercises enable row level security;
revoke all on public.shared_exercises from anon, authenticated;
grant select on public.shared_exercises to authenticated;
drop policy if exists shared_exercises_read on public.shared_exercises;
create policy shared_exercises_read on public.shared_exercises for select to authenticated using (true);
