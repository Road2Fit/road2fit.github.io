// Analyse vidéo d'une série (4.19) : « Me filmer » sur l'écran de la série → caméra (ici simulée par des images de squelette
// fabriquées à l'avance) → l'enregistrement démarre tout seul, compte les reps, s'arrête tout seul → série validée →
// pendant le repos, la carte « Le coach a regardé ta série » (verdict, reps, tempo, corrections) ; la caméra se rouvre
// toute seule à la série suivante du même exercice ; « Ne plus filmer » l'arrête.
import { afterEach, describe, expect, it } from 'vitest';
import { SUPABASE_URL, advance, clickEl, fakeSupabase, findByText, clickText, launch, sleep } from './harness';
import { DEMO_STATE } from './demo';
import { patternFor } from '../../src/form/patterns';
import { timeline, makeFrames, squatBody, curlBody, pushUpBody, pullUpBody } from '../../src/form/synth';

// corps entier dans l'image (démarrage auto) : squelette de traction réduit
const fit = b => Object.fromEntries(Object.entries(b).map(([k, p]) => [k, { x: 0.05 + p.x * 0.75, y: 0.05 + p.y * 0.75 }]));
import { EXERCISE_CATALOG } from '../../src/data/catalog';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const q = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);

// images de squelette adaptées au mouvement de l'exercice affiché
function framesFor(name, reps, opts = {}, tlOpts = {}) {
  const cat = EXERCISE_CATALOG.find(c => c.name === name);
  const P = patternFor({ catalogId: cat && cat.id, name });
  const tl = timeline({ reps, p1: 1.2, p2: 0.9, lead: 1.5, tail: 0.5, ...tlOpts });
  if (P.signal === 'knee' || P.signal === 'kneeFront') return { P, frames: makeFrames(tl, d => squatBody(d, opts)), aspect: 9 / 16 };
  if (P.id === 'pullUp') return { P, frames: makeFrames(tl, d => fit(pullUpBody(d))), aspect: 9 / 16 };
  if (P.id === 'pushUp') return { P, frames: makeFrames(tl, d => pushUpBody(d), { aspect: 16 / 9 }), aspect: 16 / 9 };
  return { P, frames: makeFrames(tl, d => curlBody(d, opts)), aspect: 9 / 16 };
}

async function waitFor(h, fn, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (fn()) return true;
    await sleep(30);
    await advance(h, 0);
  }
  return false;
}

describe('analyse vidéo de la série', () => {
  it('filmer → reps comptées → retour du coach au repos → caméra rouverte → arrêt', async () => {
    const h = await launch();
    open.push(h);
    await clickEl(h, h.doc.querySelector('[data-tab="coach"]'));
    const [lancer] = [...findByText(h, 'Lancer la séance guidée'), ...findByText(h, 'Lancer cette séance guidée maintenant')];
    await clickText(h, lancer.textContent.trim().slice(0, 30));
    if (q(h, 'feel-ok')) await clickEl(h, q(h, 'feel-ok'));
    while (q(h, 'warm-done')) await clickEl(h, [...q(h, 'warmup').querySelectorAll('button')].find(b => /Passer/.test(b.textContent)));
    const name = q(h, 'guided-set').querySelector('h2').textContent.trim();
    const noted = Number(q(h, 'set-reps').textContent);
    // la caméra « voit » une rep de moins que prévu
    const { P, frames, aspect } = framesFor(name, noted - 1);
    expect(P.iso).toBeFalsy();
    h.w.__r2fPoseMock = { frames, aspect, batch: 60 };

    await clickEl(h, q(h, 'form-cam-open'));
    expect(q(h, 'form-cam')).toBeTruthy();
    expect(await waitFor(h, () => !q(h, 'form-cam'))).toBe(true);
    await advance(h, 0);

    // repos : carte d'analyse à la place du grand cercle
    expect(q(h, 'guided-rest')).toBeTruthy();
    const card = q(h, 'form-report');
    expect(card).toBeTruthy();
    expect(card.textContent).toMatch(/Le coach a regardé ta série/);
    expect(q(h, 'form-tab-ai')).toBeNull(); // coach IA non activé : une seule analyse, aucun appel
    expect(q(h, 'form-summary').textContent).toMatch(new RegExp(`^${noted - 1} reps`));
    expect(q(h, 'rest-left')).toBeTruthy();
    // la caméra a compté une rep de moins : on corrige en un geste
    expect(q(h, 'form-count').textContent).toMatch(new RegExp(`compté ${noted - 1} rep`));
    await clickEl(h, q(h, 'form-fix-reps'));
    expect(q(h, 'form-count')).toBeNull();

    // série suivante : la caméra se rouvre toute seule ; « Ne plus filmer cet exercice » la ferme pour de bon
    h.w.__r2fPoseMock = { frames: [], aspect }; // personne devant la caméra
    await clickEl(h, q(h, 'guided-next'));
    await advance(h, 0);
    if (q(h, 'guided-set')) {
      expect(await waitFor(h, () => q(h, 'form-cam-stop-auto'))).toBe(true);
      await clickEl(h, q(h, 'form-cam-stop-auto'));
      expect(q(h, 'form-cam')).toBeNull();
      // série faite sans caméra : plus de carte d'analyse au repos
      await clickEl(h, q(h, 'set-done'));
      if (q(h, 'guided-rest')) expect(q(h, 'form-report')).toBeNull();
    }
    await advance(h, 300);
    expect(h.errors).toEqual([]);
  }, 120000);

  it('aucune rep vue : message clair et conseils de placement', async () => {
    const h = await launch();
    open.push(h);
    await clickEl(h, h.doc.querySelector('[data-tab="coach"]'));
    const [lancer] = [...findByText(h, 'Lancer la séance guidée'), ...findByText(h, 'Lancer cette séance guidée maintenant')];
    await clickText(h, lancer.textContent.trim().slice(0, 30));
    if (q(h, 'feel-ok')) await clickEl(h, q(h, 'feel-ok'));
    while (q(h, 'warm-done')) await clickEl(h, [...q(h, 'warmup').querySelectorAll('button')].find(b => /Passer/.test(b.textContent)));
    // le corps reste immobile : pas de rep vue, l'utilisateur arrête à la main
    const name = q(h, 'guided-set').querySelector('h2').textContent.trim();
    const { frames, aspect } = framesFor(name, 0);
    h.w.__r2fPoseMock = { frames, aspect, batch: 60 };
    await clickEl(h, q(h, 'form-cam-open'));
    expect(await waitFor(h, () => !q(h, 'form-cam'))).toBe(true);
    await advance(h, 0);
    expect(q(h, 'form-report-fail').textContent).toMatch(/répétition/);
    expect(q(h, 'form-report').textContent).toMatch(/profil|face/);
    expect(h.errors).toEqual([]);
  }, 120000);

  it('coach IA activé : deux onglets, Algorithme et Coach IA (mesures envoyées, jamais l’image)', async () => {
    const srv = fakeSupabase();
    const user = srv.addUser('a@x.fr');
    let sent = null;
    srv.ai = async (task, body) => {
      expect(task).toBe('form');
      sent = body;
      return { verdict: 'À travailler', summary: 'Tu ralentis nettement sur les 2 dernières reps.', points: [{ level: 'warn', title: 'Fin de série lente', detail: 'Montée 2 fois plus lente à la fin.', fix: 'Garde 1 à 2 reps en réserve.' }], nextSet: 'Même charge, une rep de moins.', usage: { input: 900, output: 250 } };
    };
    const h = await launch({ fetchImpl: srv.fetch, storage: {
      __classic: '1',
      'rondoufit:supabase': JSON.stringify({ url: SUPABASE_URL, anonKey: 'anon-public-key' }),
      'rondoufit:account': JSON.stringify({ session: user.session }),
      'rondoufit:lastUser': user.id,
      rondoudou_save_v1: JSON.stringify({ ...DEMO_STATE, onboarded: true, aiConsent: true }),
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
    // rien n'est envoyé tant qu'on ne le demande pas
    await advance(h, 300);
    expect(sent).toBeNull();
    await clickEl(h, q(h, 'form-tab-ai'));
    await clickEl(h, q(h, 'form-ai-run'));
    expect(await waitFor(h, () => sent)).toBe(true);
    // seulement du texte chiffré : pas d'image, pas de catalogue
    expect(sent.context).toMatch(/Reps comptées par la caméra/);
    expect(sent.context).toMatch(new RegExp(name));
    expect(JSON.stringify(sent)).not.toMatch(/data:image|base64/);
    await advance(h, 0);
    expect(q(h, 'form-tab-algo')).toBeTruthy();
    expect(await waitFor(h, () => q(h, 'form-ai-summary'))).toBe(true);
    expect(q(h, 'form-ai').textContent).toMatch(/Fin de série lente/);
    expect(q(h, 'form-ai-next').textContent).toMatch(/une rep de moins/);
    expect(q(h, 'form-verdict').textContent).toBe('À travailler');
    expect(q(h, 'form-ai-usage').textContent).toMatch(/1150 tokens/);
    // retour à l'onglet algorithme : son propre verdict
    await clickEl(h, q(h, 'form-tab-algo'));
    expect(q(h, 'form-ai')).toBeNull();
    expect(h.errors).toEqual([]);
  }, 120000);


  it('vidéo de la série : toucher un point relevé montre l’extrait du moment ; « Garder la vidéo »', async () => {
    const h = await launch();
    open.push(h);
    await clickEl(h, h.doc.querySelector('[data-tab="coach"]'));
    const [lancer] = [...findByText(h, 'Lancer la séance guidée'), ...findByText(h, 'Lancer cette séance guidée maintenant')];
    await clickText(h, lancer.textContent.trim().slice(0, 30));
    if (q(h, 'feel-ok')) await clickEl(h, q(h, 'feel-ok'));
    while (q(h, 'warm-done')) await clickEl(h, [...q(h, 'warmup').querySelectorAll('button')].find(b => /Passer/.test(b.textContent)));
    const name = q(h, 'guided-set').querySelector('h2').textContent.trim();
    // reps très rapides : la descente trop rapide est forcément relevée
    const { frames, aspect } = framesFor(name, 6, {}, { p1: 0.4, p2: 0.4, holdTurn: 0 });
    h.w.__r2fPoseMock = { frames, aspect, batch: 60, clip: true };
    await clickEl(h, q(h, 'form-cam-open'));
    expect(await waitFor(h, () => !q(h, 'form-cam'))).toBe(true);
    await advance(h, 0);
    expect(q(h, 'form-video')).toBeTruthy();
    const play = q(h, 'form-play');
    expect(play).toBeTruthy();
    await clickEl(h, play.closest('[role="button"]'));
    expect(q(h, 'clip-player')).toBeTruthy();
    expect(q(h, 'clip-video').getAttribute('src')).toBe('blob:test-clip');
    expect(q(h, 'clip-reps').textContent).toMatch(/Rep [0-9]/);
    await clickEl(h, q(h, 'clip-all'));
    await clickEl(h, q(h, 'clip-close'));
    expect(q(h, 'clip-player')).toBeNull();
    await clickEl(h, q(h, 'form-video-save'));
    expect(q(h, 'form-video-save').textContent).toMatch(/gardée/);
    // série suivante faite sans caméra : la vidéo est effacée
    h.w.__r2fPoseMock = { frames: [], aspect };
    await clickEl(h, q(h, 'guided-next'));
    await advance(h, 0);
    if (q(h, 'form-cam-stop-auto')) await clickEl(h, q(h, 'form-cam-stop-auto'));
    if (q(h, 'set-done')) { await clickEl(h, q(h, 'set-done')); expect(q(h, 'form-video')).toBeNull(); }
    expect(h.errors).toEqual([]);
  }, 120000);
});
