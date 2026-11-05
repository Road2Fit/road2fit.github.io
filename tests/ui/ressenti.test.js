// Séance guidée : ressenti (1 à 10) noté exercice par exercice, enregistré dans l'historique.
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickText, findByText, launch, pageText, clickEl, runGuided } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const TIMEOUT = 120000;

const start = async () => {
  const h = await launch();
  open.push(h);
  return h;
};
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));
const feltButton = (h, n) => [...h.doc.querySelectorAll('button')].find(b => b.textContent.trim() === String(n) && b.className.includes('py-2 rounded-lg text-sm font-black'));

describe('ressenti par exercice', () => {
  it('chaque exercice garde son propre ressenti, les autres reprennent le ressenti global', async () => {
    const h = await start();
    await clickEl(h, h.doc.querySelector('[data-tab="coach"]'));
    const [lancer] = [...findByText(h, 'Lancer la séance guidée'), ...findByText(h, 'Lancer cette séance guidée maintenant')];
    await clickText(h, lancer.textContent.trim().slice(0, 30));

    // le ressenti se donne pendant le repos qui suit la dernière série d'un exercice : 9 pour le 1er, 4 pour le 2e
    let asked = 0;
    await runGuided(h, { onScreen: async () => {
      const row = h.doc.querySelector('[data-testid="guided-rpe"]');
      if (row && h.doc.querySelector('[data-testid="guided-rest"]') && asked < 2 && !row.querySelector('.bg-violet-600')) {
        await clickEl(h, row.querySelector(`button[aria-label="Ressenti ${asked === 0 ? 9 : 4} sur 10"]`));
        asked++;
      }
    } });
    expect(asked).toBe(2);
    expect(pageText(h)).toContain('ressenti 9/10');
    expect(pageText(h)).toContain('ressenti 4/10');
    // ressenti global 8 pour les exercices sans note
    await clickText(h, 'Dur');
    await clickText(h, 'Enregistrer la séance');
    await clickText(h, 'Super, merci coach');

    const today = saved(h).quests.flatMap(q => q.history.filter(e => e.date === '2026-10-21'));
    const rpes = today.map(e => e.rpe);
    expect(rpes).toContain(9);
    expect(rpes).toContain(4);
    expect(rpes.filter(r => r === 8).length).toBeGreaterThan(0); // exercices non notés → ressenti global
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});
