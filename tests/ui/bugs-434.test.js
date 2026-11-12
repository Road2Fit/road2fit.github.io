// 4.34 : trois bugs remontés par Gabin.
// 1. séance guidée jamais terminée (« Enregistrer la séance » pas touché) : restait sur le téléphone, absente du compte
//    et invisible pour les amis → enregistrée toute seule à sa date le lendemain ;
// 2. la caméra (chargée à la demande) qui ne peut pas se charger faisait planter tout l'écran (« Oups ») ;
// 3. « Lancer l'analyse du coach » ne faisait plus rien après avoir réduit puis rouvert la séance (ou rechargé l'appli).
import { afterEach, describe, expect, it } from 'vitest';
import { SUPABASE_URL, advance, clickEl, clickText, fakeSupabase, findByText, launch, sleep } from './harness';
import { DEMO_STATE } from './demo';
import { patternFor } from '../../src/form/patterns';
import { timeline, makeFrames, squatBody, curlBody, pushUpBody, pullUpBody } from '../../src/form/synth';
import { EXERCISE_CATALOG } from '../../src/data/catalog';
import { retryImport, safeLazy } from '../../src/lib/safeLazy';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const q = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);
const fit = b => Object.fromEntries(Object.entries(b).map(([k, p]) => [k, { x: 0.05 + p.x * 0.75, y: 0.05 + p.y * 0.75 }]));
function framesFor(name, reps) {
  const cat = EXERCISE_CATALOG.find(c => c.name === name);
  const P = patternFor({ catalogId: cat && cat.id, name });
  const tl = timeline({ reps, p1: 1.2, p2: 0.9, lead: 1.5, tail: 0.5 });
  if (P.signal === 'knee' || P.signal === 'kneeFront') return { frames: makeFrames(tl, d => squatBody(d)), aspect: 9 / 16 };
  if (P.id === 'pullUp') return { frames: makeFrames(tl, d => fit(pullUpBody(d))), aspect: 9 / 16 };
  if (P.id === 'pushUp') return { frames: makeFrames(tl, d => pushUpBody(d), { aspect: 16 / 9 }), aspect: 16 / 9 };
  return { frames: makeFrames(tl, d => curlBody(d)), aspect: 9 / 16 };
}
async function waitFor(h, fn, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (fn()) return true; await sleep(30); await advance(h, 0); }
  return false;
}
async function startGuided(h) {
  await clickEl(h, h.doc.querySelector('[data-tab="coach"]'));
  const [lancer] = [...findByText(h, 'Lancer la séance guidée'), ...findByText(h, 'Lancer cette séance guidée maintenant')];
  await clickText(h, lancer.textContent.trim().slice(0, 30));
  if (q(h, 'feel-ok')) await clickEl(h, q(h, 'feel-ok'));
  while (q(h, 'warm-done')) await clickEl(h, [...q(h, 'warmup').querySelectorAll('button')].find(b => /Passer/.test(b.textContent)));
}

describe('4.34', () => {
  it('séance guidée d’hier jamais terminée : enregistrée toute seule à sa date', async () => {
    const h1 = await launch();
    open.push(h1);
    await startGuided(h1);
    const name = q(h1, 'guided-set').querySelector('h2').textContent.trim();
    await clickEl(h1, q(h1, 'set-done'));
    await advance(h1, 0);
    const g = JSON.parse(h1.w.localStorage.getItem('rondoufit_guided_v1'));
    const save = h1.w.localStorage.getItem('rondoudou_save_v1');
    const today = JSON.parse(save).quests.flatMap(x => x.history || []).map(e => e.date).sort().pop();
    expect(g && g.startedAt).toBeTruthy();
    h1.close(); open.pop();
    // le lendemain : l'appli rouvre avec la séance pas enregistrée
    g.startedAt -= 24 * 3600 * 1000;
    const h = await launch({ storage: { rondoudou_save_v1: save, rondoudou_local_ts: '1', rondoufit_guided_v1: JSON.stringify(g) } });
    open.push(h);
    await advance(h, 2000);
    expect(h.w.localStorage.getItem('rondoufit_guided_v1')).toBeNull();
    const st = JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));
    const quest = st.quests.find(x => x.name === name);
    const day = new Date(g.startedAt); const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    expect(iso < today || iso <= today).toBe(true);
    const before = JSON.parse(save).quests.find(x => x.name === name).history;
    const added = quest.history.filter(e => !before.some(b => b.id === e.id));
    expect(added).toHaveLength(1);
    expect(added[0].date).toBe(iso);
    expect(added[0].setDetails).toHaveLength(1);
    expect(h.doc.body.textContent).toMatch(/enregistrée/);
    expect(h.errors).toEqual([]);
  }, 120000);

  it('chargement à la demande : réessaie, puis affiche le remplaçant au lieu de planter', async () => {
    let n = 0;
    const ok = await retryImport(() => (++n < 3 ? Promise.reject(new Error('réseau')) : Promise.resolve('ok')), 3, 1);
    expect(ok).toBe('ok');
    const Fallback = () => null;
    const C = safeLazy(() => Promise.reject(new Error('404')), Fallback);
    const mod = await C._payload._result();
    expect(mod.default).toBe(Fallback);
  });

  it('analyse du coach IA : le bouton marche encore après avoir réduit puis rouvert la séance', async () => {
    const srv = fakeSupabase();
    const user = srv.addUser('a@x.fr');
    let sent = null;
    srv.ai = async (task, body) => { sent = body; return { verdict: 'Correct', summary: 'Bonne série.', points: [], nextSet: 'Pareil.', usage: { input: 10, output: 5 } }; };
    const h = await launch({ fetchImpl: srv.fetch, storage: {
      __classic: '1',
      'rondoufit:supabase': JSON.stringify({ url: SUPABASE_URL, anonKey: 'anon-public-key' }),
      'rondoufit:account': JSON.stringify({ session: user.session }),
      'rondoufit:lastUser': user.id,
      rondoudou_save_v1: JSON.stringify({ ...DEMO_STATE, onboarded: true, aiConsent: true }),
    } });
    open.push(h);
    await advance(h, 600);
    await startGuided(h);
    const name = q(h, 'guided-set').querySelector('h2').textContent.trim();
    const { frames, aspect } = framesFor(name, Number(q(h, 'set-reps').textContent));
    h.w.__r2fPoseMock = { frames, aspect, batch: 60 };
    await clickEl(h, q(h, 'form-cam-open'));
    expect(await waitFor(h, () => !q(h, 'form-cam'))).toBe(true);
    // la séance est réduite puis rouverte (l'écran est recréé)
    await clickEl(h, q(h, 'guided-minimize'));
    expect(q(h, 'guided')).toBeNull();
    await clickEl(h, q(h, 'resume-guided') || findByText(h, 'Reprendre')[0]);
    expect(await waitFor(h, () => q(h, 'form-tab-ai'))).toBe(true);
    await clickEl(h, q(h, 'form-tab-ai'));
    await clickEl(h, q(h, 'form-ai-run'));
    expect(await waitFor(h, () => sent)).toBe(true);
    expect(sent.context).toMatch(new RegExp(name));
    expect(await waitFor(h, () => q(h, 'form-ai-summary'))).toBe(true);
    expect(h.errors).toEqual([]);
  }, 120000);
});
