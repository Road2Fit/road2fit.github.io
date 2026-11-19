// 4.48.3 : séries signalées par Gabin le 19/11/2026 (dips, développé couché, extensions lombaires), toutes filmées en
// vertical. Les squelettes réels ne sont pas dans le dépôt (données personnelles) : ces tests reproduisent, avec des
// squelettes simulés, ce que montraient les vraies séries.
import { describe, it, expect } from 'vitest';
import { analyzeSet, liveCount } from './analyze';
import { patternFor } from './patterns';
import { pickPerson, REACQUIRE } from './pickPerson';
import { timeline, makeFrames, toLandmarks, pullUpBody, sideBody } from './synth';

const A = { aspect: 9 / 16 };
let seed = 5;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5;
const shift = (lm, dx, dy) => lm.map(p => ({ ...p, x: p.x + dx, y: p.y + dy }));

describe('décor pris pour une personne', () => {
  const P = patternFor({ catalogId: 'pullups', name: 'Tractions' });
  it('analyse : un « fantôme » ailleurs dans l’image, plusieurs images d’affilée, est écarté', () => {
    const still = toLandmarks(pullUpBody(0)); // objet du décor : ne bouge pas
    const fr = makeFrames(timeline({ reps: 6 }), d => pullUpBody(d)).map((f, i) => (f.lm && i % 20 < 4 ? { ...f, lm: shift(still, 0.55, 0.3) } : f));
    expect(analyzeSet(fr, P, A).repCount).toBe(6);
    expect(liveCount(fr, P, A)).toBe(6);
  });
  it('pendant le film : on ne lâche pas la personne pour un objet vu ailleurs, sauf si elle est partie longtemps', () => {
    const small = lm => lm.map(p => ({ ...p, x: 0.3 + (p.x - 0.5) * 0.4, y: 0.3 + (p.y - 0.5) * 0.4 }));
    const me = { lm: small(toLandmarks(pullUpBody(0))) };
    const ghost = { lm: shift(me.lm, 0.5, 0.2) };
    let { track } = pickPerson([me], 9 / 16);
    for (let k = 0; k < REACQUIRE; k++) {
      const r = pickPerson([ghost], 9 / 16, track, true);
      expect(r.pose).toBeNull();
      track = r.track;
    }
    expect(pickPerson([ghost], 9 / 16, track, true).pose).toBe(ghost); // partie depuis ~1,5 s : on suit qui est là
    // la personne revient avant : elle est reprise tout de suite
    let t2 = pickPerson([me], 9 / 16).track;
    t2 = pickPerson([ghost], 9 / 16, t2, true).track;
    expect(pickPerson([ghost, me], 9 / 16, t2, true).pose).toBe(me);
  });
});

describe('dips filmés de face', () => {
  const P = patternFor({ catalogId: 'dips', name: 'Dips sur Barres Parallèles' });
  // de face : épaules écartées ; le coude, qui plie vers le téléphone, est très mal placé par le détecteur
  const body = (d, side) => {
    const x = 0.5 + side * 0.1, sy = 0.3 + 0.12 * d;
    const sh = { x, y: sy }, wr = { x: x + side * 0.02, y: 0.55 };
    const el = { x: x + side * (0.05 + rnd() * 0.2), y: sy + 0.08 + rnd() * 0.15 };
    const hip = { x, y: sy + 0.27 }, kn = { x, y: sy + 0.45 }, an = { x, y: sy + 0.62 };
    return { sh, el, wr, idx: { x, y: 0.56 }, hip, kn, an, nose: { x: 0.5, y: sy - 0.1 }, ear: { x, y: sy - 0.1 }, heel: an, foot: an };
  };
  it('la hauteur des épaules compte les 8 reps', () => {
    const fr = makeFrames(timeline({ reps: 8, p1: 1, p2: 1 }), d => ({ lm: toLandmarks(body(d, 0), { left: body(d, -1), right: body(d, 1) }) }));
    const res = analyzeSet(fr, P, A);
    expect(res.view).toBe('front');
    expect(res.repCount).toBe(8);
    expect(liveCount(fr, P, A)).toBe(8);
  });
});

describe('développé couché : installation sur le banc', () => {
  const P = patternFor({ catalogId: 'bench_press', name: 'Développé Couché Barre' });
  // allongé ; la barre (les poignets) descend de 0,13 à chaque rep ; pendant l'installation la barre est immobile mais
  // l'angle du coude vu de biais saute dans tous les sens
  const lying = (d, setup) => {
    const sh = { x: 0.5, y: 0.6 }, wr = { x: 0.5, y: 0.44 + 0.13 * d };
    const el = setup ? { x: 0.5 + rnd() * 0.25, y: 0.55 + rnd() * 0.15 } : { x: 0.6, y: (sh.y + wr.y) / 2 + 0.02 };
    return { sh, el, wr, idx: { x: 0.5, y: wr.y - 0.02 }, hip: { x: 0.8, y: 0.6 }, kn: { x: 0.95, y: 0.55 }, an: { x: 1.05, y: 0.7 }, nose: { x: 0.4, y: 0.57 }, ear: { x: 0.42, y: 0.58 }, heel: { x: 1.05, y: 0.71 }, foot: { x: 1.07, y: 0.69 } };
  };
  it('les fausses reps de l’installation ne comptent pas', () => {
    const fr = makeFrames(timeline({ reps: 6, lead: 8, p1: 1.2, p2: 1 }), (d, t) => lying(d, t < 7), { aspect: 16 / 9 });
    expect(analyzeSet(fr, P, { aspect: 16 / 9 }).repCount).toBe(6);
  });
});

describe('extensions lombaires : pause en haut entre les reps', () => {
  const P = patternFor({ catalogId: 'fp_back_extension', name: 'Extensions Lombaires (Banc 45°)' });
  // banc à 45° : d = 0 corps aligné (en haut), 1 buste plié vers le bas ; à la fin on descend du banc (buste très plié)
  const body = d => sideBody({ x0: 0.8, ground: 0.85, shin: -45, thigh: -45, trunk: -45 - 75 * d, ua: -45 - 75 * d, fa: -45 - 75 * d });
  it('chaque rep compte, la descente du banc à la fin non', () => {
    const tl = timeline({ reps: 7, p1: 0.8, p2: 0.8, holdTurn: 0, holdRest: 1.2, lead: 2, tail: 0.5 });
    const end = tl[tl.length - 1].t;
    const off = Array.from({ length: 45 }, (_, i) => ({ t: end + (i + 1) / 30, d: Math.min(1.8, 1 + i / 15) }));
    const fr = makeFrames([...tl, ...off], d => body(d));
    expect(analyzeSet(fr, P, A).repCount).toBe(7);
  });
});
