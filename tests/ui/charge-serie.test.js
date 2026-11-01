// Séance guidée : la charge change entre deux séries, l'historique et le journal la gardent.
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickText, findByText, launch, pageText, clickEl } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const TIMEOUT = 120000;

const entry = (id, date, sets, value) => ({ id, date, value, sets: sets.length, reps: Math.max(...sets), setDetails: sets, validatedSets: 0, goalSets: 3, goalReps: 6, assistanceKg: 0, rpe: 8, calories: 80, note: '' });
const bench = {
  id: 'q_bench', catalogId: 'bench_press', name: 'Développé Couché Barre', category: 'Pectoraux', type: 'strength', unit: 'kg', goalMode: 'sets_reps',
  level: 1, icon: '🏋️', startValue: 40, currentValue: 15, goalValue: 100, goalSets: 3, goalReps: 6, setDetails: [6, 6, 6],
  history: [entry('h0', '2026-10-17', [6, 6, 6], 15)],
};
const SAVE = { xp: 100, quests: [bench], weightHistory: [], unlockedAchievements: [], claimedChallenges: [], soundEnabled: false, rankTrials: [4, 8, 14, 22, 35, 50] };
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));
const click = async (h, el) => { el.dispatchEvent(new h.w.MouseEvent('click', { bubbles: true })); await advance(h); };

describe('charge modifiable entre deux séries', () => {
  it('2 séries à 15 kg puis 2 séries plus lourdes : chaque série garde sa charge', async () => {
    const h = await launch({ storage: { rondoudou_save_v1: JSON.stringify(SAVE), rondoudou_local_ts: '1' } });
    open.push(h);
    await clickEl(h, h.doc.querySelector('[data-tab="coach"]'));
    const [lancer] = [...findByText(h, 'Lancer la séance guidée'), ...findByText(h, 'Lancer cette séance guidée maintenant')];
    await clickText(h, lancer.textContent.trim().slice(0, 30));
    expect(pageText(h)).toContain('Développé Couché Barre');
    expect(pageText(h)).toContain('elle vaut pour les séries restantes');

    const faites = () => [...h.doc.querySelectorAll('button')].filter(b => b.textContent.trim() === 'Faite');
    const chargeInput = () => h.doc.querySelector('input[step="0.5"]');
    const startLoad = Number(chargeInput().value);
    // séries 1 et 2 à la charge proposée
    await click(h, faites()[0]);
    await click(h, faites()[0]);
    // on augmente (bouton + de la charge) avant les séries suivantes
    const plus = [...h.doc.querySelectorAll('button')].find(b => b.textContent.trim() === '+' && b.className.includes('w-10'));
    await click(h, plus);
    await click(h, plus);
    const heavier = Number(chargeInput().value);
    expect(heavier).toBeGreaterThan(startLoad);
    // la 3e série affiche la nouvelle charge, la 1re garde l'ancienne
    const labels = [...h.doc.querySelectorAll('p.text-amber-300')].map(p => p.textContent);
    expect(labels[0]).toBe(`${String(startLoad).replace('.', ',')} kg`);
    expect(labels[2]).toBe(`${String(heavier).replace('.', ',')} kg`);
    while (faites().length) await click(h, faites()[0]);

    await clickText(h, 'Terminer ▶ Résumé');
    expect(pageText(h)).toMatch(/→/); // le résumé montre 15 → 17,5 kg
    await clickText(h, 'Enregistrer la séance');
    await clickText(h, 'Super, merci coach');

    const e = saved(h).quests[0].history.find(x => x.date === '2026-10-21');
    expect(e.setLoads).toHaveLength(e.setDetails.length);
    expect(e.setLoads.slice(0, 2)).toEqual([startLoad, startLoad]);
    expect(e.setLoads[e.setLoads.length - 1]).toBe(heavier);
    expect(e.value).toBe(heavier); // la charge la plus lourde sert de record
    expect(h.errors).toEqual([]);

    // le journal affiche les charges
    await clickText(h, 'Journal');
    expect(pageText(h)).toContain('Charges :');
  }, TIMEOUT);
});
