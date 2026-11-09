// Nouveautés : après une mise à jour, une pastille sur ⚙️ (Réglages et données → Nouveautés) ; le bandeau propose de rafraîchir.
import { afterEach, describe, expect, it } from 'vitest';
import { CURRENT_VERSION, PATCH_NOTES } from '../../src/data/patchNotes';
import { advance, clickEl, clickText, launch } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const T = 120000;
const dialog = h => h.doc.querySelector('[role="dialog"][aria-label="Nouveautés"]');

describe('nouveautés', () => {
  it('première ouverture : rien ne s’affiche, la version est retenue', async () => {
    const h = await launch();
    open.push(h);
    expect(dialog(h)).toBeNull();
    expect(h.w.localStorage.getItem('rondoufit:seenVersion')).toBe(CURRENT_VERSION);
  }, T);

  it('après une mise à jour : pas de fenêtre, une pastille sur ⚙️ et « Nouveautés » jusqu’à la lecture', async () => {
    const old = PATCH_NOTES[PATCH_NOTES.length - 1].version;
    const h = await launch({ storage: { 'rondoufit:seenVersion': old } });
    open.push(h);
    expect(dialog(h)).toBeNull();
    expect(h.doc.querySelector('[data-testid="gear-badge"]')).toBeTruthy();
    await clickEl(h, h.doc.querySelector('button[aria-label="Réglages et données"]'));
    expect(h.doc.querySelector('[data-testid="notes-badge"]')).toBeTruthy();
    await clickEl(h, h.doc.querySelector('[data-testid="open-patchnotes"]'));
    expect(dialog(h).textContent).toContain(PATCH_NOTES[0].title);
    expect(dialog(h).textContent).toContain('nouveau');
    await clickText(h, 'Compris');
    expect(dialog(h)).toBeNull();
    expect(h.w.localStorage.getItem('rondoufit:seenVersion')).toBe(CURRENT_VERSION);
    expect(h.doc.querySelector('[data-testid="gear-badge"]')).toBeNull();
  }, T);

  it('Plus → Nouveautés montre toutes les versions', async () => {
    const h = await launch();
    open.push(h);
    await clickEl(h, [...h.doc.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === 'Réglages et données'));
    await clickEl(h, h.doc.querySelector('[data-testid="open-patchnotes"]'));
    for (const n of PATCH_NOTES) expect(dialog(h).textContent).toContain(n.title);
  }, T);

  it('nouvelle version publiée : bandeau avec le résumé et le bouton Rafraîchir', async () => {
    const h = await launch();
    open.push(h);
    h.w.dispatchEvent(new h.w.CustomEvent('rondoufit-update', { detail: { version: '9.9', title: 'Super nouveauté', items: ['Un point', 'Un autre'] } }));
    await advance(h);
    const b = h.doc.querySelector('[data-testid="update-banner"]');
    expect(b.textContent).toContain('Une nouvelle version est disponible');
    expect(b.textContent).toContain('Super nouveauté');
    expect(b.textContent).toContain('Rafraîchir');
    await clickText(h, 'Plus tard');
    expect(h.doc.querySelector('[data-testid="update-banner"]')).toBeNull();
  }, T);
});
