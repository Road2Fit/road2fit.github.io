import { ARENA_GROUPS, ARENA_GROUPS_COARSE, normalizeArenaGroup } from './arenas';
import { fineFromText, plain } from './fineRules';
import { FINE_BY_CATALOG_ID, FINE_SECOND_BY_CATALOG_ID } from './fineGroups.generated';

export { fineFromText };

// ==========================================================================================================================
// DEUX MODES DE SUIVI DES MUSCLES (gameState.muscleMode)
//  - « simple »    : 5 grands groupes (Pectoraux, Dos, Jambes, Épaules & Bras, Abdominaux) + cardio / sport
//  - « optimisé »  : 14 muscles précis (biceps, triceps, avant-bras, quadriceps, ischio-jambiers, fessiers, mollets, …).
//    Toute l'appli s'y adapte : filtres, formulaires, bilans, et le coach (volume par muscle, séances plus complètes).
// Les exercices gardent leur catégorie d'origine (quest.category = grand groupe, stable) : le muscle précis se déduit de
// l'exercice (table générée depuis les fiches de mouvement : tools/make-fine-groups.mjs) ou de quest.muscle (exercices perso).
// Le mode est un état global du module, mis à jour pendant l'affichage par useGameState (voir setMuscleMode) : toutes les
// fonctions « arène » du coach et de l'interface y lisent le mode sans qu'on ait à le passer partout.
// ==========================================================================================================================

/** Muscles précis du mode optimisé. `coarse` = grand groupe d'origine ; `tier` : 1 = dans (presque) chaque séance, 2 = dans chaque séance si la durée le permet, 3 = en rotation. */
export const FINE_GROUPS = [
  { id: 'Pectoraux', label: 'Pectoraux', icon: '🛡️', coarse: 'Pectoraux', tier: 1, band: { min: 6, good: 10, max: 20 }, evidence: 'forte', color: 'from-pink-500 to-rose-600' },
  { id: 'Dos', label: 'Dos (grand dorsal, trapèzes)', icon: '🦅', coarse: 'Dos', tier: 1, band: { min: 8, good: 12, max: 22 }, evidence: 'forte', color: 'from-violet-500 to-indigo-600' },
  { id: 'Épaules', label: 'Épaules', icon: '🎯', coarse: 'Épaules & Bras', tier: 1, band: { min: 6, good: 10, max: 20 }, evidence: 'forte', color: 'from-cyan-500 to-blue-600' },
  { id: 'Quadriceps', label: 'Quadriceps', icon: '🦵', coarse: 'Jambes', tier: 1, band: { min: 6, good: 10, max: 20 }, evidence: 'forte', color: 'from-amber-500 to-orange-600' },
  { id: 'Ischio-jambiers', label: 'Ischio-jambiers', icon: '🦿', coarse: 'Jambes', tier: 1, band: { min: 5, good: 9, max: 16 }, evidence: 'moyenne', color: 'from-orange-500 to-red-600' },
  { id: 'Fessiers', label: 'Fessiers', icon: '🍑', coarse: 'Jambes', tier: 2, band: { min: 4, good: 8, max: 16 }, evidence: 'moyenne', color: 'from-rose-500 to-pink-600' },
  { id: 'Biceps', label: 'Biceps', icon: '💪', coarse: 'Épaules & Bras', tier: 2, band: { min: 4, good: 8, max: 18 }, evidence: 'forte', color: 'from-sky-500 to-cyan-600' },
  { id: 'Triceps', label: 'Triceps', icon: '🔱', coarse: 'Épaules & Bras', tier: 2, band: { min: 4, good: 9, max: 20 }, evidence: 'forte', color: 'from-teal-500 to-emerald-600' },
  { id: 'Abdominaux', label: 'Abdominaux', icon: '🍫', coarse: 'Abdominaux', tier: 2, band: { min: 4, good: 8, max: 16 }, evidence: 'estimation', color: 'from-fuchsia-500 to-purple-600' },
  { id: 'Lombaires', label: 'Lombaires', icon: '🧱', coarse: 'Dos', tier: 3, band: { min: 2, good: 4, max: 8 }, evidence: 'estimation', color: 'from-indigo-500 to-violet-600' },
  { id: 'Mollets', label: 'Mollets', icon: '🦶', coarse: 'Jambes', tier: 3, band: { min: 6, good: 10, max: 18 }, evidence: 'estimation', color: 'from-yellow-500 to-amber-600' },
  { id: 'Avant-bras', label: 'Avant-bras', icon: '✊', coarse: 'Épaules & Bras', tier: 3, band: { min: 2, good: 4, max: 10 }, evidence: 'estimation', color: 'from-blue-500 to-sky-600' },
  { id: 'Hanches', label: 'Adducteurs & abducteurs', icon: '🦋', coarse: 'Jambes', tier: 3, band: { min: 2, good: 4, max: 10 }, evidence: 'estimation', color: 'from-lime-500 to-green-600' },
  { id: 'Obliques', label: 'Obliques', icon: '🌀', coarse: 'Abdominaux', tier: 3, band: { min: 2, good: 4, max: 10 }, evidence: 'estimation', color: 'from-purple-500 to-fuchsia-600' },
];
const FINE_IDS = new Set(FINE_GROUPS.map(g => g.id));
const fineInfo = id => FINE_GROUPS.find(g => g.id === id);

// Cardio et sport restent tels quels dans les deux modes
const EXTRA_GROUPS = ARENA_GROUPS_COARSE.filter(g => g.id === 'Course & Cardio' || g.id === 'Volley-ball');

const COARSE_DEFAULT = { Jambes: 'Quadriceps', Dos: 'Dos', Pectoraux: 'Pectoraux', 'Épaules & Bras': 'Épaules', Abdominaux: 'Abdominaux' };

/** Muscle précis d'un exercice ou d'un objectif { catalogId, name, category, type, muscle }. Cardio et sport : leur groupe habituel. */
export function fineGroupOf(item) {
  const coarse = normalizeArenaGroup((item && item.category) || '', (item && item.type) || 'strength');
  if (coarse === 'Course & Cardio' || coarse === 'Volley-ball') return coarse;
  if (item && FINE_IDS.has(item.muscle)) return item.muscle;
  if (item && item.catalogId && FINE_BY_CATALOG_ID[item.catalogId]) return FINE_BY_CATALOG_ID[item.catalogId];
  return fineFromText(item && item.name) || COARSE_DEFAULT[coarse] || 'Pectoraux';
}

/** 2e muscle d'un exercice (mode optimisé) : choisi à la main (`muscle2`, exercices perso) ou donné par la table. '' si aucun. */
export function secondGroupOf(item) {
  if (!item) return '';
  if (item.muscle2 === 'none') return ''; // l'utilisateur a retiré le 2e muscle
  const first = fineGroupOf(item);
  const m2 = FINE_IDS.has(item.muscle2) ? item.muscle2 : (!item.muscle2 && item.catalogId && FINE_SECOND_BY_CATALOG_ID[item.catalogId]) || '';
  return m2 && m2 !== first && FINE_IDS.has(m2) ? m2 : '';
}

// ---- Mode courant (global) ----
let mode = 'simple';
/** Liste vivante (modifiée sur place) des groupes que le coach suit : c'est l'ancien COACH_ARENAS. */
export const COACH_ARENAS = [];
const COACH_SIMPLE = ['Jambes', 'Dos', 'Pectoraux', 'Épaules & Bras', 'Abdominaux'];
const COACH_FINE_ORDER = ['Quadriceps', 'Ischio-jambiers', 'Fessiers', 'Dos', 'Pectoraux', 'Épaules', 'Biceps', 'Triceps', 'Abdominaux', 'Lombaires', 'Mollets', 'Avant-bras', 'Hanches', 'Obliques'];

export const isOptimized = () => mode === 'optimized';
export const getMuscleMode = () => mode;

/** Change de mode (appelé par useGameState à chaque affichage) : met à jour les listes vivantes. Idempotent. */
export function setMuscleMode(next) {
  const m = next === 'optimized' ? 'optimized' : 'simple';
  if (m === mode && COACH_ARENAS.length) return;
  mode = m;
  COACH_ARENAS.splice(0, COACH_ARENAS.length, ...(m === 'optimized' ? COACH_FINE_ORDER : COACH_SIMPLE));
  ARENA_GROUPS.splice(0, ARENA_GROUPS.length, ...(m === 'optimized' ? [...FINE_GROUPS.map(g => ({ id: g.id, label: g.label, icon: g.icon, color: g.color })), ...EXTRA_GROUPS] : ARENA_GROUPS_COARSE));
}
setMuscleMode('simple');

/** Groupe d'un exercice selon le mode courant (c'est ce que l'interface et le coach utilisent partout). */
export const arenaOf = item => (mode === 'optimized' ? fineGroupOf(item) : normalizeArenaGroup((item && item.category) || '', (item && item.type) || 'strength'));

/** Tous les groupes qu'un exercice fait travailler (1 ou 2). Mode simple : toujours 1. Sert aux filtres, au bilan et à la couverture ; `arenaOf` reste le groupe principal. */
export const arenasOf = item => {
  const a = arenaOf(item);
  if (mode !== 'optimized') return [a];
  const b = secondGroupOf(item);
  return b ? [a, b] : [a];
};
export const hasArena = (item, a) => arenasOf(item).includes(a);
/** Libellé « Fessiers + Ischio-jambiers » */
export const arenaLabel = item => arenasOf(item).join(' + ');

/** Grand groupe d'un groupe (simple ou précis) : sert aux règles de récupération (jambes, haut du corps…). */
export function coarseOf(arena) {
  const f = fineInfo(arena);
  return f ? f.coarse : arena;
}
export const isLegArena = a => coarseOf(a) === 'Jambes';
export const isAbsArena = a => coarseOf(a) === 'Abdominaux';
export const isUpperArena = a => ['Dos', 'Pectoraux', 'Épaules & Bras'].includes(coarseOf(a));
/** 1 = grands muscles (dans chaque séance), 2 = dans chaque séance si la durée le permet, 3 = en rotation. En mode simple : 1 partout. */
export const arenaTier = a => (fineInfo(a) ? fineInfo(a).tier : 1);
/**
 * Repère de séries par semaine pour un groupe : { min, good, max, evidence }.
 *  - min : en dessous, le progrès est faible ; good : cible confortable ; max : au-delà, rendement décroissant (et fatigue) ;
 *  - mode simple : les valeurs d'avant (6-10, abdos 4-8) ; mode optimisé : repères par muscle (voir src/data/volumeSources.js) ;
 *  - opts.profile (puissance / hypertrophie / endurance) et opts.beginner ajustent les repères (la force sature plus vite avec le volume ; un débutant progresse avec moins).
 */
const PROFILE_FACTOR = { puissance: { min: 1, good: 0.9, max: 0.75 }, endurance: { min: 1, good: 0.9, max: 0.9 } };
const BEGINNER_FACTOR = { min: 0.7, good: 0.75, max: 0.7 };
export function arenaBand(a, opts = {}) {
  const f = fineInfo(a);
  if (!(f && mode === 'optimized')) return a === 'Abdominaux' ? { min: 4, good: 8, max: 16 } : { min: 6, good: 10, max: 20 };
  const p = PROFILE_FACTOR[opts.profile] || { min: 1, good: 1, max: 1 };
  const bg = opts.beginner ? BEGINNER_FACTOR : { min: 1, good: 1, max: 1 };
  const r = x => Math.max(1, Math.round(x));
  const min = r(f.band.min * p.min * bg.min);
  const good = Math.max(min + 1, r(f.band.good * p.good * bg.good));
  const max = Math.max(good + 2, r(f.band.max * p.max * bg.max));
  return { min, good, max, evidence: f.evidence };
}
/** Les groupes sont-ils « poussée » ou « tirage » ? (équilibre du haut du corps) */
export function pushPullSide(arena, name) {
  if (arena === 'Pectoraux' || arena === 'Triceps') return 'push';
  if (arena === 'Dos' || arena === 'Biceps') return 'pull';
  if (arena === 'Épaules' || arena === 'Épaules & Bras') {
    const n = plain(name);
    if (/traction|tirage|rowing|row|pull|oiseau|curl|shrug|face|rotation externe|arriere/.test(n) && !/developpe|pompes|dips|pec|ecarte|chest|push|militaire|elevation/.test(n)) return 'pull';
    return 'push';
  }
  return null;
}
/** Groupes de base à couvrir dans une semaine (utilisé par la note des séances). */
export const coreArenas = () => (mode === 'optimized' ? ['Quadriceps', 'Ischio-jambiers', 'Dos', 'Pectoraux', 'Épaules'] : ['Jambes', 'Dos', 'Pectoraux', 'Épaules & Bras']);
/** Groupes de chaque type de séance (full body / jambes / haut du corps) selon le mode. */
export function typeArenas(type) {
  const fine = mode === 'optimized';
  if (type === 'PUSH') return fine ? ['Pectoraux', 'Épaules', 'Triceps', 'Abdominaux'] : ['Pectoraux', 'Épaules & Bras', 'Abdominaux'];
  if (type === 'PULL') return fine ? ['Dos', 'Biceps', 'Avant-bras', 'Lombaires', 'Obliques'] : ['Dos', 'Épaules & Bras', 'Abdominaux'];
  if (type === 'LEGS') return fine ? ['Quadriceps', 'Ischio-jambiers', 'Fessiers', 'Mollets', 'Hanches', 'Abdominaux', 'Obliques'] : ['Jambes', 'Abdominaux'];
  if (type === 'UPPER') return fine ? ['Dos', 'Pectoraux', 'Épaules', 'Biceps', 'Triceps', 'Avant-bras', 'Lombaires', 'Abdominaux', 'Obliques'] : ['Dos', 'Pectoraux', 'Épaules & Bras', 'Abdominaux'];
  return fine ? COACH_FINE_ORDER.filter(a => arenaTier(a) < 3) : [...COACH_SIMPLE]; // full body : grands muscles ; les petits (mollets, avant-bras, obliques…) tournent entre les séances
}
