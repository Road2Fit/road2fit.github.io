// Accueil : défilement automatique vers le Coach, boutons photo qui ouvrent l'appareil photo.
import { afterEach, describe, expect, it } from 'vitest';
import { clickText, launch, pageText, sleep, clickEl } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const TIMEOUT = 120000;
const start = async () => { const h = await launch(); open.push(h); return h; };

describe('défilement automatique', () => {
  it('la barre du bas ouvre le Coach et fait défiler la page jusqu’à lui', async () => {
    const h = await start();
    const calls = [];
    h.w.Element.prototype.scrollIntoView = function (opts) { calls.push({ cls: this.className, opts }); };
    await clickEl(h, h.doc.querySelector('nav[aria-label="Navigation"] button'));
    await sleep(150); // le défilement attend l'affichage du nouvel onglet (2 images)
    expect(pageText(h)).toContain('Prochaine séance');
    expect(calls).toHaveLength(1);
    expect(calls[0].cls).toContain('scroll-mt-3'); // la barre d'onglets, juste au-dessus du Coach
    expect(calls[0].opts).toMatchObject({ block: 'start' });
  }, TIMEOUT);

  it('les onglets de la barre ne font pas défiler (on est déjà dessus)', async () => {
    const h = await start();
    const calls = [];
    h.w.Element.prototype.scrollIntoView = function () { calls.push(1); };
    await clickText(h, 'Journal');
    await sleep(150);
    expect(calls).toHaveLength(0);
  }, TIMEOUT);
});

describe('photo : appareil photo', () => {
  it('« Prendre une photo » ouvre l’appareil photo (arrière), selfie et galerie sont proposés à part', async () => {
    const h = await start();
    await clickText(h, 'Souvenirs');
    const jour = [...h.doc.querySelectorAll('button')].find(b => b.textContent.trim().startsWith('21'));
    expect(jour, 'case du jour').toBeTruthy();
    jour.dispatchEvent(new h.w.MouseEvent('click', { bubbles: true }));
    await sleep(60);
    const inputs = [...h.doc.querySelectorAll('input[data-testid="photo-input"]')];
    expect(inputs.map(i => i.getAttribute('capture'))).toEqual(['environment', 'user', null]);
    expect(inputs[0].multiple).toBe(false); // l'appareil photo renvoie une seule photo
    expect(inputs[2].multiple).toBe(true); // la galerie permet d'en choisir plusieurs
    expect(pageText(h)).toContain('Prendre une photo');
    expect(pageText(h)).toContain('Selfie');
    expect(pageText(h)).toContain('Choisir une photo');
  }, TIMEOUT);
});
