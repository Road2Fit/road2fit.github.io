// Profil de travail du coach : choix général et par cycle.
import { afterEach, describe, expect, it } from 'vitest';
import { clickText, expandCoachDetails, launch, pageText, setInput, clickEl } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const TIMEOUT = 120000;
const start = async () => { const h = await launch(); open.push(h); await clickEl(h, h.doc.querySelector('[data-tab="coach"]')); await clickText(h, 'Réglages et détails du coach'); return h; };
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));
const section = h => [...h.doc.querySelectorAll('section')].find(s => s.querySelector('h3') && s.querySelector('h3').textContent.includes('Profil de travail'));

describe('profil de travail', () => {
  it('par défaut : automatique ; choisir la puissance change les objectifs de la séance', async () => {
    const h = await start();
    expect(pageText(h)).toContain('Profil de travail');
    expect(pageText(h)).toContain('Le coach garde son réglage d’origine');
    expect(pageText(h)).not.toContain('Profil Puissance');
    const select = section(h).querySelector('select');
    expect([...select.options].map(o => o.textContent)).toEqual(['Automatique (comme avant)', '🚀 Puissance', '💪 Hypertrophie', '🔁 Endurance de force']);
    await setInput(h, select, 'puissance');
    expect(saved(h).coach.workProfile).toBe('puissance');
    const t = pageText(h);
    expect(t).toContain('3 à 5'); // fiche du profil
    expect(t).toContain('Puissance'); // pastille dans la prochaine séance
    await expandCoachDetails(h);
    expect(pageText(h)).toContain('Profil Puissance'); // explications de chaque exercice
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('un profil différent à chaque cycle', async () => {
    const h = await start();
    expect(pageText(h)).toContain('active un cycle d’entraînement');
    await clickText(h, 'Cycle de 4 semaines');
    await setInput(h, section(h).querySelector('select'), 'hypertrophie');
    await clickText(h, 'Un profil différent à chaque cycle');
    expect(saved(h).coach.cycleProfiles).toEqual(['hypertrophie', 'puissance']);
    expect(pageText(h)).toContain('Cycle 1 (en cours)');
    expect(pageText(h)).toContain('Profil actif cette semaine (cycle 1)');
    const selects = [...section(h).querySelectorAll('select')];
    expect(selects).toHaveLength(2);
    await setInput(h, selects[1], 'endurance');
    expect(saved(h).coach.cycleProfiles).toEqual(['hypertrophie', 'endurance']);
    await clickText(h, '+ Ajouter un cycle');
    expect(saved(h).coach.cycleProfiles).toEqual(['hypertrophie', 'endurance', 'endurance']);
    await clickText(h, '− Retirer le dernier');
    await clickText(h, 'Même profil tout le temps');
    expect(saved(h).coach.cycleProfiles).toEqual([]);
    expect(saved(h).coach.workProfile).toBe('hypertrophie'); // le profil en cours est conservé
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});
