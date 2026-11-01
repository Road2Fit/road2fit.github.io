// Copie de sécurité avant réinitialisation / import, texte plus grand.
import { afterEach, describe, expect, it } from 'vitest';
import { clickText, launch, pageText } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const TIMEOUT = 120000;
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));

describe('sécurité et confort', () => {
  it('réinitialiser garde une copie ; « Retrouver mes données » la remet', async () => {
    const h = await launch();
    open.push(h);
    await clickText(h, 'Tout réinitialiser');
    await clickText(h, 'Tout effacer et repartir');
    expect(saved(h).quests).toHaveLength(0);
    expect(pageText(h)).toContain('Bienvenue');
    await clickText(h, 'Retrouver mes données');
    expect(saved(h).quests.length).toBeGreaterThan(0);
    expect(pageText(h)).not.toContain('Bienvenue');
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('sans copie de sécurité, le bouton de restauration n’apparaît pas', async () => {
    const h = await launch();
    open.push(h);
    await clickText(h, 'Exporter mes données'); // ouvre le menu et l'utilise
    await clickText(h, 'Sons :'); // menu rouvert
    expect(pageText(h)).not.toContain('Retrouver mes données');
  }, TIMEOUT);

  it('« Texte : grand » agrandit tout le texte et se souvient du choix', async () => {
    const h = await launch();
    open.push(h);
    await clickText(h, 'Texte : normal');
    expect(h.doc.documentElement.style.fontSize).toBe('18px');
    expect(JSON.parse(h.w.localStorage.getItem('rondoufit:ui')).bigText).toBe(true);
    await clickText(h, 'Texte : grand');
    expect(h.doc.documentElement.style.fontSize).toBe('');
  }, TIMEOUT);
});
