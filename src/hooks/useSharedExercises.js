import { useEffect, useState } from 'react';
import { SUPABASE, supabaseReady } from '../config';
import { addSharedExercises } from '../data/sharedExercises';
import { sharedExercises } from '../sync/supabase';

/**
 * Catalogue commun : relit en ligne les exercices créés par le coach (par n'importe quel utilisateur) dès qu'un compte est
 * connecté, puis au retour sur l'appli. Renvoie un compteur qui change quand le catalogue grandit (pour réafficher les listes).
 */
export function useSharedExercises(user) {
  const [version, setVersion] = useState(0);
  const userId = user && user.id;
  useEffect(() => {
    if (!userId || !supabaseReady(SUPABASE)) return undefined;
    let alive = true;
    const load = async () => {
      try {
        const rows = await sharedExercises.list(SUPABASE);
        if (!alive) return;
        const before = rows.length;
        addSharedExercises(rows);
        if (before) setVersion(v => v + 1);
      } catch { /* hors ligne : la copie locale suffit */ }
    };
    load();
    const onVis = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { alive = false; document.removeEventListener('visibilitychange', onVis); };
  }, [userId]);
  return version;
}
