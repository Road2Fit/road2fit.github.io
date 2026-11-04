// Séance guidée : chaque exercice commence par 1 à 2 séries d'échauffement, jamais enregistrées.
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickText, findByText, launch, pageText, clickEl } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const TIMEOUT = 120000;

const entry = (id, date, sets, value) => ({ id, date, value, sets: sets.length, reps: Math.max(...sets), setDetails: sets, validatedSets: 0, goalSets: 3, goalReps: 6, assistanceKg: 0, rpe: 8, calories: 80, note: '' });
const bench = {
  id: 'q_bench', catalogId: 'bench_press', name: 'Développé Couché Barre', category: 'Pectoraux', type: 'strength', unit: 'kg', goalMode: 'sets_reps',
  level: 1, icon: '🏋️', startValue: 40, currentValue: 60, goalValue: 100, goalSets: 3, goalReps: 6, setDetails: [6, 6, 6],
  history: [entry('h0', '2026-10-17', [6, 6, 6], 60)],
};
const SAVE = { xp: 100, quests: [bench], weightHistory: [], unlockedAchievements: [], claimedChallenges: [], soundEnabled: false, rankTrials: [4, 8, 14, 22, 35, 50] };
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));
const click = async (h, el) => { el.dispatchEvent(new h.w.MouseEvent('click', { bubbles: true })); await advance(h); };

describe('échauffement avant les séries de travail', () => {
  it('s’affiche, se coche sans compter dans la séance et n’est pas enregistré', async () => {
    const h = await launch({ storage: { rondoudou_save_v1: JSON.stringify(SAVE), rondoudou_local_ts: '1' } });
    open.push(h);
    await clickEl(h, h.doc.querySelector('[data-tab="coach"]'));
    const [lancer] = [...findByText(h, 'Lancer la séance guidée'), ...findByText(h, 'Lancer cette séance guidée maintenant')];
    await clickText(h, lancer.textContent.trim().slice(0, 30));

    const zone = () => h.doc.querySelector('[data-testid="warmup"]');
    expect(zone()).toBeTruthy();
    expect(zone().textContent).toContain('Échauffement');
    expect(zone().textContent).toContain('compté dans les calories');
    const lignes = zone().querySelectorAll('button');
    expect(lignes.length).toBeGreaterThanOrEqual(1);
    expect(lignes.length).toBeLessThanOrEqual(2);

    await click(h, lignes[0]);
    expect(zone().textContent).toContain('✓ Fait');
    // les séries de travail ne sont pas touchées
    const faites = () => [...h.doc.querySelectorAll('button')].filter(b => b.textContent.trim() === 'Faite');
    expect(faites().length).toBeGreaterThanOrEqual(2);
    const nb = faites().length;
    while (faites().length) await click(h, faites()[0]);

    await clickText(h, 'Voir le résumé');
    await clickText(h, 'Enregistrer la séance');
    await clickText(h, 'Super, merci coach');
    const e = saved(h).quests[0].history.find(x => x.date === '2026-10-21');
    expect(e.setDetails).toHaveLength(nb); // aucune série d'échauffement dans l'historique
    expect(e.sets).toBe(nb);
    // l'échauffement fait compte dans les calories : plus que les mêmes séries sans échauffement
    const { calculateStrengthCalories } = await import('../../src/lib/calories');
    const sans = calculateStrengthCalories({ unit: 'kg', weightKg: e.value, setDetails: e.setDetails, rpe: e.rpe, userWeightKg: saved(h).userWeightKg });
    expect(e.calories).toBeGreaterThan(sans);
    expect(pageText(h)).not.toContain('undefined');
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('la séance guidée montre une petite animation du mouvement, masquable', async () => {
    const h = await launch({ storage: { rondoudou_save_v1: JSON.stringify(SAVE), rondoudou_local_ts: '1' } });
    open.push(h);
    await clickEl(h, h.doc.querySelector('[data-tab="coach"]'));
    const [lancer] = [...findByText(h, 'Lancer la séance guidée'), ...findByText(h, 'Lancer cette séance guidée maintenant')];
    await clickText(h, lancer.textContent.trim().slice(0, 30));
    await advance(h, 300);
    expect(h.doc.querySelector('[data-testid="mini-movement"]')).toBeTruthy();
    await clickText(h, 'Masquer l’aperçu');
    expect(h.doc.querySelector('[data-testid="mini-movement"]')).toBeNull();
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});
