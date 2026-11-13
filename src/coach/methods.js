// Formes de séries (« méthodes ») : séries classiques, pyramides, série lourde + séries allégées, dégressives, repos-pause,
// myo-reps, séries fractionnées, dernière série au maximum, supersets. Fonctions pures, testées dans methods.test.js.
// Repères (voir data/methodSources.js) : à volume égal, aucune forme ne fait clairement plus de muscle que les séries
// classiques ; certaines font gagner du temps (dégressives, repos-pause, myo-reps, supersets) ou servent la force
// (série lourde, séries fractionnées). Le coach les alterne pour varier, gagner du temps et viser l'objectif choisi.
import { pctForReps } from './profiles';
import { coachRound, coachStep } from './settings';
import { holdPoint, negativesFit } from './contraction';

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
  // ---- façons de faire travailler le muscle (4.42) : isométrique, excentrique, explosif, pliométrique ----
  iso_pause: {
    label: 'Pause isométrique', short: 'Chaque répétition marque un arrêt de quelques secondes au point le plus dur.',
    how: 'Fais la répétition, tiens la position indiquée quelques secondes sans bouger, puis termine. Moins de répétitions et un peu moins lourd : l’effort dure plus longtemps.',
    kinds: ['load', 'assisted', 'reps'], contraction: 'isometric',
  },
  iso_hold: {
    label: 'Tenue isométrique', short: 'Une seule position tenue longtemps (20 à 30 s), sans bouger.',
    how: 'Mets-toi dans la position indiquée et tiens-la sans bouger le temps demandé, en respirant. Arrête si la position se dégrade.',
    kinds: ['load', 'assisted', 'reps'], contraction: 'isometric',
  },
  eccentric: {
    label: 'Excentrique (descente lente)', short: 'La descente dure 4 à 5 s ; la montée reste normale.',
    how: 'Freine la charge pendant toute la descente (compte 4 à 5 s), puis remonte normalement. Aux tractions et aux dips : « négatives » (monte avec un appui ou un saut, redescends seul lentement).',
    kinds: ['load', 'assisted', 'reps'], contraction: 'eccentric',
  },
  explosive: {
    label: 'Concentrique explosif', short: 'Montée la plus rapide possible, descente contrôlée, loin de l’échec.',
    how: 'Pousse ou tire le plus vite possible à chaque montée, même si la charge bouge lentement : c’est l’intention qui compte. Arrête la série dès que la vitesse baisse nettement.',
    kinds: ['load', 'assisted', 'reps'], contraction: 'concentric',
  },
  plyo: {
    label: 'Pliométrie', short: 'Sauts ou lancers explosifs, peu de répétitions, repos complet.',
    how: 'Chaque répétition au maximum (hauteur, distance, vitesse) avec une réception propre. Arrête dès que la qualité baisse. Repos complet (1 min 30 à 2 min).',
    kinds: ['reps'], contraction: 'plyometric', plyoOnly: true,
  },
  // forme réglée série par série par la personne (quest.coachCustom) : le coach la reprend à chaque séance
  custom: {
    label: 'Personnalisée', short: 'Tes séries, réglées une par une.',
    how: 'Pour la changer : « Modifier mes séries ».',
    kinds: ['load', 'assisted', 'reps', 'timed'],
  },
};
export const METHOD_IDS = Object.keys(METHODS);
export const methodLabel = id => (METHODS[id] || METHODS.straight).label;

/** La méthode s'applique-t-elle à ce type d'exercice ? (charge, aide, poids du corps, durée) */
export function methodFits(id, e) {
  const m = METHODS[id];
  if (!m) return false;
  // la pliométrie ne vaut que pour les exercices de sauts / lancers ; ces exercices-là gardent leur forme
  const plyoEx = !!(e && /^ply_/.test(String(e.catalogId || '')));
  if (m.plyoOnly) return plyoEx;
  if (plyoEx && id !== 'straight' && id !== 'custom') return false;
  const k = e.timed ? 'timed' : e.kind === 'load' ? 'load' : e.kind === 'assisted' ? 'assisted' : 'reps';
  return m.kinds.includes(k);
}

/** Types de série proposés dans la forme personnalisée. */
export const CUSTOM_KINDS = [['work', 'Normale'], ['top', 'Lourde'], ['backoff', 'Allégée'], ['drop', 'Dégressive (sans repos avant)'], ['mini', 'Mini-série'], ['amrap', 'Au maximum']];
const KIND_LABEL = { top: 'lourde', backoff: 'allégée', drop: 'dégressive', mini: 'mini-série', amrap: 'au maximum' };

/**
 * Forme personnalisée : séries saisies (charge, aide, reps, repos, type) → modèle relatif à la charge de base de ce jour-là
 * (ratio de charge, écart d'aide), pour que la forme suive la progression. base = { kind, load, assist }.
 */
export function customFromSets(sets, base) {
  const W = Number(base.load) || 0;
  const A = Number(base.assist) || 0;
  return sets.slice(0, 12).map(s => ({
    reps: Math.max(1, Math.min(100, Math.round(Number(s.reps) || 1))),
    ratio: base.kind === 'load' && W > 0 && Number(s.load) > 0 ? Math.round((Number(s.load) / W) * 1000) / 1000 : 1,
    assistDelta: base.kind === 'assisted' ? r1((Number(s.assist) || 0) - A) : 0,
    rest: Math.max(0, Math.min(600, Math.round(Number(s.rest) || 0))),
    kind: CUSTOM_KINDS.some(([k]) => k === s.kind) ? s.kind : 'work',
  }));
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
    case 'custom':
      if (Array.isArray(e.custom) && e.custom.length) {
        return e.custom.map((c, i) => set(c.reps, W * (Number(c.ratio) || 1), c.kind || 'work', `Série ${i + 1}${KIND_LABEL[c.kind] ? ` (${KIND_LABEL[c.kind]})` : ''}`, Number.isFinite(Number(c.rest)) ? Number(c.rest) : rest, Math.max(0, A + (Number(c.assistDelta) || 0))));
      }
      return straight();
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
    case 'iso_pause': {
      // moins de répétitions (≈ 60 %), un peu moins lourd ou un peu plus d'aide : chaque rep dure plus longtemps
      const reps = Math.max(2, Math.min(6, Math.round(R * 0.6)));
      const hold = R <= 6 ? 3 : 5;
      const where = holdPoint(e);
      return Array.from({ length: N }, (_, i) => ({ ...set(reps, W * 0.85, 'iso', `Série ${i + 1} : ${reps} reps, tiens ${hold} s ${where} à chaque rep`, rest, e.kind === 'assisted' ? A + 5 : A), hold, holdEach: true, where }));
    }
    case 'iso_hold': {
      const hold = e.kind === 'load' ? 20 : 30;
      const where = holdPoint(e);
      return Array.from({ length: Math.min(4, Math.max(3, N)) }, (_, i) => ({ ...set(1, W, 'hold', `Tenue ${i + 1} : ${hold} s ${where}`, Math.max(rest, 90)), hold, where }));
    }
    case 'eccentric': {
      if (e.kind !== 'load' && negativesFit(e)) {
        // négatives : on est plus fort en freinant, donc moins d'aide (Roig 2009 : excentrique à plus haute intensité)
        const reps = Math.max(3, Math.min(6, Math.round(R / 2)));
        return Array.from({ length: N }, (_, i) => ({ ...set(reps, 0, 'ecc', `Série ${i + 1} : ${reps} négatives, descente en 5 s (monte avec un appui ou un saut)`, rest, Math.max(0, A - 10)), ecc: 5 }));
      }
      const reps = Math.max(3, R - 2);
      return Array.from({ length: N }, (_, i) => ({ ...set(reps, W * 0.95, 'ecc', `Série ${i + 1} : ${reps} reps, descente en 4 s`), ecc: 4 }));
    }
    case 'explosive': {
      // loin de l'échec (Pareja-Blanco 2017 : s'arrêter tôt garde la vitesse) ; intention d'aller vite (Behm et Sale 1993)
      const reps = Math.max(2, R - 3);
      return Array.from({ length: N }, (_, i) => set(reps, W * 0.9, 'expl', `Série ${i + 1} : ${reps} reps, montée la plus rapide possible`, Math.max(rest, 120)));
    }
    case 'plyo':
      return (e.targetReps || Array(N).fill(R)).slice(0, N).map((r, i) => set(r, 0, 'plyo', `Série ${i + 1} : ${r} répétitions au maximum, réception propre`, Math.max(rest, 90)));
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
  const planned = e.method === 'reverse_pyramid' || e.method === 'top_backoff' || e.method === 'custom' || (Array.isArray(e.setKinds) && e.setKinds.some(k => k === 'top' || k === 'backoff'));
  if (!planned) return e;
  const best = Math.max(...e.setDetails.map((r, i) => loads[i] * (1 + (Number(r) || 0) / 30)));
  const equiv = Math.round((best / (1 + R / 30)) * 4) / 4;
  const { setLoads, ...rest } = e;
  return { ...rest, value: equiv, setDetails: Array(e.setDetails.length).fill(R), sets: e.setDetails.length, equivalentOf: { best: Math.round(best), heaviest } };
}

/** Résumé court d'une forme « façon de travailler » pour la ligne de l'exercice (« 4 × 5 · tiens 5 s »), sinon null. */
export function planShort(e) {
  const p = e && Array.isArray(e.plan) && e.plan[0];
  if (!p) return null;
  const n = e.plan.length;
  if (e.method === 'iso_pause') return `${n} × ${p.reps} · tiens ${p.hold} s`;
  if (e.method === 'iso_hold') return `${n} tenues de ${p.hold} s`;
  if (e.method === 'eccentric') return `${n} × ${p.reps} · descente ${p.ecc} s`;
  if (e.method === 'explosive') return `${n} × ${p.reps} explosives`;
  if (e.method === 'plyo') return `${n} × ${p.reps} · au max`;
  return null;
}

/** Formes « façon de travailler » : leurs séances ne servent pas à régler la charge habituelle de l'exercice. */
export const CONTRACTION_METHODS = ['iso_pause', 'iso_hold', 'eccentric', 'explosive'];

/** Durée estimée (minutes) d'un plan : environ 40 s par série + le repos qui suit. */
export const planMinutes = plan => plan.reduce((s, p) => s + 0.65 + (Number(p.hold) || 0) * (p.holdEach ? p.reps : 1) / 60 + (Number(p.rest) || 0) / 60, 0);

/** Applique une méthode à un objectif d'exercice : séries, répétitions et charges détaillées. */
export function withMethod(e, id, why = '') {
  const mid = methodFits(id, e) ? id : 'straight';
  if (mid === 'straight') return { ...e, method: 'straight', plan: null, methodWhy: why };
  const plan = buildPlan(mid, e);
  // isométrie : où tenir ; excentrique : durée de la descente (affichés dans « Pourquoi ? / Ajuster »)
  const p0 = plan[0] || {};
  const extra = p0.where ? ` Position à tenir : ${p0.where}${p0.hold ? `, ${p0.hold} s${p0.holdEach ? ' à chaque rep' : ''}` : ''}.` : p0.ecc ? ` Descente en ${p0.ecc} s à chaque rep.` : '';
  return { ...e, method: mid, methodWhy: `${why}${extra}`.trim(), plan, sets: plan.length, targetReps: plan.map(p => p.reps) };
}
