// 4.47.7 : 14 vidéos signalées par Gabin le 15/11/2026 (sauts, tractions, développé couché). Les squelettes réels ne sont
// pas dans le dépôt (données personnelles) : ces tests reproduisent, avec des squelettes simulés, ce que montraient les
// vraies vidéos. Sur les vraies données : 12 séries justes sur 14 (avant : 0), les 2 autres « je préfère ne pas compter ».
import { describe, it, expect } from 'vitest';
import { analyzeSet, liveCount, ownTrack } from './analyze';
import { patternFor } from './patterns';
import { timeline, makeFrames, sideBody, toLandmarks, pullUpBody, pushUpBody } from './synth';

const A = { aspect: 9 / 16 };
const LAND = 16 / 9;
const shiftBody = (b, dx, dy) => Object.fromEntries(Object.entries(b).map(([k, p]) => [k, { x: p.x + dx, y: p.y + dy }]));
const flip = lm => lm.map(p => ({ ...p, y: 1.02 - p.y })); // squelette détecté à l'envers

describe('tractions : squelette détecté à l’envers sur certaines images', () => {
  const P = patternFor({ catalogId: 'pullups', name: 'Tractions Pronation' });
  it('les images à l’envers sont ignorées : toutes les reps comptent', () => {
    const fr = makeFrames(timeline({ reps: 7, p1: 0.9, p2: 1.1 }), d => pullUpBody(d)).map((f, i) => (f.lm && i % 6 === 3 ? { ...f, lm: flip(f.lm) } : f));
    expect(analyzeSet(fr, P, A).repCount).toBe(7);
    expect(liveCount(fr, P, A)).toBe(7);
  });
  it('s’accrocher à la barre bien avant la série ne compte pas comme une rep', () => {
    const fr = makeFrames(timeline({ reps: 7, holdRest: i => (i === 0 ? 6 : 0.5) }), d => pullUpBody(d));
    expect(analyzeSet(fr, P, A).repCount).toBe(6);
  });
});

describe('sauts (pliométrie)', () => {
  const stand = sideBody({ ua: 200, fa: 20 });
  it('sautillements : chaque envol compte, le premier depuis la position debout aussi', () => {
    const P = patternFor({ catalogId: 'ply_pogo', name: 'Pogo' });
    expect(P.id).toBe('jump');
    const fr = makeFrames(timeline({ reps: 12, p1: 0.25, p2: 0.25, holdTurn: 0, holdRest: 0.2, lead: 2 }), d => shiftBody(stand, 0, -0.12 * d));
    expect(ownTrack(fr, 9 / 16)).toBe(fr); // en l'air / au sol : la même personne, rien n'est retiré
    expect(analyzeSet(fr, P, A).repCount).toBe(12);
    expect(liveCount(fr, P, A)).toBe(12);
  });
  it('box jump : monter sur la caisse puis revenir à sa place compte, même si on se déplace', () => {
    const P = patternFor({ catalogId: 'ply_box_jump', name: 'Box Jump' });
    // d : 0 au sol à sa place, 1 sur la caisse (plus haut et plus loin) ; retour en marchant
    const fr = makeFrames(timeline({ reps: 4, p1: 0.5, p2: 1.5, holdTurn: 1, holdRest: 1.5 }), d => shiftBody(stand, 0.25 * d, -0.2 * d));
    expect(analyzeSet(fr, P, A).repCount).toBe(4);
  });
});

describe('développé couché : bas de la rep caché par la barre', () => {
  const P = patternFor({ catalogId: 'bench_press', name: 'Développé Couché Barre' });
  it('le détecteur ne voit plus rien près du bas : la rep compte quand même', () => {
    const fr = makeFrames(timeline({ reps: 6, p1: 1.3, p2: 1.0, holdTurn: 0.3 }), d => (d > 0.6 ? null : pushUpBody(d)), { aspect: LAND }); // vidéo réelle : coude vu jusqu'à ~100-120°, puis plus rien
    expect(analyzeSet(fr, P, { aspect: LAND }).repCount).toBe(6);
  });
  it('un trou de détection en position de repos ne crée pas de rep', () => {
    const fr = makeFrames(timeline({ reps: 5, holdRest: 2 }), (d, t) => (d < 0.05 && Math.floor(t) % 4 === 0 ? null : pushUpBody(d)), { aspect: LAND });
    expect(analyzeSet(fr, P, { aspect: LAND }).repCount).toBe(5);
  });
});

describe('détection instable : on ne compte pas plutôt que de donner un faux nombre', () => {
  it('squelette qui saute d’un endroit à l’autre', () => {
    const P = patternFor({ catalogId: 'bench_press', name: 'Développé Couché Barre' });
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5;
    const fr = makeFrames(timeline({ reps: 6 }), d => {
      const b = pushUpBody(d);
      return rnd() > 0.15 ? shiftBody(b, rnd() * 0.5, rnd() * 0.5) : b;
    });
    const res = analyzeSet(fr, P, A);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('unstable');
  });
  it('personne vue sur trop peu d’images', () => {
    const P = patternFor({ catalogId: 'pullups', name: 'Tractions' });
    const fr = makeFrames(timeline({ reps: 6 }), (d, t, i) => (i % 5 ? null : { lm: toLandmarks(pullUpBody(d)) }));
    const res = analyzeSet(fr, P, A);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('framing');
  });
});
