import { describe, expect, it } from 'vitest';
import { computeExerciseTarget } from '../coach/targets';
import { rebuildEntry } from './history';
import { entryTonnage, fmtLoads, isMixed, loadsOf } from './setLoads';
import { estimateQuestMax } from './maxima';
import { entryVolume } from './quests';

const TODAY = '2026-10-21';
const entry = (id, date, sets, value, extra = {}) => ({
  id, date, value, sets: sets.length, reps: Math.max(...sets), setDetails: sets, assistanceKg: 0, rpe: 8, calories: 60, note: '', ...extra,
});
const curl = history => ({
  id: 'q_c', name: 'Curl Haltères', category: 'Épaules & Bras', type: 'strength', unit: 'kg', level: 1, startValue: 10, currentValue: 15,
  goalValue: 30, goalSets: 4, goalReps: 8, setDetails: [8, 8, 8, 8], history,
});

describe('charge différente d’une série à l’autre', () => {
  it('utilitaires : séries mixtes, affichage, tonnage', () => {
    expect(isMixed([15, 15, 17.5, 17.5])).toBe(true);
    expect(isMixed([15, 15])).toBe(false);
    expect(fmtLoads([15, 15, 17.5, 17.5])).toBe('15 → 17,5 kg');
    expect(fmtLoads([15, 15])).toBe('15 kg');
    const e = entry('a', TODAY, [8, 8, 6, 6], 17.5, { setLoads: [15, 15, 17.5, 17.5] });
    expect(entryTonnage(e)).toBe(8 * 15 * 2 + 6 * 17.5 * 2);
    expect(entryVolume({ ...e, quest: curl([]) })).toBe(8 * 15 * 2 + 6 * 17.5 * 2);
    // séance guidée ancienne (une seule charge) : une valeur par série quand même
    expect(loadsOf({ reps: [8, 8, 8], load: 12 })).toEqual([12, 12, 12]);
  });

  it('coach : 2 séries à 15 puis 2 à 17,5, toutes réussies → on garde 17,5 pour le faire sur toutes les séries', () => {
    const e = entry('a', '2026-10-19', [8, 8, 8, 8], 17.5, { setLoads: [15, 15, 17.5, 17.5] });
    const t = computeExerciseTarget(curl([e]), { today: TODAY }); // objectif 4 séries : seulement 2 faites à 17,5
    expect(t.load).toBe(17.5);
    expect(t.change).toBe('hold');
    expect(t.targetReps).toEqual([8, 8, 8, 8]);
  });

  it('coach : assez de séries réussies à la charge plus lourde → on monte à partir d’elle', () => {
    const e = entry('a', '2026-10-19', [8, 8, 8, 8, 8], 17.5, { setLoads: [15, 17.5, 17.5, 17.5, 17.5] });
    const t = computeExerciseTarget(curl([e]), { today: TODAY }); // 4 séries à 17,5 = l'objectif
    // 4.46 : +2,5 kg sur 17,5 ferait +14 % d'un coup (repère ACSM 2 à 10 %) → on monte d'abord les répétitions à 17,5 kg
    expect(t.change).toBe('up');
    expect(t.load).toBe(17.5);
    expect(Math.min(...t.targetReps)).toBe(9);
    expect(t.reason).toMatch(/d’abord les répétitions/);
  });

  it('coach : 17,5 pas tenu sur toutes les séries (une seule série faite à cette charge) → on garde 17,5 et on vise l’objectif', () => {
    const e = entry('a', '2026-10-19', [8, 8, 8, 7], 17.5, { setLoads: [15, 15, 15, 17.5] });
    const t = computeExerciseTarget(curl([e]), { today: TODAY });
    expect(t.change).toBe('hold');
    expect(t.load).toBe(17.5);
    expect(Math.min(...t.targetReps)).toBeGreaterThanOrEqual(7);
  });

  it('coach : trop dur à 20 kg, on est redescendu à 17,5 → il repart de 17,5 (la charge réellement tenue à la fin)', () => {
    const e = entry('a', '2026-10-19', [8, 5, 8, 8], 20, { setLoads: [20, 20, 17.5, 17.5] });
    const t = computeExerciseTarget(curl([e]), { today: TODAY });
    expect(t.load).toBe(17.5); // pas 20
    expect(t.change).toBe('hold'); // la série ratée à 20 kg pèse dans le jugement des séries à 17,5 kg ou plus
  });

  it('exercice assisté : l’aide diminue entre deux séries, le coach part de la dernière aide', () => {
    const dips = {
      id: 'q_d', name: 'Dips Assistés', category: 'Pectoraux', type: 'strength', unit: 'reps', level: 1, startValue: 6, currentValue: 10,
      goalValue: 10, goalSets: 3, goalReps: 10, startAssistanceKg: 20, currentAssistanceKg: 10, goalAssistanceKg: 0, setDetails: [10, 10, 10],
      history: [entry('a', '2026-10-19', [10, 10, 10], 10, { assistanceKg: 7.5, setAssists: [10, 7.5, 7.5], goalSets: 3, goalReps: 10 })],
    };
    const t = computeExerciseTarget(dips, { today: TODAY }); // 2 séries sur 3 à 7,5 kg d'aide : on consolide cette aide
    expect(t.assist).toBe(7.5);
    expect(t.change).toBe('hold');
    const quatre = { ...dips, history: [entry('a', '2026-10-19', [10, 10, 10, 10], 7.5, { assistanceKg: 7.5, setAssists: [10, 7.5, 7.5, 7.5], goalSets: 3, goalReps: 10 })] };
    const t2 = computeExerciseTarget(quatre, { today: TODAY }); // 3 séries à 7,5 kg d'aide = l'objectif : l'aide baisse
    expect(t2.assist).toBeLessThan(7.5);
    expect(t2.change).toBe('assist_down');
  });

  it('1RM estimé : chaque série compte avec sa propre charge', () => {
    const q = curl([entry('a', '2026-10-15', [8, 8, 5, 5], 17.5, { setLoads: [15, 15, 17.5, 17.5] })]);
    const r = estimateQuestMax(q, {}, { today: TODAY });
    expect(r.basis.load).toBe(17.5);
    expect(r.basis.reps).toBe(5);
  });

  it('correction d’une séance : les charges de chaque série sont recalculées (record = la plus lourde)', () => {
    const q = curl([]);
    const e = entry('a', '2026-10-19', [8, 8, 8, 8], 17.5, { setLoads: [15, 15, 17.5, 17.5], validatedSets: 4, goalSets: 4, goalReps: 8 });
    const corrige = rebuildEntry(q, e, { setLoads: ['15', '15', '15', '20'] }, 82);
    expect(corrige.setLoads).toEqual([15, 15, 15, 20]);
    expect(corrige.value).toBe(20);
    // une série retirée : les charges suivent
    const moins = rebuildEntry(q, e, { setDetails: [8, 8, 8] }, 82);
    expect(moins.setLoads).toEqual([15, 15, 17.5]);
    expect(moins.value).toBe(17.5);
  });
});
