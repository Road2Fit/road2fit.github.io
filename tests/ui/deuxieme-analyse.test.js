// 4.48 : « Deuxième analyse » de la vidéo (bouton, jamais automatique) : la vidéo est relue image par image et le résultat
// remplacé ; la première analyse reste consultable. Le détecteur est simulé (__r2fPoseMock.pass2 = images relues).
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickEl, findByText, clickText, launch, sleep } from './harness';
import { timeline, makeFrames, pullUpBody } from '../../src/form/synth';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const q = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);
async function waitFor(h, fn, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (fn()) return true; await sleep(30); await advance(h, 0); }
  return false;
}
const fit = b => Object.fromEntries(Object.entries(b).map(([k, p]) => [k, { x: 0.05 + p.x * 0.75, y: 0.05 + p.y * 0.75 }]));
async function toPullUps(h) {
  await clickEl(h, h.doc.querySelector('[data-tab="coach"]'));
  const [lancer] = [...findByText(h, 'Lancer la séance guidée'), ...findByText(h, 'Lancer cette séance guidée maintenant')];
  await clickText(h, lancer.textContent.trim().slice(0, 30));
  if (q(h, 'feel-ok')) await clickEl(h, q(h, 'feel-ok'));
  for (let k = 0; k < 12; k++) {
    while (q(h, 'warm-done')) await clickEl(h, [...q(h, 'warmup').querySelectorAll('button')].find(b => /Passer/.test(b.textContent)));
    const title = q(h, 'guided-set') && q(h, 'guided-set').querySelector('h2').textContent;
    if (/traction/i.test(title || '')) return true;
    await clickEl(h, q(h, 'guided-menu'));
    const skip = [...h.doc.querySelectorAll('[data-testid="guided-menu-sheet"] button')].find(b => /Passer l.exercice/.test(b.textContent));
    if (!skip) return false;
    await clickEl(h, skip);
    await advance(h, 0);
  }
  return false;
}

describe('deuxième analyse de la vidéo', () => {
  it('bouton → vidéo relue, nouveau nombre de reps, retour possible à la première', async () => {
    const h = await launch();
    open.push(h);
    expect(await toPullUps(h)).toBe(true);
    const tl = o => timeline({ p1: 1.2, p2: 0.9, lead: 1.5, tail: 0.5, ...o });
    const live = makeFrames(tl({ reps: 4 }), d => fit(pullUpBody(d)));
    const pass2 = makeFrames(tl({ reps: 6 }), d => fit(pullUpBody(d)));
    h.w.__r2fPoseMock = { frames: live, aspect: 9 / 16, batch: 60, clip: true, pass2 };
    await clickEl(h, q(h, 'form-cam-open'));
    expect(await waitFor(h, () => !q(h, 'form-cam'))).toBe(true);
    await advance(h, 0);
    expect(q(h, 'form-summary').textContent).toMatch(/^4 reps/);
    // pas automatique : rien ne se lance tout seul
    expect(q(h, 'form-pass2-running')).toBeNull();
    expect(q(h, 'form-pass2-run').textContent).toMatch(/Deuxième analyse/);
    await clickEl(h, q(h, 'form-pass2-run'));
    expect(await waitFor(h, () => q(h, 'form-pass2-done'))).toBe(true);
    expect(q(h, 'form-summary').textContent).toMatch(/^6 reps/);
    expect(q(h, 'form-pass2-done').textContent).toMatch(/Première : 4 reps/);
    expect(q(h, 'form-pass2-run')).toBeNull();
    expect(q(h, 'form-fix-reps').textContent).toMatch(/6/);
    await clickEl(h, q(h, 'form-pass2-undo'));
    expect(q(h, 'form-summary').textContent).toMatch(/^4 reps/);
    expect(q(h, 'form-pass2-run')).toBeTruthy();
    expect(h.errors).toEqual([]);
  }, 120000);

  it('analyse impossible au premier passage : la deuxième peut compter', async () => {
    const h = await launch();
    open.push(h);
    expect(await toPullUps(h)).toBe(true);
    const tl = timeline({ reps: 5, p1: 1.2, p2: 0.9, lead: 1.5, tail: 0.5 });
    const sparse = makeFrames(tl, (d, t, i) => (t > 2.5 && i % 5 ? null : fit(pullUpBody(d)))); // vu au début (démarrage), puis presque plus
    const pass2 = makeFrames(tl, d => fit(pullUpBody(d)));
    h.w.__r2fPoseMock = { frames: sparse, aspect: 9 / 16, batch: 60, clip: true, pass2 };
    await clickEl(h, q(h, 'form-cam-open'));
    expect(await waitFor(h, () => !q(h, 'form-cam'))).toBe(true);
    await advance(h, 0);
    expect(q(h, 'form-report-fail')).toBeTruthy();
    await clickEl(h, q(h, 'form-pass2-run'));
    expect(await waitFor(h, () => q(h, 'form-pass2-done'))).toBe(true);
    expect(q(h, 'form-summary').textContent).toMatch(/^5 reps/);
    expect(q(h, 'form-pass2-done').textContent).toMatch(/analyse impossible/);
    expect(h.errors).toEqual([]);
  }, 120000);
});
