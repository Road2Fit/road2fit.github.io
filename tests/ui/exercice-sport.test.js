// 4.43 : « Nouvel exercice » : onglet du sport de la personne (exercices adaptés) et logo cœur sur « Cardio ».
import { afterEach, describe, expect, it } from 'vitest';
import { clickEl, clickText, launch } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const q = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);
const SAVE = sport => ({ xp: 100, quests: [], weightHistory: [], userWeightKg: 80, unlockedAchievements: [], claimedChallenges: [], soundEnabled: false, rankTrials: [4, 8, 14, 22, 35, 50], coach: { sessionsPerWeek: 2, ...(sport !== undefined ? { sport } : {}) } });
const names = h => [...h.doc.querySelectorAll('.fixed.inset-0 .max-h-56 button')].map(b => b.textContent);

async function openPicker(h) {
  await clickText(h, 'Nouvel exercice');
  const modal = h.doc.querySelector('.fixed.inset-0');
  if (!q(h, 'picker-filter-all')) {
    const b = [...modal.querySelectorAll('button')].find(x => /Choisir|Pokédex|Exercice/i.test(x.textContent) && !/Annuler|Valider|Créer/i.test(x.textContent));
    if (b) await clickEl(h, b);
  }
}

describe('nouvel exercice : trier par sport', () => {
  it('volley : onglet « Volley » avec les exercices adaptés ; Cardio a son cœur', async () => {
    const h = await launch({ storage: { rondoudou_save_v1: JSON.stringify(SAVE('volley')), rondoudou_local_ts: '1' } });
    open.push(h);
    await openPicker(h);
    const tab = q(h, 'picker-filter-sport');
    expect(tab.textContent).toMatch(/Volley/);
    await clickEl(h, tab);
    const list = names(h);
    expect(list.length).toBeGreaterThanOrEqual(5);
    expect(list.some(t => /Saut d’Attaque/.test(t))).toBe(true);
    expect(list.some(t => /Rotation Externe/.test(t))).toBe(true);
    const cardio = q(h, 'picker-filter-cardio');
    expect(cardio.textContent).toMatch(/Cardio/);
    expect(cardio.querySelector('svg')).toBeTruthy();
    expect(h.errors).toEqual([]);
  }, 120000);

  it('escalade : suspensions ; aucun sport précisé : pas d’onglet', async () => {
    const h = await launch({ storage: { rondoudou_save_v1: JSON.stringify(SAVE('escalade')), rondoudou_local_ts: '1' } });
    open.push(h);
    await openPicker(h);
    await clickEl(h, q(h, 'picker-filter-sport'));
    expect(names(h).some(t => /Dead Hang/.test(t))).toBe(true);
    h.close(); open.pop();
    const h2 = await launch({ storage: { rondoudou_save_v1: JSON.stringify(SAVE('')), rondoudou_local_ts: '1' } });
    open.push(h2);
    await openPicker(h2);
    expect(q(h2, 'picker-filter-all')).toBeTruthy();
    expect(q(h2, 'picker-filter-sport')).toBeNull();
  }, 120000);
});
