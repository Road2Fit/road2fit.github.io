// 4.35 : bip à chaque rep comptée pendant l'analyse vidéo (option, activée par défaut, réglage gardé).
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickEl, clickText, findByText, launch, sleep } from './harness';
import { timeline, makeFrames, squatBody, curlBody, pushUpBody, pullUpBody } from '../../src/form/synth';
const fit = b => Object.fromEntries(Object.entries(b).map(([k, p]) => [k, { x: 0.05 + p.x * 0.75, y: 0.05 + p.y * 0.75 }]));
import { patternFor } from '../../src/form/patterns';
import { EXERCISE_CATALOG } from '../../src/data/catalog';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const q = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);
async function waitFor(h, fn, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (fn()) return true; await sleep(30); await advance(h, 0); }
  return false;
}
async function film(storage = {}) {
  const h = await launch({ storage });
  open.push(h);
  await clickEl(h, h.doc.querySelector('[data-tab="coach"]'));
  const [lancer] = [...findByText(h, 'Lancer la séance guidée'), ...findByText(h, 'Lancer cette séance guidée maintenant')];
  await clickText(h, lancer.textContent.trim().slice(0, 30));
  if (q(h, 'feel-ok')) await clickEl(h, q(h, 'feel-ok'));
  while (q(h, 'warm-done')) await clickEl(h, [...q(h, 'warmup').querySelectorAll('button')].find(b => /Passer/.test(b.textContent)));
  const name = q(h, 'guided-set').querySelector('h2').textContent.trim();
  const cat = EXERCISE_CATALOG.find(c => c.name === name);
  const P = patternFor({ catalogId: cat && cat.id, name });
  const tl = timeline({ reps: 5, p1: 1.2, p2: 0.9, lead: 1.5, tail: 0.5 });
  let frames = makeFrames(tl, d => curlBody(d)), aspect = 9 / 16;
  if (P.signal === 'knee' || P.signal === 'kneeFront') frames = makeFrames(tl, d => squatBody(d));
  else if (P.id === 'pullUp') frames = makeFrames(tl, d => fit(pullUpBody(d)));
  else if (P.id === 'pushUp') { aspect = 16 / 9; frames = makeFrames(tl, d => pushUpBody(d), { aspect }); }
  h.w.__r2fPoseMock = { frames, aspect, batch: 60 };
  return h;
}

describe('bip à chaque rep', () => {
  it('activé par défaut : un bip par rep comptée', async () => {
    const h = await film();
    await clickEl(h, q(h, 'form-cam-open'));
    expect(q(h, 'form-beep-toggle').getAttribute('aria-pressed')).toBe('true');
    expect(await waitFor(h, () => !q(h, 'form-cam'))).toBe(true);
    expect(h.w.__r2fPoseMock.beeps).toBeGreaterThanOrEqual(4);
    expect(h.errors).toEqual([]);
  }, 120000);

  it('coupé : aucun bip, et le réglage est gardé', async () => {
    const h = await film({ 'rondoufit:formBeep': '0' });
    await clickEl(h, q(h, 'form-cam-open'));
    expect(q(h, 'form-beep-toggle').getAttribute('aria-pressed')).toBe('false');
    expect(await waitFor(h, () => !q(h, 'form-cam'))).toBe(true);
    expect(h.w.__r2fPoseMock.beeps).toBeUndefined();
    expect(h.errors).toEqual([]);
  }, 120000);

  it('le bouton haut-parleur change le réglage', async () => {
    const h = await film();
    h.w.__r2fPoseMock = { frames: [], aspect: 9 / 16, batch: 60 };
    await clickEl(h, q(h, 'form-cam-open'));
    await clickEl(h, q(h, 'form-beep-toggle'));
    expect(h.w.localStorage.getItem('rondoufit:formBeep')).toBe('0');
  }, 120000);
});
