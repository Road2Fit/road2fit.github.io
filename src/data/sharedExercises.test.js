// Catalogue commun : un exercice créé par le coach va dans le bon groupe musculaire et le coach s'en sert ensuite.
import { describe, expect, it } from 'vitest';
import { addSharedExercises } from './sharedExercises';
import { arenaOf, fineGroupOf, setMuscleMode } from './muscles';
import { EXERCISE_CATALOG } from './catalog';
import { coachSuggestExercises } from '../coach/suggest';
import { coachOverview } from '../coach/advice';
import { makeQuestFromCatalog } from '../lib/questFactory';
import { INITIAL_STATE } from './initialState';

const MU = { id: 'ai_muscle_up_unit', data: { name: 'Muscle-up Unit', category: 'Dos', muscle: 'Dos', muscle2: 'Triceps', unit: 'reps', timed: false, equip: 'Poids du corps', like: 'pullups', start: 2, goal: 6, sets: 4, reps: 3, icon: '🦍', how: '', caution: '' } };

describe('exercice créé par le coach', () => {
  it('rejoint le catalogue et la banque du bon muscle (mode simplifié et optimisé)', () => {
    const [c] = addSharedExercises([MU], { save: false });
    expect(EXERCISE_CATALOG.some(x => x.id === MU.id)).toBe(true);
    expect(fineGroupOf({ ...c, catalogId: c.id })).toBe('Dos');
    setMuscleMode('simple');
    expect(arenaOf({ ...c, catalogId: c.id })).toBe('Dos');
    setMuscleMode('optimized');
    expect(arenaOf({ ...c, catalogId: c.id })).toBe('Dos');
    setMuscleMode('simple');
  });
  it('le coach le propose pour son groupe et le met dans les séances une fois ajouté', () => {
    const [c] = addSharedExercises([MU], { save: false });
    const sugg = coachSuggestExercises({ quests: [] }, 'Dos', 200).map(x => x.id);
    expect(sugg).toContain(MU.id);
    const { quest } = makeQuestFromCatalog(c, INITIAL_STATE, '2026-11-04');
    expect(quest).toMatchObject({ catalogId: MU.id, unit: 'reps', muscle: 'Dos', muscle2: 'Triceps' });
    const state = { ...INITIAL_STATE, coach: { ...INITIAL_STATE.coach, sessionsPerWeek: 2 }, quests: [quest] };
    const ov = coachOverview(state, '2026-11-04');
    expect(ov.hasExercises).toBe(true);
    expect(ov.session.exercises.map(e => e.questId)).toContain(quest.id);
  });
});
