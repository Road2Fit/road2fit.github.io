// Fenêtre ouverte : la page derrière ne défile plus (téléphone), et revient au même endroit à la fermeture.
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickEl, launch, openQuestSheet } from './harness';
import { startScrollLock } from '../../src/lib/scrollLock';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });

describe('défilement bloqué derrière les fenêtres', () => {
  it('la fiche d’un exercice fige la page derrière, la fermer la libère', async () => {
    const h = await launch();
    open.push(h);
    const stop = startScrollLock(h.doc, h.w);
    await advance(h, 50);
    expect(h.doc.body.style.position).toBe('');
    await openQuestSheet(h);
    await advance(h, 50);
    expect(h.doc.body.style.position).toBe('fixed');
    expect(h.doc.body.style.overflow).toBe('hidden');
    await clickEl(h, h.doc.querySelector('[data-testid="quest-sheet"] button[aria-label="Fermer"]'));
    await advance(h, 50);
    expect(h.doc.body.style.position).toBe('');
    stop();
    expect(h.errors).toEqual([]);
  }, 120000);
});
