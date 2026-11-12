// 4.36 : choisir le thème de la prochaine séance (haut, bas, push, pull, complet) ; « Auto » rend la main au coach.
import { afterEach, describe, expect, it } from 'vitest';
import { clickEl, launch } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const q = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);
const qa = (h, id) => [...h.doc.querySelectorAll(`[data-testid="${id}"]`)];
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));

describe('thème de la séance', () => {
  it('pousser puis tirer, puis retour au choix du coach', async () => {
    const h = await launch({ openCoach: true });
    open.push(h);
    await clickEl(h, q(h, 'coach-page-seance'));
    expect(q(h, 'day-theme-auto').getAttribute('aria-pressed')).toBe('true');
    const names = () => qa(h, 'next-ex').map(el => el.querySelector('p').textContent.trim());
    const cat = name => (saved(h).quests.find(x => name.includes(x.name)) || {}).category;
    await clickEl(h, q(h, 'day-theme-PUSH'));
    expect(Object.values(saved(h).coach.dayTypes)).toEqual(['PUSH']);
    expect(q(h, 'day-theme-PUSH').getAttribute('aria-pressed')).toBe('true');
    expect(names().length).toBeGreaterThan(0);
    names().forEach(n => expect(['Dos', 'Jambes']).not.toContain(cat(n)));
    await clickEl(h, q(h, 'day-theme-PULL'));
    expect(names().length).toBeGreaterThan(0);
    names().forEach(n => expect(['Pectoraux', 'Jambes']).not.toContain(cat(n)));
    await clickEl(h, q(h, 'day-theme-auto'));
    expect(saved(h).coach.dayTypes).toEqual({});
    expect(h.errors).toEqual([]);
  }, 120000);
});
