// 4.53.1 : « Mon corps » (taille) en haut de Coach → Réglages.
import { afterEach, describe, expect, it } from 'vitest';
import { clickEl, launch, setInput } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const q = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));

describe('mon corps', () => {
  it('la taille se règle dans Coach → Réglages', async () => {
    const h = await launch({ openCoach: true });
    open.push(h);
    await clickEl(h, q(h, 'coach-page-reglages'));
    expect(q(h, 'coach-body')).toBeTruthy();
    await setInput(h, q(h, 'body-height'), '182');
    expect(saved(h).coach.profile.heightCm).toBe(182);
    expect(h.errors).toEqual([]);
  }, 120000);
});
