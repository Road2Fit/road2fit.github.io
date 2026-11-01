// « Voir le mouvement » : animation, trajet, conseils, depuis les exercices, le Coach, la séance guidée et Noter séance.
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickEl, clickText, findByText, launch, pageText } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const TIMEOUT = 120000;
const start = async () => { const h = await launch(); open.push(h); return h; };
const dialog = h => h.doc.querySelector('[role="dialog"][aria-label="Voir le mouvement"]');
const boutons = h => [...h.doc.querySelectorAll('button[aria-label="Voir le mouvement"]')];

describe('voir le mouvement', () => {
  it('depuis une carte d’exercice : animation, trajet, conseils', async () => {
    const h = await start();
    await clickEl(h, boutons(h)[0]);
    const d = dialog(h);
    expect(d).toBeTruthy();
    expect(d.querySelector('svg')).toBeTruthy();
    expect(d.querySelector('polyline[stroke-dasharray]')).toBeNull(); // le trajet est masqué par défaut…
    await clickEl(h, d.querySelector('[data-testid="toggle-path"]'));
    expect(dialog(h).querySelector('polyline[stroke-dasharray]')).toBeTruthy(); // …et s'affiche à la demande
    for (const t of ['Muscles travaillés', 'Installation et matériel', 'Le mouvement', 'Erreurs à éviter', 'Respiration et rythme']) expect(d.textContent, t).toContain(t);
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('l’animation avance, se met en pause et se règle avec la barre', async () => {
    const h = await start();
    await clickEl(h, boutons(h)[0]);
    const svgBefore = dialog(h).querySelector('svg').innerHTML;
    await advance(h, 1500);
    await new Promise(r => setTimeout(r, 120));
    const svgAfter = dialog(h).querySelector('svg').innerHTML;
    expect(svgAfter).not.toBe(svgBefore); // l'image a changé
    await clickText(h, 'Pause');
    expect(pageText(h)).toContain('Lecture');
    const slider = dialog(h).querySelector('[data-testid="position"]');
    slider.value = '100';
    slider.dispatchEvent(new h.w.Event('input', { bubbles: true }));
    slider.dispatchEvent(new h.w.Event('change', { bubbles: true }));
    await advance(h);
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('les vues sont côte à côte, et les muscles se masquent', async () => {
    const h = await start();
    h.w.dispatchEvent(new h.w.CustomEvent('rondoufit-movement', { detail: { catalogId: 'pullups' } }));
    await advance(h);
    const vues = () => dialog(h).querySelector('[data-testid="movement-views"]');
    expect(vues().textContent).toContain('Vue de côté');
    expect(vues().textContent).toContain('Vue de dos');
    expect(vues().querySelectorAll('svg').length).toBe(2);
    expect(vues().innerHTML).toContain('#e5484d'); // muscles en rouge
    await clickEl(h, dialog(h).querySelector('[data-testid="toggle-muscles"]'));
    expect(vues().innerHTML).not.toContain('#e5484d');
    // un exercice sans autre angle n'a qu'une image
    h.w.dispatchEvent(new h.w.CustomEvent('rondoufit-movement', { detail: { catalogId: 'fp_plank' } }));
    await advance(h);
    expect(vues().querySelectorAll('svg').length).toBe(1);
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('exercice personnalisé reconnu par son nom, sinon choix dans la liste', async () => {
    const h = await start();
    h.w.dispatchEvent(new h.w.CustomEvent('rondoufit-movement', { detail: { name: 'Squat gobelet maison' } }));
    await advance(h);
    expect(dialog(h).textContent).toContain('Squat');
    h.w.dispatchEvent(new h.w.CustomEvent('rondoufit-movement', { detail: { name: 'Danse du robot' } }));
    await advance(h);
    expect(dialog(h).textContent).toContain('pas d’animation');
    const select = dialog(h).querySelector('select');
    expect(select.options.length).toBeGreaterThan(100);
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('disponible dans Noter séance, le Coach et la séance guidée', async () => {
    const h = await start();
    await clickText(h, 'Noter Séance');
    expect(boutons(h).length).toBeGreaterThan(0);
    await clickText(h, 'Annuler').catch(() => {});
    const h2 = await start();
    await clickText(h2, '🧠 Coach');
    expect(boutons(h2).length).toBeGreaterThan(0);
    const [lancer] = [...findByText(h2, 'Lancer la séance guidée'), ...findByText(h2, 'Lancer cette séance guidée maintenant')];
    await clickText(h2, lancer.textContent.trim().slice(0, 30));
    expect(boutons(h2).length).toBeGreaterThan(0);
    await clickEl(h2, boutons(h2)[boutons(h2).length - 1]);
    expect(dialog(h2)).toBeTruthy();
    expect(h2.errors).toEqual([]);
  }, TIMEOUT);

  it('rythme, respiration, fantôme de la position visée et erreur fréquente', async () => {
    const h = await start();
    h.w.dispatchEvent(new h.w.CustomEvent('rondoufit-movement', { detail: { catalogId: 'squat' } }));
    await advance(h, 300);
    const d = dialog(h);
    expect(d.querySelector('[data-testid="breath"]').textContent).toMatch(/Expire|Inspire/);
    expect(d.querySelectorAll('svg[aria-hidden="true"]').length).toBe(0); // pas de fantôme par défaut
    const groupe = d.querySelector('[role="group"][aria-label="Erreur fréquente"]');
    expect(groupe).toBeTruthy();
    await clickEl(h, [...groupe.querySelectorAll('button')].find(b => b.textContent.includes('Amplitude trop courte')));
    expect(dialog(h).querySelector('[data-testid="mistake-text"]').textContent).toContain('fantôme');
    expect(dialog(h).querySelectorAll('svg[aria-hidden="true"]').length).toBeGreaterThan(0);
    await clickEl(h, [...groupe.querySelectorAll('button')].find(b => b.textContent.includes('Bonne exécution')));
    expect(dialog(h).querySelector('[data-testid="mistake-text"]')).toBeNull();
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('« Cette animation est fausse » enregistre un signalement dans la sauvegarde', async () => {
    const h = await start();
    h.w.dispatchEvent(new h.w.CustomEvent('rondoufit-movement', { detail: { catalogId: 'squat' } }));
    await advance(h, 300);
    await clickText(h, 'Cette animation est fausse');
    expect(dialog(h).querySelector('[data-testid="flag-done"]')).toBeTruthy();
    await advance(h, 3000);
    const flags = JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1')).animFlags;
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({ animId: 'squat', view: 'side' });
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});
