// 4.52 : sauts mesurés en hauteur ou en distance (demande de Gabin : box jump en hauteur, pas en lest).
import { describe, it, expect } from 'vitest';
import { fmtCm, perfBest, perfOf, perfTarget } from './perfMeasure';
import { applyStrengthSession } from '../lib/sessionRecord';
import { buildMaxTest, pickMaxLifts } from '../coach/maxTest';
import { computeExerciseTarget } from '../coach/targets';
import { INITIAL_STATE } from './initialState';

const box = (hist = []) => ({ id: 'qb', catalogId: 'ply_box_jump', name: 'Box Jump', type: 'strength', unit: 'reps', goalSets: 4, goalReps: 4, history: hist, arena: 'Jambes' });
const e = (date, cm, rpe = 7, rpeSet = true) => ({ id: `h${date}`, date, setDetails: [4, 4, 4, 4], sets: 4, reps: 4, validatedSets: 4, goalSets: 4, perfCm: cm, rpe, rpeSet });

describe('sauts mesurés', () => {
  it('box jump : hauteur de caisse, jamais de lest ; sauts sans mesure : rien', () => {
    expect(perfOf(box()).kind).toBe('setting');
    expect(perfOf({ catalogId: 'ply_pogo' })).toBeNull();
    expect(perfOf({ catalogId: '__proto__' })).toBeNull();
    expect(fmtCm(245)).toBe('2,45 m');
    expect(fmtCm(60)).toBe('60 cm');
  });
  it('caisse : même hauteur, +5 cm après une séance facile et complète ; record', () => {
    expect(perfTarget(box()).cm).toBe(40);
    expect(perfTarget(box([e('2026-11-01', 60)])).cm).toBe(60);
    expect(perfTarget(box([e('2026-11-01', 60, 5)])).cm).toBe(65);
    expect(perfTarget(box([e('2026-11-01', 60, 5, false)])).cm).toBe(60);
    expect(perfBest(box([e('2026-11-01', 70), e('2026-11-08', 65)])).cm).toBe(70);
  });
  it('enregistrement : la hauteur est gardée dans la séance', () => {
    const r = applyStrengthSession(box(), { date: '2026-11-22', setDetails: [4, 4, 4], rpe: 7, calories: 30, perf: 65 });
    expect(r.entry.perfCm).toBe(65);
    expect(r.entry.note).toMatch(/65 cm/);
    expect(applyStrengthSession(box(), { date: '2026-11-22', setDetails: [4], rpe: 7, calories: 30, perf: 'x' }).entry.perfCm).toBeUndefined();
  });
  it('objectif du coach : la caisse proposée', () => {
    expect(computeExerciseTarget(box([e('2026-11-01', 60, 5)]), { today: '2026-11-22' }).perf.cm).toBe(65);
  });
  it('test de max : box jump en hauteur max, caisse qui monte, en premier', () => {
    const q = box([e('2026-11-01', 60)]);
    const sq = { id: 'qs', catalogId: 'squat', name: 'Squat Barre', type: 'strength', unit: 'kg', currentValue: 100, goalSets: 3, goalReps: 5, history: [{ id: 'h1', date: '2026-11-20', value: 100, setDetails: [5, 5, 5], sets: 3, reps: 5 }] };
    const st = { ...INITIAL_STATE, quests: [sq, q] };
    const lifts = pickMaxLifts(st);
    expect(lifts[0].id).toBe('qb');
    const t = buildMaxTest(st, lifts.map(x => computeExerciseTarget(x, { today: '2026-11-22' })), '2026-11-22');
    const b = t.exercises.find(x => x.questId === 'qb');
    expect(b.maxMode).toBe('perf');
    expect(b.plan.map(p => p.perf)).toEqual([60, 65, 70]);
  });
});
