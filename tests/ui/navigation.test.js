// Navigation : barre du bas, menu « Plus », bouton « + », Coach repliable.
import { afterEach, describe, expect, it } from 'vitest';
import { clickEl, clickText, launch, pageText } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const TIMEOUT = 120000;
const start = async () => { const h = await launch(); open.push(h); return h; };
const nav = h => h.doc.querySelector('nav[aria-label="Navigation"]');
const bas = (h, texte) => [...nav(h).querySelectorAll('button')].find(b => b.textContent.includes(texte));

describe('navigation', () => {
  it('barre du bas : 5 entrées, « Suivi » ouvre le poids avec ses sous-onglets', async () => {
    const h = await start();
    expect([...nav(h).querySelectorAll('button')].map(b => b.textContent.replace(/[^A-Za-zÀ-ÿ]/g, ''))).toEqual(['Coach', 'Exercices', 'Journal', 'Suivi', 'Plus']);
    await clickEl(h, bas(h, 'Suivi'));
    expect(pageText(h)).toContain('Poids');
    const sous = h.doc.querySelector('[aria-label="Sous-onglets"]');
    expect(sous.textContent).toContain('Courbes');
    expect(sous.textContent).toContain('Mes maxima');
    await clickEl(h, [...sous.querySelectorAll('button')].find(b => b.textContent.includes('Mes maxima')));
    expect(pageText(h)).toContain('Mes maxima');
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('« Plus » : pages secondaires, sons, exporter, réinitialiser', async () => {
    const h = await start();
    await clickEl(h, bas(h, 'Plus'));
    const feuille = h.doc.querySelector('.fixed.inset-0');
    for (const t of ['Souvenirs', 'Bilan', 'Trophées', 'Sons :', 'Mon compte et ma sauvegarde', 'Exporter mes données', 'Importer une sauvegarde', 'Tout réinitialiser']) {
      expect(feuille.textContent, t).toContain(t);
    }
    await clickEl(h, [...feuille.querySelectorAll('button')].find(b => b.textContent.includes('Bilan')));
    expect(pageText(h)).not.toContain('Tout réinitialiser'); // la feuille se ferme
    expect(pageText(h)).toContain('Bilan de la semaine');
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('bouton « + » : course, exercice, minuteur (la dictée a son micro juste au-dessus)', async () => {
    const h = await start();
    const fab = h.doc.querySelector('button[aria-label="Ajouter"]');
    await clickEl(h, fab);
    for (const t of ['Activité (course, sport…)', 'Nouvel exercice', 'Minuteur de repos']) expect(pageText(h), t).toContain(t);
    // ordre du menu : Objectif / Exercice d'abord, Activité annexe ensuite
    const ordre = [...h.doc.querySelectorAll('button')].map(b => b.textContent.trim());
    expect(ordre.findIndex(x => x.includes('Nouvel exercice'))).toBeLessThan(ordre.findIndex(x => x.includes('Activité (course, sport…)')));
    expect(pageText(h)).not.toContain('Repos entre séries');
    await clickText(h, 'Minuteur de repos');
    expect(pageText(h)).toContain('Repos entre séries');
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('le Coach a des pages indépendantes : un bouton n’affiche que sa page', async () => {
    const h = await start();
    await clickEl(h, h.doc.querySelector('[data-tab="coach"]'));
    expect(pageText(h)).toContain('Prochaine séance');
    expect(pageText(h)).not.toContain('Ma semaine');
    expect(pageText(h)).not.toContain('Cycle d’entraînement');
    await clickEl(h, h.doc.querySelector('[data-testid="coach-page-semaine"]'));
    expect(pageText(h)).toContain('Ma semaine');
    expect(pageText(h)).not.toContain('Prochaine séance');
    await clickEl(h, h.doc.querySelector('[data-testid="coach-page-reglages"]'));
    expect(pageText(h)).toContain('Cycle d’entraînement');
    expect(pageText(h)).toContain('Sources scientifiques');
    expect(pageText(h)).not.toContain('Ma semaine');
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});
