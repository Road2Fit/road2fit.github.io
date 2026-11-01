// « Activité (course, sport…) » : liste d'activités, champs adaptés (durée seule / distance / dénivelé pour course et marche).
import { afterEach, describe, expect, it } from 'vitest';
import { clickText, launch, pageText, setInput } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const TIMEOUT = 120000;
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));
const modal = h => h.doc.querySelector('.fixed.inset-0');
const choisir = async (h, id) => setInput(h, modal(h).querySelector('#activity-select'), id);

describe('activité annexe', () => {
  it('le bouton s’appelle « Activité annexe » et la fenêtre propose les groupes d’activités', async () => {
    const h = await launch();
    open.push(h);
    await clickText(h, 'Activité (course, sport…)');
    expect(modal(h).textContent).toContain('Ajouter une activité annexe');
    const groupes = [...modal(h).querySelectorAll('optgroup')].map(g => g.label);
    for (const g of ['Course & marche', 'Cardio salle & cours', 'Sports collectifs', 'Sports de raquette', 'Plein air', 'Eau & glisse']) expect(groupes).toContain(g);
    expect(modal(h).querySelectorAll('option').length).toBeGreaterThan(90);
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('football : durée seule, aucun dénivelé ni distance ; l’entrée est enregistrée avec ses calories', async () => {
    const h = await launch({ empty: true });
    open.push(h);
    await clickText(h, 'Activité (course, sport…)');
    await choisir(h, 'fp_football');
    const t = modal(h).textContent;
    expect(t).toContain('Durée (min)');
    expect(t).not.toContain('Dénivelé');
    expect(t).not.toContain('Distance (km)');
    expect(t).not.toContain('Pente en %');
    expect(t).not.toContain('Vitesse + durée');
    await clickText(h, 'Ajouter au Bilan du Jour');
    const q = saved(h).quests.find(x => x.catalogId === 'fp_football');
    expect(q).toBeTruthy();
    expect(q.unit).toBe('min');
    const e = q.history[0];
    expect(e.calories).toBeGreaterThan(300);
    expect(e.elevationM).toBeUndefined();
    expect(e.distanceKm).toBeUndefined();
    expect(e.durationMin).toBe(90);
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('vélo de route et VTT : distance, vitesse et dénivelé ; natation et vélo d’appartement : pas de dénivelé', async () => {
    const h = await launch({ empty: true });
    open.push(h);
    await clickText(h, 'Activité (course, sport…)');
    await choisir(h, 'fp_road_bike');
    let t = modal(h).textContent;
    expect(t).toContain('Distance (km)');
    expect(t).toContain('Vitesse + durée');
    expect(t).toContain('Dénivelé D+ (m)');
    expect(t).toContain('Pente en %');
    await choisir(h, 'fp_mtb');
    expect(modal(h).textContent).toContain('Dénivelé D+ (m)');
    await choisir(h, 'fp_bike');
    expect(modal(h).textContent).not.toContain('Dénivelé');
    await choisir(h, 'fp_hiking');
    t = modal(h).textContent;
    expect(t).toContain('Dénivelé D+ (m)');
    expect(t).toContain('Pente en %');
    await choisir(h, 'running_endurance');
    expect(modal(h).textContent).toContain('Dénivelé D+ (m)');
    await choisir(h, 'fp_treadmill');
    expect(modal(h).textContent).toContain('Pente en %');
    await choisir(h, 'fp_swim');
    expect(modal(h).textContent).not.toContain('Dénivelé');
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('marche inclinée (tapis, en minutes) : la distance et la pente restent saisissables et les calories sont réalistes', async () => {
    const h = await launch({ empty: true });
    open.push(h);
    await clickText(h, 'Activité (course, sport…)');
    await choisir(h, 'incline_walk');
    const t = modal(h).textContent;
    expect(t).toContain('Distance (km)');
    expect(t).toContain('Pente en %');
    const kcal = Number(/Dépense estimée\D*(\d+) kcal/.exec(t)[1]);
    expect(kcal).toBeGreaterThan(80); // 20 min de marche inclinée : bien plus que le plancher d'avant
    await choisir(h, 'fp_roller');
    expect(modal(h).textContent).toContain('Dénivelé D+ (m)');
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('la recherche filtre la liste d’activités', async () => {
    const h = await launch({ empty: true });
    open.push(h);
    await clickText(h, 'Activité (course, sport…)');
    await setInput(h, modal(h).querySelector('input[type="search"]'), 'volley');
    const noms = [...modal(h).querySelectorAll('option')].map(o => o.textContent);
    expect(noms.some(n => n.includes('Beach-volley'))).toBe(true);
    expect(noms.some(n => n.includes('Football'))).toBe(false);
    expect(pageText(h)).toContain('Ajouter une activité annexe');
  }, TIMEOUT);
});
