// 4.51.4 : « Mes maxima » en haut de l'onglet Exercices (choix de Gabin, option A).
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickEl, clickText, launch } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const q = (h, sel) => h.doc.querySelector(sel);

describe('mes maxima', () => {
  it('tableau de tous les maxima, une ligne ouvre la fiche sur le maximum, puis on revient au tableau', async () => {
    const h = await launch({});
    open.push(h);
    await clickText(h, 'Exercices');
    await advance(h, 200);
    await clickEl(h, q(h, '[data-testid="maxima-open"]'));
    const rows = [...h.doc.querySelectorAll('[data-testid^="maxima-row-"]')];
    expect(rows.length).toBeGreaterThan(1);
    expect(h.doc.querySelectorAll('[data-testid="maxima-est"]').length).toBeGreaterThan(0);
    const withEst = rows.find(r => r.querySelector('[data-testid="maxima-est"]'));
    await clickEl(h, withEst);
    expect(q(h, '[data-testid="quest-max"]')).toBeTruthy();
    expect(q(h, '[data-testid="maxima-table"]')).toBeNull();
    await clickEl(h, q(h, '[data-testid="quest-sheet"] button[aria-label="Fermer"]'));
    expect(q(h, '[data-testid="maxima-table"]')).toBeTruthy();
    expect(h.errors).toEqual([]);
  }, 120000);
});
