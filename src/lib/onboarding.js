import { EXERCISE_CATALOG } from '../data/catalog';
import { normalizeArenaGroup } from '../data/arenas';
import { PROFILES, pctForReps } from '../coach/profiles';
import { suggestStart } from '../coach/startSuggestion';
import { coachRound, coachStep } from '../coach/settings';
import { estimateOneRm } from './maxima';
import { isTimedCatalog } from './quests';
import { detrainFactor, experienceCoachPatch, LEVELS } from '../coach/experience';
import { PLACES } from '../coach/equipment';

// Assistant d'accueil : transforme les réponses d'un nouvel utilisateur en réglages du coach, poids, exercices et records.
// Fonction pure (testée) : l'interface est dans modals/OnboardingModal.jsx.

/** Exercices proposés en premier (les plus courants), par groupe. */
export const STARTER_EXERCISES = [
  'bench_press', 'incline_dumbbell', 'pushups', 'dips',
  'squat', 'leg_press', 'deadlift', 'fp_rdl',
  'barbell_row', 'lat_pulldown', 'pullups', 'fp_seated_row',
  'overhead_press', 'fp_lateral_db', 'barbell_curl', 'fp_pushdown',
  'crunches_floor', 'fp_plank',
];

export const GOALS = [
  { id: 'force', label: 'Devenir plus fort', icon: '🚀', profile: 'puissance' },
  { id: 'muscle', label: 'Prendre du muscle', icon: '💪', profile: 'hypertrophie' },
  { id: 'endurance', label: 'Tenir plus longtemps (endurance de force)', icon: '🔁', profile: 'endurance' },
  { id: 'forme', label: 'Rester en forme / perdre du poids', icon: '🌿', profile: 'hypertrophie' },
  { id: 'nsp', label: 'Je ne sais pas : laisse le coach décider', icon: '🤷', profile: 'auto' },
];

function goalFromOnboarding(id, w, target, today) {
  if (id === 'force') return { kind: 'strength', text: 'Devenir plus fort', createdAt: today };
  if (id === 'muscle') return { kind: 'muscle', text: 'Prendre du muscle', createdAt: today };
  if (id === 'endurance') return { kind: 'reps', text: 'Tenir plus longtemps', createdAt: today };
  if (id === 'forme') return Math.abs(target - w) >= 1 ? { kind: 'weight', text: `Poids : ${target} kg`, target, startWeight: w, createdAt: today } : { kind: 'general', text: 'Rester en forme', createdAt: today };
  return null;
}

/** L'assistant s'affiche tout seul seulement pour une appli neuve de l'édition neutre. */
export const needsOnboarding = state =>
  !state.onboarded && !(state.quests && state.quests.length) && !(state.weightHistory && state.weightHistory.length) && !(Number(state.xp) > 0);

const num = v => {
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

/**
 * answers = { name, sex, age, heightCm, weightKg, targetKg, goal, sessionsPerWeek, sessionMinutes, gymDays: [0-6], sportDays: [0-6],
 *             level: 'beginner'|'advanced'|'expert', experience: { years, breakMonths, weeklySets, rir, methods, priorities, periodization, deloadEvery, limits },
 *             place: 'gym'|'home'|'both', equipment: [identifiants de HOME_EQUIPMENT],
 *             exercises: [{ catalogId, kg?, reps?, date?, workSets?, workReps?, workKg? }] }
 * (kg + reps = « j'ai soulevé kg pour reps répétitions » ; reps vide ou 1 = charge maximale ; exercices en répétitions : reps seulement ;
 *  workSets × workReps à workKg = séance type actuelle d'un expert, elle sert de charge de départ.)
 */
export function applyOnboarding(prev, a, today) {
  const goal = GOALS.find(g => g.id === a.goal) || GOALS[GOALS.length - 1];
  const w = Math.max(30, Math.min(250, num(a.weightKg) || Number(prev.userWeightKg) || 70));
  const target = Math.max(30, Math.min(250, num(a.targetKg) || w));
  const gymDays = (a.gymDays || []).map(Number);
  const sessions = Math.max(1, Math.min(6, Number(a.sessionsPerWeek) || 3));
  const coach = {
    ...prev.coach,
    profile: { heightCm: num(a.heightCm) || '', age: num(a.age) || '', sex: a.sex === 'f' ? 'f' : 'm' },
    sessionsPerWeek: sessions,
    sessionMinutes: Math.max(20, Math.min(150, Number(a.sessionMinutes) || 60)),
    workProfile: goal.profile,
    // l'objectif choisi ici devient aussi l'objectif du coach (sinon le Coach le redemandait aussitôt)
    mainGoal: prev.coach && prev.coach.mainGoal ? prev.coach.mainGoal : goalFromOnboarding(goal.id, w, target, today),
    sport: a.sport || '',
    place: PLACES.some(p => p.id === a.place) ? a.place : 'gym',
    equipment: Array.isArray(a.equipment) ? a.equipment : [],
    volleyDays: (a.sportDays || []).map(Number).sort(),
    gymSlots: gymDays.reduce((o, d) => ({ ...o, [d]: { start: '18:00', end: '19:30' } }), {}),
  };
  const level = LEVELS.some(l => l.id === a.level) ? a.level : null;
  const exp = level ? { ...(level === 'expert' ? a.experience || {} : { breakMonths: (a.experience || {}).breakMonths || 0 }), level } : null;
  Object.assign(coach, experienceCoachPatch(coach, exp, today));
  const known = level === 'advanced' || level === 'expert';
  const factor = detrainFactor(exp && exp.breakMonths);

  let state = {
    ...prev,
    heroName: String(a.name || '').trim(),
    userWeightKg: w,
    startWeightKg: (prev.weightHistory || []).length ? prev.startWeightKg : w,
    targetWeightKg: target,
    coach,
    weightHistory: (prev.weightHistory || []).length ? prev.weightHistory : [{ id: `w_${Date.now()}`, date: today, weightKg: w, note: 'Poids de départ' }],
    maxRecords: { ...(prev.maxRecords || {}) },
    quests: [...(prev.quests || [])],
    muscleMode: a.muscleMode === 'optimized' ? 'optimized' : 'simple',
    onboarded: true,
  };

  return addKnownExercises(state, a.exercises || [], today, { known, factor, origin: 'l’assistant d’accueil' });
}

/**
 * Crée les exercices déclarés (assistant d'accueil, « Raconte ton passé ») un par un, pour que les suivants profitent des
 * maxima des premiers. exercises = [{ catalogId, kg?, reps?, date?, workSets?, workReps?, workKg? }] ; un exercice déjà suivi est ignoré.
 */
export function addKnownExercises(state, exercises, today, { known = false, factor = 1, origin = 'l’assistant d’accueil' } = {}) {
  state = { ...state, quests: [...(state.quests || [])], maxRecords: { ...(state.maxRecords || {}) } };
  exercises.forEach((ex, i) => {
    const c = EXERCISE_CATALOG.find(x => x.id === ex.catalogId);
    if (!c || state.quests.some(q => q.catalogId === c.id)) return;
    const sug = suggestStart(c, state, today, EXERCISE_CATALOG);
    const P = PROFILES[sug.profile] || null;
    const unit = c.unit;
    const id = `q_${Date.now()}_${i}`;
    let startV = Number(sug.startValue) || 0;
    let goalValue = sug.goalValue;
    const kg = num(ex.kg);
    const reps = Math.max(1, Math.round(num(ex.reps)) || 1);
    const rec = {};
    if (unit === 'kg' && kg > 0) {
      const oneRm = reps === 1 ? kg : (estimateOneRm(kg, reps) || { mean: kg }).mean;
      const step = coachStep({ catalogId: c.id, name: c.name }, c.defaultStart);
      const pct = P ? P.pctStart / 100 : pctForReps((Number(sug.goalReps) || 8) + 3) / 100;
      startV = Math.max(step, coachRound(oneRm * pct * factor, step));
      goalValue = Math.max(coachRound(startV * 1.2, step), startV + step);
      rec.kg = Math.round(oneRm * 10) / 10;
    } else if (unit === 'reps' && reps > 1) {
      startV = Math.max(1, Math.round(reps * 0.7));
      goalValue = Math.max(Number(sug.goalReps) || 10, reps);
    }
    const gSets = sug.goalSets;
    const gReps = sug.goalReps;
    let setDetails = Array(gSets).fill(unit === 'reps' ? startV : gReps);
    // séance type actuelle (expert) : elle donne directement la charge et les séries de départ
    const wSets = Math.max(0, Math.min(10, Math.round(num(ex.workSets))));
    const wReps = Math.max(0, Math.min(50, Math.round(num(ex.workReps))));
    const wKg = num(ex.workKg);
    if (wSets && wReps && (unit === 'reps' || wKg > 0)) {
      const step = coachStep({ catalogId: c.id, name: c.name }, c.defaultStart);
      if (unit === 'kg') { startV = Math.max(step, coachRound(wKg * factor, step)); goalValue = Math.max(goalValue || 0, coachRound(startV * 1.15, step), startV + step); }
      else startV = Math.max(1, Math.round(wReps * factor));
      setDetails = Array(wSets).fill(unit === 'reps' ? startV : wReps);
    }
    // aide élastique de départ : on la garde tant que la personne ne peut pas faire, SANS aide, des séries complètes
    // de la cible (ex. 3 tractions max → aide pour faire de vraies séries de 8 à 12 et progresser).
    // Poids du corps seulement si son maximum dépasse la cible d'au moins 2 répétitions (10 max pour des séries de 8) ;
    // lest déclaré : départ lesté (aide négative), un peu réduit par prudence.
    const lest = num(ex.lest);
    let assist = unit === 'reps' ? Number(c.defaultStartAssistance) || 0 : 0;
    if (unit === 'reps' && reps >= (Number(gReps) || 8) + 2) assist = 0;
    // avec l'aide : de vraies séries de la cible (pas 70 % d'un maximum de 3)
    if (unit === 'reps' && assist > 0 && reps > 1 && !(lest > 0)) {
      startV = Math.max(startV, Number(gReps) || 8);
      setDetails = Array(gSets).fill(startV);
    }
    if (unit === 'reps' && lest > 0 && reps >= 1) {
      const step = 2.5;
      assist = -Math.max(0, Math.floor((lest * factor * 0.85) / step) * step);
      startV = Math.max(1, Math.round(reps * 0.7));
      setDetails = Array(gSets).fill(startV);
    }
    const quest = {
      id,
      catalogId: c.id,
      name: c.name,
      category: normalizeArenaGroup(c.category, c.type),
      type: 'strength',
      unit,
      timed: isTimedCatalog(c) ? true : undefined,
      goalMode: c.defaultGoalMode || 'sets_reps',
      known: known || undefined,
      level: 1,
      icon: c.icon,
      startValue: startV,
      currentValue: startV,
      goalValue: unit === 'reps' ? gReps : Math.max(1, Number(goalValue) || gReps),
      goalSets: gSets,
      goalReps: gReps,
      setDetails,
      startAssistanceKg: assist,
      currentAssistanceKg: assist,
      goalAssistanceKg: unit === 'reps' ? Number(c.defaultGoalAssistance) || 0 : 0,
      history: [{
        id: `h_start_${Date.now()}_${i}`,
        date: today,
        value: startV,
        sets: setDetails.length,
        reps: setDetails[0],
        setDetails,
        assistanceKg: assist,
        rpe: 7,
        calories: 0,
        goalBeaten: false,
        note: `Point de départ — Niveau 1 (${c.name}) • créé par ${origin}`,
      }],
    };
    if (rec.kg) state.maxRecords[id] = { kg: rec.kg, date: /^\d{4}-\d{2}-\d{2}$/.test(ex.date || '') && ex.date <= today ? ex.date : today };
    state = { ...state, quests: [...state.quests, quest] };
  });
  return state;
}
