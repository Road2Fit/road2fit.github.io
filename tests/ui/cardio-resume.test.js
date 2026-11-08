// Coach : toucher la carte « Cardio » ouvre le résumé de la séance (étapes, durées, vitesses), qu'on peut lancer de là.
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickEl, launch } from './harness';
import { DEMO_STATE } from './demo';
import { groupSteps } from '../../src/components/coach/CardioSession';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const q = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);

describe('résumé de la séance de cardio', () => {
  it('regroupe les répétitions (4 × effort + récupération)', () => {
    const w = { label: 'Échauffement', min: 10, zone: 'easy' };
    const e = { label: 'Effort 1/4', min: 4, zone: 'hard' };
    const r = { label: 'Récupération', min: 3, zone: 'rest' };
    const g = groupSteps([w, e, r, { ...e, label: 'Effort 2/4' }, r, { ...e, label: 'Effort 3/4' }, r, { ...e, label: 'Effort 4/4' }, r, w]);
    expect(g.map(x => x.times)).toEqual([1, 4, 1]);
    expect(g[1].steps.map(s => s.label)).toEqual(['Effort 1/4', 'Récupération']);
    // dernier effort sans récupération après : compté dans les 4 fois
    const g2 = groupSteps([w, e, r, { ...e, label: 'Effort 2/4' }, r, { ...e, label: 'Effort 3/4' }, r, { ...e, label: 'Effort 4/4' }, w]);
    expect(g2.map(x => x.times)).toEqual([1, 4, 1]);
    expect(g2[1].noLastRest).toBe(true);
  });

  it('la carte Cardio ouvre le résumé puis lance la séance', async () => {
    // cardio le samedi seulement (la démo est un mercredi) : la carte « Cardio · samedi » s'affiche sous la séance
    const state = { ...DEMO_STATE, coach: { ...(DEMO_STATE.coach || {}), cardio: { on: true, asked: true, goal: 'endurance', kinds: ['walk'], perWeek: 1, minutes: 30, days: [6] } } };
    const h = await launch({ openCoach: true, storage: { rondoudou_save_v1: JSON.stringify(state) } });
    open.push(h);
    await advance(h, 300);
    expect(q(h, 'cardio-next-open')).toBeTruthy();
    await clickEl(h, q(h, 'cardio-next-open'));
    const sum = q(h, 'cardio-summary');
    expect(sum).toBeTruthy();
    expect(sum.textContent).toMatch(/\d+ min/);
    expect(q(h, 'cardio-summary-steps').querySelectorAll('li').length).toBeGreaterThan(1);
    expect(q(h, 'cardio-session')).toBeNull(); // rien n'est lancé tant qu'on n'a pas touché « Lancer »
    await clickEl(h, q(h, 'cardio-summary-start'));
    await advance(h, 300);
    expect(q(h, 'cardio-summary')).toBeNull();
    expect(q(h, 'cardio-session')).toBeTruthy();
    expect(h.errors).toEqual([]);
  }, 120000);
});
