// Séance guidée : une série trop dure (ou trop facile) → le coach propose d'ajuster la suite d'un geste.
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickEl, clickText, findByText, guidedStep, launch } from './harness';
import { adaptAfterSet } from '../../src/components/GuidedSession';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const entry = (id, date, sets, value) => ({ id, date, value, sets: sets.length, reps: Math.max(...sets), setDetails: sets, validatedSets: 0, goalSets: 3, goalReps: 6, assistanceKg: 0, rpe: 8, calories: 80, note: '' });
const bench = {
  id: 'q_bench', catalogId: 'bench_press', name: 'Développé Couché Barre', category: 'Pectoraux', type: 'strength', unit: 'kg', goalMode: 'sets_reps',
  level: 1, icon: '🏋️', startValue: 40, currentValue: 60, goalValue: 100, goalSets: 3, goalReps: 6, setDetails: [6, 6, 6],
  history: [entry('h0', '2026-10-17', [6, 6, 6], 60)],
};
const SAVE = { xp: 100, quests: [bench], weightHistory: [], unlockedAchievements: [], claimedChallenges: [], soundEnabled: false, rankTrials: [4, 8, 14, 22, 35, 50] };
const by = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);

describe('adapter la suite après une série', () => {
  it('règle : 2 reps de moins → −5 % ; 3 de plus → +7,5 % ; 1 d’écart → rien', () => {
    const it0 = { kind: 'load' };
    expect(adaptAfterSet(it0, { load: 60 }, 6, 8, 2.5).load).toBe(57.5);
    expect(adaptAfterSet(it0, { load: 60 }, 11, 8, 2.5).load).toBe(65);
    expect(adaptAfterSet(it0, { load: 60 }, 7, 8, 2.5)).toBeNull();
    expect(adaptAfterSet({ kind: 'assisted' }, { assist: 10 }, 3, 6).assist).toBe(12.5);
    expect(adaptAfterSet({ kind: 'reps' }, {}, 3, 10)).toBeNull();
  });

  it('séance guidée : série ratée de 2 reps, le repos propose une charge plus légère, appliquée d’un geste', async () => {
    const h = await launch({ storage: { rondoudou_save_v1: JSON.stringify(SAVE), rondoudou_local_ts: '1' } });
    open.push(h);
    await clickEl(h, h.doc.querySelector('[data-tab="coach"]'));
    const [lancer] = [...findByText(h, 'Lancer la séance guidée'), ...findByText(h, 'Lancer cette séance guidée maintenant')];
    await clickText(h, lancer.textContent.trim().slice(0, 30));
    while (by(h, 'warm-done')) await guidedStep(h);
    const load = () => Number(by(h, 'set-load').textContent.replace(',', '.'));
    const before = load();
    await clickEl(h, h.doc.querySelector('button[aria-label="Répétitions moins"]'));
    await clickEl(h, h.doc.querySelector('button[aria-label="Répétitions moins"]'));
    await clickEl(h, by(h, 'set-done'));
    expect(by(h, 'guided-adapt').textContent).toContain('2 reps de moins que prévu');
    await clickEl(h, by(h, 'adapt-apply'));
    expect(by(h, 'guided-adapt')).toBeNull();
    expect(by(h, 'rest-next').textContent).not.toContain(String(before).replace('.', ',') + ' kg'); // le rappel suit la nouvelle charge
    await clickEl(h, by(h, 'guided-next'));
    await advance(h);
    expect(load()).toBeLessThan(before);
    expect(h.errors).toEqual([]);
  }, 120000);
});
