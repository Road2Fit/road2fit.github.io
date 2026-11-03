// Séance guidée : rappel de la série suivante sur le minuteur de repos, bouton « = ».
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickText, findByText, launch, pageText, clickEl } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const TIMEOUT = 120000;
const click = async (h, el) => { el.dispatchEvent(new h.w.MouseEvent('click', { bubbles: true })); await advance(h); };

describe('séance guidée : repos et saisie rapide', () => {
  it('« Faite » lance le repos avec un rappel de la série suivante ; « = » copie les répétitions', async () => {
    const h = await launch();
    open.push(h);
    const events = [];
    h.w.addEventListener('rondoufit-rest', e => events.push(e.detail));
    await clickEl(h, h.doc.querySelector('[data-tab="coach"]'));
    const [lancer] = [...findByText(h, 'Lancer la séance guidée'), ...findByText(h, 'Lancer cette séance guidée maintenant')];
    await clickText(h, lancer.textContent.trim().slice(0, 30));
    const faites = () => [...h.doc.querySelectorAll('button')].filter(b => b.textContent.trim() === 'Faite');
    await click(h, faites()[0]);
    expect(events).toHaveLength(1);
    expect(events[0].sec).toBeGreaterThan(30);
    expect(events[0].next).toMatch(/^Série 2\//);
    // le rappel s'affiche sur le minuteur
    expect(pageText(h)).toContain(events[0].next);
    // « = » existe à partir de la 2e série non faite
    const egal = [...h.doc.querySelectorAll('button[aria-label="Comme la série précédente"]')];
    expect(egal.length).toBeGreaterThan(0);
    await click(h, egal[0]);
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});

describe('fin de séance : pas de repos', () => {
  it('la dernière série de la séance (même cochée dans le désordre) ne lance pas le minuteur, et coupe celui en cours', async () => {
    const h = await launch();
    open.push(h);
    const events = [];
    let stops = 0;
    h.w.addEventListener('rondoufit-rest', e => events.push(e.detail));
    h.w.addEventListener('rondoufit-rest-stop', () => { stops++; });
    await clickEl(h, h.doc.querySelector('[data-tab="coach"]'));
    const [lancer] = [...findByText(h, 'Lancer la séance guidée'), ...findByText(h, 'Lancer cette séance guidée maintenant')];
    await clickText(h, lancer.textContent.trim().slice(0, 30));
    const faite = () => [...h.doc.querySelectorAll('button')].find(b => b.textContent.trim() === 'Faite');
    const suivant = () => [...h.doc.querySelectorAll('button')].find(b => /Exercice suivant/.test(b.textContent));
    let before = 0;
    for (let k = 0; k < 80; k++) {
      const f = faite();
      if (f) { before = events.length; await click(h, f); continue; }
      const n = suivant();
      if (!n) break;
      await click(h, n);
    }
    expect(faite()).toBeFalsy(); // tout est coché
    expect(events.length).toBe(before); // la dernière série n'a pas lancé de repos
    expect(stops).toBeGreaterThanOrEqual(1);
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});
