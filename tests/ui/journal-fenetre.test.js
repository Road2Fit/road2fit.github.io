// Journal : toucher un jour ouvre son résumé dans une fenêtre (téléphone), qu'on ferme d'un geste.
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickEl, launch } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const q = (h, sel) => h.doc.querySelector(sel);

describe('journal : fenêtre du jour', () => {
  it('ouvrir puis fermer le résumé d’un jour', async () => {
    const h = await launch();
    open.push(h);
    await clickEl(h, q(h, '[data-tab="journal"]'));
    await advance(h, 300);
    const day = q(h, '[data-testid^="journal-day-2"]');
    expect(day).toBeTruthy();
    await clickEl(h, day);
    await advance(h, 200);
    const sheet = q(h, '[data-testid="journal-day-sheet"]');
    expect(sheet).toBeTruthy();
    expect(sheet.textContent).toContain('Séance du');
    await clickEl(h, q(h, '[data-testid="journal-day-close"]'));
    await advance(h, 200);
    expect(q(h, '[data-testid="journal-day-sheet"]')).toBe(null);
    expect(h.errors).toEqual([]);
  }, 120000);
});
