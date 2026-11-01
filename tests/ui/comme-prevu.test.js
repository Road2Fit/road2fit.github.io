// Noter séance : « Remplir comme prévu par le coach » reprend la proposition du coach.
import { afterEach, describe, expect, it } from 'vitest';
import { computeExerciseTarget } from '../../src/coach/targets';
import { clickEl, clickText, findByText, launch, pageText } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const TIMEOUT = 120000;

const entry = (id, date, sets, value) => ({ id, date, value, sets: sets.length, reps: Math.max(...sets), setDetails: sets, validatedSets: 3, goalSets: 3, goalReps: 6, assistanceKg: 0, rpe: 7, calories: 80, note: '' });
const bench = {
  id: 'q_bench', catalogId: 'bench_press', name: 'Développé Couché Barre', category: 'Pectoraux', type: 'strength', unit: 'kg', goalMode: 'sets_reps',
  level: 1, icon: '🏋️', startValue: 40, currentValue: 60, goalValue: 100, goalSets: 3, goalReps: 6, setDetails: [6, 6, 6],
  history: [entry('h0', '2026-10-14', [6, 6, 6], 57.5), entry('h1', '2026-10-17', [6, 6, 6], 60)],
};
const SAVE = { xp: 100, quests: [bench], weightHistory: [], unlockedAchievements: [], claimedChallenges: [], soundEnabled: false, rankTrials: [4, 8, 14, 22, 35, 50] };
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));

describe('Noter séance : comme prévu par le coach', () => {
  it('reprend charge, séries et répétitions du coach, puis enregistre', async () => {
    const h = await launch({ storage: { rondoudou_save_v1: JSON.stringify(SAVE), rondoudou_local_ts: '1' } });
    open.push(h);
    const t = computeExerciseTarget(bench, { today: '2026-10-21' });
    await clickText(h, 'Noter la séance');
    await clickText(h, 'Remplir comme prévu par le coach');
    expect(pageText(h)).toContain('Proposition du coach reprise');
    const charge = h.doc.querySelector('.fixed.inset-0 input[step="0.5"], .fixed.inset-0 input[type="number"]');
    expect(Number(charge.value)).toBe(t.load);
    await clickText(h, 'Valider la séance');
    const e = saved(h).quests[0].history.find(x => x.date === '2026-10-21');
    expect(e.value).toBe(t.load);
    expect(e.setDetails).toEqual(t.targetReps);
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});
