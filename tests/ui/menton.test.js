// Calibration du menton (4.25) : tractions filmées, l'algorithme dit « menton sous la barre » alors que la personne le
// passait → « Mon menton passait la barre » recalcule l'analyse et garde la calibration pour les séries suivantes.
// Et la calibration avant la série (« Calibrer le menton » sur l'écran de mise en place).
import { afterEach, describe, expect, it } from 'vitest';
import { advance, clickEl, findByText, clickText, launch, sleep } from './harness';
import { timeline, makeFrames, pullUpBody, toLandmarks } from '../../src/form/synth';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const q = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);

async function waitFor(h, fn, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (fn()) return true;
    await sleep(30);
    await advance(h, 0);
  }
  return false;
}

// le corps entier doit tenir dans l'image (démarrage auto) : squelette réduit
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

describe('calibration du menton', () => {
  it('« Mon menton passait la barre » → analyse recalculée, calibration gardée', async () => {
    const h = await launch();
    open.push(h);
    expect(await toPullUps(h)).toBe(true);
    // tractions un peu courtes en haut : l'algorithme ne voit pas le menton passer
    const frames = makeFrames(timeline({ reps: 4, p1: 1.2, p2: 0.9, lead: 1.5, tail: 0.5 }), d => fit(pullUpBody(d, { top: 60 })));
    h.w.__r2fPoseMock = { frames, aspect: 9 / 16, batch: 60 };
    await clickEl(h, q(h, 'form-cam-open'));
    const closed = await waitFor(h, () => !q(h, 'form-cam'));
    expect(closed).toBe(true);
    await advance(h, 0);
    expect(q(h, 'form-report')).toBeTruthy();
    expect(q(h, 'chin-cal-pass')).toBeTruthy();
    await clickEl(h, q(h, 'chin-cal-pass'));
    expect(q(h, 'chin-cal-pass')).toBeNull();
    expect(q(h, 'chin-cal-reset')).toBeTruthy();
    expect(Number(h.w.localStorage.getItem('rondoufit:chinCal'))).toBeGreaterThan(0);
    await clickEl(h, q(h, 'form-more') || q(h, 'form-report'));
    expect(q(h, 'form-report').textContent).toMatch(/Menton au niveau de la barre/);
    // remise à zéro
    await clickEl(h, q(h, 'chin-cal-reset'));
    expect(h.w.localStorage.getItem('rondoufit:chinCal')).toBeNull();
    expect(q(h, 'chin-cal-pass')).toBeTruthy();
    expect(h.errors).toEqual([]);
  }, 120000);

  it('calibrer avant la série : menton tenu au niveau de la barre', async () => {
    const h = await launch();
    open.push(h);
    expect(await toPullUps(h)).toBe(true);
    h.w.__r2fPoseMock = { frames: [], aspect: 9 / 16 }; // caméra ouverte, personne pas encore en place
    await clickEl(h, q(h, 'form-cam-open'));
    expect(await waitFor(h, () => q(h, 'chin-calib'))).toBe(true);
    await clickEl(h, q(h, 'chin-calib'));
    expect(q(h, 'form-cam-status').textContent).toMatch(/Calibrer le menton/);
    expect(q(h, 'chin-calib-cancel')).toBeTruthy();
    await clickEl(h, q(h, 'chin-calib-cancel'));
    expect(q(h, 'chin-calib')).toBeTruthy();
    expect(h.errors).toEqual([]);
  }, 120000);
});
