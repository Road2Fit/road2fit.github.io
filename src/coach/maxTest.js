// Séance « Test de max » (4.50, demande de Gabin) : tester sa force maximale sur 1 à 3 gros exercices, en sécurité.
// Fonctions pures, testées dans maxTest.test.js. Études retrouvées en ligne le 22/11/2026 :
//  - Protocole (NSCA, repris par le HPRC du ministère américain de la Défense) : échauffement léger 5-10 reps, 1 min ;
//    3-5 reps, 2 min ; 2-3 reps proches du max, 2-4 min ; puis des essais à 1 rep avec 2-4 min de repos, le max trouvé
//    en 3 à 5 essais. Paliers : 5-10 % (haut du corps), 10-20 % (jambes) ; après un essai manqué, −2,5 à −5 % / −5 à −10 %.
//  - Sécurité : aucun blessé chez des enfants testés sous supervision (Faigenbaum 2003) ; MAIS chez des 70-79 ans, 11 sur 57
//    (19 %) se sont blessés pendant les tests de 1RM, plus que pendant l'entraînement (Pollock 1991).
//  - Fiabilité : le 1RM est très reproductible (médiane ICC 0,97, 32 études), y compris chez les non-entraînés
//    (Grgic 2020) ; une séance de familiarisation suffit chez des adultes non entraînés (Levinger 2009).
//    → ces études ne montrent PAS que tester son max est dangereux pour un débutant encadré.
//  - Mais un débutant progresse à chaque séance : s'entraîner en testant sans cesse donne la même force que
//    s'entraîner normalement (Mattocks 2017), donc tester tôt n'apporte rien de plus ; et une série de 5 reps
//    maximum prédit très bien le 1RM (R² 0,97 à 0,99, Reynolds 2006).
// Règle de l'appli (repère, pas une étude) : vrai 1RM seulement quand le geste est rodé (6 séances ou plus sur
// l'exercice, comme pour les formes de séries) et après 12 semaines de suivi ; sinon, et à partir de 65 ans,
// test de 5 reps maximum, d'où l'appli tire le max estimé.
import { getCoachSettings, coachDaysBetween, coachIsCompound, coachKind, coachRealEntries, coachRound, coachStep } from './settings';
import { getExperience } from './experience';
import { repSchemeOf } from './repScheme';
import { painFor } from './pains';
import { estimateQuestMax } from '../lib/maxima';
import { entryAssists, entryLoads } from '../lib/setLoads';
import { fmtCm, perfBest, perfOf, perfTarget } from '../data/perfMeasure';
import { arenaOf, isLegArena, pushPullSide } from '../data/muscles';
import { isTimedQuest } from '../lib/quests';

export const MAX_TEST_SESSIONS = 6;  // séances sur l'exercice avant un vrai 1RM (geste rodé)
export const MAX_TEST_WEEKS = 12;    // semaines de suivi avant un vrai 1RM
export const MAX_TEST_AGE = 65;      // à partir de cet âge : test de 5 reps (Pollock 1991)
export const MAX_TEST_LIFTS = 6;

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const isHinge = q => /souleve|deadlift|terre/.test(norm(q.name));

/** Semaines depuis la première séance notée (toutes séances de musculation). */
export function weeksTracked(state, today) {
  const first = ((state && state.quests) || []).flatMap(q => (q.type === 'strength' ? coachRealEntries(q) : [])).map(e => e.date).sort()[0];
  return first ? coachDaysBetween(first, today) / 7 : 0;
}

/**
 * Prêt pour un vrai 1RM ? { ok, why } pour la personne (q absent) ou pour un exercice.
 * why : 'weeks' (trop tôt dans la pratique), 'beginner', 'age', 'sessions' (geste pas encore rodé).
 */
export function maxTestReadiness(state, today, q = null) {
  // 4.54 (Gabin : « c'est l'utilisateur qui choisit ») : vrai 1RM demandé quand même → accepté, avec un avertissement
  if (getCoachSettings(state).maxTest1rm) return { ok: true, forced: true, weeks: weeksTracked(state, today) };
  const exp = getExperience(state);
  const trained = !!exp && exp.level !== 'beginner';
  const age = Number((getCoachSettings(state).profile || {}).age) || 0;
  const weeks = weeksTracked(state, today);
  if (age >= MAX_TEST_AGE) return { ok: false, why: 'age', weeks };
  if (!trained && weeks < MAX_TEST_WEEKS) return { ok: false, why: exp && exp.level === 'beginner' ? 'beginner' : 'weeks', weeks };
  if (q) {
    const n = coachRealEntries(q).length;
    if (n < MAX_TEST_SESSIONS && !(trained && q.known)) return { ok: false, why: 'sessions', sessions: n, weeks };
  }
  return { ok: true, weeks };
}

export const READINESS_TEXT = {
  weeks: 'tu t’entraînes depuis moins de 12 semaines',
  beginner: 'tu débutes',
  age: 'à partir de 65 ans, les tests à 1 répétition ont blessé plus que l’entraînement (Pollock 1991)',
  sessions: `le geste n’est pas encore rodé (moins de ${MAX_TEST_SESSIONS} séances sur cet exercice)`,
};

/**
 * Exercices testables (4.50.1, retour de Gabin : « tout doit être possible ») : tout exercice de musculation déjà fait
 * (en kg, au poids du corps, lesté, avec élastique, tenu en secondes), sans douleur signalée, ni sauts ni haltérophilie.
 */
function testable(state, q, legsOk) {
  if (!q || q.type !== 'strength' || q.paused || q.goalMode === 'free_mode') return false;
  // sauts : seulement ceux qui se mesurent (box jump en hauteur, saut en longueur, saut vertical : 4.52)
  if (/^ply_/.test(String(q.catalogId || ''))) { const pf = perfOf(q); if (!pf || !pf.test) return false; } else if (repSchemeOf(q)) return false;
  if (!coachRealEntries(q).length) return false;
  if (!legsOk && isLegArena(arenaOf(q))) return false;
  return !painFor({ catalogId: q.catalogId, name: q.name }, state.coach);
}

/** Type de test d'un exercice : charge (1 rep), lest (1 rep lestée), répétitions au maximum, ou temps au maximum. */
export function testKindOf(q) {
  if (perfOf(q)) return 'perf';
  if (isTimedQuest(q)) return 'time';
  const k = coachKind(q);
  if (k === 'load') return 'load';
  if (k === 'assisted' && (Number(q.currentAssistanceKg) || 0) < 0) return 'lest';
  return 'reps';
}

/**
 * Exercices du test (au plus 6, retour de Gabin : « faire rapidement plein d'exercices différents ») : l'exercice de
 * l'objectif de force d'abord, puis un par groupe musculaire (gros exercices et les plus pratiqués d'abord), puis un
 * deuxième dans les groupes déjà pris. Ordre : tests lourds (jambes, poussée, tirage, soulevé de terre), puis tests de
 * répétitions, puis gainage. La personne peut ensuite en retirer ou en ajouter.
 */
export function pickMaxLifts(state, { legsOk = true, allowedArenas = null, quests = null } = {}) {
  const goal = getCoachSettings(state).mainGoal;
  const pool = (quests || state.quests || []).filter(q => testable(state, q, legsOk) && (!allowedArenas || allowedArenas.includes(arenaOf(q))));
  const region = q => (isHinge(q) ? 'hinge' : isLegArena(arenaOf(q)) ? 'legs' : pushPullSide(arenaOf(q), q.name) || 'other');
  const sorted = pool.slice().sort((a, b) => (coachIsCompound(b.name) ? 1 : 0) - (coachIsCompound(a.name) ? 1 : 0) || coachRealEntries(b).length - coachRealEntries(a).length);
  const out = [];
  const goalQ = goal && (goal.kind === 'strength' || goal.kind === 'reps') ? sorted.find(q => q.id === goal.questId) : null;
  if (goalQ) out.push(goalQ);
  for (const q of sorted) if (out.length < MAX_TEST_LIFTS && !out.includes(q) && !out.some(o => arenaOf(o) === arenaOf(q))) out.push(q);
  for (const q of sorted) if (out.length < MAX_TEST_LIFTS && !out.includes(q)) out.push(q);
  // les sauts d'abord (frais, explosifs), puis les tests lourds, les répétitions, le gainage
  const heavy = q => ({ perf: -10, load: 0, lest: 0, reps: 10, time: 20 }[testKindOf(q)] || 0);
  const rank = { legs: 0, push: 1, other: 2, pull: 3, hinge: 4 };
  return out.sort((a, b) => heavy(a) + rank[region(a)] - (heavy(b) + rank[region(b)]));
}

/** Meilleure série des 90 derniers jours (répétitions, ou secondes pour un exercice tenu). */
export function bestRecent(q, today) {
  let best = 0;
  for (const e of coachRealEntries(q)) {
    if (today && coachDaysBetween(e.date, today) > 90) continue;
    for (const r of Array.isArray(e.setDetails) && e.setDetails.length ? e.setDetails : [e.reps || 0]) best = Math.max(best, Number(r) || 0);
  }
  return best;
}

export const RECENT_DAYS = 42;
/**
 * Meilleure série des 6 dernières semaines ramenée à 1 rep (Epley : charge × (1 + reps / 30), séries de 1 à 12 reps).
 * 4.51.3 (retour de Gabin : « 5 reps à 32,5 kg au développé couché alors que je viens d'en faire 3 × 8 à 40 ») : la
 * moyenne pondérée des maxima estimés (90 jours) gardait le poids des vieilles séances plus légères ; le test part
 * maintenant de ce que tu as RÉELLEMENT fait récemment. `total` : lest compris (poids du corps `bw` + lest).
 */
export function recentBest1rm(q, today, bw = 0) {
  let best = 0;
  for (const e of coachRealEntries(q)) {
    if (today && (e.date > today || coachDaysBetween(e.date, today) > RECENT_DAYS)) continue;
    const reps = Array.isArray(e.setDetails) && e.setDetails.length ? e.setDetails : [e.reps || 0];
    const loads = bw ? entryAssists(e).map(a => bw - (Number(a) || 0)) : entryLoads(e);
    reps.forEach((r, i) => {
      const n = Number(r) || 0;
      const w = Number(loads[i]) || 0;
      if (n >= 1 && n <= 12 && w > 0) best = Math.max(best, w * (1 + n / 30));
    });
  }
  return best;
}

/** Max de départ (1 rep) : le plus haut entre le max estimé de l'appli et la meilleure série récente. */
export function referenceMax(state, q, today) {
  const est = estimateQuestMax(q, state, { today });
  const e = est && !est.empty && est.estimate > 0 ? est.estimate : 0;
  return Math.max(e, recentBest1rm(q, today));
}
/** Lest possible pour 1 rep (kg ajoutés au poids du corps) : max estimé ou meilleure série lestée récente ; 0 si inconnu. */
export function referenceExtra(state, q, today) {
  const est = estimateQuestMax(q, state, { today });
  const e = est && !est.empty && est.extraFor1 > 0 ? est.extraFor1 : 0;
  const bw = est && est.bodyweight > 0 ? est.bodyweight : Number(state.userWeightKg) || 0;
  return Math.max(e, bw ? recentBest1rm(q, today, bw) - bw : 0);
}

/**
 * Séries du test (plan de la séance guidée). L'échauffement est donné par warmupSets (warmup.js).
 *  - '1rm' : base = max estimé ; essais à 95 %, 100 % puis 102,5 % (record), 3 à 4 min de repos.
 *  - '5rm' : base = charge de 5 reps (max / 1,167, Epley) ; deux essais de 5 reps à 95 % puis 100 %, 3 min de repos.
 */
export function maxTestPlan(e, mode) {
  const W = Number(e.load) || 0;
  const q = { catalogId: e.catalogId, name: e.name };
  const step = coachStep(q, W);
  const rnd = x => Math.max(step, coachRound(x, step));
  const legs = isLegArena(e.arena) || isHinge(e);
  if (mode === '5rm') {
    const a = rnd(W * 0.95);
    const b = Math.max(a + step, rnd(W));
    const c = Math.max(b + step, rnd(W * (legs ? 1.04 : 1.025)));
    return [
      { reps: 5, load: a, assist: 0, rest: 180, kind: 'max', label: 'Essai 1 : 5 reps propres' },
      { reps: 5, load: b, assist: 0, rest: 180, kind: 'max', label: 'Essai 2 : 5 reps (ton max de 5 estimé)' },
      { reps: 5, load: c, assist: 0, rest: 180, kind: 'max', label: 'Essai 3 : 5 reps (record), seulement si l’essai 2 est passé avec de la marge' },
    ];
  }
  const a = rnd(W * 0.95);
  const b = Math.max(a + step, rnd(W));
  const c = Math.max(b + step, rnd(W * (legs ? 1.04 : 1.025)));
  return [
    { reps: 1, load: a, assist: 0, rest: 240, kind: 'max', label: 'Essai 1 (doit passer)' },
    { reps: 1, load: b, assist: 0, rest: 240, kind: 'max', label: 'Essai 2 (ton max estimé)' },
    { reps: 1, load: c, assist: 0, rest: 240, kind: 'max', label: 'Essai 3 (record) : seulement si l’essai 2 est passé avec de la marge' },
  ];
}
const fmt = x => String(Math.round(x * 100) / 100).replace('.', ',');

/** Échauffement propre au test (NSCA) : 5-10 reps légères, 3-5 reps, 2-3 reps, puis 1 rep vers 90 %. Base = item.load. */
export function maxTestWarmup(item) {
  if (item.maxMode === 'lest' || item.maxMode === 'lest5') {
    // lesté : quelques reps au poids du corps, puis le lest monte vers le 1er essai
    const first = item.plan && item.plan[0] ? -Number(item.plan[0].assist) || 0 : 0;
    const five = item.maxMode === 'lest5';
    const out = [{ assist: 0, reps: 5, restSec: 90, label: '5 reps au poids du corps' }];
    const half = Math.round((first * 0.5) / 1.25) * 1.25;
    if (half >= 2.5) out.push({ assist: -half, reps: five ? 4 : 3, restSec: 120, label: `${five ? 4 : 3} reps lesté de ${fmt(half)} kg` });
    const near = Math.round((first * 0.8) / 1.25) * 1.25;
    if (!five && near > half && near >= 5) out.push({ assist: -near, reps: 1, restSec: 180, label: `1 rep lesté de ${fmt(near)} kg` });
    return out;
  }
  if (item.maxMode !== '1rm' && item.maxMode !== '5rm') return null; // répétitions ou temps : échauffement habituel
  const W = Number(item.load) || 0;
  if (!(W > 0)) return [];
  const step = coachStep({ catalogId: '', name: item.name }, W);
  const bar = /barre|squat|souleve|developpe couche|bench|deadlift/.test(norm(item.name)) ? 20 : step;
  const five = item.maxMode === '5rm';
  const plan = five
    ? [{ pct: 0.5, reps: 8, restSec: 60 }, { pct: 0.7, reps: 5, restSec: 120 }, { pct: 0.85, reps: 3, restSec: 180 }]
    : [{ pct: 0.5, reps: 8, restSec: 60 }, { pct: 0.7, reps: 4, restSec: 120 }, { pct: 0.8, reps: 2, restSec: 180 }, { pct: 0.9, reps: 1, restSec: 180 }];
  const out = [];
  for (const p of plan) {
    const load = Math.max(bar, coachRound(W * p.pct, step));
    if (load >= W * 0.95 || (out.length && out[out.length - 1].load >= load)) continue;
    out.push({ load, reps: p.reps, restSec: p.restSec, label: `${p.reps} rep${p.reps > 1 ? 's' : ''} à ${fmt(load)} kg` });
  }
  return out;
}

/**
 * Après un essai : manqué (moins de reps que prévu) → l'essai suivant 2,5 % (haut du corps) ou 5 % (jambes) sous
 * l'essai manqué (NSCA) ; deux essais manqués → on arrête. Renvoie { load (nouvelle base), next, text, button, stop }.
 */
export function adaptAfterAttempt(it, d, j, done) {
  const plan = it && it.plan;
  if (!plan || !plan[j] || plan[j].kind !== 'max' || !plan[j + 1] || plan[j + 1].kind !== 'max') return null;
  if (done >= plan[j].reps) return null;
  const loads = (d.loads || plan.map(p => p.load)).map(Number);
  const failed = (d.reps || []).slice(0, j).filter((r, k) => plan[k].kind === 'max' && Number(r) < plan[k].reps).length + 1;
  if (failed >= 2) return { stop: true, text: 'Deux essais manqués : ton max du jour est ton dernier essai réussi. Arrête là pour cet exercice.', button: 'Compris' };
  if (perfOf(it)) return { stop: true, text: 'Essai manqué : refais un essai à la hauteur d’avant, ou arrête là.', button: 'Compris' };
  if (it.kind !== 'load') {
    const extra = -Number((d.assists || plan.map(p => p.assist))[j]) || 0;
    const next = Math.max(0, Math.round((extra * 0.9) / 1.25) * 1.25);
    return { stop: true, text: `Essai manqué : refais un essai lesté d’environ ${fmt(next)} kg (règle le lest avec − / +), ou arrête là.`, button: 'Compris' };
  }
  const step = coachStep({ catalogId: it.catalogId, name: it.name }, loads[j]);
  const legs = isLegArena(it.arena) || isHinge(it);
  let next = coachRound(loads[j] * (legs ? 0.95 : 0.975), step);
  if (next >= loads[j]) next = loads[j] - step;
  const base = Number(d.load) || 0;
  if (!(next > 0) || !(base > 0) || !(loads[j + 1] > 0)) return null;
  return { load: Math.round((base * next / loads[j + 1]) * 100) / 100, next, text: `Essai manqué : le suivant à ${fmt(next)} kg ?`, button: `Baisser à ${fmt(next)} kg` };
}

const lestPlan = (extra, five, bestBw) => {
  const r = x => Math.max(1.25, Math.round(x / 1.25) * 1.25);
  const at = (x, n, label) => ({ reps: n, load: 0, assist: -r(x), rest: 240, kind: 'max', label });
  const tail = { reps: Math.max(1, bestBw), load: 0, assist: 0, rest: 180, kind: 'amrap', label: 'Pour finir : le plus de répétitions possible au poids du corps' };
  if (five) return [at(extra * 0.95, 5, 'Essai 1 : 5 reps lestées propres'), at(extra, 5, 'Essai 2 : 5 reps lestées, seulement si l’essai 1 était propre'), tail];
  return [at(extra * 0.95, 1, 'Essai 1 lesté (doit passer)'), at(extra, 1, 'Essai 2 lesté (ton max estimé)'), at(Math.max(extra * 1.05, extra + 2.5), 1, 'Essai 3 lesté (record) : seulement si l’essai 2 est passé avec de la marge'), tail];
};

/**
 * Exercices de la séance de test (objectifs de computeExerciseTarget déjà calculés pour ces exercices) et notes.
 * Par type d'exercice (4.51, retour de Gabin) : en kg → 1RM (ou 5 reps max) ; lesté → essais lestés puis max de reps au
 * poids du corps ; poids du corps ou élastique → le plus de répétitions possible ; tenu (gainage…) → le plus longtemps possible.
 * @returns { exercises, notes, mode } mode : '1rm' si au moins un vrai test à 1 rep, sinon '5rm' (ou 'reps')
 */
export function buildMaxTest(state, targets, today) {
  const who = maxTestReadiness(state, today);
  const notes = [];
  const byId = Object.fromEntries((state.quests || []).map(q => [q.id, q]));
  const exercises = [];
  const fives = [];
  for (const t of targets) {
    const q = byId[t.questId];
    if (!q) continue;
    const tk = testKindOf(q);
    const r = who.ok ? maxTestReadiness(state, today, q) : who;
    // 4.56.1 : tenue (gainage) : le record réel noté compte comme une performance (110 s noté, séances à 90 s)
    const recSec = tk === 'time' ? Number(((state.maxRecords || {})[q.id] || {}).seconds) || 0 : 0;
    const best = Math.max(bestRecent(q, today), recSec);
    const common = { method: 'max_test', manualSets: true, change: 'test' };
    if (tk === 'perf') {
      // sauts mesurés : 3 essais à 1 saut, repos complet ; caisse qui monte, ou meilleur saut mesuré
      const pf = perfOf(q);
      const pt = perfTarget(q);
      const best = perfBest(q);
      const base = pf.kind === 'setting' ? Math.max(pf.min, (best && best.cm) || (pt && pt.cm) || pf.start) : null;
      const plan = pf.kind === 'setting'
        ? [0, 1, 2].map(k => ({ reps: 1, load: 0, assist: 0, perf: base + k * pf.step, rest: 120, kind: 'max', label: `Essai ${k + 1} : caisse à ${fmtCm(base + k * pf.step)}${k === 2 ? ' (record), seulement si l’essai 2 était facile' : k === 0 ? ' (doit passer)' : ''}` }))
        : [1, 2, 3].map(k => ({ reps: 1, load: 0, assist: 0, rest: 120, kind: 'max', label: `Essai ${k} : ${pf.short === 'longueur' ? 'le plus loin' : 'le plus haut'} possible, note la mesure` }));
      exercises.push({
        ...t, ...common, assist: 0, maxMode: 'perf', maxRef: best ? best.cm : 0, plan, sets: plan.length, targetReps: plan.map(p => p.reps), restSec: 120,
        reason: `${pf.test} : 3 essais, 2 min de repos entre chaque.${best ? ` Record : ${fmtCm(best.cm)}.` : ''}${pf.how ? ` ${pf.how}` : ''}`,
        methodWhy: 'Un saut par essai, au maximum, réception propre ; arrête si la réception devient lourde.',
      });
      continue;
    }
    // 4.53.2 (Gabin : « je veux pouvoir changer le poids proposé ») : aide ou lest choisis à la main pour un exercice au
    // poids du corps (q.maxTestAssist : aide > 0, sans aide = 0, lest < 0)
    const userAssist = Number.isFinite(Number(q.maxTestAssist)) && q.maxTestAssist !== null && q.maxTestAssist !== undefined && tk !== 'load' && tk !== 'perf' && tk !== 'time' ? Number(q.maxTestAssist) : null;
    if (tk === 'load') {
      const E = Number(q.maxTestLoad) > 0 ? Number(q.maxTestLoad) * (r.ok ? 1 : 1 + 5 / 30) : referenceMax(state, q, today);
      if (!(E > 0)) continue;
      const mode = r.ok ? '1rm' : '5rm';
      if (!r.ok) fives.push(t.name);
      const load = coachRound(mode === '5rm' ? E / (1 + 5 / 30) : E, coachStep(q, E));
      const base = { ...t, load: Number(q.maxTestLoad) > 0 ? Number(q.maxTestLoad) : load, restSec: 240, maxMode: mode, maxRef: Math.round(E * 2) / 2, userSet: Number(q.maxTestLoad) > 0 };
      const plan = maxTestPlan(base, mode);
      exercises.push({
        ...base, ...common, plan, sets: plan.length, targetReps: plan.map(p => p.reps),
        reason: mode === '1rm' ? `Test de 1RM : ton max estimé est ${fmt(base.maxRef)} kg. Échauffement en montée, puis jusqu’à 3 essais à 1 rep.` : 'Test de 5 reps maximum : l’appli en tire ton max estimé (une série de 5 au maximum le prédit très bien, Reynolds 2006).',
        methodWhy: mode === '1rm' ? 'Protocole NSCA : échauffement progressif, essais à 1 rep, 3 à 4 min de repos.' : `Pas de vrai 1RM pour l’instant : ${READINESS_TEXT[r.why]}.`,
      });
      continue;
    }
    if (tk === 'lest' || (userAssist !== null && userAssist < 0)) {
      const X = userAssist !== null && userAssist < 0 ? -userAssist : referenceExtra(state, q, today);
      const five = !r.ok;
      const extra = userAssist !== null && userAssist < 0 ? X : five ? X * 0.85 : X;
      if (extra >= 2.5) {
        if (five) fives.push(t.name);
        const plan = lestPlan(extra, five, best);
        exercises.push({
          ...t, ...common, assist: plan[0].assist, restSec: 240, maxMode: five ? 'lest5' : 'lest', maxRef: Math.round(X * 4) / 4, plan, sets: plan.length, targetReps: plan.map(p => p.reps),
          reason: `Test lesté : lest estimé pour 1 rep ${fmt(Math.round(X * 4) / 4)} kg. Essais lestés, puis une série au maximum au poids du corps. Change le lest avec − / + si besoin.`,
          methodWhy: five ? `Essais de 5 reps lestées : ${READINESS_TEXT[r.why]}.` : 'Échauffement au poids du corps puis lest qui monte, essais à 1 rep, 4 min de repos.',
        });
        continue;
      }
    }
    // répétitions (poids du corps, élastique, ou lest trop faible pour un test lesté) ou temps
    const timed = tk === 'time';
    const assist = userAssist !== null ? Math.max(0, userAssist) : tk === 'reps' ? Math.max(0, Number(t.assist) || 0) : 0;
    const plan = [{ reps: Math.max(1, best + (timed ? 5 : 1)), load: 0, assist, rest: 180, kind: 'amrap', label: timed ? `Tiens le plus longtemps possible (record récent : ${best} s)` : `Le plus de répétitions propres possible${assist ? ` avec ${fmt(assist)} kg d’aide` : ''} (record récent : ${best})` }];
    exercises.push({
      ...t, ...common, assist, maxMode: timed ? 'time' : 'reps', maxRef: best, plan, sets: 1, targetReps: [plan[0].reps], restSec: 180,
      reason: timed ? 'Test de temps : une seule tenue, le plus longtemps possible en gardant la bonne position.' : 'Test de répétitions : une seule série, le plus de répétitions propres possible. Arrête-toi quand une rep n’est plus complète.',
      methodWhy: 'Une série au maximum après l’échauffement.',
    });
  }
  if (!exercises.length) {
    notes.push('Test de max prévu, mais aucun exercice déjà pratiqué ne s’y prête : fais d’abord quelques séances normales.');
    return { exercises, notes, mode: null };
  }
  const mode = exercises.some(e => e.maxMode === '1rm' || e.maxMode === 'lest') ? '1rm' : exercises.some(e => e.maxMode === '5rm' || e.maxMode === 'lest5') ? '5rm' : 'reps';
  notes.push(`Test de max : ${exercises.length} exercice${exercises.length > 1 ? 's' : ''} sur des muscles différents, rien d’autre aujourd’hui. Échauffement général 5 à 10 min, puis l’échauffement de chaque exercice. Retire ou ajoute des exercices si tu veux : c’est toi qui règles.`);
  if (who.forced) notes.push('Vrai test à 1 répétition : c’est ton choix. Au début, le geste est encore fragile et un 1RM n’apporte rien de plus qu’un test de 5 reps : échauffe-toi bien, un pareur ou des barres de sécurité, et arrête un essai dès que la technique se dégrade.');
  if (!who.ok && exercises.some(e => ['5rm', 'lest5'].includes(e.maxMode))) notes.push(`Pas de vrai test à 1 répétition pour l’instant : ${READINESS_TEXT[who.why]}. Le coach fait des tests de 5 reps maximum, plus sûrs, d’où il tire ton max. Tester tôt n’apporte rien : tu progresses déjà à chaque séance (Mattocks 2017).`);
  else if (fives.length) notes.push(`Test de 5 reps sur ${fives.join(', ')} : le geste n’est pas encore assez rodé pour un 1RM.`);
  notes.push('Sécurité : barres de sécurité ou pareur au squat et au développé couché ; un essai s’arrête dès que la technique se dégrade ; pas de test si tu as mal, si tu es malade ou très fatigué. Repos complet entre les essais (3 à 4 min).');
  return { exercises, notes, mode };
}

/** Une ligne pour le coach IA : vrai 1RM possible ou test de 5 reps, et exercices qui seraient testés. */
export function maxTestLine(state, today) {
  const r = maxTestReadiness(state, today);
  const lifts = pickMaxLifts(state).map(q => {
    const tk = testKindOf(q);
    const rq = r.ok ? maxTestReadiness(state, today, q) : r;
    if (tk === 'time') return `${q.name} (temps au maximum)`;
    if (tk === 'reps') return `${q.name} (répétitions au maximum)`;
    if (tk === 'lest') return `${q.name} (${rq.ok ? '1 rep lestée' : '5 reps lestées'} puis reps au poids du corps)`;
    const e = referenceMax(state, q, today);
    return `${q.name} (${rq.ok ? '1RM' : '5 reps max'}${e ? `, max estimé ${fmt(Math.round(e * 2) / 2)} kg` : ''})`;
  });
  const who = r.ok ? 'vrai test à 1 répétition possible' : `PAS de vrai 1RM conseillé (${READINESS_TEXT[r.why]}) : l'appli fera un test de 5 reps maximum`;
  return `Test de max (day_style max) : ${who} ; ${Math.round(r.weeks || 0)} semaine(s) de suivi ; exercices qui seraient testés : ${lifts.length ? lifts.join(', ') : 'aucun (pas encore d’exercice pratiqué)'}.`;
}
