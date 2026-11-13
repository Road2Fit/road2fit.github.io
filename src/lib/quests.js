// Aides sur les exercices et leurs séances : exercices chronométrés, entrées d'historique, séries validées.
// Exercices chronométrés (gainage, planche, chaise murale…) : les « répétitions » sont des secondes
const TIMED_IDS = new Set(['fp_plank', 'fp_side_plank', 'fp_wall_sit', 'fp_dead_hang', 'fp_hollow_hold', 'fp_superman_hold']);

const TIMED_NAME_RE = /\(en secondes\)|gainage|planche|plank|chaise murale|wall sit|dead hang|suspension [aà] la barre|hollow|superman|isometri/i;
// mots de mouvement : jamais une tenue, même si le nom contient « planche » (pompes pseudo-planche), sauf « (en secondes) »
const NOT_TIMED_RE = /pompes|push.?up/i;
const timedName = name => { const n = timedNameOf(name); return /\(en secondes\)/i.test(n) || (TIMED_NAME_RE.test(n) && !NOT_TIMED_RE.test(n)); };

const timedNameOf = name => String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const isTimedCatalog = c => !!c && c.type !== 'cardio' && (c.timed === true || TIMED_IDS.has(c.id) || timedName(c.name));

export const isTimedQuest = q => {
  if (!q || q.type === 'cardio' || q.unit === 'kg') return false;
  if (q.timed === true) return true;
  if (q.timed === false) return false;
  return TIMED_IDS.has(q.catalogId) || timedName(q.name);
};

export const repUnit = q => (isTimedQuest(q) ? 's' : 'reps');

// Valeurs conseillées à la création d'un exercice chronométré
export function timedAdvice(name) {
  const n = timedNameOf(name).toLowerCase();
  if (/lateral|side/.test(n)) return { start: 20, sets: 3, reps: 45, tip: 'Gainage latéral : pars de ce que tu tiens proprement sur un côté (ex. 20 s) et vise 3 × 45 s par côté.' };
  if (/hollow/.test(n)) return { start: 15, sets: 3, reps: 30, tip: 'Hollow hold : pars de 15 s et vise 3 × 30 s (dos bien plaqué au sol).' };
  if (/superman/.test(n)) return { start: 20, sets: 3, reps: 30, tip: 'Superman hold : pars de 20 s et vise 3 × 30 s.' };
  if (/dead hang|suspension/.test(n)) return { start: 20, sets: 3, reps: 45, tip: 'Suspension : pars de 20 s et vise 3 × 45 s.' };
  if (/chaise|wall sit/.test(n)) return { start: 30, sets: 3, reps: 60, tip: 'Chaise murale : pars de 30 s et vise 3 × 60 s.' };
  return { start: 30, sets: 3, reps: 60, tip: 'Gainage : pars de la durée que tu tiens proprement sur la 1re série (ex. 30 s) et vise 3 × 60 s.' };
}

export const isStartEntry = h => String(h.note || '').startsWith('Point de départ');

export const isVolleyQuest = q => /volley/i.test(`${q.category || ''} ${q.catalogId || ''} ${q.name || ''}`);

export const getAllEntries = state =>
  (state.quests || []).flatMap(q => (q.history || []).filter(h => !isStartEntry(h)).map(h => ({ ...h, quest: q })));

export const entryReps = e =>
  isTimedQuest(e.quest) ? 0 : Array.isArray(e.setDetails)
    ? e.setDetails.reduce((a, r) => a + (Number(r) || 0), 0)
    : e.quest.type === 'strength' ? (Number(e.sets) || 0) * (Number(e.reps) || 0) : 0;

export const entryVolume = e => {
  if (!(e.quest.type === 'strength' && e.quest.unit === 'kg')) return 0;
  if (Array.isArray(e.setLoads) && Array.isArray(e.setDetails) && e.setLoads.length === e.setDetails.length) {
    return e.setDetails.reduce((s, r, i) => s + (Number(r) || 0) * (Number(e.setLoads[i]) || 0), 0); // charge différente selon la série
  }
  return entryReps(e) * (Number(e.value) || 0);
};

export const entryKm = e =>
  e.quest.type !== 'cardio' ? 0 : Number(e.distanceKm) || (e.quest.unit === 'km' ? Number(e.value) || 0 : 0);

export const isRunQuest = q => ['run', 'interval'].includes(q.cardioMode) || /course|running/i.test(`${q.catalogId || ''} ${q.name || ''}`);

export function getSetDetailsArray(item, fallbackSets = 3, fallbackReps = 6) {
  if (Array.isArray(item?.setDetails) && item.setDetails.length > 0) {
    return item.setDetails.map(r => Math.max(0, Number(r) || 0));
  }
  const count = Math.max(1, Number(item?.sets || item?.currentSets || fallbackSets) || 3);
  const reps = Math.max(0, Number(item?.reps ?? item?.value ?? item?.currentValue ?? fallbackReps) || 0);
  return Array(count).fill(reps);
}

export function formatSetsBreakdown(setDetails) {
  if (!Array.isArray(setDetails) || setDetails.length === 0) return '';
  return setDetails.join(' - ');
}

export function countValidatedSets(setDetails, goalReps) {
  const target = Math.max(1, Number(goalReps) || 1);
  return (setDetails || []).filter(r => Number(r) >= target).length;
}
