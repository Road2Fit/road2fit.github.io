// Formes de séries (« méthodes ») : séries classiques, pyramides, série lourde + séries allégées, dégressives, repos-pause,
// myo-reps, séries fractionnées, dernière série au maximum, supersets. Fonctions pures, testées dans methods.test.js.
// Repères (voir data/methodSources.js) : à volume égal, aucune forme ne fait clairement plus de muscle que les séries
// classiques ; certaines font gagner du temps (dégressives, repos-pause, myo-reps, supersets) ou servent la force
// (série lourde, séries fractionnées). Le coach les alterne pour varier, gagner du temps et viser l'objectif choisi.
import { pctForReps } from './profiles';
import { coachRound, coachStep } from './settings';

const r1 = x => Math.round(x * 10) / 10;

export const METHODS = {
  straight: {
    label: 'Séries classiques', short: 'Même charge et mêmes répétitions à chaque série.',
    how: 'Fais chaque série avec la même charge, en gardant 1 à 3 répétitions en réserve. Repos complet entre les séries.',
    kinds: ['load', 'assisted', 'reps', 'timed'],
  },
  pyramid: {
    label: 'Pyramide montante', short: 'La charge monte, les répétitions baissent.',
    how: 'Commence plus léger avec plus de répétitions, puis monte la charge à chaque série. La dernière série est la plus lourde.',
    kinds: ['load'],
  },
  reverse_pyramid: {
    label: 'Pyramide inversée', short: 'La série la plus lourde d’abord, puis la charge baisse.',
    how: 'Après l’échauffement, fais d’abord la série la plus lourde (tu es frais), puis enlève un peu de charge et fais plus de répétitions.',
    kinds: ['load'],
  },
  top_backoff: {
    label: 'Série lourde + séries allégées', short: 'Une série lourde, puis des séries un peu plus légères.',
    how: 'Une seule série lourde avec 1 à 2 répétitions en réserve, puis les autres séries à environ −8 % pour accumuler du travail propre.',
    kinds: ['load'],
  },
  drop_set: {
    label: 'Série dégressive', short: 'Dernière série prolongée en baissant la charge sans repos.',
    how: 'Dernière série presque jusqu’à l’échec, puis baisse la charge d’environ 20 % et repars aussitôt (10 s), deux fois.',
    kinds: ['load', 'assisted'],
  },
  rest_pause: {
    label: 'Repos-pause', short: 'Dernière série prolongée par de courtes mini-séries.',
    how: 'Dernière série presque jusqu’à l’échec, 20 s de pause, quelques répétitions de plus avec la même charge, deux fois.',
    kinds: ['load', 'assisted', 'reps'],
  },
  myo_reps: {
    label: 'Myo-reps', short: 'Une série d’activation puis des mini-séries très rapprochées.',
    how: 'Série d’activation un peu plus légère et longue, presque jusqu’à l’échec, puis 4 mini-séries de quelques répétitions avec 15 s de pause. Rapide et efficace sur les exercices d’isolation.',
    kinds: ['load', 'assisted', 'reps'],
  },
  cluster: {
    label: 'Séries fractionnées', short: 'Chaque série coupée en deux avec 20 s de pause.',
    how: 'Fais la série en deux morceaux avec 20 s de pause au milieu : la vitesse reste haute, la charge peut être un peu plus lourde. Pour la force et la puissance.',
    kinds: ['load'],
  },
  amrap: {
    label: 'Dernière série au maximum', short: 'La dernière série : le plus de répétitions possible, proprement.',
    how: 'Séries classiques, mais la dernière : autant de répétitions propres que possible. Le coach s’en sert pour régler la suite.',
    kinds: ['load', 'assisted', 'reps'],
  },
};
export const METHOD_IDS = Object.keys(METHODS);
export const methodLabel = id => (METHODS[id] || METHODS.straight).label;

/** La méthode s'applique-t-elle à ce type d'exercice ? (charge, aide, poids du corps, durée) */
export function methodFits(id, e) {
  const m = METHODS[id];
  if (!m) return false;
  const k = e.timed ? 'timed' : e.kind === 'load' ? 'load' : e.kind === 'assisted' ? 'assisted' : 'reps';
  return m.kinds.includes(k);
}

// charge pour `reps` répétitions quand `base` vaut pour `R` répétitions (tableau % du 1RM)
const loadFor = (base, R, reps) => base * (pctForReps(reps) / pctForReps(R));

/**
 * Détail série par série d'une méthode, à partir de l'objectif classique de l'exercice
 * (e.load = charge de base pour e.targetReps[0] répétitions, e.sets séries, e.restSec repos).
 * @returns {Array<{reps, load, assist, rest, kind, label}>} kind : work | top | backoff | drop | mini | cluster | amrap
 */
export function buildPlan(id, e) {
  const N = Math.max(1, e.sets || (e.targetReps || []).length || 3);
  const R = Math.max(1, Number((e.targetReps || [])[0]) || Number(e.goalReps) || 8);
  const W = Number(e.load) || 0;
  const A = Number(e.assist) || 0;
  const rest = e.restSec || 90;
  const q = { catalogId: e.catalogId, name: e.name };
  const rnd = x => (W > 0 ? Math.max(0, coachRound(x, coachStep(q, x))) : 0);
  const set = (reps, load, kind, label, restAfter = rest, assist = A) => ({ reps: Math.max(1, Math.round(reps)), load: e.kind === 'load' ? rnd(load) : 0, assist: e.kind === 'assisted' ? r1(assist) : 0, rest: restAfter, kind, label });
  const straight = () => (e.targetReps || Array(N).fill(R)).slice(0, N).map((r, i) => set(r, W, 'work', `Série ${i + 1}`));
  switch (id) {
    case 'pyramid':
      return Array.from({ length: N }, (_, i) => { const reps = R + 2 * (N - 1 - i); return set(reps, loadFor(W, R, reps), 'work', `Série ${i + 1}${i === N - 1 ? ' (la plus lourde)' : ''}`); });
    case 'reverse_pyramid':
      return Array.from({ length: N }, (_, i) => { const reps = Math.max(3, R - 2 + 2 * i); return set(reps, loadFor(W, R, reps), i === 0 ? 'top' : 'work', i === 0 ? 'Série 1 (la plus lourde)' : `Série ${i + 1}`); });
    case 'top_backoff': {
      const top = Math.max(3, R - 3);
      return [set(top, loadFor(W, R, top), 'top', 'Série lourde (1-2 reps en réserve)', Math.max(rest, 150)), ...Array.from({ length: Math.max(1, N - 1) }, (_, i) => set(R, W * 0.92, 'backoff', `Série allégée ${i + 1}`))];
    }
    case 'drop_set': {
      const base = straight();
      base[base.length - 1] = { ...base[base.length - 1], rest: 10, label: `${base[base.length - 1].label} (presque à l’échec)` };
      const drops = e.kind === 'assisted'
        ? [set(R, 0, 'drop', 'Dégressive 1 : +10 kg d’aide, sans repos', 10, A + 10), set(R, 0, 'drop', 'Dégressive 2 : +20 kg d’aide, sans repos', rest, A + 20)]
        : [set(R, W * 0.8, 'drop', 'Dégressive 1 : −20 %, sans repos', 10), set(R, W * 0.65, 'drop', 'Dégressive 2 : −35 %, sans repos', rest)];
      return [...base, ...drops];
    }
    case 'rest_pause': {
      const base = straight();
      base[base.length - 1] = { ...base[base.length - 1], rest: 20, label: `${base[base.length - 1].label} (presque à l’échec)` };
      const mini = Math.max(2, Math.round(R / 3));
      return [...base, set(mini, W, 'mini', 'Mini-série 1 (après 20 s)', 20), set(mini, W, 'mini', 'Mini-série 2 (après 20 s)', rest)];
    }
    case 'myo_reps': {
      const act = R + 4;
      const load = loadFor(W, R, act);
      const mini = Math.max(3, Math.round(act / 3));
      return [set(act, load, 'work', 'Activation (presque à l’échec)', 15), ...[1, 2, 3, 4].map(k => set(mini, load, 'mini', `Mini-série ${k} (après 15 s)`, k === 4 ? rest : 15))];
    }
    case 'cluster': {
      const half = Math.ceil(R / 2);
      return Array.from({ length: N }, (_, i) => set(R, W * 1.025, 'cluster', `Série ${i + 1} : ${half} + ${R - half} reps, 20 s de pause au milieu`));
    }
    case 'amrap': {
      const base = straight();
      base[base.length - 1] = { ...base[base.length - 1], kind: 'amrap', label: `${base[base.length - 1].label} : le plus possible (objectif ${R}+)` };
      return base;
    }
    default:
      return straight();
  }
}

/** Séries dont les répétitions jugent la progression (les mini-séries et dégressives ne comptent pas). */
export const isKeyKind = k => !k || k === 'work' || k === 'top' || k === 'backoff' || k === 'cluster' || k === 'amrap';

/**
 * Séance passée vue par la progression, quelle que soit sa forme (pyramide, série lourde, dégressives, mini-séries,
 * séance dictée ou notée à la main) :
 *  - seules les séries principales comptent (setKinds : les dégressives et mini-séries sont écartées) ;
 *  - charge qui BAISSE comme prévu (pyramide inversée, série lourde + séries allégées) : la séance est ramenée à une
 *    séance classique équivalente, à la charge qui correspond à la meilleure série pour R répétitions (1RM estimé, Epley 1985).
 *  - charge qui monte (pyramide montante, charge augmentée en cours de séance) : inchangé (la dernière série sert de référence).
 */
export function normalizeForProgress(entry, kind, R) {
  if (!entry) return entry;
  let e = entry;
  const n = Array.isArray(e.setDetails) ? e.setDetails.length : 0;
  if (n && Array.isArray(e.setKinds) && e.setKinds.length === n) {
    const keep = e.setKinds.map(isKeyKind);
    if (keep.some(Boolean) && keep.some(k => !k)) {
      const f = arr => (Array.isArray(arr) && arr.length === n ? arr.filter((_, i) => keep[i]) : arr);
      e = { ...e, setDetails: f(e.setDetails), setLoads: f(e.setLoads), setAssists: f(e.setAssists), setKinds: f(e.setKinds), sets: keep.filter(Boolean).length };
    }
  }
  if (kind !== 'load' || !Array.isArray(e.setLoads) || e.setLoads.length !== (e.setDetails || []).length) return e;
  const loads = e.setLoads.map(Number);
  const heaviest = Math.max(...loads);
  if (!(heaviest > 0) || loads[loads.length - 1] >= heaviest || new Set(loads).size < 2) return e;
  // seulement une forme prévue pour descendre (série lourde d'abord) ; une charge baissée parce que c'était trop dur garde la charge tenue à la fin
  const planned = e.method === 'reverse_pyramid' || e.method === 'top_backoff' || (Array.isArray(e.setKinds) && e.setKinds.some(k => k === 'top' || k === 'backoff'));
  if (!planned) return e;
  const best = Math.max(...e.setDetails.map((r, i) => loads[i] * (1 + (Number(r) || 0) / 30)));
  const equiv = Math.round((best / (1 + R / 30)) * 4) / 4;
  const { setLoads, ...rest } = e;
  return { ...rest, value: equiv, setDetails: Array(e.setDetails.length).fill(R), sets: e.setDetails.length, equivalentOf: { best: Math.round(best), heaviest } };
}

/** Durée estimée (minutes) d'un plan : environ 40 s par série + le repos qui suit. */
export const planMinutes = plan => plan.reduce((s, p) => s + 0.65 + (Number(p.rest) || 0) / 60, 0);

/** Applique une méthode à un objectif d'exercice : séries, répétitions et charges détaillées. */
export function withMethod(e, id, why = '') {
  const mid = methodFits(id, e) ? id : 'straight';
  if (mid === 'straight') return { ...e, method: 'straight', plan: null, methodWhy: why };
  const plan = buildPlan(mid, e);
  return { ...e, method: mid, methodWhy: why, plan, sets: plan.length, targetReps: plan.map(p => p.reps) };
}
