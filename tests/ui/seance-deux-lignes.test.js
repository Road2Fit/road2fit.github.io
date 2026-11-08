// Prochaine séance : chaque exercice en deux lignes ; le crayon ouvre charge, répétitions, séries, forme,
// changer / monter / descendre / retirer.
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickEl, clickText, launch } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const TIMEOUT = 120000;
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));
const all = (h, id) => [...h.doc.querySelectorAll(`[data-testid="${id}"]`)];
const one = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);
const btn = (h, label) => h.doc.querySelector(`button[aria-label="${label}"]`);

describe('prochaine séance en deux lignes', () => {
  it('fermé : nom + séries · repos ; sous le crayon : charge, séries, forme, changer', async () => {
    const h = await launch({ openCoach: true });
    open.push(h);
    await advance(h, 300);
    const rows = all(h, 'next-ex');
    expect(rows.length).toBeGreaterThan(1);
    // fermé : deux lignes de texte, pas de bouton d'action ni d'explication
    for (const r of rows) {
      expect(r.querySelectorAll('p').length).toBe(2);
      expect(r.querySelector('[data-testid="ex-swap"]')).toBeNull();
    }
    expect(one(h, 'ex-line2').textContent).toMatch(/×.*\d’/);
    // ouvrir le premier exercice à charge
    const row = rows.find(r => /kg/.test(r.textContent) && !/aide/.test(r.textContent));
    const qName = row.querySelector('p').textContent.trim();
    await clickEl(h, row.querySelector('[data-testid="ex-adjust"]'));
    const panel = () => all(h, 'next-ex').find(r => r.querySelector('p').textContent.trim() === qName).querySelector('[data-testid="ex-panel"]');
    expect(panel()).toBeTruthy();
    expect(panel().querySelector('[data-testid="method-select"]')).toBeTruthy();
    expect(panel().querySelector('[data-testid="ex-swap"]')).toBeTruthy();
    const sets0 = Number(panel().querySelector('[data-testid="adj-sets"]').textContent);
    await clickEl(h, panel().querySelector('button[aria-label="Séries plus"]'));
    expect(Number(panel().querySelector('[data-testid="adj-sets"]').textContent)).toBe(sets0 + 1);
    const load0 = panel().querySelector('[data-testid="adj-load"]').textContent;
    await clickEl(h, panel().querySelector('button[aria-label="Charge plus"]'));
    expect(panel().querySelector('[data-testid="adj-load"]').textContent).not.toBe(load0);
    await clickEl(h, panel().querySelector('button[aria-label="Répétitions moins"]'));
    const q = saved(h).quests.find(x => x.name.trim() === qName.replace(/^\S+\s/, '').trim()) || saved(h).quests.find(x => qName.includes(x.name));
    expect(q.coachOverride.sets).toBe(sets0 + 1);
    expect(q.coachOverride.load).toBeGreaterThan(0);
    expect(q.coachOverride.repsDelta).toBe(-1);
    // retour à la proposition du coach
    await clickEl(h, panel().querySelector('[data-testid="adj-reset"]'));
    expect(Number(panel().querySelector('[data-testid="adj-sets"]').textContent)).toBe(sets0);
    // touché par erreur : on retrouve son réglage
    await clickEl(h, panel().querySelector('[data-testid="adj-restore"]'));
    expect(Number(panel().querySelector('[data-testid="adj-sets"]').textContent)).toBe(sets0 + 1);
    expect(panel().querySelector('[data-testid="adj-restore"]')).toBeNull();
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('séance modifiée : monter, descendre et retirer sous le crayon', async () => {
    const h = await launch({ openCoach: true });
    open.push(h);
    await advance(h, 300);
    await clickText(h, 'Choisir le jour / modifier');
    const names = () => all(h, 'next-ex').map(r => r.querySelector('p').textContent.trim());
    const before = names();
    expect(before.length).toBeGreaterThan(2);
    await clickEl(h, all(h, 'next-ex')[0].querySelector('[data-testid="ex-adjust"]'));
    const p0 = () => all(h, 'next-ex').find(r => r.querySelector('[data-testid="ex-panel"]'));
    expect(p0().querySelector('[data-testid="ex-up"]').disabled).toBe(true);
    await clickEl(h, p0().querySelector('[data-testid="ex-down"]'));
    expect(names()[1]).toBe(before[0]);
    expect(names()[0]).toBe(before[1]);
    await clickEl(h, p0().querySelector('[data-testid="ex-remove"]'));
    expect(names()).not.toContain(before[0]);
    expect(names()).toHaveLength(before.length - 1);
    // l'encadré jour / groupes est ouvert juste après « Choisir le jour / modifier », puis se range derrière le crayon
    expect(one(h, 'plan-box')).toBeTruthy();
    await clickEl(h, one(h, 'plan-edit'));
    expect(one(h, 'plan-box')).toBeNull();
    await clickEl(h, one(h, 'plan-edit'));
    expect(one(h, 'plan-box')).toBeTruthy();
    // revenir à la proposition du coach, puis retrouver sa séance perso
    const perso = names();
    await clickEl(h, one(h, 'plan-reset'));
    expect(saved(h).coach.plan).toBeNull();
    expect(names()).not.toEqual(perso);
    await clickEl(h, one(h, 'plan-restore'));
    expect(names()).toEqual(perso);
    expect(saved(h).coach.planBackup).toBeNull();
    expect(one(h, 'plan-box')).toBeNull(); // encadré rangé
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});
