// 4.56 : façon de travailler choisie pour UN exercice (crayon de l'exercice → Façon de travailler → Test de max).
import { afterEach, describe, expect, it } from 'vitest';
import { clickEl, launch, setInput } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const q = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);
const qa = (h, id) => [...h.doc.querySelectorAll(`[data-testid="${id}"]`)];
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));
const MAX = /test de (5 reps max|1RM)|max de répétitions|tenue au maximum|test lesté/;

describe('façon de travailler d’un seul exercice', () => {
  it('séance perso normale, sauf un test de max sur un exercice : testé en premier, le reste ne change pas', async () => {
    const h = await launch({ openCoach: true });
    open.push(h);
    await clickEl(h, q(h, 'coach-page-seance'));
    await clickEl(h, q(h, 'plan-start'));
    const plan = saved(h).coach.plan;
    expect(plan.questIds.length).toBeGreaterThan(2);
    // l'exercice en kg le plus bas de la liste : il remonte en premier une fois en test
    const quests = saved(h).quests;
    const kgIds = plan.questIds.filter(id => (quests.find(x => x.id === id) || {}).unit === 'kg');
    const target = kgIds[kgIds.length - 1];
    const i = plan.questIds.indexOf(target);
    const name = quests.find(x => x.id === target).name;
    await clickEl(h, qa(h, 'ex-adjust')[i]);
    expect(q(h, 'ex-style')).toBeTruthy();
    expect(q(h, 'ex-style-auto').getAttribute('aria-pressed')).toBe('true');
    await clickEl(h, q(h, 'ex-style-max'));
    expect(saved(h).coach.exStyles).toEqual({ [plan.date]: { [target]: 'max' } });
    expect(saved(h).coach.dayStyles || {}).toEqual({});
    const rows = qa(h, 'next-ex');
    expect(rows[0].textContent).toContain(name);
    expect(rows[0].textContent).toMatch(MAX);
    rows.slice(1).forEach(el => expect(el.textContent).not.toMatch(MAX));
    expect(rows.length).toBe(plan.questIds.length);
    expect(q(h, 'ex-style-help').textContent).toMatch(/Le reste de la séance ne change pas/);
    // changer le jour : le choix suit
    const d1 = new Date(`${plan.date}T12:00:00`); d1.setDate(d1.getDate() + 2);
    const iso1 = `${d1.getFullYear()}-${String(d1.getMonth() + 1).padStart(2, '0')}-${String(d1.getDate()).padStart(2, '0')}`;
    await setInput(h, q(h, 'plan-date'), iso1);
    expect(saved(h).coach.exStyles).toEqual({ [iso1]: { [target]: 'max' } });
    expect(qa(h, 'next-ex')[0].textContent).toMatch(MAX);
    // « Comme la séance » : retour à la normale
    await clickEl(h, q(h, 'ex-style-auto'));
    expect(saved(h).coach.exStyles).toEqual({});
    qa(h, 'next-ex').forEach(el => expect(el.textContent).not.toMatch(MAX));
    expect(h.errors).toEqual([]);
  }, 120000);
});
