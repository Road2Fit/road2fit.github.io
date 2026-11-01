// Séance guidée : ressenti (1 à 10) noté exercice par exercice, enregistré dans l'historique.
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickText, findByText, launch, pageText, clickEl } from './harness';

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

    // exercice 1 : toutes les séries faites, ressenti 9
    const noms = [];
    for (let i = 0; i < 12 && !findByText(h, 'Résumé de la séance').length; i++) {
      noms.push(h.doc.querySelector('h2').textContent);
      for (const b of [...h.doc.querySelectorAll('button')].filter(b => b.textContent.trim() === 'Faite')) {
        b.dispatchEvent(new h.w.MouseEvent('click', { bubbles: true }));
        await advance(h);
      }
      if (i === 0) {
        expect(pageText(h)).toContain('Ressenti sur cet exercice');
        expect(pageText(h)).toContain('Pas noté : le ressenti global');
        await (async () => { feltButton(h, 9).dispatchEvent(new h.w.MouseEvent('click', { bubbles: true })); await advance(h); })();
        expect(pageText(h)).toContain('9/10 : Presque au maximum');
      }
      if (i === 1) { feltButton(h, 4).dispatchEvent(new h.w.MouseEvent('click', { bubbles: true })); await advance(h); }
      const [suite] = [...findByText(h, 'Voir le résumé'), ...findByText(h, 'Exercice suivant')];
      if (!suite) break;
      await clickText(h, suite.textContent.trim().slice(0, 30));
    }
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
