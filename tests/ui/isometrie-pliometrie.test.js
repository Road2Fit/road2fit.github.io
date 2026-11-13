// 4.42 : séance axée isométrie (chrono de tenue dans la séance guidée), carte Pliométrie (ajout des sauts du volley).
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickEl, launch } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const q = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));

async function toSetScreen(h) {
  for (let k = 0; k < 10 && !q(h, 'set-done'); k++) {
    if (q(h, 'feel-ok')) await clickEl(h, q(h, 'feel-ok'));
    else if (q(h, 'warm-done')) await clickEl(h, [...q(h, 'warmup').querySelectorAll('button')].find(b => /Passer/.test(b.textContent)));
    else if (q(h, 'guided-next')) await clickEl(h, q(h, 'guided-next'));
    await advance(h, 300);
  }
}

describe('isométrie et pliométrie', () => {
  it('séance du jour en isométrie : pause indiquée, chrono de tenue avec bip', async () => {
    const h = await launch({ openCoach: true });
    open.push(h);
    await clickEl(h, q(h, 'coach-page-seance'));
    expect(q(h, 'day-theme-style-normal').getAttribute('aria-pressed')).toBe('true');
    await clickEl(h, q(h, 'day-theme-style-iso'));
    expect(Object.values(saved(h).coach.dayStyles)).toEqual(['iso']);
    expect(q(h, 'day-theme-style-note').textContent).toMatch(/Isométrie/);
    await clickEl(h, q(h, 'start-today') || q(h, 'start-early'));
    await advance(h, 700);
    await toSetScreen(h);
    expect(q(h, 'guided-method').textContent).toMatch(/Pause isométrique/);
    expect(q(h, 'set-label').textContent).toMatch(/tiens \d s/);
    const timer = q(h, 'hold-timer');
    expect(timer).toBeTruthy();
    const secs = Number(q(h, 'hold-left').textContent.match(/\d+/)[0]);
    await clickEl(h, q(h, 'hold-start'));
    expect(q(h, 'hold-start').disabled).toBe(true);
    await advance(h, secs * 1000 + 400);
    expect(q(h, 'hold-start').disabled).toBe(false);
    expect(q(h, 'hold-start').textContent).toMatch(/rep 2|Encore/);
    expect(h.errors).toEqual([]);
  }, 120000);

  it('Réglages → Pliométrie : ajouter les sauts, 2 séances par semaine, explications et études', async () => {
    const h = await launch({ openCoach: true });
    open.push(h);
    await clickEl(h, q(h, 'coach-page-reglages'));
    const card = q(h, 'coach-plyo');
    expect(card).toBeTruthy();
    await clickEl(h, q(h, 'plyo-week-2'));
    expect(saved(h).coach.plyo.perWeek).toBe(2);
    const before = saved(h).quests.length;
    await clickEl(h, q(h, 'plyo-add-pack'));
    const plyo = saved(h).quests.filter(x => /^ply_/.test(x.catalogId || ''));
    expect(plyo.length).toBeGreaterThanOrEqual(4);
    expect(saved(h).quests.length).toBe(before + plyo.length);
    await clickEl(h, q(h, 'contraction-toggle'));
    expect(q(h, 'contraction-info').textContent).toMatch(/Isométrique.*Pliométrique/s);
    expect(q(h, 'contraction-info').textContent).toMatch(/Markovic 2007/);
    expect(h.errors).toEqual([]);
  }, 120000);
});
