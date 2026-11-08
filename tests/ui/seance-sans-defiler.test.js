// Page Séance du Coach : tout tient dans l'écran. En haut, l'encadré « Prochaine séance » ouvre une fenêtre
// (voir et modifier la séance) ; objectif et programme dans des pastilles qui ouvrent aussi une fenêtre.
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickEl, launch } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const q = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);
const shown = el => !!el && !el.className.split(' ').includes('hidden');

describe('page Séance sans défiler', () => {
  it('encadré Prochaine séance en haut → fenêtre, fermée par défaut', async () => {
    const h = await launch({ openCoach: true });
    open.push(h);
    await advance(h, 300);
    const card = q(h, 'next-session-open');
    expect(card).toBeTruthy();
    // l'encadré est avant le grand rond
    const hero = q(h, 'session-hero');
    expect(card.compareDocumentPosition(hero) & h.w.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(card.textContent).toMatch(/exos · \d+ min/);
    // la séance détaillée est dans une fenêtre fermée
    expect(shown(q(h, 'sheet-next'))).toBe(false);
    await clickEl(h, card);
    expect(shown(q(h, 'sheet-next'))).toBe(true);
    expect(q(h, 'sheet-next').querySelector('[data-testid="next-ex"]')).toBeTruthy();
    await clickEl(h, q(h, 'sheet-next').querySelector('button[aria-label="Fermer"]'));
    expect(shown(q(h, 'sheet-next'))).toBe(false);
    // « Parle à ton coach » sous le rond (seulement avec la coach IA disponible)
    if (q(h, 'coach-chat-open')) expect(hero.compareDocumentPosition(q(h, 'coach-chat-open')) & h.w.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(h.errors).toEqual([]);
  }, 120000);

  it('questions à répondre une fois : notifications en haut, puis rangées dans Réglages', async () => {
    const h = await launch({ openCoach: true });
    open.push(h);
    await advance(h, 300);
    // en haut, avant le rond
    const hero = q(h, 'session-hero');
    for (const id of ['notif-goal', 'notif-program']) {
      expect(q(h, id)).toBeTruthy();
      expect(q(h, id).compareDocumentPosition(hero) & h.w.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    // objectif : « Choisir » ouvre la fenêtre
    await clickEl(h, q(h, 'goal-open'));
    expect(shown(q(h, 'sheet-goal'))).toBe(true);
    await clickEl(h, q(h, 'sheet-goal').querySelector('button[aria-label="Fermer"]'));
    // « Tu as déjà un coach ? » → Non : la notification disparaît, la question reste dans Réglages
    await clickEl(h, q(h, 'notif-program-no'));
    expect(q(h, 'notif-program')).toBeNull();
    await clickEl(h, q(h, 'coach-page-reglages'));
    expect(q(h, 'program-intro')).toBeTruthy();
    expect(h.errors).toEqual([]);
  }, 120000);
});
