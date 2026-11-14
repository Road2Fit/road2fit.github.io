-- 4.47.5 (14/11/2026) : filet de sécurité des sauvegardes.
-- Avant : une copie de l'ancienne version au plus toutes les 8 h. Une séance enregistrée puis effacée par un autre
-- appareil dans ces 8 h était perdue pour de bon (cas réel de Gabin : volley du 13/11 et course du 14/11).
-- Maintenant : copie AUSSI à chaque fois qu'une nouvelle version contient moins de séances ou de pesées que l'ancienne.
-- On garde les 30 dernières copies.

create or replace function public.save_entry_count(d jsonb) returns integer
language sql immutable set search_path = public as $$
  select coalesce((select sum(jsonb_array_length(coalesce(q->'history', '[]'::jsonb)))
                   from jsonb_array_elements(case when jsonb_typeof(d->'quests') = 'array' then d->'quests' else '[]'::jsonb end) q), 0)::int
       + coalesce(jsonb_array_length(case when jsonb_typeof(d->'weightHistory') = 'array' then d->'weightHistory' else '[]'::jsonb end), 0);
$$;

create or replace function public.keep_save_history() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.saves_history h where h.user_id = old.user_id and h.saved_at > now() - interval '8 hours')
     or public.save_entry_count(new.data) < public.save_entry_count(old.data) then
    insert into public.saves_history (user_id, version, data) values (old.user_id, old.version, old.data);
    delete from public.saves_history h
      where h.user_id = old.user_id
        and h.id not in (select s.id from public.saves_history s where s.user_id = old.user_id order by s.saved_at desc limit 30);
  end if;
  return new;
end;
$$;
