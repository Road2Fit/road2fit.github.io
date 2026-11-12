import { pick } from '../edition';
import { COACH_ARENAS, typeArenas } from '../data/muscles';
import { EXERCISE_CATALOG } from '../data/catalog';
import { isStartEntry } from '../lib/quests';
import { stripAccents } from '../lib/text';
import { DEFAULT_SPORT } from '../data/sports';

// ==========================================================================
// COACH : progression, planning de la semaine, équilibre, suivi du poids
// Repères scientifiques utilisés (voir la section « Sources » de l'onglet Coach) :
//  - ACSM 2009 (Ratamess et al.) : +2 à 10 % de charge quand les répétitions cibles sont dépassées,
//    repos 2-3 min sur les exercices principaux, 1-2 min sur les exercices d'appoint.
//  - Schoenfeld 2016/2017 : fréquence ≥ 2 séances/semaine par groupe, ≥ 10 séries/semaine pour la masse musculaire.
//  - Spiering 2021 : dose minimale pour conserver la force/le muscle (déficit calorique).
//  - Garthe 2011 : perte de poids ≈ 0,5-1 % du poids de corps par semaine pour préserver la masse maigre.
// ==========================================================================
const COACH_DEFAULTS = { sessionsPerWeek: 2, sessionMinutes: 60, volleyDays: pick([4, 5], []), sport: DEFAULT_SPORT, matchDates: [], deloadWeeks: [], volleySkips: [], volleyExtra: [], gymSlots: {}, gymSkips: [], gymExtra: [], splitMode: 'auto', cycleWeeks: 0, cycleStart: null, workProfile: 'auto', cycleProfiles: [], weeklyClaimed: [], profile: { heightCm: '', age: '', sex: 'm' }, readiness: null, plan: null, planBackup: null, cardioCustom: [], memory: [], place: 'gym', equipment: [], pains: [], homeDays: [], reminders: false, methodStyle: 'evidence', mainGoal: null, experience: null };

export const getCoachSettings = state => ({ ...COACH_DEFAULTS, ...((state && state.coach) || {}) });

// Groupes suivis par le coach : 5 grands groupes (mode simple) ou 14 muscles précis (mode optimisé) ; liste vivante (data/muscles.js).
export { COACH_ARENAS };

export const COACH_DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

// Types de séance du mode « 3 séances » : full body, jambes, haut du corps
// groups : familles de muscles travaillées (deux séances de suite ne doivent pas en partager une)
export const COACH_TYPES = {
  FB: { id: 'FB', label: 'Full body', legs: true, upper: true, groups: ['push', 'pull', 'legs'], get arenas() { return typeArenas('FB'); } },
  LEGS: { id: 'LEGS', label: 'Jambes', legs: true, upper: false, groups: ['legs'], get arenas() { return typeArenas('LEGS'); } },
  UPPER: { id: 'UPPER', label: 'Haut du corps', legs: false, upper: true, groups: ['push', 'pull'], get arenas() { return typeArenas('UPPER'); } },
  PUSH: { id: 'PUSH', label: 'Poussée', side: 'push', legs: false, upper: true, groups: ['push'], get arenas() { return typeArenas('PUSH'); } },
  PULL: { id: 'PULL', label: 'Tirage', side: 'pull', legs: false, upper: true, groups: ['pull'], get arenas() { return typeArenas('PULL'); } }
};
/** Rotation des séances quand on s'entraîne 4 fois ou plus par semaine (split) : haut / bas, puis poussée / tirage / jambes.
 *  Repères : Schoenfeld 2016 (chaque muscle 2 fois par semaine), répartition classique haut-bas et push-pull-legs. */
export function coachSplitRotation(n) {
  if (n >= 6) return ['PUSH', 'PULL', 'LEGS', 'PUSH', 'PULL', 'LEGS'];
  if (n === 5) return ['PUSH', 'PULL', 'LEGS', 'UPPER', 'LEGS'];
  return ['UPPER', 'LEGS', 'UPPER', 'LEGS'];
}

export const COACH_TYPE_ORDER = ['FB', 'LEGS', 'UPPER'];

/** Rythme choisi (4.37, cas réel d'un ami : « push pull legs, 3 séances par semaine ») : coach.splitMode
 *  'auto' (corps entier jusqu'à 3 séances, puis haut / bas ou push / pull / legs), 'trio' (corps entier + jambes + haut),
 *  'upperlower' (haut / bas en alternance), 'ppl' (push / pull / legs en alternance), quel que soit le nombre de séances. */
export const SPLIT_MODES = [
  { id: 'auto', label: 'Auto', why: 'Corps entier jusqu’à 3 séances par semaine, puis haut / bas ou push / pull / legs.' },
  { id: 'ppl', label: 'Push / Pull / Legs', why: 'Pousser (pectoraux, épaules, triceps), tirer (dos, biceps), jambes, en alternance.' },
  { id: 'upperlower', label: 'Haut / Bas', why: 'Haut du corps et bas du corps en alternance.' },
  { id: 'trio', label: 'Corps entier + Jambes + Haut', why: '3 séances différentes par semaine.' },
];
const CYCLES = { ppl: ['PUSH', 'PULL', 'LEGS'], upperlower: ['UPPER', 'LEGS'] };
const weekNo = ws => Math.round(Date.parse(`${ws}T00:00:00Z`) / (7 * 86400000));
/** Types de la semaine pour un rythme choisi : la suite continue d'une semaine à l'autre (2 séances en push / pull / legs :
 *  push + pull, puis legs + push…), pour que chaque type revienne. null si le rythme n'est pas choisi. */
export function chosenRotation(mode, n, weekStart) {
  const cyc = CYCLES[mode];
  if (!cyc) return null;
  const k = Math.max(1, Math.min(6, Number(n) || 3));
  const off = (((weekNo(weekStart || '2026-01-05') * k) % cyc.length) + cyc.length) % cyc.length;
  return Array.from({ length: k }, (_, i) => cyc[(off + i) % cyc.length]);
}

export const coachTimeToMin = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };

export const coachDow = iso => new Date(iso + 'T00:00:00').getDay();

export const coachDayLabel = iso => `${COACH_DAY_NAMES[coachDow(iso)]} ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export const coachDaysBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);

export const coachRound = (x, step) => Math.round(Math.round(x / step) * step * 100) / 100;

export const coachIsCompound = name =>
  /squat|presse|souleve|terre|developpe|rowing|tirage|traction|dips|fente|hip thrust|pompes|good morning|hack/i.test(stripAccents(name || ''));

export function coachRealEntries(q) {
  return (q.history || []).filter(h => !isStartEntry(h) && h.date).sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

export function coachKind(q) {
  if (q.unit === 'kg') return 'load';
  // aide (> 0) ou lest (< 0, voir lib/assist.js) : réglé en kg
  return (Number(q.startAssistanceKg) || 0) !== 0 || (Number(q.currentAssistanceKg) || 0) !== 0 || (Number(q.goalAssistanceKg) || 0) < 0 ? 'assisted' : 'reps';
}

export function coachEquip(q) {
  const c =
    EXERCISE_CATALOG.find(x => x.id === q.catalogId) ||
    EXERCISE_CATALOG.find(x => stripAccents(x.name) === stripAccents(q.name || ''));
  return (c && c.equip) || '';
}

export function coachStep(q, load) {
  const eq = coachEquip(q);
  if (eq === 'Haltères') return load < 10 ? 1 : 2;
  if (eq === 'Kettlebell') return 4;
  return load < 10 ? 1 : 2.5;
}

export function coachSetsOf(entry, fallbackSets, fallbackReps) {
  if (Array.isArray(entry.setDetails) && entry.setDetails.length) return entry.setDetails.map(Number);
  return Array(Math.max(1, Number(entry.sets) || fallbackSets)).fill(Number(entry.reps) || fallbackReps);
}
