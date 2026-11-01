// Nouvel exercice : charge de départ et séries adaptées aux maxima et au profil de travail.
import { afterEach, describe, expect, it } from 'vitest';
import { EXERCISE_CATALOG } from '../../src/data/catalog';
import { clickEl, clickText, launch, pageText, setInput } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const TIMEOUT = 120000;

const bench = {
  id: 'q_bench', catalogId: 'bench_press', name: 'Développé Couché Barre', category: 'Pectoraux', type: 'strength', unit: 'kg', goalMode: 'sets_reps',
  level: 1, icon: '🏋️', startValue: 40, currentValue: 80, goalValue: 120, goalSets: 3, goalReps: 8, setDetails: [8, 8, 8],
  history: [{ id: 'b1', date: '2026-10-15', value: 80, sets: 3, reps: 11, setDetails: [11, 11, 11], assistanceKg: 0, rpe: 8, calories: 90, note: '' }],
};
const incline = EXERCISE_CATALOG.find(c => c.id === 'fp_incline_barbell');
const SAVE = (coach = {}) => ({
  xp: 100, quests: [bench], weightHistory: [], userWeightKg: 80, unlockedAchievements: [], claimedChallenges: [], soundEnabled: false,
  rankTrials: [4, 8, 14, 22, 35, 50], coach: { sessionsPerWeek: 2, ...coach },
});
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));
const start = async coach => {
  const h = await launch({ storage: { rondoudou_save_v1: JSON.stringify(SAVE(coach)), rondoudou_local_ts: '1' } });
  open.push(h);
  return h;
};
const choisir = async (h, nom) => {
  await clickText(h, 'Nouvel exercice');
  await clickEl(h, [...h.doc.querySelectorAll('.fixed.inset-0 button')].find(b => b.textContent.includes('Pokédex') || b.textContent.includes('Choisir')) || h.doc.querySelector('.fixed.inset-0 button'));
};

describe('formulaire « Nouvel exercice »', () => {
  it('propose une charge d’après tes maxima et l’explique', async () => {
    const h = await start();
    await clickText(h, 'Nouvel exercice');
    // le sélecteur d'exercices : on cherche « Incliné Barre »
    const modal = h.doc.querySelector('.fixed.inset-0');
    const bouton = [...modal.querySelectorAll('button')].find(b => /Choisir|Pokédex|Exercice/i.test(b.textContent) && !/Annuler|Valider|Créer/i.test(b.textContent));
    expect(bouton, 'sélecteur d’exercice').toBeTruthy();
    await clickEl(h, bouton);
    const recherche = modal.querySelector('input[type=text], input[type=search]');
    if (recherche) await setInput(h, recherche, 'Incliné Barre');
    await clickText(h, incline.name);
    expect(pageText(h)).toContain('Charge de départ');
    expect(pageText(h)).toContain('d’après tes maxima');
    expect(pageText(h)).toContain(bench.name);
    const champs = [...h.doc.querySelectorAll('.fixed.inset-0 input[type=number]')].map(i => Number(i.value));
    expect(Math.max(...champs)).toBeGreaterThan(incline.defaultStart * 1.5); // la charge de départ dépasse nettement celle d'un débutant
  }, TIMEOUT);
});

describe('ajout par le coach', () => {
  it('l’exercice ajouté part d’une charge adaptée et suit le profil', async () => {
    const h = await start({ workProfile: 'puissance' });
    await clickEl(h, h.doc.querySelector('[data-tab="coach"]'));
    // « + Presse… » / suggestions d'exercices du coach : on ajoute l'exercice d'une arène sans exercice
    const ajout = [...h.doc.querySelectorAll('button')].find(b => b.textContent.trim().startsWith('+ ') && /Presse|Traction|Squat|Rowing|Développé|Curl/.test(b.textContent));
    expect(ajout, 'bouton d’ajout du coach').toBeTruthy();
    await clickEl(h, ajout);
    const nouveau = saved(h).quests.find(q => q.id !== 'q_bench' && q.history.some(e => (e.note || '').includes('ajouté par le Coach')));
    expect(nouveau).toBeTruthy();
    expect(nouveau.goalReps).toBe(5); // haut de la fourchette du profil Puissance
    expect([3, 4]).toContain(nouveau.goalSets);
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});
