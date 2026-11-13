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
    expect(q(h, 'day-theme-style-auto').getAttribute('aria-pressed')).toBe('true');
    expect(q(h, 'day-theme-style-auto-note').textContent).toMatch(/le coach choisit/);
    await clickEl(h, q(h, 'day-theme-style-iso'));
    expect(Object.values(saved(h).coach.dayStyles)).toEqual(['iso']);
    expect(q(h, 'day-theme-style-note').textContent).toMatch(/Pauses isométriques : .*3 à 5 s/);
    // la charge reste dans le résumé de l'exercice
    expect([...h.doc.querySelectorAll('[data-testid="ex-line2"]')].some(el => /tiens \d s · [\d,.]+ kg|tiens \d s · aide/.test(el.textContent))).toBe(true);
    // séance mixte : tenues en plus
    await clickEl(h, q(h, 'day-theme-style-iso_hold'));
    expect(Object.values(saved(h).coach.dayStyles)).toEqual([['iso', 'iso_hold']]);
    expect(q(h, 'day-theme-style-note').textContent).toMatch(/Tenues isométriques : .*20 à 30 s/);
    expect(q(h, 'day-theme-style-note').textContent).toMatch(/Séance mixte/);
    await clickEl(h, q(h, 'day-theme-style-iso_hold'));
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

  it('Pliométrie sur la prochaine séance : les sauts du sport sont ajoutés et remplacent des exercices', async () => {
    const h = await launch({ openCoach: true });
    open.push(h);
    await clickEl(h, q(h, 'coach-page-seance'));
    const before = [...h.doc.querySelectorAll('[data-testid="next-ex"]')].length;
    await clickEl(h, q(h, 'day-theme-style-plyo'));
    const s = saved(h);
    expect(Object.values(s.coach.dayStyles)).toEqual(['plyo']);
    expect(s.quests.filter(x => /^ply_/.test(x.catalogId || '')).length).toBeGreaterThan(0);
    const names = [...h.doc.querySelectorAll('[data-testid="next-ex"]')].map(el => el.textContent);
    expect(names.some(t => /Saut|Sautillements|Box Jump|Pompes Claquées/.test(t))).toBe(true);
    expect(names.length).toBeLessThanOrEqual(before + 3);
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
