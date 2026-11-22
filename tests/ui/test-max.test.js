// 4.50 : séance « Test de max » choisie dans « Prochaine séance » (Façon de travailler → Test de max).
import { afterEach, describe, expect, it } from 'vitest';
import { clickEl, launch, setInput } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const q = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);
const qa = (h, id) => [...h.doc.querySelectorAll(`[data-testid="${id}"]`)];
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));

describe('test de max', () => {
  it('le jour devient un test de max, seul, et revient au choix du coach', async () => {
    const h = await launch({ openCoach: true });
    open.push(h);
    await clickEl(h, q(h, 'coach-page-seance'));
    await clickEl(h, q(h, 'day-theme-style-iso'));
    await clickEl(h, q(h, 'day-theme-style-max'));
    expect(Object.values(saved(h).coach.dayStyles)).toEqual(['max']);
    expect(q(h, 'day-theme-style-max').getAttribute('aria-pressed')).toBe('true');
    expect(q(h, 'day-theme-style-iso').getAttribute('aria-pressed')).toBe('false');
    const text = h.doc.body.textContent;
    expect(text).toMatch(/Test de max/);
    // séance de démonstration : tous les types de test (kg, répétitions, gainage)
    const ex = qa(h, 'next-ex').map(el => el.textContent);
    expect(ex.length).toBeGreaterThan(0);
    ex.forEach(t => expect(t).toMatch(/test de (5 reps max|1RM)|max de répétitions|tenue au maximum|test lesté/));
    expect(ex.length).toBeGreaterThan(2); // plusieurs exercices, pas seulement les barres
    // personnaliser la séance puis changer le jour : le test de max reste (4.51.3)
    await clickEl(h, q(h, 'plan-start'));
    const d0 = saved(h).coach.plan.date;
    const d1 = new Date(`${d0}T12:00:00`); d1.setDate(d1.getDate() + 2);
    const iso1 = `${d1.getFullYear()}-${String(d1.getMonth() + 1).padStart(2, '0')}-${String(d1.getDate()).padStart(2, '0')}`;
    await setInput(h, q(h, 'plan-date'), iso1);
    expect(saved(h).coach.plan.date).toBe(iso1);
    expect(saved(h).coach.dayStyles).toEqual({ [iso1]: 'max' });
    qa(h, 'next-ex').forEach(el => expect(el.textContent).toMatch(/test de (5 reps max|1RM)|max de répétitions|tenue au maximum|test lesté/));
    await clickEl(h, q(h, 'day-theme-style-auto'));
    expect(saved(h).coach.dayStyles).toEqual({});
    expect(h.errors).toEqual([]);
  }, 120000);
});
