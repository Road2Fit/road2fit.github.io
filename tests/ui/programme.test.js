// « J'ai déjà un coach » : saisir son programme, le coach de l'appli le suit puis propose la suite.
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickEl, clickText, launch, setInput } from './harness';

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
    expect(h.doc.body.textContent).toContain('Programme de ton coach : semaine 1');
    await clickText(h, 'Lancer');
    for (const b of [...h.doc.querySelectorAll('button')].filter(x => x.textContent.trim() === 'Faite')) await clickEl(h, b);
    await clickText(h, 'Exercice suivant');
    for (const b of [...h.doc.querySelectorAll('button')].filter(x => x.textContent.trim() === 'Faite')) await clickEl(h, b);
    await clickText(h, 'Voir le résumé');
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
