// 4.48.5 : durée estimée des séances (retour de Gabin : remplacer un saut par le box jump ajoutait ≈ 20 min).
import { describe, it, expect } from 'vitest';
import { EXERCISE_CATALOG } from '../data/catalog';
import { makeQuestFromCatalog } from '../lib/questFactory';
import { INITIAL_STATE } from '../data/initialState';
import { computeExerciseTarget } from './targets';
import { exerciseMinutes, sessionMinutes, setWorkSec, CHANGE_MIN } from './methods';
import { restFor } from './rest';

const today = '2026-11-22';
const state = { ...INITIAL_STATE, quests: [], userWeightKg: 80 };
const target = c => computeExerciseTarget(makeQuestFromCatalog(c, state, today).quest, { today });
const byId = id => EXERCISE_CATALOG.find(c => c.id === id);

describe('durée d’un exercice', () => {
  it('le repos ne compte qu’ENTRE les séries, puis 1 min pour changer d’exercice', () => {
    const e = { name: 'Squat Barre', sets: 3, targetReps: [8, 8, 8], restSec: 180 };
    expect(exerciseMinutes(e)).toBeCloseTo((3 * setWorkSec(8) + 2 * 180) / 60 + CHANGE_MIN);
  });
  it('sauts : 1 min 30 de repos, comme pour sauter de nouveau au maximum', () => {
    for (const c of EXERCISE_CATALOG.filter(x => /^ply_/.test(x.id))) {
      expect(restFor({ id: c.id, name: c.name, reps: 4, compound: true, arena: 'Jambes' }).sec).toBe(90);
    }
  });
  it('box jump au lieu du saut vertical : quelques minutes de différence, pas 20', () => {
    const box = exerciseMinutes({ ...target(byId('ply_box_jump')), catalogId: 'ply_box_jump' });
    const cmj = exerciseMinutes({ ...target(byId('ply_cmj')), catalogId: 'ply_cmj' });
    expect(Math.abs(box - cmj)).toBeLessThan(3);
    expect(box).toBeLessThan(8);
  });
  it('un côté puis l’autre (squat bulgare) dure plus longtemps par série', () => {
    expect(exerciseMinutes({ name: 'Squat Bulgare Haltères', sets: 3, targetReps: [8, 8, 8], restSec: 120 }))
      .toBeGreaterThan(exerciseMinutes({ name: 'Fentes', sets: 3, targetReps: [8, 8, 8], restSec: 120 }));
  });
  it('tout le catalogue : chaque exercice entre 3 et 16 min avec ses réglages de départ', () => {
    const bad = [];
    for (const c of EXERCISE_CATALOG) {
      if (c.type && c.type !== 'strength') continue;
      const q = makeQuestFromCatalog(c, state, today).quest;
      const m = exerciseMinutes({ ...computeExerciseTarget(q, { today }), catalogId: c.id });
      if (!(m >= 3 && m <= 16)) bad.push(`${c.id} ${m.toFixed(1)}`);
    }
    expect(bad).toEqual([]);
  });
  it('séance type de 8 exercices (≈ 30 séries) : entre 70 et 90 min (avant : 105)', () => {
    const ex = [
      ['ply_box_jump', 4, 4, 90], ['ply_pogo', 3, 13, 90], ['squat', 4, 8, 210], ['hip', 4, 9, 210],
      ['pullups', 4, 10, 135], ['bench', 4, 8, 180], ['face', 3, 12, 75], ['dips', 4, 9, 135],
    ].map(([id, sets, r, restSec]) => ({ catalogId: id, name: id, sets, targetReps: Array(sets).fill(r), restSec }));
    const min = sessionMinutes(ex);
    expect(min).toBeGreaterThan(70);
    expect(min).toBeLessThan(90);
  });
});
