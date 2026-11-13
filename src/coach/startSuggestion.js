
import { estimateOneRm, estimateQuestMax } from '../lib/maxima';
import { isTimedCatalog, isTimedQuest } from '../lib/quests';
import { activeProfile, profileFor } from './profiles';
import { repSchemeOf } from './repScheme';
import { coachIsCompound, coachRound, coachStep, getCoachSettings } from './settings';
import { arenaOf } from '../data/muscles';

// Départ d'un NOUVEL exercice : charge, séries et répétitions proposées d'après ce que tu sais déjà soulever
// (maxima estimés ou records réels de tes autres exercices) et d'après ton profil de travail du moment.
//
//  - niveau relatif = moyenne géométrique (exercices de la même arène comptés triple) de « ton max estimé / le max d'un
//    débutant sur cet exercice », le max d'un débutant étant déduit de la charge de départ du catalogue ;
//  - sans profil (automatique) : charge de départ du catalogue × ton niveau relatif ;
//  - avec un profil : max estimé du nouvel exercice × % de départ du profil (voir profiles.js) ;
//  - séries et répétitions visées : celles du profil (le haut de la fourchette est l'objectif à valider).
// C'est une proposition à ajuster : dès la première séance, le coach repart de ce que tu as réellement fait.

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const EXTRA_REPS = 3; // la charge de départ du catalogue = charge qu'on peut répéter l'objectif de reps + 3 fois (≈ 3 reps en réserve)

/** Niveau de force de l'utilisateur par rapport aux valeurs de départ du catalogue (1 = comme un débutant). */
export function relativeStrength(state, arena, today, catalog) {
  let sum = 0;
  let weight = 0;
  const used = [];
  for (const q of state.quests || []) {
    if (q.type !== 'strength' || q.unit !== 'kg' || isTimedQuest(q)) continue;
    const cat = catalog.find(c => c.id === q.catalogId);
    if (!cat || !(Number(cat.defaultStart) > 0)) continue;
    const rec = (state.maxRecords || {})[q.id];
    const est = estimateQuestMax(q, state, { today });
    const e1 = rec && Number(rec.kg) > 0 ? Number(rec.kg) : est.estimate;
    if (!(e1 > 0)) continue;
    const ref = estimateOneRm(cat.defaultStart, (cat.defaultGoalReps || 6) + EXTRA_REPS);
    if (!ref) continue;
    const w = arenaOf(q) === arena ? 3 : 1;
    sum += Math.log(e1 / ref.mean) * w;
    weight += w;
    used.push(q.name);
  }
  return weight ? { level: clamp(Math.exp(sum / weight), 0.5, 2.5), used } : { level: 1, used: [] };
}

/**
 * Valeurs de départ proposées pour un exercice du catalogue.
 * @returns {{ startValue, goalValue, goalSets, goalReps, profile, note }}
 */
export function suggestStart(c, state, today, catalog) {
  const coach = getCoachSettings(state);
  const profileId = activeProfile(state, today).id;
  const compound = coachIsCompound(c.name);
  // sauts, haltérophilie, épreuves HYROX, figures de calisthénie… : forme du catalogue, pas celle du profil (repScheme.js)
  const P = repSchemeOf(c) ? null : profileFor(profileId, compound);
  const base = {
    startValue: c.defaultStart,
    goalValue: c.defaultGoal,
    goalSets: c.defaultGoalSets || 3,
    goalReps: c.defaultGoalReps || 6,
    profile: profileId,
    note: '',
  };
  if (c.type !== 'strength' || isTimedCatalog(c)) return base;

  if (P) {
    base.goalSets = compound ? P.sets : P.setsAccessory;
    base.goalReps = P.hi;
  }
  const profText = P ? ` Profil ${P.label} : ${base.goalSets} séries, ${P.lo} à ${P.hi} reps.` : '';

  if (c.unit !== 'kg') {
    if (P) base.goalValue = P.hi; // exercice en répétitions : l'objectif est le haut de la fourchette
    return { ...base, note: P ? `Séries et répétitions adaptées à ton profil du moment.${profText}` : '' };
  }

  const arena = arenaOf(c);
  const { level, used } = relativeStrength(state, arena, today, catalog);
  const step = coachStep({ catalogId: c.id, name: c.name }, c.defaultStart);
  let start;
  if (P) {
    const ref = estimateOneRm(c.defaultStart, (c.defaultGoalReps || 6) + EXTRA_REPS);
    start = coachRound(level * (ref ? ref.mean : c.defaultStart) * (P.pctStart / 100), step);
  } else {
    start = coachRound(level * c.defaultStart, step);
  }
  start = Math.max(step, start);
  const goal = Math.max(coachRound(level * (c.defaultGoal || start * 1.3), step), coachRound(start * 1.2, step));
  const from = used.length
    ? `d’après tes maxima (${used.slice(0, 3).join(', ')}${used.length > 3 ? '…' : ''})`
    : 'valeur de départ du catalogue (aucun maximum connu pour l’instant)';
  return {
    ...base,
    startValue: start,
    goalValue: goal,
    note: `Charge de départ ≈ ${start} kg, ${from}.${profText} À ajuster dès la première séance.`,
  };
}
