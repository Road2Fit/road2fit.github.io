// Squelettes synthétiques au format MediaPipe Pose (tests automatiques et démonstration sans caméra).
// Coordonnées : x vers la droite, y vers le bas, en « hauteurs d'image » ; converties en coordonnées normalisées (x / aspect).
export const SYNTH_ASPECT = 9 / 16;
const R = Math.PI / 180;

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}
// point suivant : longueur L, direction a (degrés, 0 = vers le haut, + = vers l'avant de la personne)
const step = (p, L, a, facing = 1) => ({ x: p.x + facing * L * Math.sin(a * R), y: p.y - L * Math.cos(a * R) });

/**
 * Déroulé d'une série : d(t) = 0 au repos, 1 au point d'inversion (bas du squat, haut du curl…).
 * p1/p2 : durées (s) de la 1re et de la 2e moitié de chaque rep (nombre ou fonction de l'index), depth : amplitude par rep.
 */
export function timeline({ reps = 5, p1 = 1.2, p2 = 0.8, holdTurn = 0.1, holdRest = 0.5, lead = 1, tail = 1, fps = 30, depth = 1 } = {}) {
  const val = (v, i) => (typeof v === 'function' ? v(i) : v);
  const keys = [[0, 0]];
  let t = lead;
  keys.push([t, 0]);
  for (let i = 0; i < reps; i++) {
    const dp = val(depth, i);
    t += val(p1, i); keys.push([t, dp]);
    t += val(holdTurn, i); keys.push([t, dp]);
    t += val(p2, i); keys.push([t, 0]);
    if (i < reps - 1) { t += val(holdRest, i); keys.push([t, 0]); }
  }
  t += tail; keys.push([t, 0]);
  const out = [];
  let k = 0;
  for (let tt = 0; tt <= t + 1e-9; tt += 1 / fps) {
    while (k < keys.length - 2 && keys[k + 1][0] < tt) k++;
    const [t0, d0] = keys[k], [t1, d1] = keys[k + 1];
    const x = t1 > t0 ? Math.min(1, Math.max(0, (tt - t0) / (t1 - t0))) : 1;
    const e = (1 - Math.cos(Math.PI * x)) / 2; // accélération puis freinage, comme un vrai mouvement
    out.push({ t: tt, d: d0 + (d1 - d0) * e });
  }
  return out;
}

/** Squelette de profil (regard vers +x). seg : angles des segments, en degrés depuis la verticale. */
export function sideBody({ x0 = 0.3, ground = 0.88, shin = 0, thigh = 0, trunk = 0, ua = 180, fa = 180, head = 0, facing = 1, sag = 0 } = {}) {
  const an = { x: x0, y: ground };
  const kn = step(an, 0.21, shin, facing);
  const hip0 = step(kn, 0.22, thigh, facing);
  const hip = { x: hip0.x, y: hip0.y + sag };
  const sh = step(hip, 0.27, trunk, facing);
  const el = step(sh, 0.15, ua, facing);
  const wr = step(el, 0.14, fa, facing);
  const idx = step(wr, 0.05, fa, facing);
  const neck = step(sh, 0.06, trunk + head, facing);
  const nose = step(neck, 0.06, trunk + head + 40, facing);
  const ear = step(neck, 0.05, trunk + head - 10, facing);
  return { an, kn, hip, sh, el, wr, idx, nose, ear, heel: { x: an.x - facing * 0.03, y: an.y + 0.02 }, foot: { x: an.x + facing * 0.08, y: an.y + 0.025 } };
}

/** Convertit les points d'un corps (les deux côtés au même endroit, de profil) en 33 repères MediaPipe. */
export function toLandmarks(b, { aspect = SYNTH_ASPECT, nearVis = 0.95, farVis = 0.55, noise = 0, rand = Math.random, left, right } = {}) {
  const n = () => (noise ? (rand() - 0.5) * 2 * noise : 0);
  const L = left || b, Rt = right || b;
  const P = (p, v) => ({ x: (p.x + n()) / aspect, y: p.y + n(), z: 0, visibility: v });
  const lm = new Array(33);
  lm[0] = P(b.nose, 0.98);
  for (const i of [1, 2, 3, 4, 5, 6, 9, 10]) lm[i] = P(b.nose, 0.9);
  lm[7] = P(L.ear, nearVis); lm[8] = P(Rt.ear, farVis);
  lm[11] = P(L.sh, nearVis); lm[12] = P(Rt.sh, farVis);
  lm[13] = P(L.el, nearVis); lm[14] = P(Rt.el, farVis);
  lm[15] = P(L.wr, nearVis); lm[16] = P(Rt.wr, farVis);
  for (const [i, s] of [[17, L], [19, L], [21, L], [18, Rt], [20, Rt], [22, Rt]]) lm[i] = P(s.idx, i % 2 ? nearVis : farVis);
  lm[23] = P(L.hip, nearVis); lm[24] = P(Rt.hip, farVis);
  lm[25] = P(L.kn, nearVis); lm[26] = P(Rt.kn, farVis);
  lm[27] = P(L.an, nearVis); lm[28] = P(Rt.an, farVis);
  lm[29] = P(L.heel, nearVis); lm[30] = P(Rt.heel, farVis);
  lm[31] = P(L.foot, nearVis); lm[32] = P(Rt.foot, farVis);
  return lm;
}

/** Fabrique une série d'images à partir d'un déroulé et d'une fonction d → corps. */
export function makeFrames(tl, bodyAt, opts = {}) {
  const rand = rng(opts.seed || 7);
  return tl.map(({ t, d }, i) => {
    const b = bodyAt(d, t, i);
    if (!b) return { t: t * 1000, lm: null };
    if (b.lm) return { t: t * 1000, lm: b.lm, wl: b.wl };
    return { t: t * 1000, lm: toLandmarks(b, { ...opts, rand }) };
  });
}

// ---------- mouvements types ----------
/** Squat de profil : d = 0 debout, 1 en bas. depth = profondeur (1 = sous la parallèle), lean = buste en bas. */
export function squatBody(d, { depth = 1, lean = 40, hipsFirst = 0 } = {}) {
  const k = d * depth;
  return sideBody({ shin: 30 * k, thigh: -95 * k, trunk: lean * k + hipsFirst * Math.sin(Math.PI * Math.min(1, d)), ua: 200, fa: 20 });
}
/** Curl de profil : d = 0 bras tendus, 1 en haut. swing = bascule du buste, drift = coude qui avance. */
export function curlBody(d, { top = 140, swing = 0, drift = 0 } = {}) {
  return sideBody({ trunk: -swing * d, ua: 180 + drift * d, fa: 180 - top * d });
}
/** Pompe de profil : d = 0 bras tendus, 1 en bas ; sag = bassin qui s'affaisse (fraction du buste). */
export function pushUpBody(d, { bottom = 75, sag = 0 } = {}) {
  const e = (170 - (170 - bottom) * d) * R; // angle du coude
  const Lr = 0.15, floor = 0.86, wx = 1.25;
  const D = 2 * Lr * Math.sin(e / 2);
  const sh = { x: wx, y: floor - D };
  const el = { x: wx - Lr * Math.cos(e / 2), y: floor - D / 2 };
  const an = { x: wx - 0.7, y: floor - 0.03 };
  const lerp = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
  const hip = lerp(sh, an, 0.4); hip.y += sag * 0.27;
  const kn = lerp(sh, an, 0.7);
  const wr = { x: wx, y: floor };
  return { sh, el, wr, idx: { x: wx + 0.04, y: floor }, hip, kn, an, nose: { x: sh.x + 0.1, y: sh.y + 0.01 }, ear: { x: sh.x + 0.06, y: sh.y - 0.02 }, heel: { x: an.x - 0.01, y: an.y - 0.03 }, foot: { x: an.x + 0.01, y: an.y + 0.03 } };
}
/** Squat de face, avec repères 3D : valgus = rapprochement des genoux en bas (fraction de l'écart des hanches). */
export function frontSquatLm(d, { valgus = 0, depth = 1, aspect = SYNTH_ASPECT } = {}) {
  const k = d * depth;
  // plan sagittal (f = vers l'avant = vers la caméra, u = vers le haut), en mètres, comme squatBody
  const ank = { x: 0, y: 0 };
  const sg = (p, L, a) => ({ x: p.x + L * Math.sin(a * R), y: p.y + L * Math.cos(a * R) });
  const kn = sg(ank, 0.42, 30 * k), hip = sg(kn, 0.43, -95 * k), sh = sg(hip, 0.5, 40 * k);
  const head = sg(sh, 0.22, 40 * k);
  const lat = { sh: 0.18, el: 0.22, wr: 0.2, hip: 0.1, an: 0.12 };
  const kneeLat = 0.11 - valgus * 0.1 * d;
  const pts = []; // [index, latéral (m, + = gauche de la personne), point sagittal]
  for (const [l, r, w, p] of [[11, 12, lat.sh, sh], [13, 14, lat.el, { x: sh.x, y: sh.y - 0.25 }], [15, 16, lat.wr, { x: sh.x, y: sh.y + 0.02 }],
    [23, 24, lat.hip, hip], [25, 26, kneeLat, kn], [27, 28, lat.an, ank], [29, 30, lat.an, { x: -0.05, y: -0.03 }], [31, 32, lat.an + 0.02, { x: 0.15, y: -0.04 }],
    [7, 8, 0.07, { x: head.x - 0.02, y: head.y }]]) { pts.push([l, w, p]); pts.push([r, -w, p]); }
  pts.push([0, 0, { x: head.x + 0.08, y: head.y - 0.02 }]);
  const lm = new Array(33), wl = new Array(33);
  const cx = 0.5 * aspect, scale = 0.42, ground = 0.9;
  for (const [i, x, p] of pts) {
    lm[i] = { x: (cx + x * scale) / aspect, y: ground - p.y * scale, z: 0, visibility: 0.95 };
    wl[i] = { x, y: -(p.y - hip.y), z: -(p.x - hip.x) };
  }
  for (let i = 0; i < 33; i++) if (!lm[i]) { lm[i] = { ...lm[0] }; wl[i] = { ...wl[0] }; }
  return { lm, wl };
}
/** Traction de profil, mains fixes sur la barre : d = 0 suspendu bras tendus, 1 en haut ; top = angle du coude en haut. */
export function pullUpBody(d, { top = 25, kip = 0 } = {}) {
  const e = (170 - (170 - top) * d) * R;
  const a = 0.15, b = 0.14, bar = 0.12, x = 0.3;
  const wr = { x, y: bar + 0.03 };
  const D = Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(e));
  const sh = { x, y: wr.y + D };
  // coude devant la ligne épaule–poignet
  const along = (a * a - b * b + D * D) / (2 * D), off = Math.sqrt(Math.max(0, a * a - along * along));
  const el = { x: x + off, y: sh.y - along };
  const hip = { x, y: sh.y + 0.27 };
  const kn = step(hip, 0.22, 180 - kip * Math.sin(Math.PI * d));
  const an = step(kn, 0.21, 180 - kip * Math.sin(Math.PI * d));
  const nose = { x: x + 0.05, y: sh.y - 0.12 }, ear = { x: x, y: sh.y - 0.12 };
  return { sh, el, wr, idx: { x, y: bar }, hip, kn, an, nose, ear, heel: { x: an.x - 0.02, y: an.y }, foot: { x: an.x + 0.05, y: an.y + 0.02 } };
}
/** Élévations latérales de face (repères 2D + 3D) : d = 0 bras le long du corps, 1 en haut ; topL / topR = angle des bras en haut. */
export function frontRaiseLm(d, { topL = 90, topR = 90, swing = 0, aspect = SYNTH_ASPECT } = {}) {
  const pts = {};
  const sh = 0.18, hipW = 0.1, shY = -0.5;
  const arm = (side, top) => {
    const ab = (15 + (top - 15) * d) * R, s = side === 'l' ? 1 : -1;
    const el = { x: s * (sh + 0.28 * Math.sin(ab)), y: shY + 0.28 * Math.cos(ab) };
    const wr = { x: s * (sh + 0.55 * Math.sin(ab)), y: shY + 0.55 * Math.cos(ab) };
    return { el, wr };
  };
  const L = arm('l', topL), Rr = arm('r', topR);
  const lean = swing * Math.sin(Math.PI * d) * R; // bascule du buste (vers l'arrière) pour lancer les bras
  const z = y => -Math.sin(lean) * (y - 0); // le haut du corps recule (z +) quand le buste bascule en arrière
  Object.assign(pts, {
    11: [sh, shY], 12: [-sh, shY], 13: [L.el.x, L.el.y], 14: [Rr.el.x, Rr.el.y], 15: [L.wr.x, L.wr.y], 16: [Rr.wr.x, Rr.wr.y],
    19: [L.wr.x * 1.05, L.wr.y + 0.05], 20: [Rr.wr.x * 1.05, Rr.wr.y + 0.05],
    23: [hipW, 0], 24: [-hipW, 0], 25: [0.11, 0.43], 26: [-0.11, 0.43], 27: [0.12, 0.85], 28: [-0.12, 0.85],
    29: [0.12, 0.88], 30: [-0.12, 0.88], 31: [0.14, 0.9], 32: [-0.14, 0.9], 0: [0, -0.72], 7: [0.07, -0.7], 8: [-0.07, -0.7],
  });
  const lm = new Array(33), wl = new Array(33);
  const cx = 0.5 * aspect, scale = 0.42, top = 0.5;
  for (let i = 0; i < 33; i++) {
    const p = pts[i] || pts[0];
    const zz = p[1] < 0 ? z(p[1]) : 0;
    lm[i] = { x: (cx + p[0] * scale) / aspect, y: top + p[1] * scale, z: 0, visibility: 0.95 };
    wl[i] = { x: p[0], y: p[1], z: zz };
  }
  return { lm, wl };
}
/** Gainage de profil : sag = bassin qui s'affaisse (+) ou trop haut (−). */
export function plankBody(sag = 0) {
  const floor = 0.86;
  const an = { x: 0.4, y: floor - 0.02 }, sh = { x: 1.25, y: floor - 0.2 };
  const lerp = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
  const hip = lerp(sh, an, 0.42); hip.y += sag * 0.27;
  const kn = lerp(sh, an, 0.7);
  const el = { x: sh.x, y: floor - 0.02 }, wr = { x: sh.x + 0.13, y: floor - 0.01 };
  return { an, kn, hip, sh, el, wr, idx: { x: wr.x + 0.04, y: wr.y }, nose: { x: sh.x + 0.12, y: sh.y - 0.02 }, ear: { x: sh.x + 0.07, y: sh.y - 0.04 }, heel: { x: an.x - 0.01, y: an.y - 0.03 }, foot: { x: an.x + 0.01, y: an.y + 0.02 } };
}
