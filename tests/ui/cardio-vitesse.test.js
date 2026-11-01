// « Activité (course, sport…) » : saisie vitesse + durée et pente en %.
import { afterEach, describe, expect, it } from 'vitest';
import { clickText, launch, pageText, setInput } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const TIMEOUT = 120000;
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));
const modal = h => h.doc.querySelector('.fixed.inset-0');
const inputByLabel = (h, label) => [...modal(h).querySelectorAll('label')].find(l => l.textContent.includes(label)).parentElement.querySelector('input');

describe('course / marche : vitesse + durée, pente en %', () => {
  it('4 km/h pendant 40 min à 10 % : distance, dénivelé et note déduits', async () => {
    const h = await launch();
    open.push(h);
    await clickText(h, 'Activité (course, sport…)');
    await clickText(h, 'Vitesse + durée');
    await clickText(h, 'Pente en %');
    expect(modal(h).textContent).not.toContain('Distance (km)');
    await setInput(h, inputByLabel(h, 'Vitesse'), '4');
    await setInput(h, inputByLabel(h, 'Durée'), '40');
    await setInput(h, inputByLabel(h, 'Pente'), '10');
    expect(modal(h).textContent).toContain('≈ 2.67 km parcourus');
    expect(modal(h).textContent).toContain('≈ 267 m de dénivelé');
    await clickText(h, 'Ajouter au Bilan du Jour');
    const entries = saved(h).quests.flatMap(q => q.history || []).filter(e => e.distanceKm === 2.67);
    expect(entries).toHaveLength(1);
    expect(entries[0].durationMin).toBe(40);
    expect(entries[0].elevationM).toBe(267);
    expect(entries[0].note).toContain('à 4 km/h, pente 10 %');
    expect(pageText(h)).not.toContain('NaN');
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('saisie classique toujours disponible (distance + dénivelé en m)', async () => {
    const h = await launch();
    open.push(h);
    await clickText(h, 'Activité (course, sport…)');
    expect(modal(h).textContent).toContain('Distance (km)');
    expect(modal(h).textContent).toContain('Dénivelé D+ (m)');
    await clickText(h, 'Ajouter au Bilan du Jour');
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});
