// 4.53.2 : test de max : la charge / l'aide proposées se changent à la main (« Tu décides »).
import { afterEach, describe, expect, it } from 'vitest';
import { clickEl, launch } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const q = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);
const qa = (h, id) => [...h.doc.querySelectorAll(`[data-testid="${id}"]`)];
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));

describe('test de max : réglage à la main', () => {
  it('chaque exercice du test a son réglage, qui est gardé', async () => {
    const h = await launch({ openCoach: true });
    open.push(h);
    await clickEl(h, q(h, 'coach-page-seance'));
    await clickEl(h, q(h, 'day-theme-style-max'));
    let found = false;
    for (const el of qa(h, 'next-ex')) {
      await clickEl(h, el.querySelector('button[aria-expanded]'));
      const s = q(h, 'adj-max-load') || q(h, 'adj-max-assist');
      if (!s) continue;
      found = true;
      const before = s.textContent;
      await clickEl(h, s.parentElement.querySelector('button[aria-label$="plus"]'));
      const after = (q(h, 'adj-max-load') || q(h, 'adj-max-assist')).textContent;
      expect(after).not.toBe(before);
      expect(saved(h).quests.some(x => x.maxTestLoad !== undefined || x.maxTestAssist !== undefined)).toBe(true);
      await clickEl(h, q(h, 'adj-max-reset'));
      expect(saved(h).quests.some(x => x.maxTestLoad !== undefined || x.maxTestAssist !== undefined)).toBe(false);
      break;
    }
    expect(found).toBe(true);
    expect(h.errors).toEqual([]);
  }, 120000);
});
