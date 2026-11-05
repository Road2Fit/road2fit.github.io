// « J'ai déjà un coach » : saisir son programme, le coach de l'appli le suit puis propose la suite.
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickEl, clickText, launch, setInput, runGuided, openCoachDetails } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const T = 120000;
const by = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);
const save = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));

describe('programme de mon coach', () => {
  it('saisie, analyse, prochaine séance prévue par le coach, puis marquée faite après la séance guidée', async () => {
    const h = await launch({ openCoach: true });
    open.push(h);
    await clickEl(h, by(h, 'program-add'));
    const areas = () => [...h.doc.querySelectorAll('[data-testid="program-text"]')];
    await setInput(h, by(h, 'program-name'), 'Programme de Max');
    await setInput(h, areas()[0], 'Développé couché 4x8 40kg\nTractions 3x6 aide 15kg');
    await setInput(h, areas()[1], 'Squat 4x6 60kg\nLeg extension 3x12');
    expect(h.doc.body.textContent).toContain('sera ajouté à tes exercices'); // leg extension : nouvel exercice
    // semaine 2 : copie, puis charges en hausse
    await clickEl(h, by(h, 'program-copy-week'));
    await setInput(h, areas()[0], 'Développé couché 4x8 42.5kg\nTractions 3x6 aide 12.5kg');
    await setInput(h, areas()[1], 'Squat 4x7 60kg\nLeg extension 3x12');
    await clickEl(h, by(h, 'program-save'));
    await advance(h, 300);
    const p = save(h).coach.program;
    expect(p.name).toBe('Programme de Max');
    expect(p.weeks).toHaveLength(2);
    expect(save(h).quests.some(q => /Leg Extension/i.test(q.name))).toBe(true);
    expect(by(h, 'program-card').textContent).toContain('Semaine 1 sur 2');
    expect(by(h, 'program-analysis').textContent).toMatch(/Progression par la charge/);
    // la prochaine séance est celle du coach
    expect(h.doc.body.textContent).toContain('Ton coach'); // badge de chaque exercice de la séance
    await openCoachDetails(h);
    expect(h.doc.body.textContent).toContain('Programme de ton coach : semaine 1');
    await clickText(h, 'Lancer');
    expect(await runGuided(h)).toBe('summary');
    await clickText(h, 'Enregistrer la séance');
    await advance(h, 500);
    expect(Object.keys(save(h).coach.program.log)).toEqual(['w0:s0']);
    // la séance suivante (jeudi) peut se faire en avance, sans plantage
    expect(h.doc.body.textContent).toContain('Séance B');
    expect(h.errors).toEqual([]);
  }, T);

  it('ligne non reconnue : message clair, rien n’est enregistré', async () => {
    const h = await launch({ openCoach: true });
    open.push(h);
    await clickEl(h, by(h, 'program-add'));
    await setInput(h, h.doc.querySelector('[data-testid="program-text"]'), 'Truc inventé 3x10');
    await clickEl(h, by(h, 'program-save'));
    expect(by(h, 'program-error').textContent).toContain('pas reconnu');
    expect(save(h).coach && save(h).coach.program).toBeFalsy();
  }, T);
});

describe('« Tu as déjà un coach ? » : réponse non', () => {
  it('l’encadré quitte le haut du Coach et se range dans les réglages, d’où on peut le remettre', async () => {
    const h = await launch({ openCoach: true });
    open.push(h);
    await advance(h, 300);
    expect(by(h, 'program-intro')).toBeTruthy();
    await clickEl(h, by(h, 'program-no'));
    expect(save(h).coach.noCoach).toBe(true);
    expect(by(h, 'program-intro')).toBeNull();
    await clickEl(h, h.doc.querySelector('[data-testid="coach-page-reglages"]'));
    expect(by(h, 'program-intro')).toBeTruthy(); // dans les réglages
    expect(by(h, 'program-no')).toBeNull();
    await clickText(h, 'Remettre cet encadré en haut du Coach');
    expect(save(h).coach.noCoach).toBe(false);
    expect(h.errors).toEqual([]);
  }, T);
});

describe('trophées de la semaine', () => {
  it('les objectifs de la semaine sont dans l’onglet Trophées (plus dans le Coach)', async () => {
    const h = await launch({ openCoach: true });
    open.push(h);
    await advance(h, 300);
    expect(h.doc.body.textContent).not.toContain('Objectifs de la semaine');
    await clickText(h, 'Trophées');
    await advance(h, 200);
    const box = by(h, 'weekly-trophies');
    expect(box).toBeTruthy();
    expect(box.textContent).toContain('Séances de muscu');
    expect(box.textContent).toContain('Pesées');
    expect(box.textContent).toContain('renouvellent chaque lundi');
    expect(h.errors).toEqual([]);
  }, T);
});

describe('après la saisie : l’appli prend le relais ?', () => {
  it('question après l’enregistrement ; « Non » → à la fin du programme, aperçu seulement ; on peut changer d’avis', async () => {
    const h = await launch({ openCoach: true });
    open.push(h);
    await clickEl(h, by(h, 'program-add'));
    const areas = () => [...h.doc.querySelectorAll('[data-testid="program-text"]')];
    await setInput(h, areas()[0], 'Développé couché 4x8 40kg');
    await setInput(h, areas()[1], 'Squat 4x6 60kg');
    await clickEl(h, by(h, 'program-save'));
    await advance(h, 300);
    expect(by(h, 'program-takeover').textContent).toContain('l’appli prend le relais');
    await clickEl(h, by(h, 'takeover-no'));
    expect(save(h).coach.program.takeOver).toBe(false);
    expect(by(h, 'program-takeover')).toBeNull();
    expect(by(h, 'takeover-state').textContent).toContain('tu continues seul');
    // pendant le programme, rien ne change : séance de son coach, à lancer normalement
    expect(by(h, 'coach-preview')).toBeNull();
    expect(h.doc.body.textContent).toContain('Lancer');
    // les deux séances passées : programme fini → aperçu, rien pour lancer ni régler
    await clickText(h, 'Passer cette séance');
    await clickText(h, 'Passer cette séance');
    await advance(h, 300);
    expect(by(h, 'coach-preview')).toBeTruthy();
    expect(h.doc.body.textContent).toContain('Aperçu de la séance suivante');
    expect([...h.doc.querySelectorAll('button')].some(b => /Lancer/.test(b.textContent))).toBe(false);
    expect(h.doc.body.textContent).not.toContain('Pourquoi ? / Ajuster');
    expect(h.doc.body.textContent).not.toContain('Avis du coach');
    // changer d'avis
    await clickEl(h, by(h, 'preview-takeover'));
    expect(save(h).coach.program.takeOver).toBe(true);
    expect(by(h, 'coach-preview')).toBeNull();
    await openCoachDetails(h);
    expect(h.doc.body.textContent).toContain('suite que je propose');
    expect([...h.doc.querySelectorAll('button')].some(b => /Lancer/.test(b.textContent))).toBe(true);
    // la question revient à chaque enregistrement du programme
    await clickEl(h, by(h, 'program-edit'));
    await clickEl(h, by(h, 'program-save'));
    await advance(h, 300);
    expect(by(h, 'program-takeover')).toBeTruthy();
    await clickEl(h, by(h, 'takeover-yes'));
    expect(save(h).coach.program.takeOver).toBe(true);
    expect(h.errors).toEqual([]);
  }, T);
});
