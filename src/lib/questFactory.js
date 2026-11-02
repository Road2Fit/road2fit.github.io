// Création d'un exercice (quête) depuis le catalogue : charge de départ, séries et répétitions d'après les maxima et le profil.
// Utilisé par le coach (« + exercice ») et par la saisie d'un programme.
import { suggestStart } from '../coach/startSuggestion';
import { EXERCISE_CATALOG } from '../data/catalog';
import { normalizeArenaGroup } from '../data/arenas';
import { isTimedCatalog } from './quests';

export function makeQuestFromCatalog(c, state, today, note = 'ajouté par le Coach') {
  const sug = suggestStart(c, state, today, EXERCISE_CATALOG);
  const gSets = sug.goalSets;
  const gReps = sug.goalReps;
  const unit = c.unit;
  const startV = Number(sug.startValue) || 0;
  const initialSetDetails = Array(gSets).fill(unit === 'reps' ? startV : gReps);
  const assist = unit === 'reps' ? Number(c.defaultStartAssistance) || 0 : 0;
  const stamp = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  return {
    quest: {
      id: `q_${stamp}`,
      catalogId: c.id,
      name: c.name,
      category: normalizeArenaGroup(c.category, c.type),
      type: 'strength',
      unit,
      timed: isTimedCatalog(c) ? true : undefined,
      goalMode: c.defaultGoalMode || 'sets_reps',
      level: 1,
      icon: c.icon,
      startValue: startV,
      currentValue: startV,
      goalValue: unit === 'reps' ? gReps : Math.max(1, Number(sug.goalValue) || gReps),
      goalSets: gSets,
      goalReps: gReps,
      setDetails: initialSetDetails,
      startAssistanceKg: assist,
      currentAssistanceKg: assist,
      goalAssistanceKg: unit === 'reps' ? Number(c.defaultGoalAssistance) || 0 : 0,
      history: [{
        id: `h_start_${stamp}`,
        date: today,
        value: startV,
        sets: gSets,
        reps: unit === 'reps' ? startV : gReps,
        setDetails: initialSetDetails,
        assistanceKg: assist,
        rpe: 7,
        calories: 0,
        goalBeaten: false,
        note: `Point de départ — Niveau 1 (${c.name}) • ${note}`,
      }],
    },
    note: sug.note,
  };
}
