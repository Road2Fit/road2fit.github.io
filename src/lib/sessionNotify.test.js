// 4.51.2 : texte de la notification de suivi de séance.
import { describe, it, expect } from 'vitest';
import { sessionStatusOf } from './sessionNotify';

const g = {
  idx: 0, startedAt: 0,
  items: [{ questId: 'a', name: 'Squat Barre', kind: 'load' }, { questId: 'b', name: 'Tractions', kind: 'assisted' }],
  data: {
    a: { reps: [8, 8, 8], loads: [100, 100, 100], done: [true, false, false], load: 100 },
    b: { reps: [6, 6], assists: [-10, -10], done: [false, false], assist: -10 },
  },
};
describe('notification de suivi de séance', () => {
  it('exercice, série en cours, charge et progression', () => {
    expect(sessionStatusOf(g)).toEqual({ name: 'Squat Barre', set: 'Série 2/3', detail: '8 reps à 100 kg', progress: 'Exercice 1/2' });
  });
  it('exercice fini : passe au suivant (lest affiché)', () => {
    const g2 = { ...g, data: { ...g.data, a: { ...g.data.a, done: [true, true, true] } } };
    const st = sessionStatusOf(g2);
    expect(st.name).toBe('Tractions');
    expect(st.set).toBe('Série 1/2');
    expect(st.detail).toMatch(/6 reps · .*10/);
    expect(st.progress).toBe('Exercice 2/2');
  });
});
