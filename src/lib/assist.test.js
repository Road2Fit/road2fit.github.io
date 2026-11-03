// Poids du corps : aide (> 0) et lest (< 0) sur une seule échelle.
import { describe, expect, it } from 'vitest';
import { assistText, nextAssistDown } from './assist';
import { computeExerciseTarget } from '../coach/targets';
import { estimateQuestMax } from './maxima';
import { aiDictationItems } from '../ai/dictation';
import { parseSpokenWorkout } from '../voice/parser';

const dips = (assist, goal = 0, history = []) => ({
  id: 'q_dips', catalogId: 'dips', name: 'Dips sur Barres Parallèles', type: 'strength', unit: 'reps', goalMode: 'sets_reps',
  goalSets: 3, goalReps: 8, startValue: 8, currentValue: 8, goalValue: 8, startAssistanceKg: assist, currentAssistanceKg: assist, goalAssistanceKg: goal, history,
});
const done = (date, assist, reps = [8, 8, 8]) => ({ id: `h${date}`, date, value: 8, sets: reps.length, reps: reps[0], setDetails: reps, assistanceKg: assist, rpe: 7 });

describe('aide et lest', () => {
  it('textes', () => {
    expect(assistText(10)).toBe('aide 10 kg');
    expect(assistText(-12.5)).toBe('lest +12,5 kg');
    expect(assistText(0)).toBe('poids du corps');
  });
  it('cran suivant : moins d’aide jusqu’à l’objectif, puis du lest sans limite (ou jusqu’au lest visé)', () => {
    expect(nextAssistDown(10, 0)).toEqual({ value: 7.5, reached: false, lest: false });
    expect(nextAssistDown(0, 0).reached).toBe(true); // sans aide et sans lest visé : objectif atteint (comme avant)
    expect(nextAssistDown(-5, 0)).toEqual({ value: -7.5, reached: false, lest: true });
    expect(nextAssistDown(2.5, -5).value).toBe(0);
    expect(nextAssistDown(-5, -5).reached).toBe(true);
  });
  it('le coach ajoute du lest aux dips lestés quand toutes les répétitions sont réussies', () => {
    const t = computeExerciseTarget(dips(-10, -20, [done('2026-10-20', -10)]), { today: '2026-10-22' });
    expect(t.kind).toBe('assisted');
    expect(t.assist).toBe(-12.5);
    expect(t.reason).toContain('lest');
  });
  it('max estimé : le lest s’ajoute au poids du corps', () => {
    const state = { userWeightKg: 80, weightHistory: [], maxRecords: {} };
    const sans = estimateQuestMax(dips(0, 0, [done('2026-10-20', 0)]), state, { today: '2026-10-22' });
    const leste = estimateQuestMax(dips(-20, 0, [done('2026-10-20', -20)]), state, { today: '2026-10-22' });
    expect(leste.estimate).toBeGreaterThan(sans.estimate + 15);
  });
  it('dictée : des kilos sur un exercice au poids du corps = du lest ; RIR compris', () => {
    const state = { userWeightKg: 80, quests: [dips(0)] };
    const ai = aiDictationItems({ items: [{ kind: 'strength', questId: 'q_dips', catalogId: '', customName: '', sets: [{ reps: 8, kg: 10, assistKg: 0, seconds: 0, kind: 'work' }, { reps: 8, kg: 10, assistKg: 0, seconds: 0, kind: 'work' }], method: 'straight', durationMin: 0, distanceKm: 0, rpe: 8, note: '' }] }, state);
    expect(ai[0].assistanceKg).toBe(-10);
    expect(ai[0].summary).toContain('lest +10 kg');
    const loc = parseSpokenWorkout('dips 3 fois 8 à 10 kilos rir 2', state.quests, state.userWeightKg);
    expect(loc[0].assistanceKg).toBe(-10);
    expect(loc[0].rpe).toBe(8);
  });
});
