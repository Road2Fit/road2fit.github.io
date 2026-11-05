// Application neuve : elle démarre vide, accueille l'utilisateur et tous les écrans fonctionnent sans données.
import { afterEach, describe, expect, it } from 'vitest';
import { clickEl, clickText, launch, monkey, pageText } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const TIMEOUT = 120000;
const start = async () => { const h = await launch({ empty: true }); open.push(h); return h; };

describe('application neuve (aucune donnée)', () => {
  it('affiche un message de bienvenue et aucun faux exercice', async () => {
    const h = await start();
    expect(pageText(h)).toContain('Bienvenue');
    expect(pageText(h)).toContain('Ajouter mon premier exercice');
    expect(pageText(h)).not.toContain('Tractions Pronation');
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('chaque onglet s’ouvre sans erreur', async () => {
    const h = await start();
    for (const onglet of ['Coach', 'Journal', 'Poids', 'Souvenirs', 'Bilan', 'Trophées', 'Exercices']) {
      await clickText(h, onglet);
    }
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('le premier exercice se crée depuis l’écran d’accueil', async () => {
    const h = await start();
    await clickText(h, 'Ajouter mon premier exercice');
    expect(h.doc.querySelector('.fixed.inset-0')).toBeTruthy();
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('résiste à des clics au hasard', async () => {
    const h = await start();
    const n = await monkey(h, 3, 120);
    expect(n).toBeGreaterThan(60);
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});
