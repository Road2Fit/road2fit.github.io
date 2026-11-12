// 4.39 : « Mon avatar » dans le profil : le personnage des animations change, le choix est enregistré, « par défaut » le remet.
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickEl, launch } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const q = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));

describe('mon avatar', () => {
  it('profil → Mon avatar : peau, foulard, legging ; enregistré ; remis par défaut', async () => {
    const h = await launch();
    open.push(h);
    await clickEl(h, q(h, 'profile-button'));
    await clickEl(h, q(h, 'profile-avatar'));
    await advance(h, 0);
    for (let i = 0; i < 20 && !q(h, 'avatar-editor'); i++) await advance(h, 50);
    expect(q(h, 'avatar-editor')).toBeTruthy();
    expect(q(h, 'avatar-preview').querySelectorAll('svg').length).toBeGreaterThan(0);
    expect(q(h, 'avatar-skin-s3').getAttribute('aria-pressed')).toBe('true');
    await clickEl(h, q(h, 'avatar-skin-s6'));
    await clickEl(h, q(h, 'avatar-hair-scarf'));
    await clickEl(h, q(h, 'avatar-bottom-leggings'));
    await clickEl(h, q(h, 'avatar-topColor-lime'));
    expect(saved(h).avatar).toMatchObject({ skin: 's6', hair: 'scarf', bottom: 'leggings', topColor: 'lime' });
    expect(q(h, 'avatar-preview').innerHTML).toContain('#6b4129');
    expect(q(h, 'avatar-preview').innerHTML).toContain('#84cc16');
    await clickEl(h, q(h, 'avatar-reset'));
    expect(saved(h).avatar).toBeNull();
    expect(q(h, 'avatar-skin-s3').getAttribute('aria-pressed')).toBe('true');
    await clickEl(h, q(h, 'avatar-close'));
    expect(q(h, 'avatar-editor')).toBeNull();
    expect(h.errors).toEqual([]);
  }, 120000);
});
