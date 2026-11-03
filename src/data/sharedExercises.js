// Catalogue commun : exercices créés par le coach intelligent (table Supabase shared_exercises, docs/supabase-exercices.sql).
// Ils s'ajoutent au catalogue de l'appli (EXERCISE_CATALOG, tableau modifié sur place) pour tout le monde :
//  - chargés au démarrage depuis la copie locale (rondoufit:sharedEx), puis relus en ligne quand un compte est connecté ;
//  - un exercice créé par quelqu'un apparaît chez les autres à leur prochaine ouverture de l'appli.
// Fiche : { name, category, muscle, muscle2, unit, timed, equip, like, start, goal, sets, reps, icon, how, caution }.
import { EXERCISE_CATALOG } from './catalog';

const KEY = 'rondoufit:sharedEx';
const CATEGORIES = ['Dos', 'Pectoraux', 'Jambes', 'Épaules & Bras', 'Abdominaux'];

/** Fiche partagée → entrée du catalogue (mêmes champs que les exercices d'origine). */
export function sharedToCatalog(id, d) {
  if (!id || !d || !String(d.name || '').trim()) return null;
  const unit = d.unit === 'kg' ? 'kg' : 'reps';
  const n = (v, def) => (Number(v) > 0 ? Number(v) : def);
  return {
    id: String(id),
    name: String(d.name).trim().slice(0, 60),
    category: CATEGORIES.includes(d.category) ? d.category : 'Épaules & Bras',
    type: 'strength',
    unit,
    equip: String(d.equip || ''),
    defaultGoalMode: 'sets_reps',
    defaultStart: n(d.start, unit === 'kg' ? 20 : 5),
    defaultGoal: n(d.goal, unit === 'kg' ? 30 : 10),
    defaultGoalSets: n(d.sets, 3),
    defaultGoalReps: n(d.reps, 8),
    defaultStartAssistance: 0,
    defaultGoalAssistance: 0,
    icon: d.icon || '💪',
    timed: !!d.timed || undefined,
    muscle: d.muscle || '',
    muscle2: d.muscle2 || '',
    like: String(d.like || ''),
    how: String(d.how || ''),
    caution: String(d.caution || ''),
    brands: '',
    shared: true,
    raw: d, // fiche d'origine, gardée pour la copie locale
  };
}

/** Ajoute des fiches partagées au catalogue (sans doublon) ; renvoie les entrées du catalogue correspondantes. */
export function addSharedExercises(rows, { save = true } = {}) {
  const out = [];
  (rows || []).forEach(r => {
    const c = sharedToCatalog(r.id, r.data);
    if (!c) return;
    const i = EXERCISE_CATALOG.findIndex(x => x.id === c.id);
    if (i >= 0) { out.push(EXERCISE_CATALOG[i]); return; }
    EXERCISE_CATALOG.push(c);
    out.push(c);
  });
  if (save) {
    try {
      const all = EXERCISE_CATALOG.filter(c => c.shared).map(c => ({ id: c.id, data: c.raw }));
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch { /* sans mémoire : relu en ligne la prochaine fois */ }
  }
  return out;
}

// copie locale : disponibles tout de suite, même hors ligne
try {
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
  if (raw) addSharedExercises(JSON.parse(raw), { save: false });
} catch { /* copie illisible : ignorée */ }
