// Corriger une séance dans le journal, et aller à l'encontre de la proposition du coach.
import { afterEach, describe, expect, it } from 'vitest';
import { clickText, expandCoachDetails, findByText, launch, pageText, setInput, clickEl } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const TIMEOUT = 120000;

const entry = (id, date, sets, assistanceKg) => ({
  id, date, value: Math.max(...sets), sets: sets.length, reps: Math.max(...sets), setDetails: sets,
  validatedSets: sets.filter(r => r >= 10).length, goalSets: 3, goalReps: 10, assistanceKg, rpe: 8, calories: 50,
  note: `Séries : ${sets.join(' - ')} reps (Aide ${assistanceKg} kg) • ${sets.filter(r => r >= 10).length}/3 séries validées`,
});
const dips = {
  id: 'q_dips', catalogId: 'dips_assisted', name: 'Dips Assistés', category: 'Pectoraux', type: 'strength', unit: 'reps',
  goalMode: 'sets_reps', level: 1, icon: '💪', startValue: 6, currentValue: 10, goalValue: 10, goalSets: 3, goalReps: 10,
  startAssistanceKg: 15, currentAssistanceKg: 10, goalAssistanceKg: 0, setDetails: [10, 10, 9],
  history: [entry('h1', '2026-10-14', [10, 9, 9], 10), entry('h2', '2026-10-21', [10, 10, 9], 10)],
};
const SAVE = { xp: 100, quests: [dips], weightHistory: [], unlockedAchievements: [], claimedChallenges: [], soundEnabled: false, rankTrials: [4, 8, 14, 22, 35, 50] };
const start = async () => {
  const h = await launch({ storage: { rondoudou_save_v1: JSON.stringify(SAVE), rondoudou_local_ts: '1' } });
  open.push(h);
  return h;
};
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));

describe('corriger une séance du journal', () => {
  it('corrige un 9 en 10 : séance, calories, note et exercice sont mis à jour', async () => {
    const h = await start();
    await clickText(h, 'Journal');
    await clickText(h, 'Corriger');
    expect(pageText(h)).toContain('Corriger cette séance');
    const form = h.doc.querySelector('form');
    const reps = [...form.querySelectorAll('input[type=number]')].slice(0, 3);
    expect(reps.map(i => i.value)).toEqual(['10', '10', '9']);
    await setInput(h, reps[2], '10');
    await clickText(h, 'Enregistrer la correction');
    const e = saved(h).quests[0].history.find(x => x.id === 'h2');
    expect(e.setDetails).toEqual([10, 10, 10]);
    expect(e.validatedSets).toBe(3);
    expect(e.note).toContain('10 - 10 - 10');
    expect(saved(h).quests[0].setDetails).toEqual([10, 10, 10]);
    expect(findByText(h, 'Corriger cette séance')).toHaveLength(0); // l'éditeur se referme
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('Annuler ne change rien', async () => {
    const h = await start();
    await clickText(h, 'Journal');
    await clickText(h, 'Corriger');
    await clickText(h, 'Annuler');
    expect(saved(h).quests[0].history.find(x => x.id === 'h2').setDetails).toEqual([10, 10, 9]);
    expect(findByText(h, 'Corriger cette séance')).toHaveLength(0);
  }, TIMEOUT);
});

describe('aller à l’encontre du coach', () => {
  it('le coach propose de reculer : je choisis moins d’aide, puis je reviens à sa proposition', async () => {
    const h = await start();
    await clickEl(h, h.doc.querySelector('[data-tab="coach"]'));
    await expandCoachDetails(h);
    expect(pageText(h)).toContain('aide 12,5 kg'); // la proposition du coach : l'aide remonte
    await clickText(h, 'Moins d’aide'); // 12,5 → 10
    expect(pageText(h)).toContain('aide 10 kg');
    await clickText(h, 'Moins d’aide'); // 10 → 7,5
    expect(pageText(h)).toContain('aide 7,5 kg');
    expect(pageText(h)).toContain('Ton choix');
    expect(pageText(h)).toContain('Le coach proposait 12.5 kg d’aide');
    expect(saved(h).quests[0].coachOverride).toMatchObject({ entries: 2, assist: 7.5 });
    await clickText(h, 'Proposition du coach');
    expect(pageText(h)).toContain('aide 12,5 kg');
    expect(saved(h).quests[0].coachOverride).toBeUndefined();
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('plus d’aide : le choix s’additionne à chaque clic', async () => {
    const h = await start();
    await clickEl(h, h.doc.querySelector('[data-tab="coach"]'));
    await expandCoachDetails(h);
    await clickText(h, 'Plus d’aide');
    await clickText(h, 'Plus d’aide');
    expect(saved(h).quests[0].coachOverride.assist).toBe(17.5);
    expect(pageText(h)).toContain('aide 17,5 kg');
  }, TIMEOUT);
});
