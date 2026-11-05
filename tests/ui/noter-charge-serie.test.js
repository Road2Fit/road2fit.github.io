// « Noter séance » : charge (ou aide) différente selon la série.
import { afterEach, describe, expect, it } from 'vitest';
import { clickEl, clickText, findByText, launch, pageText, setInput , openQuestSheet } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const TIMEOUT = 120000;

const entry = (id, date, sets, value, assistanceKg = 0) => ({ id, date, value, sets: sets.length, reps: Math.max(...sets), setDetails: sets, validatedSets: 0, goalSets: 4, goalReps: 6, assistanceKg, rpe: 8, calories: 80, note: '' });
const bench = {
  id: 'q_bench', catalogId: 'bench_press', name: 'Développé Couché Barre', category: 'Pectoraux', type: 'strength', unit: 'kg', goalMode: 'sets_reps',
  level: 1, icon: '🏋️', startValue: 40, currentValue: 15, goalValue: 100, goalSets: 4, goalReps: 6, setDetails: [6, 6, 6, 6],
  history: [entry('h0', '2026-10-17', [6, 6, 6, 6], 15)],
};
const dips = {
  id: 'q_dips', catalogId: 'dips_assisted', name: 'Dips Assistés', category: 'Pectoraux', type: 'strength', unit: 'reps', goalMode: 'sets_reps',
  level: 1, icon: '💪', startValue: 6, currentValue: 8, goalValue: 10, goalSets: 3, goalReps: 10, startAssistanceKg: 20, currentAssistanceKg: 10,
  goalAssistanceKg: 0, setDetails: [10, 10, 10], history: [entry('d0', '2026-10-17', [10, 10, 10], 10, 10)],
};
const SAVE = { xp: 100, quests: [bench, dips], weightHistory: [], unlockedAchievements: [], claimedChallenges: [], soundEnabled: false, rankTrials: [4, 8, 14, 22, 35, 50] };
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));

async function ouvrir(nomExercice) {
  const h = await launch({ storage: { rondoudou_save_v1: JSON.stringify(SAVE), rondoudou_local_ts: '1' } });
  open.push(h);
  // le bouton « Noter la séance » de la fiche de cet exercice
  const carte = await openQuestSheet(h, nomExercice);
  await clickEl(h, [...carte.querySelectorAll('button')].find(b => b.textContent.includes('Noter la séance')));
  return h;
}
const modal = h => h.doc.querySelector('.fixed.inset-0.z-50');
const caseCharge = h => [...modal(h).querySelectorAll('input[type=checkbox]')][0];
const champsSerie = h => [...modal(h).querySelectorAll('input[title^="Charge de cette série"], input[title^="Aide de cette série"]')];

describe('Noter séance : charge par série', () => {
  it('2 séries à la charge de base puis 2 plus lourdes : chaque série est enregistrée avec sa charge', async () => {
    const h = await ouvrir('Développé Couché Barre');
    expect(champsSerie(h)).toHaveLength(0);
    expect(modal(h).textContent).toContain('Charge différente selon la série');
    await clickEl(h, caseCharge(h));
    const champs = champsSerie(h);
    expect(champs).toHaveLength(4);
    expect(champs.every(c => c.value === '15')).toBe(true); // valeur de base partout au départ
    await setInput(h, champs[2], '17.5');
    await setInput(h, champs[3], '17.5');
    await clickText(h, 'Valider la séance');
    const e = saved(h).quests[0].history.find(x => x.date !== '2026-10-17');
    expect(e.setLoads).toEqual([15, 15, 17.5, 17.5]);
    expect(e.value).toBe(17.5); // la plus lourde = record
    expect(e.note).toContain('15 → 17,5 kg');
    expect(saved(h).quests[0].currentValue).toBe(17.5);
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('changer la charge de base change les séries sans valeur propre', async () => {
    const h = await ouvrir('Développé Couché Barre');
    await clickEl(h, caseCharge(h));
    await setInput(h, champsSerie(h)[3], '20');
    const base = modal(h).querySelector('input[step="0.5"]:not([title])');
    await setInput(h, base, '12.5');
    expect(champsSerie(h).map(c => c.value)).toEqual(['12.5', '12.5', '12.5', '20']);
  }, TIMEOUT);

  it('décocher revient à une charge unique', async () => {
    const h = await ouvrir('Développé Couché Barre');
    await clickEl(h, caseCharge(h));
    await setInput(h, champsSerie(h)[3], '20');
    await clickEl(h, caseCharge(h));
    expect(champsSerie(h)).toHaveLength(0);
    await clickText(h, 'Valider la séance');
    const e = saved(h).quests[0].history.find(x => x.date !== '2026-10-17');
    expect(e.setLoads).toBeUndefined();
    expect(e.value).toBe(15);
  }, TIMEOUT);

  it('exercice assisté : aide différente selon la série, la plus faible sert de record', async () => {
    const h = await ouvrir('Dips Assistés');
    expect(findByText(h, 'Aide différente selon la série').length).toBeGreaterThan(0);
    const cases = [...modal(h).querySelectorAll('input[type=checkbox]')];
    await clickEl(h, cases[0]);
    const champs = champsSerie(h);
    expect(champs).toHaveLength(3);
    await setInput(h, champs[1], '7.5');
    await setInput(h, champs[2], '7.5');
    await clickText(h, 'Valider la séance');
    const e = saved(h).quests[1].history.find(x => x.date !== '2026-10-17');
    expect(e.setAssists).toEqual([10, 7.5, 7.5]);
    expect(e.assistanceKg).toBe(7.5);
    expect(saved(h).quests[1].currentAssistanceKg).toBe(7.5);
    expect(pageText(h)).not.toContain('NaN');
  }, TIMEOUT);
});
