// Petit jeu pendant le repos : icône sur l'écran de repos ; le jeu s'arrête avec le repos et revient (en pause) au repos suivant.
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickEl, findByText, clickText, launch } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const q = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);

describe('jeu pendant le repos', () => {
  it('icône → jeu ; fin du repos → le jeu disparaît ; repos suivant → il revient ; « Fermer le jeu » → il ne revient plus', async () => {
    const h = await launch();
    open.push(h);
    await clickEl(h, h.doc.querySelector('[data-tab="coach"]'));
    const [lancer] = [...findByText(h, 'Lancer la séance guidée'), ...findByText(h, 'Lancer cette séance guidée maintenant')];
    await clickText(h, lancer.textContent.trim().slice(0, 30));
    if (q(h, 'feel-ok')) await clickEl(h, q(h, 'feel-ok'));
    while (q(h, 'warm-done')) await clickEl(h, [...q(h, 'warmup').querySelectorAll('button')].find(b => /Passer/.test(b.textContent)));
    await clickEl(h, q(h, 'set-done'));
    expect(q(h, 'guided-rest')).toBeTruthy();
    expect(q(h, 'rest-game')).toBeNull();
    await clickEl(h, q(h, 'rest-game-open'));
    expect(q(h, 'rest-game')).toBeTruthy();
    expect(q(h, 'rest-left')).toBeTruthy(); // le temps de repos reste affiché
    await clickEl(h, q(h, 'game-jump'));
    await clickEl(h, q(h, 'game-duck'));
    // au doigt : glisser vers le haut (saut), vers le bas puis relâcher (se baisser), simple toucher (saut)
    const area = q(h, 'game-area');
    const ptr = (type, y) => area.dispatchEvent(new h.w.MouseEvent(type, { bubbles: true, clientY: y }));
    ptr('pointerdown', 200); ptr('pointermove', 150); ptr('pointerup', 150);
    ptr('pointerdown', 100); ptr('pointermove', 160); ptr('pointermove', 170); ptr('pointerup', 170);
    ptr('pointerdown', 120); ptr('pointerup', 121);
    await advance(h, 200);
    // fin du repos (série suivante) : le jeu s'arrête
    await clickEl(h, q(h, 'guided-next'));
    expect(q(h, 'rest-game')).toBeNull();
    // repos suivant : le jeu revient tout seul
    await clickEl(h, q(h, 'set-done'));
    expect(q(h, 'rest-game')).toBeTruthy();
    // fermé volontairement : il ne revient plus au repos suivant
    await clickEl(h, q(h, 'game-close'));
    expect(q(h, 'rest-game')).toBeNull();
    await clickEl(h, q(h, 'guided-next'));
    if (q(h, 'set-done')) await clickEl(h, q(h, 'set-done'));
    if (q(h, 'guided-rest')) expect(q(h, 'rest-game')).toBeNull();
    await advance(h, 300);
    expect(h.errors).toEqual([]);
  }, 120000);
});
