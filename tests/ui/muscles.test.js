// Suivi des muscles : mode simplifié (5 grands groupes) / optimisé (14 muscles), dans les options et dans l'assistant d'accueil.
import { afterEach, describe, expect, it } from 'vitest';
import { DEMO_STATE } from './demo';
import { advance, clickEl, clickText, launch, pageText, setInput } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const TIMEOUT = 120000;
const NEUTRAL = { __classic: '1' };
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));
const byTest = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);
const next = async h => clickEl(h, byTest(h, 'ob-next'));
const fill = async (h, id, v) => setInput(h, h.doc.getElementById(id), v);

describe('suivi des muscles : deux modes', () => {
  it('dans les options : bascule simplifié ⇄ optimisé, les filtres d’exercices suivent', async () => {
    const h = await launch({ storage: { ...NEUTRAL, rondoudou_save_v1: JSON.stringify({ ...DEMO_STATE, onboarded: true }) } });
    open.push(h);
    await advance(h, 300);
    await clickText(h, 'Exercices');
    await advance(h, 300);
    expect(pageText(h)).not.toContain('Triceps');
    const more = h.doc.querySelector('button[aria-label="Réglages et données"]');
    await clickEl(h, more);
    expect(byTest(h, 'toggle-muscle-mode').textContent).toContain('simplifié');
    await clickEl(h, byTest(h, 'toggle-muscle-mode'));
    await advance(h, 400);
    expect(saved(h).muscleMode).toBe('optimized');
    expect(byTest(h, 'toggle-muscle-mode').textContent).toContain('optimisé');
    // on referme le menu : les filtres de l'onglet sont maintenant les muscles précis
    const close = h.doc.querySelector('button[aria-label="Fermer"]');
    if (close) await clickEl(h, close);
    await advance(h, 300);
    const t = pageText(h);
    for (const m of ['Biceps', 'Triceps', 'Quadriceps']) expect(t, m).toContain(m);
    // retour au mode simple
    await clickEl(h, h.doc.querySelector('button[aria-label="Réglages et données"]'));
    await clickEl(h, byTest(h, 'toggle-muscle-mode'));
    await advance(h, 400);
    expect(saved(h).muscleMode).toBe('simple');
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('dans l’assistant d’accueil : choix du mode, enregistré sur le compte', async () => {
    const h = await launch({ empty: true, storage: NEUTRAL });
    open.push(h);
    await advance(h, 300);
    await fill(h, 'ob-name', 'Léa');
    await next(h);
    await fill(h, 'ob-age', '28'); await fill(h, 'ob-h', '168'); await fill(h, 'ob-w', '64'); await fill(h, 'ob-t', '60');
    await next(h);
    expect(byTest(h, 'muscle-mode-choice')).toBeTruthy();
    await clickEl(h, byTest(h, 'goal-force'));
    await clickEl(h, byTest(h, 'mode-optimized'));
    await next(h);
    await next(h);
    await clickEl(h, byTest(h, 'ex-barbell_curl'));
    await clickEl(h, byTest(h, 'ex-squat'));
    await next(h);
    await next(h); // sport : aucun
    await next(h); // sauvegarde : plus tard
    await clickEl(h, byTest(h, 'ob-finish'));
    await advance(h, 400);
    const s = saved(h);
    expect(s.muscleMode).toBe('optimized');
    expect(s.quests.length).toBe(2);
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('par défaut, l’assistant garde le mode simplifié', async () => {
    const h = await launch({ empty: true, storage: NEUTRAL });
    open.push(h);
    await advance(h, 300);
    await fill(h, 'ob-name', 'Max');
    await next(h);
    await fill(h, 'ob-w', '75');
    for (let i = 0; i < 8 && !byTest(h, 'ob-finish'); i++) await next(h);
    await clickEl(h, byTest(h, 'ob-finish'));
    await advance(h, 400);
    expect(saved(h).muscleMode).toBe('simple');
  }, TIMEOUT);
});

describe('bilan du coach en mode optimisé', () => {
  it('silhouette, cibles par muscle et études derrière les repères', async () => {
    const h = await launch({ storage: { ...NEUTRAL, rondoudou_save_v1: JSON.stringify({ ...DEMO_STATE, onboarded: true, muscleMode: 'optimized' }) } });
    open.push(h);
    await advance(h, 400);
    await clickEl(h, h.doc.querySelector('[data-tab="coach"]'));
    await advance(h, 1000);
    await clickText(h, 'Réglages et détails du coach');
    expect(byTest(h, 'muscle-map')).toBeTruthy();
    expect(pageText(h)).toContain('Équilibre des groupes musculaires');
    await clickEl(h, byTest(h, 'toggle-sources'));
    expect(byTest(h, 'sources-list').textContent).toContain('Schoenfeld 2017');
    expect(byTest(h, 'sources-list').textContent).toContain('estimations prudentes');
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('en mode simplifié : pas de silhouette', async () => {
    const h = await launch({ storage: { ...NEUTRAL, rondoudou_save_v1: JSON.stringify({ ...DEMO_STATE, onboarded: true }) } });
    open.push(h);
    await advance(h, 400);
    expect(byTest(h, 'muscle-map')).toBeNull();
  }, TIMEOUT);
});

describe('mini silhouette en haut de page', () => {
  it('présente à côté de la barre d’EXP en mode optimisé, absente en mode simplifié', async () => {
    const opt = await launch({ storage: { ...NEUTRAL, rondoudou_save_v1: JSON.stringify({ ...DEMO_STATE, onboarded: true, muscleMode: 'optimized' }) } });
    open.push(opt);
    await advance(opt, 400);
    expect(byTest(opt, 'muscle-map-mini')).toBeTruthy();
    expect(byTest(opt, 'muscle-map')).toBeNull();
    const sim = await launch({ storage: { ...NEUTRAL, rondoudou_save_v1: JSON.stringify({ ...DEMO_STATE, onboarded: true }) } });
    open.push(sim);
    await advance(sim, 400);
    expect(byTest(sim, 'muscle-map-mini')).toBeNull();
    expect(opt.errors).toEqual([]);
  }, TIMEOUT);
});

describe('changer d’exercice : tous les exercices du muscle', () => {
  it('Lombaires : tous listés, même d’une autre unité ; un exercice d’une autre unité devient un nouvel exercice', async () => {
    const { EXERCISE_CATALOG } = await import('../../src/data/catalog');
    const { fineGroupOf } = await import('../../src/data/muscles');
    const lombaires = EXERCISE_CATALOG.filter(c => c.type === 'strength' && fineGroupOf({ ...c, catalogId: c.id }) === 'Lombaires');
    expect(lombaires.length).toBeGreaterThan(1);
    const h = await launch({ storage: { ...NEUTRAL, rondoudou_save_v1: JSON.stringify({ ...DEMO_STATE, onboarded: true, muscleMode: 'optimized' }) } });
    open.push(h);
    await advance(h, 400);
    await clickText(h, 'Ajuster'); // 1er exercice : Tractions (répétitions)
    await advance(h, 300);
    await clickText(h, 'Changer d’exercice');
    await advance(h, 300);
    const chip = [...h.doc.querySelectorAll('button')].filter(b => /Lombaires/.test(b.textContent) && b.className.includes('rounded-full') && !b.className.includes('Niv'))
      .find(b => b.closest('[data-testid]') === null || true);
    await clickEl(h, [...h.doc.querySelectorAll('button')].find(b => b.textContent.trim() === '🧱 Lombaires'));
    for (const c of lombaires) expect(byTest(h, `pick-${c.id}`), c.id).toBeTruthy();
    // un exercice en kg alors que Tractions se mesure en répétitions : proposé comme nouvel exercice
    const kg = lombaires.find(c => c.unit === 'kg');
    expect(kg).toBeTruthy();
    await clickEl(h, byTest(h, `pick-${kg.id}`));
    expect(byTest(h, 'swap-other').textContent).toContain('nouvel exercice');
    await clickEl(h, byTest(h, 'swap-other-create'));
    await advance(h, 300);
    expect(h.doc.body.textContent).toContain(kg.name);
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});
