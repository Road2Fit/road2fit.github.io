// Séance guidée : le chrono d'une tenue (gainage…) s'arrête tout seul au temps prévu de la série.
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickEl, launch } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });

const entry = (id, date, sets) => ({ id, date, value: Math.max(...sets), sets: sets.length, reps: Math.max(...sets), setDetails: sets, validatedSets: 0, goalSets: 3, goalReps: 30, assistanceKg: 0, rpe: 7, calories: 20, note: '' });
const plank = {
  id: 'q_plank', catalogId: 'plank', name: 'Gainage Planche (en secondes)', category: 'Abdominaux', type: 'strength', unit: 'reps', timed: true, goalMode: 'sets_reps',
  level: 1, icon: '🧱', startValue: 30, currentValue: 30, goalValue: 90, goalSets: 3, goalReps: 30, setDetails: [30, 30, 30],
  history: [entry('h0', '2026-10-17', [30, 30, 30])],
};
const SAVE = { xp: 100, quests: [plank], weightHistory: [], unlockedAchievements: [], claimedChallenges: [], soundEnabled: false, rankTrials: [4, 8, 14, 22, 35, 50] };

describe('chrono des tenues', () => {
  it('s’arrête au temps prévu et valide la série', async () => {
    const h = await launch({ storage: { rondoudou_save_v1: JSON.stringify(SAVE), rondoudou_local_ts: '1' }, openCoach: true });
    open.push(h);
    await clickEl(h, h.doc.querySelector('[data-testid="start-today"], [data-testid="start-early"]'));
    if (h.doc.querySelector('[data-testid="feel-ok"]')) await clickEl(h, h.doc.querySelector('[data-testid="feel-ok"]'));
    const label = () => h.doc.querySelector('[data-testid="set-label"]').textContent;
    expect(label()).toMatch(/1\s*\/\s*\d/);
    const target = Number(h.doc.querySelector('[data-testid="set-reps"]').textContent.match(/\d+/)[0]);
    expect(target).toBeGreaterThan(0);
    const chrono = [...h.doc.querySelectorAll('button')].find(b => b.textContent.includes('Chrono'));
    await clickEl(h, chrono);
    expect(h.doc.querySelector('[data-testid="timed-chrono"]').textContent).toContain(`sur ${target} s`);
    // pas encore fini à mi-temps
    await advance(h, (target / 2) * 1000);
    expect(h.doc.querySelector('[data-testid="timed-chrono"]')).toBeTruthy();
    // au temps prévu : chrono arrêté, série validée avec la durée prévue, écran de repos
    await advance(h, (target / 2) * 1000 + 600);
    expect(h.doc.querySelector('[data-testid="timed-chrono"]')).toBeNull();
    expect(h.doc.querySelector('[data-testid="guided-rest"]')).toBeTruthy();
    expect(h.errors).toEqual([]);
  }, 120000);
});
