// 4.38 : « Signaler une erreur » sous l'analyse vidéo d'une série : le squelette (jamais l'image) et ce que la personne
// dit être juste partent dans la table form_flags du compte.
import { afterEach, describe, expect, it } from 'vitest';
import { SUPABASE_URL, advance, clickEl, clickText, fakeSupabase, findByText, launch, sleep } from './harness';
import { DEMO_STATE } from './demo';
import { patternFor } from '../../src/form/patterns';
import { timeline, makeFrames, squatBody, curlBody, pushUpBody, pullUpBody } from '../../src/form/synth';
import { EXERCISE_CATALOG } from '../../src/data/catalog';
import { buildFlag, compactFrames } from '../../src/form/flag';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const q = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);
const fit = b => Object.fromEntries(Object.entries(b).map(([k, p]) => [k, { x: 0.05 + p.x * 0.75, y: 0.05 + p.y * 0.75 }]));
async function waitFor(h, fn, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (fn()) return true; await sleep(30); await advance(h, 0); }
  return false;
}
function framesFor(name, reps) {
  const cat = EXERCISE_CATALOG.find(c => c.name === name);
  const P = patternFor({ catalogId: cat && cat.id, name });
  const tl = timeline({ reps, p1: 1.2, p2: 0.9, lead: 1.5, tail: 0.5 });
  if (P.signal === 'knee' || P.signal === 'kneeFront') return { frames: makeFrames(tl, d => squatBody(d)), aspect: 9 / 16 };
  if (P.id === 'pullUp') return { frames: makeFrames(tl, d => fit(pullUpBody(d))), aspect: 9 / 16 };
  if (P.id === 'pushUp') return { frames: makeFrames(tl, d => pushUpBody(d), { aspect: 16 / 9 }), aspect: 16 / 9 };
  return { frames: makeFrames(tl, d => curlBody(d)), aspect: 9 / 16 };
}

describe('signaler une analyse vidéo fausse', () => {
  it('images allégées : 15 par seconde au plus, 3 décimales, sans image', () => {
    const frames = Array.from({ length: 90 }, (_, i) => ({ t: 1000 + i * 33.3, lm: [{ x: 0.123456, y: 0.5, z: 0, visibility: 0.99 }], wl: null }));
    const c = compactFrames(frames);
    expect(c.length).toBeLessThanOrEqual(46);
    expect(c[0]).toEqual({ t: 0, lm: [[0.123, 0.5, 0, 0.99]], wl: null });
    const d = buildFlag({ series: { frames, aspect: 0.56 }, result: { ok: true, repCount: 8 }, item: { name: 'Squat' }, problems: ['count', 'nope'], trueReps: 10 });
    expect(d.problems).toEqual(['count']);
    expect(d.trueReps).toBe(10);
    expect(JSON.stringify(d)).not.toMatch(/blob:|data:image|base64/);
  });

  it('après une série filmée : « Signaler une erreur » envoie le squelette et le bon nombre de reps', async () => {
    const srv = fakeSupabase();
    const user = srv.addUser('a@x.fr');
    const h = await launch({ fetchImpl: srv.fetch, storage: {
      __classic: '1',
      'rondoufit:supabase': JSON.stringify({ url: SUPABASE_URL, anonKey: 'anon-public-key' }),
      'rondoufit:account': JSON.stringify({ session: user.session }),
      'rondoufit:lastUser': user.id,
      rondoudou_save_v1: JSON.stringify({ ...DEMO_STATE, onboarded: true }),
    } });
    open.push(h);
    await advance(h, 600);
    await clickEl(h, h.doc.querySelector('[data-tab="coach"]'));
    const [lancer] = [...findByText(h, 'Lancer la séance guidée'), ...findByText(h, 'Lancer cette séance guidée maintenant')];
    await clickText(h, lancer.textContent.trim().slice(0, 30));
    if (q(h, 'feel-ok')) await clickEl(h, q(h, 'feel-ok'));
    while (q(h, 'warm-done')) await clickEl(h, [...q(h, 'warmup').querySelectorAll('button')].find(b => /Passer/.test(b.textContent)));
    const name = q(h, 'guided-set').querySelector('h2').textContent.trim();
    const { frames, aspect } = framesFor(name, Number(q(h, 'set-reps').textContent));
    h.w.__r2fPoseMock = { frames, aspect, batch: 60 };
    await clickEl(h, q(h, 'form-cam-open'));
    expect(await waitFor(h, () => !q(h, 'form-cam'))).toBe(true);
    await advance(h, 0);
    await clickEl(h, q(h, 'form-flag-open'));
    expect(q(h, 'flag-send').disabled).toBe(true); // rien de coché
    await clickEl(h, q(h, 'flag-count'));
    const before = Number(q(h, 'flag-reps').textContent);
    await clickEl(h, q(h, 'flag-reps-plus'));
    await clickEl(h, q(h, 'flag-reps-plus'));
    await clickEl(h, q(h, 'flag-person'));
    await clickEl(h, q(h, 'flag-send'));
    expect(await waitFor(h, () => q(h, 'flag-sent'))).toBe(true);
    expect(srv.formFlags).toHaveLength(1);
    const d = srv.formFlags[0].data;
    expect(d.exercise.name).toBe(name);
    expect(d.problems).toEqual(['count', 'person']);
    expect(d.trueReps).toBe(before + 2);
    expect(d.frames.length).toBeGreaterThan(20);
    expect(d.frames[0].lm.length).toBe(33);
    expect(d.camera.aspect).toBeCloseTo(aspect);
    expect(JSON.stringify(d)).not.toMatch(/blob:|data:image|base64/);
    expect(h.errors).toEqual([]);
  }, 120000);

  it('sans compte connecté : pas de bouton', async () => {
    const h = await launch();
    open.push(h);
    await clickEl(h, h.doc.querySelector('[data-tab="coach"]'));
    const [lancer] = [...findByText(h, 'Lancer la séance guidée'), ...findByText(h, 'Lancer cette séance guidée maintenant')];
    await clickText(h, lancer.textContent.trim().slice(0, 30));
    if (q(h, 'feel-ok')) await clickEl(h, q(h, 'feel-ok'));
    while (q(h, 'warm-done')) await clickEl(h, [...q(h, 'warmup').querySelectorAll('button')].find(b => /Passer/.test(b.textContent)));
    const name = q(h, 'guided-set').querySelector('h2').textContent.trim();
    const { frames, aspect } = framesFor(name, Number(q(h, 'set-reps').textContent));
    h.w.__r2fPoseMock = { frames, aspect, batch: 60 };
    await clickEl(h, q(h, 'form-cam-open'));
    expect(await waitFor(h, () => !q(h, 'form-cam'))).toBe(true);
    await advance(h, 0);
    expect(q(h, 'form-report')).toBeTruthy();
    expect(q(h, 'form-flag-open')).toBeNull();
  }, 120000);
});
