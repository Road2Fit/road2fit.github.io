import { addDaysISO } from './dates';
import { isTimedQuest, isStartEntry } from './quests';
import { entryAssists, entryLoads } from './setLoads';

// Maxima estimés : pour chaque exercice, ce que tu pourrais faire en UNE répétition (charge), ou ta meilleure
// performance (temps, distance), calculés à partir de ce que tu as déjà réussi.
//
// Méthodes (voir aussi la section « Comment c'est calculé » de l'onglet) :
//  - charge : moyenne de 7 équations de prédiction du 1RM à partir de séries de 2 à 15 répétitions
//    (Epley 1985, Brzycki 1993, Lander 1985, Lombardi 1989, Mayhew 1992, O'Conner 1989, Wathen 1994).
//    Aucune équation n'est la meilleure partout (étude de 2024, Int. J. Strength Cond.) : on en prend la moyenne
//    et on affiche la fourchette. Plus la série est courte (≤ 5 reps), plus l'estimation est fiable.
//  - effort ressenti (option) : une série qui n'allait pas à l'échec compte comme si on avait fait les répétitions
//    « en réserve » en plus (échelle RPE/RIR de Zourdos et al. 2016, limitée à 3 pour rester prudent).
//  - exercices avec aide ou au poids du corps : charge réellement soulevée = poids du corps × coefficient − aide
//    (pompes : 64 % du poids du corps, Ebben et al. 2011 ; pompes sur les genoux 49 % ; tractions, dips… : 100 %, approximation).
//  - cardio : formule de Riegel (1977/1981), T2 = T1 × (D2 / D1)^1,06, valable pour des efforts de 3,5 à 230 minutes.

const FORMULAS = {
  Epley: (w, r) => w * (1 + r / 30),
  Brzycki: (w, r) => (r < 37 ? (w * 36) / (37 - r) : NaN),
  Lander: (w, r) => (100 * w) / (101.3 - 2.67123 * r),
  Lombardi: (w, r) => w * Math.pow(r, 0.1),
  Mayhew: (w, r) => (100 * w) / (52.2 + 41.9 * Math.exp(-0.055 * r)),
  "O'Conner": (w, r) => w * (1 + 0.025 * r),
  Wathen: (w, r) => (100 * w) / (48.8 + 53.8 * Math.exp(-0.075 * r)),
};

const MAX_REPS_FOR_ESTIMATE = 15;
const RECENT_DAYS = 90;
const round05 = x => Math.round(x * 2) / 2;

/** Estimation du 1RM à partir d'une série (charge `w`, `reps` répétitions). null si la série est trop longue. */
export function estimateOneRm(w, reps) {
  const r = Number(reps);
  const load = Number(w);
  if (!(load > 0) || !(r >= 1) || r > MAX_REPS_FOR_ESTIMATE) return null;
  if (r === 1) return { mean: load, min: load, max: load, confidence: 'bonne' };
  const values = Object.values(FORMULAS).map(f => f(load, r)).filter(Number.isFinite);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return {
    mean,
    min: Math.min(...values),
    max: Math.max(...values),
    confidence: r <= 5 ? 'bonne' : r <= 10 ? 'moyenne' : 'faible',
  };
}

/** Répétitions « en réserve » déduites de l'effort ressenti (RPE 10 = 0, RPE 9 = 1…), limitées à 3. */
export const repsInReserve = rpe => Math.min(3, Math.max(0, 10 - (Number(rpe) || 10)));

/** Tableau classique % du 1RM ↔ répétitions possibles (NSCA, Baechle & Earle). */
export const PERCENT_TABLE = [
  [100, 1], [95, 2], [93, 3], [90, 4], [87, 5], [85, 6], [83, 7], [80, 8], [77, 9], [75, 10], [67, 12],
];

/** Charges de travail à partir d'un max (arrondies au pas de la machine). */
export function workingLoads(oneRm, step = 2.5) {
  return PERCENT_TABLE.map(([pct, reps]) => ({ pct, reps, kg: Math.round((oneRm * pct) / 100 / step) * step }));
}

/** Part du poids du corps réellement soulevée (approximation par nom d'exercice). */
export function bodyweightFactor(name) {
  const n = String(name || '').toLowerCase();
  if (/pompe|push.?up/.test(n)) return /genou|knee/.test(n) ? 0.49 : 0.64;
  return 1;
}

/** Poids du corps connu à une date (dernière pesée avant cette date, sinon la plus proche). */
function bodyweightAt(state, date) {
  const list = (state.weightHistory || []).filter(w => w.date && Number(w.weightKg) > 0).sort((a, b) => (a.date < b.date ? -1 : 1));
  if (!list.length) return Number(state.userWeightKg) || 80;
  const before = list.filter(w => w.date <= date);
  return Number((before.length ? before[before.length - 1] : list[0]).weightKg);
}

function maxKind(q) {
  if (q.type === 'cardio') return 'cardio';
  if (isTimedQuest(q)) return 'timed';
  if (q.unit === 'kg') return 'load';
  // aide > 0 ou lest < 0 : charge soulevée = poids du corps − aide (donc + lest)
  return (Number(q.startAssistanceKg) || 0) !== 0 || (Number(q.currentAssistanceKg) || 0) !== 0 ? 'assisted' : 'bodyweight';
}

const realEntries = q => (q.history || []).filter(h => !isStartEntry(h) && h.date).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

/** Toutes les séries exploitables d'un exercice de force, avec la charge réellement soulevée. */
function liftedSets(q, state, kind) {
  const factor = bodyweightFactor(q.name);
  const out = [];
  for (const e of realEntries(q)) {
    const sets = Array.isArray(e.setDetails) && e.setDetails.length ? e.setDetails : [e.reps || 0];
    const loads = entryLoads({ ...e, setDetails: sets });
    const assists = entryAssists({ ...e, setDetails: sets });
    const bw = kind === 'load' ? 0 : bodyweightAt(state, e.date) * factor;
    sets.forEach((reps, i) => {
      // charge réellement soulevée à cette série (elle peut changer d'une série à l'autre)
      const load = kind === 'load' ? loads[i] : kind === 'assisted' ? bw - assists[i] : bw;
      if (load > 0 && Number(reps) >= 1) out.push({ entry: e, reps: Number(reps), load, bw });
    });
  }
  return out;
}

const mmss = min => {
  const total = Math.round(min * 60);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h ? `${h} h ${String(m).padStart(2, '0')} min ${String(s).padStart(2, '0')} s` : `${m} min ${String(s).padStart(2, '0')} s`;
};
export const formatDuration = mmss;

/** Prédiction de Riegel : temps (min) pour la distance d2 d'après t1 (min) sur d1 (km). */
export const riegel = (t1, d1, d2) => t1 * Math.pow(d2 / d1, 1.06);
export const PREDICTED_DISTANCES = [5, 10, 21.1, 42.2];

function cardioResult(q, manual) {
  const efforts = [];
  for (const e of realEntries(q)) {
    const km = q.unit === 'km' ? Number(e.value) : null;
    const min = Number(e.durationMin) || (q.unit === 'min' ? Number(e.value) : 0);
    if (km > 0 && min >= 3.5 && min <= 230) efforts.push({ km, min, date: e.date, source: 'séance' });
  }
  if (manual && Number(manual.distanceKm) > 0 && Number(manual.minutes) > 0) {
    efforts.push({ km: Number(manual.distanceKm), min: Number(manual.minutes), date: manual.date, source: 'record' });
  }
  const bestDistance = Math.max(0, ...realEntries(q).map(e => (q.unit === 'km' ? Number(e.value) || 0 : 0)));
  if (!efforts.length) return { kind: 'cardio', empty: true, bestDistance };
  // l'effort qui donne la meilleure prédiction sur 5 km sert de base
  const base = efforts.reduce((best, x) => (riegel(x.min, x.km, 5) < riegel(best.min, best.km, 5) ? x : best));
  const distances = PREDICTED_DISTANCES.filter(d => d !== 42.2 || base.km >= 10);
  return {
    kind: 'cardio',
    base,
    bestDistance,
    predictions: distances.map(d => ({ km: d, min: riegel(base.min, base.km, d) })),
  };
}

/**
 * Maximum estimé d'un exercice.
 * @param opts { useRpe: tenir compte de l'effort ressenti, today: 'AAAA-MM-JJ' }
 */
export function estimateQuestMax(q, state, { useRpe = false, today } = {}) {
  const kind = maxKind(q);
  const manual = (state.maxRecords || {})[q.id] || null;
  if (kind === 'cardio') return { ...cardioResult(q, manual), manual };

  if (kind === 'timed') {
    let best = null;
    for (const e of realEntries(q)) for (const s of Array.isArray(e.setDetails) && e.setDetails.length ? e.setDetails : [e.reps || 0]) {
      if (Number(s) > (best ? best.seconds : 0)) best = { seconds: Number(s), date: e.date };
    }
    return { kind, best, manual };
  }

  const sets = liftedSets(q, state, kind);
  const cands = [];
  for (const s of sets) {
    const rir = useRpe ? repsInReserve(s.entry.rpe) : 0;
    const est = estimateOneRm(s.load, s.reps + rir);
    if (est) cands.push({ ...s, est, rir });
  }
  if (!cands.length) return { kind, empty: true, manual };
  const limit = today ? addDaysISO(today, -RECENT_DAYS) : '';
  const recent = cands.filter(c => c.entry.date >= limit);
  const pool = recent.length ? recent : cands;
  const top = list => list.reduce((b, c) => (c.est.mean > b.est.mean ? c : b));
  const best = top(pool);
  const allTime = top(cands);
  const result = {
    kind,
    manual,
    estimate: best.est.mean,
    range: [best.est.min, best.est.max],
    confidence: best.est.confidence,
    basis: { reps: best.reps, rir: best.rir, load: best.load, date: best.entry.date, rpe: best.entry.rpe, assistanceKg: best.entry.assistanceKg },
    fromRecent: recent.length > 0,
    allTime: allTime.est.mean,
    bodyweight: best.bw || 0,
  };
  if (kind !== 'load') {
    result.assistFor1 = Math.max(0, best.bw - best.est.mean); // aide qu'il faudrait pour 1 répétition
    result.extraFor1 = Math.max(0, best.est.mean - best.bw);  // lest supplémentaire possible pour 1 répétition
  }
  result.estimate = kind === 'load' ? round05(result.estimate) : result.estimate;
  return result;
}
