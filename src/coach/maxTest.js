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
import { arenaOf, isLegArena, pushPullSide } from '../data/muscles';
import { isTimedQuest } from '../lib/quests';

export const MAX_TEST_SESSIONS = 6;  // séances sur l'exercice avant un vrai 1RM (geste rodé)
export const MAX_TEST_WEEKS = 12;    // semaines de suivi avant un vrai 1RM
export const MAX_TEST_AGE = 65;      // à partir de cet âge : test de 5 reps (Pollock 1991)
export const MAX_TEST_LIFTS = 3;

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

/** Exercices testables : en kg, gros exercice, déjà fait, sans douleur signalée, ni sauts ni haltérophilie. */
function testable(state, q, legsOk) {
  if (!q || q.type !== 'strength' || q.paused || q.goalMode === 'free_mode') return false;
  if (coachKind(q) !== 'load' || isTimedQuest(q) || /^ply_/.test(String(q.catalogId || '')) || repSchemeOf(q)) return false;
  if (!coachIsCompound(q.name) || !coachRealEntries(q).length) return false;
  if (!legsOk && isLegArena(arenaOf(q))) return false;
  return !painFor({ catalogId: q.catalogId, name: q.name }, state.coach);
}

/**
 * Exercices du test (au plus 3) : l'exercice de l'objectif de force d'abord, puis un par région (jambes, poussée,
 * tirage), les plus pratiqués ; ordre de passage : jambes, poussée, puis tirage et soulevé de terre (comme en compétition).
 */
export function pickMaxLifts(state, { legsOk = true, allowedArenas = null, quests = null } = {}) {
  const goal = getCoachSettings(state).mainGoal;
  const pool = (quests || state.quests || []).filter(q => testable(state, q, legsOk) && (!allowedArenas || allowedArenas.includes(arenaOf(q))));
  const region = q => (isHinge(q) ? 'hinge' : isLegArena(arenaOf(q)) ? 'legs' : pushPullSide(arenaOf(q), q.name) || 'other');
  const sorted = pool.slice().sort((a, b) => coachRealEntries(b).length - coachRealEntries(a).length);
  const out = [];
  const goalQ = goal && goal.kind === 'strength' ? sorted.find(q => q.id === goal.questId) : null;
  if (goalQ) out.push(goalQ);
  for (const q of sorted) if (out.length < MAX_TEST_LIFTS && !out.includes(q) && !out.some(o => region(o) === region(q) || (region(o) === 'hinge' && region(q) === 'legs') || (region(o) === 'legs' && region(q) === 'hinge'))) out.push(q);
  for (const q of sorted) if (out.length < MAX_TEST_LIFTS && !out.includes(q)) out.push(q);
  const rank = { legs: 0, push: 1, other: 2, pull: 3, hinge: 4 };
  return out.sort((a, b) => rank[region(a)] - rank[region(b)]);
}

/** Max de départ : max estimé d'après les séances (séries comptées comme faites à l'échec : prudent). */
export function referenceMax(state, q, today) {
  const est = estimateQuestMax(q, state, { today });
  return est && !est.empty && est.estimate > 0 ? est.estimate : 0;
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
    return [
      { reps: 5, load: a, assist: 0, rest: 180, kind: 'max', label: 'Essai 1 : 5 reps propres' },
      { reps: 5, load: b, assist: 0, rest: 180, kind: 'max', label: 'Essai 2 : 5 reps, seulement si l’essai 1 était propre' },
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
  if (!plan || !plan[j] || plan[j].kind !== 'max' || !plan[j + 1]) return null;
  if (done >= plan[j].reps) return null;
  const loads = (d.loads || plan.map(p => p.load)).map(Number);
  const failed = (d.reps || []).slice(0, j).filter((r, k) => plan[k].kind === 'max' && Number(r) < plan[k].reps).length + 1;
  if (failed >= 2) return { stop: true, text: 'Deux essais manqués : ton max du jour est ton dernier essai réussi. Arrête là pour cet exercice.', button: 'Compris' };
  const step = coachStep({ catalogId: it.catalogId, name: it.name }, loads[j]);
  const legs = isLegArena(it.arena) || isHinge(it);
  let next = coachRound(loads[j] * (legs ? 0.95 : 0.975), step);
  if (next >= loads[j]) next = loads[j] - step;
  const base = Number(d.load) || 0;
  if (!(next > 0) || !(base > 0) || !(loads[j + 1] > 0)) return null;
  return { load: Math.round((base * next / loads[j + 1]) * 100) / 100, next, text: `Essai manqué : le suivant à ${fmt(next)} kg ?`, button: `Baisser à ${fmt(next)} kg` };
}

/**
 * Exercices de la séance de test (objectifs de computeExerciseTarget déjà calculés pour ces exercices) et notes.
 * @returns { exercises, notes, mode } mode : '1rm' si au moins un vrai 1RM, sinon '5rm'
 */
export function buildMaxTest(state, targets, today) {
  const who = maxTestReadiness(state, today);
  const notes = [];
  const byId = Object.fromEntries((state.quests || []).map(q => [q.id, q]));
  const exercises = [];
  const fives = [];
  for (const t of targets) {
    const q = byId[t.questId];
    const E = referenceMax(state, q, today);
    if (!(E > 0)) continue;
    const r = who.ok ? maxTestReadiness(state, today, q) : who;
    const mode = r.ok ? '1rm' : '5rm';
    if (!r.ok) fives.push([t.name, r.why]);
    const step = coachStep(q, E);
    const load = coachRound(mode === '5rm' ? E / (1 + 5 / 30) : E, step);
    const base = { ...t, load, restSec: 240, maxMode: mode, maxRef: Math.round(E * 2) / 2 };
    const plan = maxTestPlan(base, mode);
    exercises.push({
      ...base, method: 'max_test', plan, sets: plan.length, targetReps: plan.map(p => p.reps), manualSets: true,
      change: 'test', reason: mode === '1rm'
        ? `Test de 1RM : ton max estimé est ${fmt(base.maxRef)} kg. Échauffement en montée, puis jusqu’à 3 essais à 1 rep.`
        : `Test de 5 reps maximum : l’appli en tire ton max estimé (une série de 5 au maximum le prédit très bien, Reynolds 2006).`,
      methodWhy: mode === '1rm' ? 'Protocole NSCA : échauffement progressif, essais à 1 rep, 3 à 4 min de repos.' : `Pas de vrai 1RM pour l’instant : ${READINESS_TEXT[r.why]}.`,
    });
  }
  if (!exercises.length) {
    notes.push('Test de max prévu, mais aucun gros exercice en kg déjà pratiqué (squat, développé, soulevé de terre, rowing…) : fais d’abord quelques séances normales.');
    return { exercises, notes, mode: null };
  }
  const mode = exercises.some(e => e.maxMode === '1rm') ? '1rm' : '5rm';
  notes.push(`Test de max : ${exercises.length} exercice${exercises.length > 1 ? 's' : ''}, rien d’autre aujourd’hui. Échauffement général 5 à 10 min, puis l’échauffement en montée de chaque exercice.`);
  if (!who.ok) notes.push(`Pas de vrai test à 1 répétition pour l’instant : ${READINESS_TEXT[who.why]}. Le coach fait un test de 5 reps maximum, plus sûr, d’où il tire ton max. Tester tôt n’apporte rien : tu progresses déjà à chaque séance (Mattocks 2017).`);
  else if (fives.length) notes.push(`Test de 5 reps sur ${fives.map(f => f[0]).join(', ')} : le geste n’est pas encore assez rodé pour un 1RM.`);
  notes.push('Sécurité : barres de sécurité ou pareur au squat et au développé couché ; un essai s’arrête dès que la technique se dégrade ; pas de test si tu as mal, si tu es malade ou très fatigué. Repos complet entre les essais (3 à 4 min).');
  return { exercises, notes, mode };
}

/** Une ligne pour le coach IA : vrai 1RM possible ou test de 5 reps, et exercices qui seraient testés. */
export function maxTestLine(state, today) {
  const r = maxTestReadiness(state, today);
  const lifts = pickMaxLifts(state).map(q => {
    const e = referenceMax(state, q, today);
    const rq = r.ok ? maxTestReadiness(state, today, q) : r;
    return `${q.name} (${rq.ok ? '1RM' : '5 reps max'}${e ? `, max estimé ${fmt(Math.round(e * 2) / 2)} kg` : ''})`;
  });
  const who = r.ok ? 'vrai test à 1 répétition possible' : `PAS de vrai 1RM conseillé (${READINESS_TEXT[r.why]}) : l'appli fera un test de 5 reps maximum`;
  return `Test de max (day_style max) : ${who} ; ${Math.round(r.weeks || 0)} semaine(s) de suivi ; exercices qui seraient testés : ${lifts.length ? lifts.join(', ') : 'aucun (pas encore de gros exercice en kg pratiqué)'}.`;
}
