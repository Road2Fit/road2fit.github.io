// Séance à deux (4.51, demande de Gabin) : deux amis partagent le même plan de séance (mêmes exercices, dans le même
// ordre, mêmes séries et répétitions), chacun avec SES charges. Fonctions pures, testées dans duo.test.js.
//  1. L'invitant envoie sa « part » (buildDuoPart) : exercices qu'il peut faire (identifiants du catalogue), exercices à
//     éviter (douleurs signalées : seulement la liste, pas la zone), type d'objectif, salle ou maison, matériel.
//  2. L'invité, s'il accepte, calcule le plan commun (mergeDuoPlan) avec SES données, qui ne quittent pas son téléphone.
//  3. Chaque appli construit la séance de ce jour (duoSession) : charges tirées de son propre historique.
// SQL : docs/supabase-seance-a-deux.sql.
import { EXERCISE_CATALOG } from '../data/catalog';
import { arenaOf, arenaTier, pushPullSide } from '../data/muscles';
import { COACH_ARENAS, COACH_TYPES, coachIsCompound, coachKind, coachRound, coachStep, getCoachSettings } from './settings';
import { coachableQuests, doable, doableAtHome, equipmentOf, placeOf } from './equipment';
import { painFor } from './pains';
import { repSchemeOf } from './repScheme';
import { PROFILES, activeProfile, pctForReps, profileFor, profileOpts } from './profiles';
import { getExperience } from './experience';
import { computeExerciseTarget } from './targets';
import { restFor } from './rest';
import { sessionMinutes } from './methods';
import { isTimedQuest } from '../lib/quests';

export const DUO_THEMES = [
  { id: 'auto', label: 'Au choix du coach' },
  { id: 'full', label: 'Corps entier' },
  { id: 'upper', label: 'Haut du corps' },
  { id: 'lower', label: 'Bas du corps' },
  { id: 'push', label: 'Pousser' },
  { id: 'pull', label: 'Tirer' },
];
const TYPE_OF = { auto: 'FB', full: 'FB', upper: 'UPPER', lower: 'LEGS', push: 'PUSH', pull: 'PULL' };
export const duoThemeLabel = id => (DUO_THEMES.find(t => t.id === id) || DUO_THEMES[0]).label;
const MAX_EX = 6;
const byCat = Object.fromEntries(EXERCISE_CATALOG.map(c => [c.id, c]));
const catOf = id => (typeof id === 'string' && Object.prototype.hasOwnProperty.call(byCat, id) ? byCat[id] : null);
const isProfile = id => typeof id === 'string' && Object.prototype.hasOwnProperty.call(PROFILES, id);
const clamp = (v, a, b, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(a, Math.min(b, n)) : d; };

/**
 * Plan reçu du serveur (écrit par l'autre compte : on ne lui fait pas confiance) : seulement des exercices connus du
 * catalogue qui conviennent, sans doublon, 6 au plus ; séries 1-6, reps 1-30, repos 30-600 s. null si rien ne reste.
 */
export function cleanDuoPlan(plan) {
  if (!plan || typeof plan !== 'object' || !Array.isArray(plan.ex)) return null;
  const seen = new Set();
  const ex = [];
  for (const x of plan.ex) {
    if (!x || typeof x !== 'object' || ex.length >= MAX_EX) continue;
    const c = catOf(x.c);
    if (!c || !fits(c) || seen.has(c.id)) continue;
    seen.add(c.id);
    ex.push({ c: c.id, sets: clamp(x.sets, 1, 6, 3), reps: clamp(x.reps, 1, 30, 8), rest: clamp(x.rest, 30, 600, 120) });
  }
  if (!ex.length) return null;
  return { v: 1, theme: DUO_THEMES.some(t => t.id === plan.theme) ? plan.theme : 'auto', ex };
}

// Exercice qui convient à une séance à deux : musculation classique (ni sauts, ni haltérophilie, ni tenue en secondes)
const fits = c => !!c && c.type === 'strength' && !/^ply_/.test(c.id) && !repSchemeOf({ catalogId: c.id, name: c.name }) && !isTimedQuest({ ...c, catalogId: c.id });

/** Mes exercices possibles pour une séance à deux (identifiants du catalogue), sans les exercices douloureux. */
export function duoPool(state) {
  const coach = getCoachSettings(state);
  const ids = coachableQuests(state)
    .filter(q => q.type === 'strength' && !q.paused && q.goalMode !== 'free_mode' && q.catalogId && fits(catOf(q.catalogId)))
    .filter(q => !painFor({ catalogId: q.catalogId, name: q.name }, coach))
    .map(q => q.catalogId);
  return [...new Set(ids)];
}

/** Part envoyée par l'invitant : rien d'autre que ce qui sert à choisir les exercices et les répétitions. */
export function buildDuoPart(state, today) {
  const coach = getCoachSettings(state);
  const exp = getExperience(state);
  const prof = activeProfile(state, today).id;
  return {
    v: 1,
    ex: duoPool(state).slice(0, 80),
    no: EXERCISE_CATALOG.filter(c => fits(c) && painFor({ catalogId: c.id, name: c.name }, coach)).map(c => c.id).slice(0, 400),
    profile: isProfile(prof) ? prof : 'auto',
    level: exp ? exp.level : '',
    place: placeOf(coach),
    eq: equipmentOf(coach),
  };
}

/** Moyenne des deux objectifs pour un exercice : répétitions, séries, repos (« un entre-deux »). */
export function duoScheme(p1, p2, compound) {
  const P = id => profileFor(isProfile(id) ? id : 'hypertrophie', compound);
  const a = P(p1);
  const b = P(p2);
  const mid = x => (x.lo + x.hi) / 2;
  const reps = Math.round((mid(a) + mid(b)) / 2);
  const sets = Math.round(((compound ? a.sets : a.setsAccessory) + (compound ? b.sets : b.setsAccessory)) / 2);
  const rest = Math.round(((compound ? a.restCompound : a.restAccessory) + (compound ? b.restCompound : b.restAccessory)) / 2 / 15) * 15;
  return { reps, sets, rest };
}

/**
 * Plan commun, calculé chez l'invité à partir de ses données et de la part de l'invitant.
 * Exercices : par groupe du thème, d'abord ceux que les deux font déjà, puis à tour de rôle un exercice de l'un que
 * l'autre peut faire (matériel, douleurs) ; gros exercices d'abord ; 6 au plus.
 * @returns {{ v, theme, ex: [{ c, sets, reps, rest }] }} ou null si rien de commun n'est possible
 */
export function mergeDuoPlan(state, part, theme, today) {
  if (!part || !Array.isArray(part.ex)) return null;
  const coach = getCoachSettings(state);
  const type = TYPE_OF[theme] || 'FB';
  const side = COACH_TYPES[type].side;
  const arenas = COACH_TYPES[type].arenas;
  const mineIds = duoPool(state);
  const mine = new Set(mineIds);
  const theirs = new Set(part.ex.filter(id => fits(catOf(id))));
  const no = new Set(Array.isArray(part.no) ? part.no : []);
  const friendCoach = { place: part.place === 'home' ? 'home' : 'gym', equipment: Array.isArray(part.eq) ? part.eq : [] };
  const iCan = c => doable(c, coach) && !painFor({ catalogId: c.id, name: c.name }, coach);
  const theyCan = c => !no.has(c.id) && (friendCoach.place !== 'home' || doableAtHome(c, friendCoach));
  const arenaOfId = id => arenaOf({ catalogId: id, name: catOf(id).name, category: catOf(id).category });
  const okSide = id => !side || !pushPullSide(arenaOfId(id), catOf(id).name) || pushPullSide(arenaOfId(id), catOf(id).name) === side;
  const big = id => (coachIsCompound(catOf(id).name) ? 1 : 0);
  const both = [...mine].filter(id => theirs.has(id) && theyCan(catOf(id)));
  const onlyMine = mineIds.filter(id => !theirs.has(id) && theyCan(catOf(id)));
  const onlyTheirs = [...theirs].filter(id => !mine.has(id) && iCan(catOf(id)));
  const picked = [];
  let turn = 0;
  const pickIn = arena => {
    const inA = list => list.filter(id => !picked.includes(id) && arenaOfId(id) === arena && okSide(id)).sort((x, y) => big(y) - big(x));
    const common = inA(both);
    if (common.length) return common[0];
    const order = turn % 2 ? [inA(onlyMine), inA(onlyTheirs)] : [inA(onlyTheirs), inA(onlyMine)];
    const hit = order[0][0] || order[1][0];
    if (hit) turn += 1;
    return hit || null;
  };
  const list = COACH_ARENAS.filter(a => arenas.includes(a));
  for (const a of list) { if (picked.length >= MAX_EX) break; const id = pickIn(a); if (id) picked.push(id); }
  // deuxième exercice pour les gros groupes s'il reste de la place
  for (const a of list.filter(x => arenaTier(x) === 1)) { if (picked.length >= MAX_EX) break; const id = pickIn(a); if (id) picked.push(id); }
  if (!picked.length) return null;
  const p1 = part.profile;
  const p2 = activeProfile(state, today).id;
  const ex = picked
    .map(id => ({ id, a: list.indexOf(arenaOfId(id)) }))
    .sort((x, y) => x.a - y.a || big(y.id) - big(x.id))
    .map(({ id }) => ({ c: id, ...duoScheme(p1, p2, !!big(id)) }));
  return { v: 1, theme: theme || 'auto', ex };
}

/** Exercices du plan qui me manquent (à ajouter à mes exercices quand la séance à deux est acceptée). */
export const duoMissing = (state, plan) => [...new Set(((plan && Array.isArray(plan.ex) && plan.ex) || []).filter(x => x && typeof x === 'object').map(x => x.c))].filter(id => fits(catOf(id)) && !(state.quests || []).some(q => q.catalogId === id && q.type === 'strength')).slice(0, MAX_EX);

/**
 * Ma séance du jour à partir du plan commun : mêmes exercices, séries, répétitions et repos ; MES charges (charge de
 * l'objectif habituel ramenée au nombre de répétitions commun, tableau % du max ↔ répétitions).
 */
export function duoSession(state, duo, iso) {
  const quests = state.quests || [];
  const exercises = [];
  for (const it of (cleanDuoPlan(duo.plan) || { ex: [] }).ex) {
    const q = quests.find(x => x.catalogId === it.c && x.type === 'strength');
    if (!q) continue;
    const t = computeExerciseTarget(q, { ...profileOpts(state, iso), today: iso });
    const R = Math.max(1, Math.min(30, Number(it.reps) || 8));
    const N = Math.max(1, Math.min(6, Number(it.sets) || 3));
    const R0 = Number((t.targetReps || [])[0]) || R;
    let load = t.load;
    if (coachKind(q) === 'load' && t.load > 0 && R0 !== R) {
      load = Math.max(0, coachRound(t.load * (pctForReps(R) / pctForReps(R0)), coachStep(q, t.load)));
    }
    exercises.push({
      ...t, load, sets: N, targetReps: Array(N).fill(R), restSec: Number(it.rest) || restFor({ id: q.catalogId, name: q.name, reps: R, compound: t.compound, arena: t.arena }).sec,
      method: 'straight', plan: null, manualSets: true, duo: true, change: 'duo',
      reason: `Séance à deux${duo.with ? ` avec ${duo.with}` : ''} : mêmes séries et répétitions pour vous deux (${N} × ${R}), ta charge vient de tes propres séances.`,
    });
  }
  return { exercises, estMin: sessionMinutes(exercises) };
}

/**
 * Met mes réglages à jour d'après la liste du serveur : séance à deux acceptée → coach.duos[date] (+ ce jour ajouté
 * comme séance en plus s'il n'était pas prévu, + exercices du plan qui me manquent) ; annulée ou refusée → retirée.
 * @param makeQuest (catalogItem) => nouvel exercice (makeQuestFromCatalog), passé par l'appelant
 * @returns le nouvel état, ou `state` tel quel si rien ne change
 */
export function syncDuos(state, rows, today, makeQuest) {
  const coach = state.coach || {};
  const duos = { ...(coach.duos || {}) };
  let extra = [...(coach.gymExtra || [])];
  let quests = state.quests || [];
  let changed = false;
  const live = new Map();
  for (const r of rows || []) {
    const plan = r && r.status === 'accepted' && typeof r.date === 'string' && r.date >= today ? cleanDuoPlan(r.plan) : null;
    if (plan && !live.has(r.date)) live.set(r.date, { ...r, plan });
  }
  // retirées : annulées, refusées, ou passées
  for (const [date, d] of Object.entries(duos)) {
    const r = live.get(date);
    if (r && r.id === d.id) continue;
    if (date < today) continue; // séance passée : gardée telle quelle // séance passée : gardée telle quelle (historique)
    delete duos[date];
    if (d.extra) extra = extra.filter(x => x !== date);
    changed = true;
  }
  for (const [date, r] of live) {
    const cur = duos[date];
    const want = { id: r.id, with: String(r.other_name || '').slice(0, 40), plan: r.plan };
    if (cur && cur.id === r.id && JSON.stringify(cur.plan) === JSON.stringify(r.plan) && cur.with === want.with) continue;
    const added = !extra.includes(date);
    if (added) extra = [...extra, date].sort();
    duos[date] = { ...want, extra: cur && cur.id === r.id ? !!cur.extra : added };
    const miss = duoMissing({ ...state, quests }, r.plan);
    if (miss.length && makeQuest) quests = [...quests, ...miss.map(id => makeQuest(catOf(id))).filter(Boolean)];
    changed = true;
  }
  if (!changed) return state;
  return { ...state, quests, coach: { ...coach, duos, gymExtra: extra } };
}
