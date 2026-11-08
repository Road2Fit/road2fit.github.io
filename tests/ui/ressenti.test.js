// Séance guidée : ressenti (1 à 10) noté exercice par exercice sur un écran à lui, enregistré dans l'historique ;
// suppression d'un exercice de la séance.
import { afterEach, describe, expect, it } from 'vitest';
import { clickText, findByText, launch, pageText, clickEl, runGuided, guidedStep } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const TIMEOUT = 120000;

const start = async () => {
  const h = await launch();
  open.push(h);
  await clickEl(h, h.doc.querySelector('[data-tab="coach"]'));
  const [lancer] = [...findByText(h, 'Lancer la séance guidée'), ...findByText(h, 'Lancer cette séance guidée maintenant')];
  await clickText(h, lancer.textContent.trim().slice(0, 30));
  return h;
};
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoufit_save_v1') || h.w.localStorage.getItem('rondoudou_save_v1'));
const q = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);

describe('ressenti par exercice', () => {
  it('écran dédié après chaque exercice, une seule fois ; puis grand chrono ; enregistré', async () => {
    const h = await start();
    let asked = 0;
    let rpeScreens = 0;
    let restWithRpe = 0;
    await runGuided(h, { onScreen: async () => {
      if (q(h, 'guided-rest') && q(h, 'guided-rpe')) restWithRpe++; // jamais de ressenti sur l'écran de repos
      if (q(h, 'guided-rpe-screen')) {
        rpeScreens++;
        expect(q(h, 'guided-rest')).toBeNull(); // écran à lui
        if (asked < 2) {
          await clickEl(h, q(h, `rpe-${asked === 0 ? 9 : 4}`));
          asked++;
          // une fois noté : retour au repos, chrono en grand, plus de question
          expect(q(h, 'guided-rpe-screen')).toBeNull();
          if (q(h, 'guided-rest')) {
            expect(q(h, 'rest-left').className).toContain('text-7xl');
            expect(q(h, 'guided-rpe')).toBeNull();
          }
        }
      }
    } });
    expect(asked).toBe(2);
    expect(restWithRpe).toBe(0);
    // un écran par exercice terminé (le dernier se note dans le résumé)
    expect(rpeScreens).toBeGreaterThanOrEqual(2);
    expect(pageText(h)).toContain('ressenti 9/10');
    expect(pageText(h)).toContain('ressenti 4/10');
    // ressenti global 8 pour les exercices sans note
    await clickText(h, 'Dur');
    await clickText(h, 'Enregistrer la séance');
    await clickText(h, 'Super, merci coach');

    const today = saved(h).quests.flatMap(x => x.history.filter(e => e.date === '2026-10-21'));
    const rpes = today.map(e => e.rpe);
    expect(rpes).toContain(9);
    expect(rpes).toContain(4);
    expect(rpes.filter(r => r === 8).length).toBeGreaterThan(0); // exercices non notés → ressenti global
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('menu ⋯ : supprimer un exercice le retire de la séance (rien d’enregistré pour lui)', async () => {
    const h = await start();
    await guidedStep(h); // comment te sens-tu ?
    const nb = () => h.doc.querySelectorAll('[data-testid="guided"] .shrink-0.flex.gap-1 > button').length;
    const before = nb();
    const histLen = name => (saved(h).quests.find(x => x.name === name) || { history: [] }).history.length;
    expect(before).toBeGreaterThan(1);
    // on fait une série du premier exercice, puis on le supprime
    while (q(h, 'warm-done')) await guidedStep(h);
    const first = q(h, 'guided-set').querySelector('h2').textContent;
    const len0 = histLen(first);
    await clickEl(h, q(h, 'set-done'));
    await clickEl(h, q(h, 'guided-menu'));
    await clickEl(h, q(h, 'remove-exercise'));
    expect(q(h, 'remove-exercise-confirm').textContent).toContain('ne seront pas enregistrées');
    await clickEl(h, q(h, 'remove-exercise-confirm'));
    expect(nb()).toBe(before - 1);
    expect(q(h, 'guided-menu-sheet')).toBeNull();
    expect(q(h, 'guided').textContent).not.toContain(first);
    expect(await runGuided(h)).toBe('summary');
    expect(q(h, 'guided').textContent).not.toContain(first);
    await clickText(h, 'Enregistrer la séance');
    await clickText(h, 'Super, merci coach');
    expect(histLen(first)).toBe(len0); // aucune séance ajoutée pour l'exercice supprimé
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});
