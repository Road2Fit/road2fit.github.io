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
//
// Depuis la 4.14 (inspiré de la « Méthode Forge » de Maxime Houel, plannpull.app, analysée avec Gabin le 09/11/2026) :
//  - répétitions EFFECTIVES = faites + en réserve (ressenti noté), plafonnées à 12 : au-delà de 10-12 répétitions les
//    formules perdent en précision (Reynolds 2006) ; une série à plus de 3 répétitions en réserve n'est pas utilisée
//    (le ressenti est moins fiable loin de l'échec, Zourdos 2021) ; sans ressenti, la série compte comme faite à l'échec ;
//  - coefficient k PROPRE À CHAQUE EXERCICE : 1RM = charge × (1 + Reff / k). Par défaut la moyenne des 7 équations ;
//    dès qu'un vrai record est noté (« Mon max réel »), k est recalculé d'après la meilleure série des 60 jours qui
//    précèdent : le nombre de répétitions possibles à un % du max change selon l'exercice (Shimano 2006, Nuzzo 2024) ;
//  - estimation = moyenne pondérée d'une valeur par séance (sa meilleure série), poids = exp(−Reff/8) × 0,5^(âge/21 j) :
//    les séries courtes et récentes comptent le plus (une seule meilleure série gonflait parfois le max) ;
//  - NON repris : le bonus de fatigue des séries multiples (heuristique non validée) et les k de Maxime (une seule personne).

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
export const MAX_EFFECTIVE_REPS = 12; // répétitions effectives (faites + en réserve) au-delà desquelles on n'estime pas de max
const MAX_RIR = 3; // série plus loin de l'échec : pas utilisée
const HALF_LIFE_DAYS = 21;
const RECENT_DAYS = 90;
const K_MIN = 12;
const K_MAX = 100;
const round05 = x => Math.round(x * 2) / 2;

/** Estimation du 1RM à partir d'une série (charge `w`, `reps` répétitions). null si la série est trop longue.
 *  `k` (facultatif) : coefficient personnel de l'exercice → 1RM = charge × (1 + reps / k). */
export function estimateOneRm(w, reps, k) {
  const r = Number(reps);
  const load = Number(w);
  if (!(load > 0) || !(r >= 1) || r > MAX_REPS_FOR_ESTIMATE) return null;
  if (r === 1) return { mean: load, min: load, max: load, confidence: 'bonne' };
  if (Number(k) > 0) {
    const mean = load * (1 + r / Number(k));
    // précision d'environ ±2,5 % sur un exercice calibré
    return { mean, min: mean * 0.975, max: mean * 1.025, confidence: r <= 5 ? 'bonne' : r <= 10 ? 'moyenne' : 'faible', k: Number(k) };
  }
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
/** Répétitions en réserve d'une séance (RIR = 10 − RPE, demi-valeurs gardées) ; null si le ressenti n'est pas noté. */
// Séance sans ressenti réellement donné (rpeSet === false : 7/10 mis par défaut) → null. Anciennes séances (rpeSet absent) :
// on garde leur ressenti s'il est noté (on ne peut plus savoir s'il était mis par défaut).
const rirOf = entry => (entry && entry.rpeSet !== false && Number(entry.rpe) > 0 ? Math.max(0, 10 - Number(entry.rpe)) : null);

/** Facteur 1RM / charge pour Reff répétitions effectives (k personnel, sinon la moyenne des équations). */
export function repsFactor(reff, k) {
  const r = Number(reff);
  if (!(r > 1)) return 1;
  if (Number(k) > 0) return 1 + r / Number(k);
  const e = estimateOneRm(1, r);
  return e ? e.mean : 1 + r / 30;
}

/** Charges à mettre pour X répétitions en gardant Y en réserve (consigne « X reps à RIR Y »). */
export const LOAD_TABLE = [[1, 1], [2, 1], [3, 2], [5, 2], [6, 2], [8, 2], [10, 2]];
/** Tableau classique % du 1RM ↔ répétitions possibles (NSCA, Baechle & Earle) — gardé pour référence. */
export const PERCENT_TABLE = [
  [100, 1], [95, 2], [93, 3], [90, 4], [87, 5], [85, 6], [83, 7], [80, 8], [77, 9], [75, 10], [67, 12],
];

/** Charges de travail à partir d'un max (arrondies au pas de la machine) : reps + répétitions en réserve, avec le k de l'exercice. */
export function workingLoads(oneRm, step = 2.5, k) {
  return LOAD_TABLE.map(([reps, rir]) => {
    const pct = 100 / repsFactor(reps + rir, k);
    return { reps, rir, pct: Math.round(pct), kg: Math.round((oneRm * pct) / 100 / step) * step };
  });
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
 * Coefficient k personnel d'un exercice, d'après un vrai record noté (« Mon max réel ») et la meilleure série des
 * 60 jours qui le précèdent : k = Reff / (record / charge − 1). null s'il n'y a pas de quoi le calculer.
 */
function personalK(q, state, kind, sets, effective) {
  const m = (state.maxRecords || {})[q.id];
  if (!m || !m.date) return null;
  const bw = kind === 'load' ? 0 : bodyweightAt(state, m.date) * bodyweightFactor(q.name);
  const total = kind === 'load' ? Number(m.kg) : bw - (Number(m.assistKg) || 0) + (Number(m.extraKg) || 0);
  if (!(total > 0)) return null;
  const from = addDaysISO(m.date, -60);
  let base = null;
  for (const s of sets) {
    if (s.entry.date < from || s.entry.date > m.date) continue;
    const e = effective(s);
    if (!e || e.reff < 2 || !(s.load < total)) continue;
    const est = estimateOneRm(s.load, e.reff);
    if (est && (!base || est.mean > base.est)) base = { load: s.load, reff: e.reff, est: est.mean, date: s.entry.date };
  }
  if (!base) return null;
  const k = base.reff / (total / base.load - 1);
  if (!Number.isFinite(k)) return null;
  return { k: Math.round(Math.min(K_MAX, Math.max(K_MIN, k)) * 10) / 10, from: { record: total, date: m.date, load: base.load, reff: base.reff } };
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
  // répétitions effectives de chaque série (faites + en réserve si le ressenti est noté et pris en compte)
  const effective = s => {
    const rir = useRpe ? rirOf(s.entry) : null;
    if (useRpe && rir === null) return null; // ressenti pas donné : la séance ne compte pas dans le max (règle de Gabin)
    if (rir !== null && rir > MAX_RIR) return null; // trop loin de l'échec : pas utilisée
    const reff = s.reps + (rir || 0);
    return reff <= MAX_EFFECTIVE_REPS ? { reff, rir: rir || 0 } : null;
  };
  const k = personalK(q, state, kind, sets, effective);
  // une valeur par séance : sa meilleure série (avec un k donné, ou les équations si k est vide)
  const sessionsWith = kv => {
    const bySession = new Map();
    for (const s of sets) {
      const e = effective(s);
      if (!e) continue;
      const est = estimateOneRm(s.load, e.reff, kv);
      if (!est) continue;
      const key = s.entry.id || s.entry.date;
      const cur = bySession.get(key);
      if (!cur || est.mean > cur.est.mean) bySession.set(key, { ...s, est, rir: e.rir, reff: e.reff });
    }
    return [...bySession.values()];
  };
  const cands = sessionsWith(k ? k.k : undefined);
  if (!cands.length) {
    // séries trop longues (> 12 répétitions effectives) : pas de max calculé, on montre la meilleure série
    const longest = sets.reduce((b, x) => (!b || x.reps > b.reps ? x : b), null);
    const noRpe = useRpe && sets.length > 0 && sets.every(s => rirOf(s.entry) === null);
    return { kind, empty: true, manual, noRpe, bestSet: !noRpe && longest ? { reps: longest.reps, load: longest.load, date: longest.entry.date } : null };
  }
  const lastDate = cands.reduce((m, c) => (c.entry.date > m ? c.entry.date : m), '');
  const ref = today || lastDate;
  const limit = addDaysISO(ref, -RECENT_DAYS);
  const recent = cands.filter(c => c.entry.date >= limit);
  const pool = recent.length ? recent : cands;
  // moyenne pondérée : séries courtes (plus fiables) et récentes (force du moment) d'abord
  const ageDays = d => Math.max(0, (new Date(`${ref}T00:00:00`) - new Date(`${d}T00:00:00`)) / 86400000);
  const weightOf = c => Math.exp(-c.reff / 8) * Math.pow(0.5, ageDays(c.entry.date) / HALF_LIFE_DAYS);
  const wavg = (list, key) => { const ws = list.map(c => [c, weightOf(c)]); const W = ws.reduce((t, x) => t + x[1], 0) || 1; return ws.reduce((t, x) => t + x[1] * x[0].est[key], 0) / W; };
  const weighted = pool.map(c => ({ c, w: weightOf(c) }));
  const avg = key => wavg(pool, key);
  const best = weighted.reduce((b, x) => (x.w > b.w ? x : b)).c; // séance qui pèse le plus : base affichée
  const allTime = cands.reduce((b, c) => (c.est.mean > b.est.mean ? c : b));
  const conf = best.reff <= 5 ? 'bonne' : best.reff <= 10 ? 'moyenne' : 'faible';
  const result = {
    kind,
    manual,
    estimate: avg('mean'),
    range: [avg('min'), avg('max')],
    confidence: conf,
    basis: { reps: best.reps, rir: best.rir, load: best.load, date: best.entry.date, rpe: best.entry.rpe, assistanceKg: best.entry.assistanceKg },
    sessions: pool.length,
    fromRecent: recent.length > 0,
    allTime: allTime.est.mean,
    bodyweight: best.bw || 0,
    k: k ? k.k : null,
    kFrom: k ? k.from : null,
  };
  // avec un k personnel : ce que donnaient les équations seules (pour comparer avec le record réel)
  if (k) {
    const gen = sessionsWith(undefined).filter(c => c.entry.date >= (recent.length ? limit : ''));
    if (gen.length) result.estimateGeneric = kind === 'load' ? round05(wavg(gen, 'mean')) : wavg(gen, 'mean');
  }
  if (kind !== 'load') {
    result.assistFor1 = Math.max(0, best.bw - result.estimate); // aide qu'il faudrait pour 1 répétition
    result.extraFor1 = Math.max(0, result.estimate - best.bw);  // lest supplémentaire possible pour 1 répétition
  }
  result.estimate = kind === 'load' ? round05(result.estimate) : result.estimate;
  return result;
}
