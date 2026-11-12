import { describe, it, expect } from 'vitest';
import { progressSummary } from './progressSummary';

const q = (id, name, unit, hist) => ({ id, name, type: 'strength', unit, history: hist.map(([date, value, setDetails], i) => ({ id: `${id}${i}`, date, value, setDetails, reps: setDetails ? setDetails[0] : 8 })) });
describe('bilan de progression sur 4 semaines', () => {
  const state = {
    coach: { sessionsPerWeek: 3 },
    quests: [
      q('s', 'Squat', 'kg', [['2026-10-01', 50], ['2026-10-20', 55], ['2026-11-03', 57.5], ['2026-11-10', 60]]),
      q('p', 'Pompes', 'reps', [['2026-10-20', 10, [10, 9, 8]], ['2026-11-10', 12, [12, 11, 10]]]),
      q('c', 'Curl', 'kg', [['2026-10-25', 12], ['2026-11-08', 12]]),
      q('d', 'Dips', 'reps', [['2026-11-08', 6, [6, 6]]]),
      { id: 'run', type: 'cardio', history: [{ date: '2026-11-09', value: 5 }] },
    ],
  };
  it('régularité, progrès par exercice, phrase de résumé', () => {
    const r = progressSummary(state, '2026-11-11');
    expect(r.from).toBe('2026-10-15');
    expect(r.planned).toBe(12);
    expect(r.done).toBe(5); // 20/10, 25/10, 03/11, 08/11, 10/11
    expect(r.up.map(x => x.id)).toEqual(['s', 'p']);
    const s = r.rows.find(x => x.id === 's');
    expect(s.from).toBe(50); // dernière séance AVANT la période
    expect(s.diff).toBe(10);
    expect(r.text(s)).toBe('50 → 60 kg');
    expect(r.flat.map(x => x.id)).toEqual(['c']);
    expect(r.rows.find(x => x.id === 'd')).toBeUndefined(); // une seule séance : rien à comparer
    expect(r.headline).toBe('5 séances sur 12 prévues · +10 kg sur Squat');
    expect(r.verdict).toMatch(/Peu de séances/);
  });
  it('aucune séance', () => {
    const r = progressSummary({ quests: [] }, '2026-11-11');
    expect(r.done).toBe(0);
    expect(r.rows).toEqual([]);
    expect(r.verdict).toMatch(/Pas de séance/);
  });
});
