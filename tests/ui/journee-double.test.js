// « Ma semaine » : un même jour peut avoir la muscu ET le sport (journée double), et on ajoute une séance en plus juste un jour.
import { afterEach, describe, expect, it } from 'vitest';
import { clickEl, launch } from './harness';
import { coachPlanWeek } from '../../src/coach/planning';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const TIMEOUT = 120000;
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));
const cell = (h, iso) => h.doc.querySelector(`[data-testid="week-day-${iso}"]`);

describe('journée double et séance en plus', () => {
  it('planning : une séance en plus un jour de sport garde le sport, sans jambes, et ne change pas les autres séances', () => {
    const base = { quests: [], coach: { sessionsPerWeek: 2, volleyDays: [4, 5], sport: 'volley' } };
    const before = coachPlanWeek(base, '2026-10-19', '2026-10-19');
    const after = coachPlanWeek({ ...base, coach: { ...base.coach, gymExtra: ['2026-10-22'] } }, '2026-10-19', '2026-10-19');
    const thu = after.days.find(d => d.iso === '2026-10-22');
    expect(thu.gym).toBe('planned');
    expect(thu.sportKind).toBe('sport');
    expect(thu.extra).toBe(true);
    expect(thu.legsOk).toBe(false);
    expect(after.planned.filter(d => d !== '2026-10-22')).toEqual(before.planned); // le reste de la semaine ne bouge pas
  });

  it('toucher jeudi (jour de volley) puis « séance en plus » : la case montre la muscu et le volley', async () => {
    const h = await launch();
    open.push(h);
    await clickEl(h, h.doc.querySelector('[data-tab="coach"]'));
    await clickEl(h, h.doc.querySelector('[data-testid="coach-page-semaine"]'));
    const thu = cell(h, '2026-10-22');
    expect(thu).toBeTruthy();
    expect(thu.textContent).toContain('Volley');
    expect(thu.textContent).not.toContain('Séance');
    await clickEl(h, thu);
    await clickEl(h, h.doc.querySelector('[data-testid="week-add-gym"]'));
    expect(saved(h).coach.gymExtra).toContain('2026-10-22');
    const t = cell(h, '2026-10-22').textContent;
    expect(t).toContain('Séance');
    expect(t).toContain('Volley');
    expect(t).toContain('en plus');
    // on peut la retirer
    await clickEl(h, [...h.doc.querySelectorAll('[data-testid="week-day-panel"] button')].find(b => b.textContent.includes('Retirer la séance en plus')));
    expect(saved(h).coach.gymExtra || []).not.toContain('2026-10-22');
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});

describe('raccourcis vers le Coach', () => {
  it('profil → « Équilibre des muscles » ouvre la page Équilibre du Coach ; le jour J, gros bouton « Lancer la séance du jour »', async () => {
    const h = await launch();
    open.push(h);
    await clickEl(h, h.doc.querySelector('[data-tab="journal"]'));
    await clickEl(h, h.doc.querySelector('[data-testid="profile-button"]'));
    await clickEl(h, h.doc.querySelector('[data-testid="profile-balance"]'));
    expect(h.doc.querySelector('[data-testid="coach-page-equilibre"]').getAttribute('aria-selected')).toBe('true');
    expect(h.doc.querySelector('[data-testid="muscle-map"]')).toBeTruthy();
    // depuis le Coach déjà ouvert, sur une autre page
    await clickEl(h, h.doc.querySelector('[data-testid="coach-page-semaine"]'));
    await clickEl(h, h.doc.querySelector('[data-testid="profile-button"]'));
    await clickEl(h, h.doc.querySelector('[data-testid="profile-balance"]'));
    expect(h.doc.querySelector('[data-testid="coach-page-equilibre"]').getAttribute('aria-selected')).toBe('true');
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});
