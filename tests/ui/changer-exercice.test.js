// Ajuster : changer l'exercice (ex. presse horizontale → presse 45°) en gardant tout l'historique.
import { afterEach, describe, expect, it } from 'vitest';
import { clickEl, clickText, findByText, launch, pageText } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const TIMEOUT = 120000;
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));

const entry = (id, date, sets, value) => ({ id, date, value, sets: sets.length, reps: Math.max(...sets), setDetails: sets, validatedSets: 0, goalSets: 4, goalReps: 10, assistanceKg: 0, rpe: 8, calories: 120, note: 'séance ' + id });
const presse = {
  id: 'q_presse', catalogId: 'fp_leg_press_h', name: 'Presse à Cuisses Horizontale', category: 'Jambes', type: 'strength', unit: 'kg', goalMode: 'sets_reps',
  level: 2, icon: '⚡', startValue: 60, currentValue: 140, goalValue: 180, goalSets: 4, goalReps: 10, setDetails: [10, 10, 10, 9],
  history: [entry('h1', '2026-10-10', [10, 10, 10, 8], 130), entry('h2', '2026-10-17', [10, 10, 10, 9], 140)],
};
const SAVE = { xp: 100, quests: [presse], weightHistory: [], unlockedAchievements: [], claimedChallenges: [], soundEnabled: false, rankTrials: [4, 8, 14, 22, 35, 50] };

describe('changer d’exercice depuis Ajuster', () => {
  it('presse horizontale → presse 45° : tout est conservé, seul l’exercice change', async () => {
    const h = await launch({ storage: { rondoudou_save_v1: JSON.stringify(SAVE), rondoudou_local_ts: '1' } });
    open.push(h);
    await clickText(h, 'Ajuster');
    expect(pageText(h)).toContain('Changer d’exercice');
    await clickText(h, 'Changer d’exercice');
    // tous les exercices de musculation sont listés (ceux d'une autre unité sont marqués « Autre unité »), mais pas le cardio
    const fenetre = h.doc.querySelector('.fixed.inset-0');
    const boutons = [...fenetre.querySelectorAll('button')].map(b => b.textContent);
    expect(boutons.some(t => t.includes('Presse à Cuisses 45°'))).toBe(true);
    const tractions = boutons.find(t => t.includes('Tractions Pronation'));
    expect(tractions).toContain('Autre unité');
    expect(boutons.find(t => t.includes('Presse à Cuisses 45°'))).not.toContain('Autre unité');
    expect(boutons.some(t => t.includes('Course à pied'))).toBe(false);
    expect(boutons.some(t => t.includes('personnalisé'))).toBe(false);
    await clickEl(h, [...fenetre.querySelectorAll('button')].find(b => b.textContent.includes('Presse à Cuisses 45°')));
    expect(pageText(h)).toContain('Exercice remplacé par « Presse à Cuisses 45° (Plaques) »');
    await clickText(h, 'Enregistrer l’objectif');
    const q = saved(h).quests[0];
    expect(q.id).toBe('q_presse');
    expect(q.catalogId).toBe('fp_leg_press_45');
    expect(q.name).toBe('Presse à Cuisses 45° (Plaques)');
    expect(q.history).toHaveLength(2);
    expect(q.history.map(e => e.value)).toEqual([130, 140]);
    expect(q.currentValue).toBe(140);
    expect(q.goalValue).toBe(180);
    expect(q.goalSets).toBe(4);
    expect(q.level).toBe(2);
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('les exercices de poids du corps ne se remplacent que par des exercices de poids du corps', async () => {
    const h = await launch();
    open.push(h);
    await clickText(h, 'Ajuster'); // première carte : tractions (répétitions avec aide)
    await clickText(h, 'Changer d’exercice');
    const fenetre = h.doc.querySelector('.fixed.inset-0');
    const boutons = [...fenetre.querySelectorAll('button')].map(b => b.textContent);
    expect(boutons.some(t => t.includes('Tractions Supination'))).toBe(true);
    expect(boutons.find(t => t.includes('Squat Barre'))).toContain('Autre unité'); // listé, mais il faudra l'ajouter comme nouvel exercice
    expect(boutons.some(t => t.includes('Course à pied'))).toBe(false);
    expect(findByText(h, 'Créer la quête')).toHaveLength(0);
  }, TIMEOUT);
});
