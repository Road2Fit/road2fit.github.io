-- Photos partagées entre amis (4.16, 09/11/2026, accord de Gabin) :
--  - « last » : MA dernière photo de séance, visible par ceux qui m'ont ajouté — seulement si je l'ai activé (interrupteur) ;
--  - « tag »  : une de mes photos où je tague des amis MUTUELS (je les ai ajoutés ET ils m'ont ajouté) : elle apparaît chez eux.
-- Écriture : seulement le propriétaire (RLS). Lecture des photos des autres : seulement par les fonctions ci-dessous.

create table if not exists public.shared_photos (
  id text primary key,                                   -- '<owner>:<kind>:<photo_id>'
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  photo_id text not null,
  kind text not null check (kind in ('last', 'tag')),
  date date,
  note text not null default '' check (length(note) <= 200),
  data text not null check (length(data) <= 600000),     -- JPEG ≈ 900 px en base64
  tagged uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shared_photos_owner on public.shared_photos (owner);
create index if not exists shared_photos_tagged on public.shared_photos using gin (tagged);

-- Mes amis mutuels (je les ai ajoutés et ils m'ont ajouté)
create or replace function public.my_mutual_friends() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(f.friend_user), '{}')
  from public.friendships f
  where f.owner = auth.uid()
    and exists (select 1 from public.friendships g where g.owner = f.friend_user and g.friend_user = auth.uid());
$$;

alter table public.shared_photos enable row level security;
drop policy if exists shared_photos_select_own on public.shared_photos;
drop policy if exists shared_photos_insert_own on public.shared_photos;
drop policy if exists shared_photos_update_own on public.shared_photos;
drop policy if exists shared_photos_delete_own on public.shared_photos;
create policy shared_photos_select_own on public.shared_photos for select using (owner = auth.uid());
create policy shared_photos_insert_own on public.shared_photos for insert
  with check (owner = auth.uid() and id = owner::text || ':' || kind || ':' || photo_id
              and (kind = 'last' and tagged = '{}' or kind = 'tag' and tagged <@ public.my_mutual_friends()));
create policy shared_photos_update_own on public.shared_photos for update using (owner = auth.uid())
  with check (owner = auth.uid() and id = owner::text || ':' || kind || ':' || photo_id
              and (kind = 'last' and tagged = '{}' or kind = 'tag' and tagged <@ public.my_mutual_friends()));
create policy shared_photos_delete_own on public.shared_photos for delete using (owner = auth.uid());
revoke all on public.shared_photos from anon;
grant select, insert, update, delete on public.shared_photos to authenticated;

-- Dernière photo de séance d'un ami que j'ai ajouté (s'il partage son profil et l'a activée)
create or replace function public.friend_last_photo(p_user uuid)
returns table (photo_id text, date date, note text, data text, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.photo_id, s.date, s.note, s.data, s.updated_at
  from public.shared_photos s
  join public.profiles p on p.user_id = s.owner and p.share
  where s.owner = p_user and s.kind = 'last'
    and exists (select 1 from public.friendships f where f.owner = auth.uid() and f.friend_user = p_user)
  limit 1;
$$;

-- Photos où je suis tagué (avec le prénom publié de l'ami qui l'a prise)
create or replace function public.photos_tagged_me()
returns table (id text, photo_id text, date date, note text, data text, owner_name text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.id, s.photo_id, s.date, s.note, s.data, coalesce(p.summary->>'name', ''), s.created_at
  from public.shared_photos s
  left join public.profiles p on p.user_id = s.owner
  where s.kind = 'tag' and auth.uid() = any (s.tagged)
  order by s.created_at desc
  limit 200;
$$;

revoke all on function public.my_mutual_friends() from anon;
revoke all on function public.friend_last_photo(uuid) from anon;
revoke all on function public.photos_tagged_me() from anon;
grant execute on function public.my_mutual_friends() to authenticated;
grant execute on function public.friend_last_photo(uuid) to authenticated;
grant execute on function public.photos_tagged_me() to authenticated;
revoke all on function public.my_mutual_friends() from public;
revoke all on function public.friend_last_photo(uuid) from public;
revoke all on function public.photos_tagged_me() from public;
