// Analyse d'une série filmée (4.19). Entrée : les 33 repères du corps détectés sur chaque image (MediaPipe Pose / BlazePose,
// Bazarevsky et al. 2020, arXiv:2006.10204), calculés sur le téléphone : aucune image ne sort de l'appareil.
// Méthode, sans IA générative : angles articulaires → signal du mouvement → comptage des reps par seuils avec hystérésis →
// durées des phases → contrôles de technique propres au modèle de mouvement (patterns.js) → retours et corrections en français.
//
// Une image = { t (ms), lm: [33 × {x, y, z, visibility}] (coordonnées normalisées de l'image), wl: [33 × {x, y, z}] (mètres, optionnel) }.
// De profil, les angles sont mesurés dans le plan de l'image (le plus précis) ; de face, avec les repères 3D (wl).
import { PATTERNS } from './patterns';

const SIDES = {
  l: { ear: 7, sh: 11, el: 13, wr: 15, idx: 19, hip: 23, kn: 25, an: 27, heel: 29, foot: 31 },
  r: { ear: 8, sh: 12, el: 14, wr: 16, idx: 20, hip: 24, kn: 26, an: 28, heel: 30, foot: 32 },
};
const NOSE = 0;
const VIS = 0.4; // visibilité minimale d'un repère pour l'utiliser
const DEG = 180 / Math.PI;
const JOINT = { knee: ['hip', 'kn', 'an'], hip: ['sh', 'hip', 'kn'], elbow: ['sh', 'el', 'wr'], shoulder: ['hip', 'sh', 'el'], ankle: ['kn', 'an', 'foot'], wrist: ['el', 'wr', 'idx'] };
const PER_SIDE = new Set(Object.keys(JOINT));

// ---------- maths ----------
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) });
const dot = (a, b) => a.x * b.x + a.y * b.y + (a.z || 0) * (b.z || 0);
const norm = a => Math.sqrt(dot(a, a));
const dist = (a, b) => norm(sub(a, b));
function angleAt(a, b, c) {
  const u = sub(a, b), v = sub(c, b), d = norm(u) * norm(v);
  return d ? Math.acos(Math.max(-1, Math.min(1, dot(u, v) / d))) * DEG : NaN;
}
const finite = arr => Array.from(arr).filter(isNum);
export function quantile(arr, q) {
  const s = finite(arr).sort((a, b) => a - b);
  if (!s.length) return NaN;
  const i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
}
const median = arr => quantile(arr, 0.5);
const mean = arr => { const f = finite(arr); return f.length ? f.reduce((a, b) => a + b, 0) / f.length : NaN; };
const r0 = v => Math.round(v);
const fmtS = s => `${(Math.round(s * 10) / 10).toFixed(1).replace('.', ',')} s`;
const pct = v => `${Math.round(v * 100)} %`;

function stat(a, i0, i1) {
  let mn = Infinity, mx = -Infinity, sum = 0, n = 0;
  for (let i = Math.max(0, i0); i <= Math.min(a.length - 1, i1); i++) {
    const v = a[i];
    if (isNum(v)) { if (v < mn) mn = v; if (v > mx) mx = v; sum += v; n++; }
  }
  return n ? { min: mn, max: mx, range: mx - mn, mean: sum / n } : null;
}

// interpole les trous courts (≤ maxGap s), puis moyenne glissante centrée
function fillGaps(t, a, maxGap) {
  const out = Float64Array.from(a);
  let i = 0;
  while (i < out.length) {
    if (isNum(out[i])) { i++; continue; }
    let j = i;
    while (j < out.length && !isNum(out[j])) j++;
    if (i > 0 && j < out.length && t[j] - t[i - 1] <= maxGap) {
      for (let k = i; k < j; k++) out[k] = out[i - 1] + (out[j] - out[i - 1]) * (t[k] - t[i - 1]) / (t[j] - t[i - 1]);
    } else for (let k = i; k < j; k++) out[k] = NaN;
    i = j;
  }
  return out;
}
function smooth(a, w) {
  if (w <= 1) return Float64Array.from(a);
  const h = Math.floor(w / 2), out = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) {
    if (!isNum(a[i])) { out[i] = NaN; continue; }
    let s = 0, n = 0;
    for (let k = i - h; k <= i + h; k++) if (k >= 0 && k < a.length && isNum(a[k])) { s += a[k]; n++; }
    out[i] = s / n;
  }
  return out;
}

// ---------- préparation des images ----------
function prepare(frames, aspect) {
  return (frames || []).map(f => {
    const t = f && isNum(f.t) ? f.t / 1000 : NaN;
    const lm = f && f.lm;
    if (!lm || lm.length < 33) return { t, p: null, w: null };
    const p = lm.map(l => {
      let v = l.visibility == null ? 1 : l.visibility;
      if (l.x < -0.02 || l.x > 1.02 || l.y < -0.02 || l.y > 1.02) v = Math.min(v, 0.1); // hors de l'image
      return { x: l.x * aspect, y: l.y, z: 0, v };
    });
    const w = f.wl && f.wl.length >= 33 ? f.wl.map(q => ({ x: q.x, y: q.y, z: q.z })) : null;
    return { t, p, w };
  }).filter(f => isNum(f.t));
}
// milieu de deux repères, pondéré par leur visibilité (de profil, le côté caché est moins fiable)
function midOf(C, P, a, b) {
  const wa = Math.max(P[a].v, 0.02), wb = Math.max(P[b].v, 0.02), s = wa + wb;
  return { x: (C[a].x * wa + C[b].x * wb) / s, y: (C[a].y * wa + C[b].y * wb) / s, z: ((C[a].z || 0) * wa + (C[b].z || 0) * wb) / s };
}

function makeCtx(frames, meta) {
  const aspect = meta.aspect || 9 / 16;
  let F = prepare(frames, aspect);
  // longueur du buste (2D) : échelle du corps. Les images où la personne est bien plus grande que d'habitude
  // (elle s'approche du téléphone pour arrêter l'enregistrement) sont écartées.
  const torso2 = F.map(f => (f.p ? dist(midOf(f.p, f.p, 11, 12), midOf(f.p, f.p, 23, 24)) : NaN));
  const tRef = quantile(torso2, 0.85);
  F = F.map((f, i) => (f.p && torso2[i] > tRef * 1.35 ? { ...f, p: null, w: null } : f));
  const t = F.map(f => f.t);
  const valid = F.filter(f => f.p).length;
  const dts = t.slice(1).map((v, i) => v - t[i]).filter(d => d > 0);
  const fps = dts.length ? Math.min(60, Math.max(5, 1 / median(dts))) : 30;
  // vue : largeur des épaules / longueur du buste. De profil les épaules se superposent (rapport faible).
  const ratio = median(F.map(f => (f.p ? dist(f.p[11], f.p[12]) / (dist(midOf(f.p, f.p, 11, 12), midOf(f.p, f.p, 23, 24)) || NaN) : NaN)));
  const view = !isNum(ratio) ? 'side' : ratio >= 0.42 ? 'front' : ratio <= 0.28 ? 'side' : 'oblique';
  const hasWorld = F.some(f => f.w);
  const use3d = view !== 'side' && hasWorld;
  // de profil : sens du regard (nez devant les oreilles, sinon pointe des pieds devant les talons)
  let facing = Math.sign(median(F.map(f => (f.p && f.p[NOSE].v > 0.5 ? f.p[NOSE].x - midOf(f.p, f.p, 7, 8).x : NaN))));
  if (!facing) facing = Math.sign(median(F.map(f => (f.p ? midOf(f.p, f.p, 31, 32).x - midOf(f.p, f.p, 29, 30).x : NaN)))) || 1;
  const ctx = {
    F, t, fps, view, use3d, hasWorld, facing, valid, aspect,
    win: Math.max(1, Math.round(fps * 0.15) | 1),
    torso: median(torso2),
    cache: {},
    chinCal: isNum(meta.chinCal) ? meta.chinCal : 0,
  };
  ctx.C = f => (use3d && f.w ? f.w : f.p); // repères pour les angles du plan sagittal
  return ctx;
}

// ---------- signaux ----------
function clean(ctx, raw, maxGap = 0.5) { return smooth(fillGaps(ctx.t, raw, maxGap), ctx.win); }

function jointRaw(ctx, joint, s) {
  const ids = JOINT[joint].map(k => SIDES[s][k]);
  return ctx.F.map(f => {
    if (!f.p || ids.some(i => f.p[i].v < VIS)) return NaN;
    const C = ctx.C(f);
    return angleAt(C[ids[0]], C[ids[1]], C[ids[2]]);
  });
}
function sideSeries(ctx, joint, s) {
  const k = `${joint}.${s}`;
  return ctx.cache[k] || (ctx.cache[k] = clean(ctx, jointRaw(ctx, joint, s)));
}
function coverage(a) { return a.length ? finite(a).length / a.length : 0; }
function spread(a) { return quantile(a, 0.95) - quantile(a, 0.05); }
function sideVis(ctx, joint, s) {
  const ids = JOINT[joint].map(k => SIDES[s][k]);
  return mean(ctx.F.map(f => (f.p ? Math.min(...ids.map(i => f.p[i].v)) : NaN)));
}
function combine(a, b, how) {
  return a.map((v, i) => {
    const w = b[i];
    if (isNum(v) && isNum(w)) return how === 'min' ? Math.min(v, w) : how === 'absdiff' ? Math.abs(v - w) : (v + w) / 2;
    return how === 'absdiff' ? NaN : isNum(v) ? v : w;
  });
}

/** Choisit le côté pour un angle articulaire : de profil le côté visible qui bouge le plus, de face la moyenne des deux. */
function chooseSide(ctx, joint, preferRange = false) {
  const L = sideSeries(ctx, joint, 'l'), R = sideSeries(ctx, joint, 'r');
  const score = s => {
    const a = s === 'l' ? L : R;
    if (coverage(a) < 0.4) return -1;
    const vis = Math.max(0, Math.min(1, (sideVis(ctx, joint, s) - 0.3) / 0.4));
    return (spread(a) || 0) * (preferRange ? 1 : 0.25 + vis);
  };
  const sl = score('l'), sr = score('r');
  if (sl < 0 && sr < 0) return null;
  if (ctx.view !== 'side' && !preferRange && sl > 0 && sr > 0 && Math.min(sl, sr) / Math.max(sl, sr) > 0.6) return 'avg';
  return sl >= sr ? 'l' : 'r';
}
function jointSeries(ctx, joint) {
  const k = `${joint}.sel`;
  if (ctx.cache[k]) return ctx.cache[k];
  const s = ctx.side && ctx.side !== 'avg' ? ctx.side : null;
  let out;
  if (s && coverage(sideSeries(ctx, joint, s)) >= 0.3) out = sideSeries(ctx, joint, s);
  else if (ctx.view === 'side') {
    const c = chooseSide(ctx, joint);
    out = c === 'l' || c === 'r' ? sideSeries(ctx, joint, c) : combine(sideSeries(ctx, joint, 'l'), sideSeries(ctx, joint, 'r'), 'avg');
  } else out = combine(sideSeries(ctx, joint, 'l'), sideSeries(ctx, joint, 'r'), 'avg');
  return (ctx.cache[k] = out);
}

// signaux globaux (2D sauf mention) ; renvoie un tableau brut (non lissé)
function globalRaw(ctx, name) {
  const T = ctx.torso || 0.3;
  const ok = (P, ids) => ids.every(i => P[i].v >= VIS);
  return ctx.F.map(f => {
    const P = f.p;
    if (!P) return NaN;
    switch (name) {
      case 'hipY': return P[23].v >= VIS || P[24].v >= VIS ? midOf(P, P, 23, 24).y / T : NaN;
      case 'wristUp': {
        if (!(P[15].v >= VIS || P[16].v >= VIS)) return NaN;
        return (midOf(P, P, 23, 24).y - midOf(P, P, 15, 16).y) / T;
      }
      case 'gap': {
        if (!ok(P, [11, 12, 15, 16])) return NaN;
        return dist(P[15], P[16]) / (dist(P[11], P[12]) || NaN);
      }
      case 'shrug': {
        if (!ok(P, [7, 8, 11, 12])) return NaN;
        return (midOf(P, P, 11, 12).y - midOf(P, P, 7, 8).y) / (dist(P[11], P[12]) || NaN);
      }
      case 'thighs': {
        if (!ok(P, [23, 24, 25, 26])) return NaN;
        return dist(P[25], P[26]) / (dist(P[23], P[24]) || NaN);
      }
      case 'twist': {
        if (f.w) {
          const s = sub(f.w[12], f.w[11]), h = sub(f.w[24], f.w[23]);
          let d = (Math.atan2(s.z, s.x) - Math.atan2(h.z, h.x)) * DEG;
          while (d > 180) d -= 360;
          while (d < -180) d += 360;
          return d;
        }
        if (!ok(P, [11, 12, 23, 24])) return NaN;
        return (dist(P[11], P[12]) / (dist(P[23], P[24]) || NaN)) * 60; // repli 2D : les épaules « rétrécissent » en tournant
      }
      case 'limbsUp': {
        if (!(P[15].v >= VIS || P[16].v >= VIS) || !(P[27].v >= VIS || P[28].v >= VIS)) return NaN;
        const hy = midOf(P, P, 23, 24).y;
        return (hy - (midOf(P, P, 15, 16).y + midOf(P, P, 27, 28).y) / 2) / T;
      }
      case 'wristOut': {
        if (!ok(P, [11, 12, 15, 16])) return NaN;
        const cx = midOf(P, P, 11, 12).x, w = dist(P[11], P[12]) || NaN;
        return Math.max(Math.abs(P[15].x - cx), Math.abs(P[16].x - cx)) / w;
      }
      default: return NaN;
    }
  });
}
function globalSeries(ctx, name) {
  const k = `g.${name}`;
  return ctx.cache[k] || (ctx.cache[k] = clean(ctx, globalRaw(ctx, name)));
}

/** Inclinaison du buste (degrés) : 0 = droit, + = penché vers l'avant, − = vers l'arrière. */
function leanSeries(ctx) {
  if (ctx.cache.lean) return ctx.cache.lean;
  const raw = ctx.F.map(f => {
    const P = f.p;
    if (!P || !(P[11].v >= VIS || P[12].v >= VIS) || !(P[23].v >= VIS || P[24].v >= VIS)) return NaN;
    const C = ctx.C(f);
    const v = sub(midOf(C, P, 11, 12), midOf(C, P, 23, 24));
    let fwd;
    if (ctx.use3d && f.w) {
      const r = sub(C[12], C[11]); // vers l'avant = vertical × ligne des épaules
      const n = { x: -r.z, y: 0, z: r.x }, nl = norm(n);
      if (!nl) return NaN;
      fwd = dot(v, n) / nl;
    } else if (ctx.view === 'side') fwd = v.x * ctx.facing;
    else return NaN; // de face sans 3D : impossible de savoir si on penche en avant
    return Math.atan2(fwd, -v.y) * DEG;
  });
  return (ctx.cache.lean = clean(ctx, raw));
}
/** Inclinaison du corps par rapport à la verticale, sans signe (0 debout, 90 allongé, 180 tête en bas). */
function inclineSeries(ctx) {
  if (ctx.cache.incl) return ctx.cache.incl;
  const raw = ctx.F.map(f => {
    const P = f.p;
    if (!P || !(P[11].v >= VIS || P[12].v >= VIS) || !(P[23].v >= VIS || P[24].v >= VIS)) return NaN;
    const C = ctx.use3d && f.w ? f.w : P;
    const v = sub(midOf(C, P, 11, 12), midOf(C, P, 23, 24));
    return Math.atan2(Math.sqrt(v.x * v.x + (v.z || 0) * (v.z || 0)), -v.y) * DEG;
  });
  return (ctx.cache.incl = clean(ctx, raw));
}
/** Angle de la cuisse au-dessus de l'horizontale (degrés) : + hanche au-dessus du genou, 0 = cuisse parallèle au sol. */
function thighSeries(ctx) {
  if (ctx.cache.thigh) return ctx.cache.thigh;
  const s = ctx.side === 'r' ? 'r' : ctx.side === 'l' ? 'l' : null;
  const one = side => ctx.F.map(f => {
    const P = f.p, S = SIDES[side];
    if (!P || P[S.hip].v < VIS || P[S.kn].v < VIS) return NaN;
    const C = ctx.C(f), d = sub(C[S.kn], C[S.hip]);
    return Math.atan2(d.y, Math.sqrt(d.x * d.x + (d.z || 0) * (d.z || 0))) * DEG;
  });
  const raw = s ? one(s) : combine(one('l'), one('r'), 'avg');
  return (ctx.cache.thigh = clean(ctx, raw));
}
/** Écart du bassin à la ligne épaules–chevilles (ou épaules–genoux), en fraction du buste : + bassin qui s'affaisse. */
function lineSeries(ctx, toKnee = false) {
  const k = toKnee ? 'lineK' : 'line';
  if (ctx.cache[k]) return ctx.cache[k];
  const end = toKnee ? [25, 26] : [27, 28];
  const raw = ctx.F.map(f => {
    const P = f.p;
    if (!P || !(P[11].v >= VIS || P[12].v >= VIS) || !(P[23].v >= VIS || P[24].v >= VIS) || !(P[end[0]].v >= VIS || P[end[1]].v >= VIS)) return NaN;
    const C = ctx.C(f);
    const S = midOf(C, P, 11, 12), H = midOf(C, P, 23, 24), A = midOf(C, P, end[0], end[1]);
    const d = sub(A, S), dl = norm(d), h = sub(H, S);
    if (!dl) return NaN;
    const along = dot(h, d) / dl;
    const o = { x: h.x - d.x * along / dl, y: h.y - d.y * along / dl, z: (h.z || 0) - (d.z || 0) * along / dl };
    const off = norm(o) / (dist(S, H) || NaN);
    if (Math.abs(d.y) / dl > 0.7) return off; // corps vertical (équilibre) : écart sans signe
    return o.y > 0 ? off : -off;              // y vers le bas : bassin côté sol = affaissement
  });
  return (ctx.cache[k] = clean(ctx, raw));
}

function mainRaw(ctx, P) {
  const sig = P.signal;
  if (PER_SIDE.has(sig)) {
    const c = chooseSide(ctx, sig, P.id === 'kickback' || P.id === 'multiHip');
    ctx.side = c;
    if (!c) return null;
    return jointSeries(ctx, sig);
  }
  if (sig === 'kneeFront') { ctx.side = null; return combine(sideSeries(ctx, 'knee', 'l'), sideSeries(ctx, 'knee', 'r'), 'min'); }
  if (sig === 'hipMove') {
    const c = chooseSide(ctx, 'hip', true);
    ctx.side = c;
    return c ? jointSeries(ctx, 'hip') : null;
  }
  if (sig === 'legAlt') return combine(sideSeries(ctx, 'hip', 'l'), sideSeries(ctx, 'hip', 'r'), 'absdiff');
  return globalSeries(ctx, sig);
}

// repli : la coordonnée d'un repère qui bouge le plus (sert au comptage quand le signal prévu n'est pas visible)
function motionSeries(ctx) {
  const T = ctx.torso || 0.3;
  let best = null, bestR = 0;
  for (const i of [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
    for (const axis of ['x', 'y']) {
      const a = clean(ctx, ctx.F.map(f => (f.p && f.p[i].v >= 0.5 ? f.p[i][axis] / T : NaN)));
      if (coverage(a) < 0.7) continue;
      const r = spread(a);
      if (r > bestR) { bestR = r; best = a; }
    }
  }
  return best;
}

// ---------- comptage des répétitions ----------
/**
 * Compte les reps sur un signal : chaque rep = départ de la zone de repos, passage dans la zone opposée, retour au repos
 * (seuils à 30 % et 70 % de l'amplitude : hystérésis, les petits tremblements ne comptent pas).
 * rest : 'hi' | 'lo' (position de départ) ou null (déduite des premières images).
 */
export function detectReps(t, s, { rest = null, min = 0 } = {}) {
  const lo = quantile(s, 0.05), hi = quantile(s, 0.95), R = hi - lo;
  if (!(R > 0) || R < min) return { reps: [], R: isNum(R) ? R : 0, lo, hi, rest };
  if (!rest) {
    const first = [];
    for (let i = 0; i < s.length && first.length < 15; i++) if (isNum(s[i])) first.push(s[i]);
    rest = median(first) >= (lo + hi) / 2 ? 'hi' : 'lo';
  }
  const u = Array.from(s, v => (isNum(v) ? (rest === 'hi' ? (hi - v) / R : (v - lo) / R) : NaN));
  const exc = [];
  let state = null, fromRest = false, lastRest = -1, firstValid = -1, lastValid = -1;
  for (let i = 0; i < u.length; i++) {
    const x = u[i];
    if (!isNum(x)) continue;
    if (firstValid < 0) firstValid = i;
    lastValid = i;
    if (x <= 0.25) {
      if (state === 'away' && fromRest) exc.push({ from: lastRest, to: i });
      state = 'rest'; lastRest = i; fromRest = false;
    } else if (x >= 0.5 && state !== 'away') {
      fromRest = state === 'rest';
      state = 'away';
    }
  }
  const argExt = (i0, i1, best) => {
    let k = -1;
    for (let i = Math.max(0, i0); i <= Math.min(u.length - 1, i1); i++) if (isNum(u[i]) && (k < 0 || best(u[i], u[k]))) k = i;
    return k;
  };
  const turns = exc.map(e => argExt(e.from, e.to, (a, b) => a > b));
  const reps = turns.map((k, j) => {
    const a = argExt(j ? turns[j - 1] : firstValid, k, (x, y) => x < y);
    const b = argExt(k, j < turns.length - 1 ? turns[j + 1] : lastValid, (x, y) => x <= y);
    const va = u[a], vb = u[b], peak = u[k];
    // début / fin du mouvement : dès qu'on quitte (ou retrouve) la position de repos à 4 % d'amplitude près
    let st = k;
    while (st > a && !(u[st] <= va + 0.04)) st--;
    let en = k;
    while (en < b && !(u[en] <= vb + 0.04)) en++;
    let h1 = k, h2 = k;
    while (h1 - 1 > st && isNum(u[h1 - 1]) && u[h1 - 1] >= peak - 0.04) h1--;
    while (h2 + 1 < en && isNum(u[h2 + 1]) && u[h2 + 1] >= peak - 0.04) h2++;
    return { a, b, start: st, turn: k, end: en, h1, h2, depth: peak, p1: t[h1] - t[st], hold: t[h2] - t[h1], p2: t[en] - t[h2] };
  });
  return { reps, R, lo, hi, rest, u };
}

// ---------- fausses reps (4.24) ----------
// Une rep compte seulement si le mouvement dure au moins MIN_REP_S (un tremblement ou un repère qui « saute » est plus bref)
// et si les pieds restent en place (marcher vers le téléphone pour l'arrêter plie aussi les genoux). Exceptions : les
// mouvements où les pieds bougent normalement (fentes marchées, suspension, haltérophilie, mountain climbers, marche chargée).
export const MIN_REP_S = 0.45;
const MAX_FEET_TRAVEL = 0.2; // en longueurs de buste (un pas déplace le milieu des chevilles d’environ un demi-pas)
const FEET_MOVE = new Set(['lunge', 'pullUp', 'legRaise', 'olympic', 'mountain', 'carry', 'hang']);
function feetX(ctx) {
  if (ctx.cache.feetX) return ctx.cache.feetX;
  const T = ctx.torso || 0.3;
  const raw = ctx.F.map(f => (f.p && (f.p[27].v >= 0.5 || f.p[28].v >= 0.5) ? midOf(f.p, f.p, 27, 28).x / T : NaN));
  return (ctx.cache.feetX = clean(ctx, raw));
}
function realReps(ctx, P, reps) {
  const fx = FEET_MOVE.has(P.id) ? null : feetX(ctx);
  return reps.filter(r => {
    if (!(ctx.t[r.end] - ctx.t[r.start] >= MIN_REP_S)) return false;
    if (!fx) return true;
    let lo = Infinity, hi = -Infinity;
    for (let i = r.start; i <= r.end; i++) if (isNum(fx[i])) { lo = Math.min(lo, fx[i]); hi = Math.max(hi, fx[i]); }
    return !(hi - lo > MAX_FEET_TRAVEL);
  });
}

function restFor(P) {
  if (!P.conDir) return null;
  return (P.first === 'ecc') === (P.conDir > 0) ? 'hi' : 'lo';
}

// ---------- résultat ----------
const LEVEL_ORDER = { warn: 0, tip: 1, info: 2, good: 3 };
const VIEW_TXT = { side: 'de profil', front: 'de face', oblique: 'de trois quarts' };

function fail(reason, message, P) {
  const tips = [];
  if (reason !== 'nomove') tips.push(P && P.view === 'front' ? 'Place le téléphone face à toi, à 2-3 m, à hauteur de hanches.' : 'Place le téléphone sur le côté (de profil), à 2-3 m, à hauteur de hanches.');
  if (reason === 'framing') tips.push('Recule le téléphone pour que tout ton corps reste dans l’image, de la tête aux pieds.', 'Évite le contre-jour (fenêtre derrière toi).');
  if (reason === 'nomove') tips.push('Vérifie que c’est bien le bon exercice.', P && P.view === 'front' ? 'Filme-toi de face.' : 'Filme-toi de profil.');
  return { ok: false, reason, message, tips, pattern: P && P.id };
}

/** Compte rapide pendant l'enregistrement (même calcul que l'analyse complète). */
export function liveCount(frames, pattern, meta = {}) {
  const P = pattern || PATTERNS.generic;
  if (P.iso || !frames || frames.length < 8) return 0;
  const ctx = makeCtx(frames, meta);
  if (!ctx.valid) return 0;
  let s = mainRaw(ctx, P);
  let rest = restFor(P);
  let fallback = false;
  if (!s || coverage(s) < 0.5) { s = motionSeries(ctx); rest = null; fallback = true; }
  if (!s) return 0;
  // mêmes réglages que l'analyse complète (avant 4.24, le compte en direct n'avait pas de seuil sur le signal de secours)
  return realReps(ctx, P, detectReps(ctx.t, s, { rest, min: fallback ? 0.12 : P.min || 0 }).reps).length;
}

/**
 * Analyse complète d'une série. meta : { aspect (largeur/hauteur de la vidéo), targetReps }.
 * Renvoie { ok, repCount, reps, tempo, findings[{level, title, detail, fix}], score, verdict, summary, view… }
 * ou { ok: false, reason, message, tips } si la vidéo ne permet pas l'analyse.
 */
export function analyzeSet(frames, pattern, meta = {}) {
  const P = pattern || PATTERNS.generic;
  const ctx = makeCtx(frames, meta);
  if (ctx.valid < 10) return fail('nobody', 'Je ne t’ai pas vu dans l’image.', P);
  if (P.iso) return analyzeHold(ctx, P);

  let s = mainRaw(ctx, P);
  let rest = restFor(P);
  let fallback = false;
  if (!s || coverage(s) < 0.5) {
    s = motionSeries(ctx);
    rest = null;
    fallback = true;
    if (!s) return fail('framing', 'Ton corps n’était pas assez visible pour analyser la série.', P);
  }
  const det = detectReps(ctx.t, s, { rest, min: fallback ? 0.12 : P.min || 0 });
  det.reps = realReps(ctx, P, det.reps);
  if (!det.reps.length) return fail('nomove', 'Je n’ai pas vu de répétition nette.', P);
  ctx.main = s;
  ctx.det = det;
  const reps = det.reps;
  const N = reps.length;
  const conFirst = P.first === 'con';
  const con = reps.map(r => (conFirst ? r.p1 : r.p2));
  const ecc = reps.map(r => (conFirst ? r.p2 : r.p1));
  ctx.conFirst = conFirst;
  ctx.con = con;
  ctx.ecc = ecc;

  const findings = [];
  const viewOk = P.view === ctx.view || (P.view === 'side' && ctx.view === 'oblique' && ctx.use3d);
  if (!fallback) {
    for (const id of P.checks || []) {
      const fn = CHECKS[id];
      if (!fn) continue;
      const need = FRONT_ONLY.has(id) ? 'front' : 'sagittal';
      if (need === 'front' && ctx.view === 'side') continue;
      if (need === 'sagittal' && ctx.view !== 'side' && !ctx.use3d && !SIGNAL_ONLY.has(id)) continue;
      TRACK.last = null; TRACK.bad = null;
      const out = fn(ctx, P, reps);
      if (out) findings.push(...[].concat(out).filter(Boolean).map(attachReps));
    }
  } else {
    for (const id of ['tempo', 'fade']) if ((P.checks || []).includes(id)) { TRACK.last = null; TRACK.bad = null; const o = CHECKS[id](ctx, P, reps); if (o) findings.push(attachReps(o)); }
    findings.push({ id: 'fallback', level: 'info', title: 'Analyse simplifiée', detail: 'Certaines parties du corps n’étaient pas visibles : j’ai seulement compté les reps et mesuré le tempo.', fix: P.view === 'front' ? 'Filme-toi de face, tout le corps dans l’image.' : 'Filme-toi de profil, tout le corps dans l’image.' });
  }
  if (!viewOk && !fallback) {
    findings.push({ id: 'view', level: 'info', title: 'Angle de caméra', detail: `Tu étais filmé ${VIEW_TXT[ctx.view]} : certaines vérifications ne sont fiables que ${VIEW_TXT[P.view]}.`, fix: `La prochaine fois, filme-toi ${VIEW_TXT[P.view]}.` });
  }
  const quality = coverage(s);
  if (quality < 0.8 && !fallback) findings.push({ id: 'quality', level: 'info', title: 'Visibilité moyenne', detail: 'Une partie du corps sortait parfois de l’image : les mesures sont un peu moins précises.', fix: 'Recule un peu le téléphone.' });

  findings.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
  const { score, verdict } = scoreOf(findings);
  const eM = median(ecc), cM = median(con);
  const showTempo = !['olympic', 'olympicOver', 'generic', 'mountain'].includes(P.id);
  const summary = [`${N} rep${N > 1 ? 's' : ''}`, showTempo && isNum(eM) ? `${P.words[1]} ${fmtS(eM)}` : null, showTempo && isNum(cM) ? `${P.words[0]} ${fmtS(cM)}` : null].filter(Boolean).join(' · ');
  return {
    ok: true,
    pattern: P.id,
    label: P.label,
    view: ctx.view,
    viewOk,
    fallback,
    quality: Math.round(quality * 100) / 100,
    repCount: N,
    signal: fallback ? 'motion' : P.signal,
    // par rep : durées, amplitude relative, valeurs extrêmes du signal (degrés pour un angle), inclinaison du buste au point d'inversion
    reps: reps.map((r, i) => {
      const c = cyc(s, r);
      const lean = !fallback && (ctx.view === 'side' || ctx.use3d) ? leanSeries(ctx)[r.turn] : NaN;
      return { ecc: round2(ecc[i]), con: round2(con[i]), hold: round2(r.hold), depth: round2(r.depth), lo: round2(c.min), hi: round2(c.max), lean: isNum(lean) ? Math.round(lean) : null,
        t0: round2(Math.max(0, ctx.t[r.start] - ctx.t[0] - 0.4)), t1: round2(ctx.t[r.end] - ctx.t[0] + 0.4) };
    }),
    tempo: { ecc: round2(eM), con: round2(cM) },
    duration: round2(ctx.t[ctx.t.length - 1] - ctx.t[0]),
    findings,
    score,
    verdict,
    summary,
    ...(ctx.chin ? { chin: { ...ctx.chin, cal: ctx.chinCal } } : {}),
  };
}
const round2 = v => (isNum(v) ? Math.round(v * 100) / 100 : null);

// ---------- menton et barre (tractions ; refait en 4.25) ----------
// Avant 4.25 la barre était placée au bout des doigts (repères 19/20), que la détection place souvent bien AU-DESSUS de la
// barre (doigts dessinés tendus), et le menton n'était regardé que sur une seule image : beaucoup de reps réussies étaient
// jugées « menton sous la barre ». Maintenant :
//  - barre = position médiane des poignets pendant toute la série (les mains ne quittent pas la barre ; le téléphone est
//    posé), moins WRIST_TO_BAR (la barre est dans la paume, un peu au-dessus de l'articulation du poignet) ;
//  - menton = nez + CHIN_BELOW (bas du visage) ;
//  - pour chaque rep, le point le PLUS HAUT atteint par le menton pendant toute la rep ;
//  - calibration personnelle `chinCal` (en longueurs de buste, + = le menton est en réalité plus haut que mesuré) : réglée
//    avant la série (menton tenu au niveau de la barre, `chinCalibration`) ou après (« Mon menton passait la barre »).
export const WRIST_TO_BAR = 0.13, CHIN_BELOW = 0.10, CHIN_TOL = 0.04, CHIN_UNDER = 0.12, CHIN_CAL_MAX = 0.3;
function barY(ctx) {
  const ys = [];
  for (const f of ctx.F) {
    const p = f.p;
    if (!p || !(p[15].v >= VIS || p[16].v >= VIS)) continue;
    const w = midOf(p, p, 15, 16), sh = midOf(p, p, 11, 12);
    if (w.y < sh.y) ys.push(w.y); // mains au-dessus des épaules : sur la barre
  }
  return ys.length >= 5 ? median(ys) - WRIST_TO_BAR * (ctx.torso || 0.3) : NaN;
}
function chinMargins(ctx, reps) {
  const T = ctx.torso || 0.3;
  const bar = barY(ctx);
  if (!isNum(bar)) return null;
  const chinY = clean(ctx, ctx.F.map(f => (f.p && f.p[NOSE].v >= VIS ? f.p[NOSE].y + CHIN_BELOW * T : NaN)));
  const raw = [], idx = [];
  reps.forEach((r, i) => {
    let best = NaN;
    for (let k = r.start; k <= r.end; k++) if (isNum(chinY[k]) && !(chinY[k] >= best)) best = chinY[k];
    if (isNum(best)) { raw.push(Math.round(((bar - best) / T) * 1000) / 1000); idx.push(i); }
  });
  return raw.length ? { raw, idx } : null;
}
/** Constat « menton » d'après les écarts menton – barre de chaque rep (+ = au-dessus) et la calibration. */
export function chinFinding(raw, idx, cal = 0) {
  if (!raw || !raw.length) return null;
  const v = raw.map(x => x + (cal || 0));
  const okK = v.map(x => x >= -CHIN_TOL);
  const ok = okK.filter(Boolean).length, under = v.filter(x => x < -CHIN_UNDER).length;
  const bad = idx.filter((_, k) => !okK[k]);
  const n = v.length;
  const calTxt = cal ? ' (calibration personnelle appliquée)' : '';
  if (ok / n >= 0.8) return F('chin', 'good', 'Menton au niveau de la barre', `Sur ${ok}/${n} reps${calTxt}.`);
  if (under / n >= 0.5) return F('chin', 'warn', 'Menton sous la barre', `Ton menton a atteint la barre sur ${ok}/${n} reps${calTxt}.`, 'Monte jusqu’à ce que le menton dépasse la barre ; sinon, prends un élastique ou fais des négatives (descentes lentes).', bad);
  return F('chin', 'tip', 'Il manque un peu en haut', `Ton menton a atteint la barre sur ${ok}/${n} reps${calTxt}.`, 'Tire encore un peu à chaque rep, jusqu’au menton au-dessus de la barre.', bad);
}
function scoreOf(findings) {
  const nWarn = findings.filter(f => f.level === 'warn').length, nTip = findings.filter(f => f.level === 'tip').length;
  const score = Math.max(30, 100 - 20 * nWarn - 8 * nTip);
  return { score, verdict: score >= 90 ? 'Propre' : score >= 70 ? 'Correct' : 'À travailler' };
}
/** Même analyse avec une autre calibration du menton (sans refilmer). */
export function applyChinCal(result, cal) {
  if (!result || !result.ok || !result.chin) return result;
  const fnd = chinFinding(result.chin.raw, result.chin.idx, cal);
  const findings = result.findings.filter(f => f.id !== 'chin');
  if (fnd) findings.push(fnd);
  findings.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
  return { ...result, findings, ...scoreOf(findings), chin: { ...result.chin, cal } };
}
/** Calibration qui fait passer toutes les reps de cette série (« mon menton passait la barre »). */
export function chinCalToPassAll(result) {
  if (!result || !result.chin || !result.chin.raw.length) return null;
  const need = -Math.min(...result.chin.raw) - CHIN_TOL + 0.01;
  return Math.round(Math.max(-CHIN_CAL_MAX, Math.min(CHIN_CAL_MAX, need)) * 1000) / 1000;
}
/**
 * Calibration en direct : la personne tient le menton juste au niveau de la barre. frames = les ~1,5 dernières secondes.
 * Renvoie la calibration (écart à ajouter) quand la position est tenue immobile, sinon null.
 */
export function chinCalibration(frames, meta = {}) {
  const ctx = makeCtx(frames, meta);
  if (ctx.valid < 15 || ctx.t[ctx.t.length - 1] - ctx.t[0] < 1.2) return null;
  const T = ctx.torso || 0.3;
  const bar = barY(ctx);
  const nose = ctx.F.filter(f => f.p && f.p[NOSE].v >= VIS).map(f => f.p[NOSE].y);
  if (!isNum(bar) || nose.length < 15) return null;
  if (quantile(nose, 0.9) - quantile(nose, 0.1) > 0.06 * T) return null; // pas immobile
  const raw = (bar - (median(nose) + CHIN_BELOW * T)) / T;
  if (Math.abs(raw) > 0.45) return null; // menton loin de la barre : pas en position
  return Math.round(Math.max(-CHIN_CAL_MAX, Math.min(CHIN_CAL_MAX, -raw)) * 1000) / 1000;
}

// ---------- contrôles de technique ----------
// FRONT_ONLY : mesures dans le plan de face (genoux, bassin, symétrie). Les autres demandent une vue de profil (2D) ou les repères 3D.
const FRONT_ONLY = new Set(['valgus', 'shift', 'sym']);
const SIGNAL_ONLY = new Set(['tempo', 'fade', 'speed', 'bounce', 'topPause', 'raiseTop', 'elbowBend']);

// TRACK : dernières valeurs par rep calculées par un contrôle (et reps qui ne passent pas), pour relier un point relevé
// aux reps concernées sans le réécrire dans chaque contrôle
const TRACK = { last: null, bad: null };
const perRep = (reps, fn) => {
  const out = [];
  out.idx = [];
  reps.forEach((r, i) => { const v = fn(r, i); if (isNum(v)) { out.push(v); out.idx.push(i); } });
  TRACK.last = out;
  return out;
};
const cyc = (a, r) => stat(a, r.a, r.b) || {};
const mov = (a, r) => stat(a, r.start, r.end) || {};
const share = (vals, pred) => {
  if (vals.idx) TRACK.bad = vals.idx.filter((_, k) => pred(vals[k]));
  return vals.length ? vals.filter(pred).length / vals.length : 0;
};
// contrôles où le pire écart se lit en valeur absolue (côté gauche / droit, bassin trop bas / trop haut)
const ABS_WORST = new Set(['sym', 'shift', 'line']);
function attachReps(f) {
  if (!f || (f.level !== 'warn' && f.level !== 'tip') || f.reps) return f;
  if (TRACK.bad && TRACK.bad.length) f.reps = TRACK.bad.slice();
  else if (TRACK.last && TRACK.last.length) {
    const val = v => (ABS_WORST.has(f.id) ? Math.abs(v) : v);
    let k = 0;
    TRACK.last.forEach((v, j) => { if (val(v) > val(TRACK.last[k])) k = j; });
    f.reps = [TRACK.last.idx[k]];
  }
  return f;
}
const note3d = ctx => (ctx.view !== 'side' ? ' (mesure approximative de face)' : '');
// reps : index (à partir de 0) des reps où le point se voit, pour l'extrait vidéo
const F = (id, level, title, detail, fix, reps) => ({ id, level, title, detail, fix, ...(reps && reps.length ? { reps } : {}) });

const CHECKS = {
  depthThigh(ctx, P, reps) {
    const th = thighSeries(ctx);
    const v = perRep(reps, r => mov(th, r).min);
    if (v.length < reps.length / 2) return null;
    const ok = v.filter(x => x <= P.thighOk).length, med = median(v);
    TRACK.bad = v.idx.filter((_, k) => v[k] > P.thighOk);
    if (ok / v.length >= 0.8) return F('depth', 'good', 'Profondeur', `Cuisses à la parallèle (ou plus bas) sur ${ok}/${v.length} reps${note3d(ctx)}.`);
    if (med > P.thighWarn) return F('depth', 'warn', 'Squat partiel', `Il manque environ ${r0(med)}° pour avoir les cuisses parallèles au sol${note3d(ctx)}.`, 'Descends jusqu’à ce que le pli de la hanche arrive au niveau des genoux. Si tu n’y arrives pas, allège la charge et travaille la mobilité des chevilles et des hanches.');
    const miss = `il manque environ ${r0(Math.max(1, med))}° pour avoir les cuisses parallèles au sol`;
    return F('depth', 'tip', 'Un peu haut', `${ok ? `Profondeur atteinte sur ${ok}/${v.length} reps ; sur les autres, ${miss}` : cap(miss)}${note3d(ctx)}.`, 'Descends quelques centimètres de plus, dos droit et talons au sol.');
  },
  depthKnee(ctx, P, reps) {
    const k = ctx.main;
    const v = perRep(reps, r => cyc(k, r).min);
    const ok = v.filter(x => x <= P.depth).length, med = median(v);
    TRACK.bad = v.idx.filter((_, k) => v[k] > P.depth);
    const fixes = {
      machineLeg: 'Descends jusqu’à environ 90° aux genoux, sans que le bas du dos se décolle du dossier.',
      lunge: 'Descends jusqu’à ce que le genou arrière frôle le sol, genou avant au-dessus du pied.',
      pistol: 'Descends plus bas en contrôle (tiens un support si besoin).',
    };
    if (ok / v.length >= 0.8) return F('depth', 'good', 'Amplitude', `Genoux pliés à ~${r0(med)}° en bas : bonne amplitude${note3d(ctx)}.`);
    if (med > P.depthWarn) return F('depth', 'warn', 'Amplitude courte', `Genoux à ~${r0(med)}° seulement en bas${note3d(ctx)}.`, `${fixes[P.id] || fixes.machineLeg} Allège la charge si besoin.`);
    return F('depth', 'tip', 'Amplitude un peu courte', `Genoux à ~${r0(med)}° en bas (objectif ≈ ${P.depth}°)${note3d(ctx)}.`, fixes[P.id] || fixes.machineLeg);
  },
  depthElbow(ctx, P, reps) {
    const el = ctx.main;
    const v = perRep(reps, r => cyc(el, r).min);
    const ok = v.filter(x => x <= P.depth).length, med = median(v);
    TRACK.bad = v.idx.filter((_, k) => v[k] > P.depth);
    const fixes = {
      benchPress: 'Descends jusqu’à toucher légèrement la poitrine (ou jusqu’à ce que les coudes passent sous le banc), sans rebondir.',
      pushUp: 'Descends jusqu’à ce que la poitrine frôle le sol, corps gainé.',
      dip: 'Descends jusqu’à avoir les bras à peu près parallèles au sol, si tes épaules le tolèrent.',
      press: 'Redescends les mains au niveau du menton ou des épaules à chaque rep.',
      hspu: 'Descends jusqu’à ce que la tête frôle le sol.',
    };
    if (ok / v.length >= 0.8) return F('depth', 'good', 'Amplitude', `Coudes pliés à ~${r0(med)}° en bas : amplitude complète${note3d(ctx)}.`);
    if (med > P.depthWarn) return F('depth', 'warn', 'Reps partielles', `Tes coudes ne plient qu’à ~${r0(med)}° en bas${note3d(ctx)}.`, `${fixes[P.id]} Allège la charge si besoin.`);
    return F('depth', 'tip', 'Amplitude un peu courte', `Coudes à ~${r0(med)}° en bas (objectif ≈ ${P.depth}°)${note3d(ctx)}.`, fixes[P.id]);
  },
  lock(ctx, P, reps) {
    const v = perRep(reps, r => cyc(ctx.main, r).max);
    if (share(v, x => x < P.lock - 5) < 0.5) return null;
    const tri = P.id === 'triExtUp' || P.id === 'triExtDown';
    return F('lock', 'tip', 'Bras pas tendus', `Coudes à ~${r0(median(v))}° au maximum.`, tri ? 'Tends complètement les bras à chaque rep, pour faire travailler le triceps sur toute son amplitude.' : 'Va chercher l’extension complète des bras à chaque rep (sans claquer les coudes).');
  },
  lockOver(ctx, P, reps) {
    const out = [];
    const v = perRep(reps, r => cyc(ctx.main, r).max);
    if (share(v, x => x < P.lock - 5) >= 0.5) out.push(F('lock', 'tip', 'Bras pas tendus en haut', `Coudes à ~${r0(median(v))}° au plus haut.`, 'Pousse jusqu’à avoir les bras tendus au-dessus de la tête.'));
    if (ctx.view === 'side') {
      const s = ctx.side === 'r' ? SIDES.r : SIDES.l;
      const off = perRep(reps, r => {
        const f = ctx.F[r.turn];
        if (!f.p || f.p[s.wr].v < VIS || f.p[s.sh].v < VIS) return NaN;
        const arm = dist(f.p[s.sh], f.p[s.el]) + dist(f.p[s.el], f.p[s.wr]);
        return ((f.p[s.wr].x - f.p[s.sh].x) * ctx.facing) / (arm || NaN);
      });
      if (off.length && median(off) > 0.3) out.push(F('path', 'tip', 'Charge devant la tête', 'En haut, tes mains finissent nettement devant tes épaules.', 'Finis avec la charge au-dessus du crâne : avance légèrement la tête une fois la barre passée.'));
    }
    return out;
  },
  archBack(ctx, P, reps) {
    const knee = jointSeries(ctx, 'knee');
    if (!(median(knee) > 150)) return null; // assis : le dossier fait le travail
    const lean = leanSeries(ctx);
    const v = perRep(reps, r => mov(lean, r).min);
    if (!v.length || share(v, x => x < -12) < 0.5) return null;
    return F('arch', 'warn', 'Dos cambré', `Tu te penches en arrière d’environ ${r0(-median(v))}° en poussant.`, 'Serre les fessiers et les abdos, côtes basses. Prends un peu moins lourd si besoin.');
  },
  bounce(ctx, P, reps) {
    if (reps.length < 2) return null;
    let bad;
    let list;
    if (!ctx.conFirst) list = reps.map((r, i) => (r.hold < 0.07 && ctx.ecc[i] < 0.8 ? i : -1)).filter(i => i >= 0);
    else list = reps.map((r, i) => (i > 0 && ctx.t[r.start] - ctx.t[reps[i - 1].end] < 0.08 && ctx.ecc[i - 1] < 0.6 ? i : -1)).filter(i => i >= 0);
    bad = list.length;
    TRACK.bad = list;
    const n = ctx.conFirst ? reps.length - 1 : reps.length;
    if (bad / n < 0.5) return null;
    const fixes = {
      benchPress: 'Pose la charge sur la poitrine en contrôle, sans rebondir.',
      calf: 'Marque 1 s en bas, talons étirés, avant de remonter.',
    };
    return F('bounce', 'tip', 'Rebond en bas', `Pas de temps d’arrêt en bas sur ${bad}/${n} reps : l’élan fait une partie du travail.`, fixes[P.id] || 'Freine la descente et évite de rebondir en bas.');
  },
  topPause(ctx, P, reps) {
    if (!ctx.conFirst) return null;
    const v = reps.map(r => r.hold);
    if (median(v) >= 0.5) return F('pause', 'good', 'Contraction en haut', `Tu marques ~${fmtS(median(v))} en haut : parfait.`);
    if (share(v, x => x < 0.2) < 0.6) return null;
    return F('pause', 'tip', 'Pas de pause en haut', 'Tu redescends dès que tu arrives en haut.', 'Marque 1 s en haut en contractant fort.');
  },
  tempo(ctx, P, reps) {
    const e = median(ctx.ecc), c = median(ctx.con);
    if (!isNum(e)) return null;
    if (e < 0.7) return F('tempo', 'tip', `${cap(P.words[1])} rapide`, `${cap(P.words[1])} en ${fmtS(e)} en moyenne : la charge tombe plus qu’elle n’est freinée.`, `Freine ${withArt(P.words[1])} : compte environ 2 secondes à chaque rep.`, ctx.ecc.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]).slice(0, 3).map(p => p[1]));
    if (e >= 1.2) return F('tempo', 'good', 'Tempo contrôlé', `${cap(P.words[1])} en ${fmtS(e)}, ${P.words[0]} en ${fmtS(c)}.`);
    return null;
  },
  fade(ctx, P, reps) {
    // amplitude de chaque rep, vue depuis la position de repos (0 = rien, 1 = amplitude complète de la série)
    const amp = reps.map(r => r.depth);
    if (reps.length >= 4) {
      const first = median(amp.slice(0, Math.min(3, amp.length - 2))), last = mean(amp.slice(-2));
      if (first > 0 && last < first * 0.85) return F('fade', 'tip', 'Amplitude qui baisse', `Tes 2 dernières reps étaient environ ${pct(1 - last / first)} moins amples que les premières.`, 'Garde la même amplitude jusqu’au bout, quitte à faire une rep de moins.', [reps.length - 2, reps.length - 1]);
    }
    const partial = amp.map((a, i) => (a < 0.75 ? i + 1 : 0)).filter(Boolean);
    if (partial.length && partial.length < reps.length) {
      return F('partial', 'tip', partial.length > 1 ? 'Reps incomplètes' : 'Une rep incomplète', `Rep${partial.length > 1 ? 's' : ''} n° ${partial.join(', ')} nettement moins ample${partial.length > 1 ? 's' : ''} que les autres.`, 'Garde la même amplitude à chaque rep.', partial.map(n => n - 1));
    }
    return null;
  },
  speed(ctx, P, reps) {
    if (reps.length < 4) return null;
    const c = ctx.con;
    const head = c.slice(0, 3).filter(isNum), last = c[c.length - 1];
    const base = head.length ? Math.min(...head) : NaN;
    if (!(base > 0) || !isNum(last)) return null;
    const loss = 1 - base / last;
    if (loss >= 0.4) return F('speed', 'info', 'Proche de ta limite', `Dernière rep : ${P.words[0]} en ${fmtS(last)}, contre ${fmtS(base)} pour la plus rapide. Tu étais près de l’échec.`);
    if (loss <= 0.1 && reps.length >= 5) return F('speed', 'info', 'Encore de la marge', `Ta vitesse est restée stable jusqu’à la dernière rep : il te restait sûrement plusieurs reps en réserve.`);
    return null;
  },
  trunk(ctx, P, reps) {
    const lean = leanSeries(ctx);
    const v = perRep(reps, r => lean[r.turn]);
    if (v.length < reps.length / 2) return null;
    const med = median(v);
    if (med <= P.trunkMax) return null;
    const fix = P.id === 'lunge' ? 'Garde le buste droit en descendant, regard devant.' : 'Garde la poitrine haute et le regard devant. Si ça ne suffit pas : mobilité des chevilles, ou essaie le goblet squat.';
    return F('trunk', med > P.trunkMax + 15 ? 'warn' : 'tip', 'Buste très penché', `Ton buste penche à ~${r0(med)}° en bas${note3d(ctx)}.`, fix);
  },
  hipsFirst(ctx, P, reps) {
    const lean = leanSeries(ctx);
    const d = perRep(reps, r => {
      const i0 = ctx.conFirst ? r.start : r.h2, i1 = ctx.conFirst ? r.h1 : r.end;
      if (i1 - i0 < 3) return NaN;
      const iE = i0 + Math.max(2, Math.round((i1 - i0) * 0.35));
      const st = stat(lean, i0, iE);
      return st && isNum(lean[i0]) ? st.max - lean[i0] : NaN;
    });
    if (d.length < reps.length / 2) return null;
    const med = median(d);
    if (med < 8) return null;
    const fix = P.id === 'deadlift' ? 'Au départ, pousse le sol avec les jambes : hanches et épaules montent ensemble.' : 'Remonte en poussant le sol et en levant la poitrine en même temps que les fesses.';
    return F('hipsFirst', med >= 15 ? 'warn' : 'tip', 'Fesses qui remontent en premier', `En début de montée, ton buste s’incline de ~${r0(med)}° de plus.`, fix);
  },
  valgus(ctx, P, reps) {
    const ratio = clean(ctx, ctx.F.map(f => (f.p && [25, 26, 27, 28].every(i => f.p[i].v >= VIS) ? dist(f.p[25], f.p[26]) / (dist(f.p[27], f.p[28]) || NaN) : NaN)));
    const badList = reps.map((r, i) => {
      const b = ratio[r.turn], top = ratio[r.a];
      return isNum(b) && (b < 0.8 || (isNum(top) && b < top * 0.85)) ? i : -1;
    }).filter(i => i >= 0);
    const bad = badList.length;
    TRACK.bad = badList;
    const seen = reps.filter(r => isNum(ratio[r.turn])).length;
    if (!seen) return null;
    if (bad / seen >= 0.4) return F('valgus', 'warn', 'Genoux qui rentrent', `Tes genoux se rapprochent l’un de l’autre en bas sur ${bad}/${seen} reps.`, 'Pousse les genoux vers l’extérieur, dans l’axe des pieds. Allège la charge si tu n’y arrives pas.');
    return F('valgus', 'good', 'Genoux dans l’axe', 'Tes genoux restent bien alignés avec tes pieds.');
  },
  shift(ctx, P, reps) {
    const sh = clean(ctx, ctx.F.map(f => (f.p && [23, 24, 27, 28].every(i => f.p[i].v >= VIS) ? (midOf(f.p, f.p, 23, 24).x - midOf(f.p, f.p, 27, 28).x) / (dist(f.p[23], f.p[24]) || NaN) : NaN)));
    const v = perRep(reps, r => sh[r.turn] - sh[r.a]);
    if (!v.length) return null;
    const med = median(v);
    if (Math.abs(med) < 0.25) return null;
    // image non inversée : la gauche de la personne est à droite de l'image quand elle nous fait face
    return F('shift', 'tip', 'Bassin décalé', `En bas, ton bassin part vers la ${med > 0 ? 'gauche' : 'droite'}.`, 'Répartis le poids sur les deux pieds ; allège un peu la charge et filme-toi de face pour vérifier.');
  },
  sym(ctx, P, reps) {
    const joint = P.signal === 'gap' ? 'shoulder' : P.signal;
    if (!PER_SIDE.has(joint)) return null;
    const L = sideSeries(ctx, joint, 'l'), R = sideSeries(ctx, joint, 'r');
    const v = perRep(reps, r => L[r.turn] - R[r.turn]);
    if (v.length < reps.length / 2) return null;
    const med = median(v);
    if (Math.abs(med) < 12) return null;
    return F('sym', 'tip', 'Asymétrie', `Ton bras ${med < 0 ? 'gauche' : 'droit'} va ~${r0(Math.abs(med))}° moins loin que l’autre.`, 'Concentre-toi sur le côté le plus faible et garde les deux bras synchronisés ; prends un peu moins lourd si besoin.');
  },
  hang(ctx, P, reps) {
    const v = perRep(reps, r => cyc(ctx.main, r).max);
    if (share(v, x => x < P.hang - 10) < 0.5) return null;
    const fixes = {
      pullUp: 'Redescends bras presque tendus à chaque rep (épaules engagées).',
      curl: 'Redescends bras tendus à chaque rep pour travailler toute l’amplitude.',
    };
    return F('hang', 'tip', 'Bras pas tendus en bas', `Coudes à ~${r0(median(v))}° au plus bas.`, fixes[P.id] || 'Laisse les bras se tendre au retour pour étirer le dos.');
  },
  topElbow(ctx, P, reps) {
    const v = perRep(reps, r => cyc(ctx.main, r).min);
    if (share(v, x => x > P.top + 15) < 0.5) return null;
    const fixes = {
      curl: 'Monte jusqu’à ce que l’avant-bras touche presque le biceps.',
      row: 'Tire jusqu’à ce que tes coudes passent derrière ton buste.',
      invRow: 'Tire jusqu’à ce que ta poitrine touche presque la barre.',
      pulldown: 'Tire la barre jusqu’au haut de la poitrine.',
    };
    return F('top', 'tip', 'Amplitude courte en haut', `Coudes à ~${r0(median(v))}° au maximum de la contraction.`, fixes[P.id] || fixes.row);
  },
  chin(ctx, P, reps) {
    const m = chinMargins(ctx, reps);
    if (!m) return null;
    ctx.chin = m;
    const out = chinFinding(m.raw, m.idx, ctx.chinCal);
    TRACK.last = null; TRACK.bad = null;
    return out;
  },
  kip(ctx, P, reps) {
    const hip = jointSeries(ctx, 'hip');
    const v = perRep(reps, r => mov(hip, r).range);
    if (!v.length || median(v) <= P.kipMax) return null;
    return F('kip', 'tip', 'Balancement des jambes', `Tes hanches bougent de ~${r0(median(v))}° pendant la traction : l’élan aide à monter.`, 'Gaine-toi : jambes serrées et légèrement devant, et monte sans balancer.');
  },
  swing(ctx, P, reps) {
    const lean = leanSeries(ctx);
    const v = perRep(reps, r => mov(lean, r).range);
    if (v.length < reps.length / 2) return null;
    const med = median(v);
    if (med <= P.swingMax) return null;
    const fix = P.id === 'legRaise' ? 'Contrôle la descente et évite de te balancer : jambes qui remontent sans élan.' : 'Garde le buste immobile et gaine les abdos ; prends un peu moins lourd si besoin.';
    return F('swing', med > P.swingMax * 2 ? 'warn' : 'tip', 'Élan avec le buste', `Ton buste bascule d’environ ${r0(med)}° pendant les reps.`, fix);
  },
  elbowStill(ctx, P, reps) {
    const sh = jointSeries(ctx, 'shoulder');
    const v = perRep(reps, r => mov(sh, r).range);
    if (v.length < reps.length / 2 || median(v) <= P.elbowVar) return null;
    return F('elbows', 'tip', P.id === 'curl' ? 'Coudes qui avancent' : 'Coudes qui bougent', `Ton bras bouge d’environ ${r0(median(v))}° à chaque rep.`, 'Garde les coudes fixes, collés au corps : seul l’avant-bras bouge.');
  },
  trunkStill(ctx, P, reps) {
    const lean = leanSeries(ctx);
    const v = perRep(reps, r => mov(lean, r).range);
    if (v.length < reps.length / 2 || median(v) <= P.trunkVar) return null;
    return F('trunk', 'tip', 'Buste qui bouge', `Ton buste se relève d’environ ${r0(median(v))}° à chaque rep.`, 'Garde le buste fixe et tire avec les coudes ; prends un peu moins lourd si besoin.');
  },
  raiseTop(ctx, P, reps) {
    const v = perRep(reps, r => cyc(ctx.main, r).max);
    if (!v.length) return null;
    const med = median(v);
    if (med > P.topMax) return F('top', 'tip', 'Trop haut', `Tes bras montent à ~${r0(med)}°.`, 'Monte jusqu’à l’horizontale (coudes à hauteur d’épaules), pas plus.', v.idx.filter((_, k) => v[k] > P.topMax));
    if (med < P.topMin) return F('top', 'tip', 'Pas assez haut', `Tes bras montent à ~${r0(med)}°.`, 'Monte jusqu’à avoir les coudes à hauteur d’épaules.', v.idx.filter((_, k) => v[k] < P.topMin));
    return F('top', 'good', 'Hauteur', `Bras à ~${r0(med)}° en haut : bonne hauteur.`);
  },
  elbowBend(ctx, P, reps) {
    const el = jointSeries(ctx, 'elbow');
    const v = perRep(reps, r => mov(el, r).range);
    if (v.length < reps.length / 2 || median(v) <= 30) return null;
    return F('elbows', 'tip', 'Bras qui plient', `Ton coude varie d’environ ${r0(median(v))}° : le mouvement devient un développé.`, P.id.startsWith('pullover') ? 'Garde les bras presque tendus pendant tout le mouvement.' : 'Garde le même léger fléchi des coudes du début à la fin.');
  },
  kneeLock(ctx, P, reps) {
    const v = perRep(reps, r => cyc(ctx.main, r).max);
    if (share(v, x => x < 155) < 0.5) return null;
    return F('lockout', 'tip', 'Pas complètement redressé', `Genoux à ~${r0(median(v))}° en haut.`, 'Redresse-toi complètement entre les reps, hanches et genoux tendus.');
  },
  kneeHyper(ctx, P, reps) {
    const v = perRep(reps, r => cyc(ctx.main, r).max);
    if (share(v, x => x >= 177) < 0.5) return null;
    return F('lockout', 'tip', 'Genoux verrouillés', 'Tes jambes se tendent complètement en haut.', 'Garde un léger fléchi en haut au lieu de verrouiller les genoux.');
  },
  kneeTop(ctx, P, reps) {
    const v = perRep(reps, r => cyc(ctx.main, r).max);
    if (share(v, x => x < 155) < 0.5) return null;
    return F('lockout', 'tip', 'Jambes pas tendues', `Genoux à ~${r0(median(v))}° en haut.`, 'Tends complètement les jambes en haut et marque 1 s.');
  },
  kneeBottom(ctx, P, reps) {
    const v = perRep(reps, r => cyc(ctx.main, r).min);
    if (share(v, x => x > 85) < 0.5) return null;
    return F('depth', 'tip', 'Amplitude courte', `Genoux pliés à ~${r0(median(v))}° seulement.`, 'Plie les genoux au maximum, talons vers les fesses.');
  },
  hipStill(ctx, P, reps) {
    const hip = jointSeries(ctx, 'hip');
    const v = perRep(reps, r => mov(hip, r).range);
    if (v.length < reps.length / 2 || median(v) <= P.hipVar) return null;
    return F('hips', 'tip', 'Hanches qui bougent', `Ton bassin bouge d’environ ${r0(median(v))}° à chaque rep.`, 'Garde le bassin plaqué contre le banc (ou le siège) pendant toute la flexion.');
  },
  hipLock(ctx, P, reps) {
    const v = perRep(reps, r => cyc(ctx.main, r).max);
    if (share(v, x => x < P.lock - 5) < 0.5) return null;
    const fixes = {
      hipThrust: 'Monte jusqu’à aligner épaules, hanches et genoux, et serre les fessiers 1 s en haut.',
      backExt: 'Remonte jusqu’à aligner le buste avec les jambes (sans te cambrer).',
    };
    return F('lockout', 'tip', 'Hanches pas tendues en haut', `Hanches à ~${r0(median(v))}° en haut.`, fixes[P.id] || 'Termine debout, hanches tendues, en serrant les fessiers.');
  },
  leanBack(ctx, P, reps) {
    const lean = leanSeries(ctx);
    const v = perRep(reps, r => stat(lean, r.h1, r.h2)?.min);
    if (!v.length || share(v, x => x < -10) < 0.5) return null;
    return F('leanBack', 'tip', 'Bascule en arrière', `En haut, tu te penches en arrière d’environ ${r0(-median(v))}°.`, 'En haut, reste droit : hanches et genoux tendus suffisent.');
  },
  hinge(ctx, P, reps) {
    const v = perRep(reps, r => cyc(ctx.main, r).min);
    if (share(v, x => x > P.hinge) < 0.5) return null;
    return F('depth', 'tip', 'Amplitude courte', `Ta hanche ne se plie qu’à ~${r0(median(v))}°.`, 'Descends plus bas en poussant les fesses en arrière, dos plat, jusqu’à sentir l’étirement derrière les cuisses.');
  },
  kneeStill(ctx, P, reps) {
    const knee = jointSeries(ctx, 'knee');
    const v = perRep(reps, r => mov(knee, r).range);
    if (v.length < reps.length / 2 || median(v) <= P.kneeVar) return null;
    return F('knees', 'tip', 'Genoux trop pliés', `Tes genoux plient d’environ ${r0(median(v))}° : ça devient un soulevé classique.`, 'Garde les genoux légèrement fléchis et fixes : c’est la hanche qui bouge (fesses vers l’arrière).');
  },
  bodyLine(ctx, P, reps) {
    const kneeling = median(jointSeries(ctx, 'knee')) < 140;
    const line = lineSeries(ctx, kneeling);
    const v = perRep(reps, r => median(Array.from(line.slice(r.start, r.end + 1))));
    if (v.length < reps.length / 2) return null;
    const med = median(v);
    if (med > 0.12) return F('line', 'warn', 'Bassin qui s’affaisse', 'Ton bassin descend sous la ligne épaules–pieds.', 'Serre les fessiers et les abdos : corps droit de la tête aux pieds.');
    if (med < -0.15) return F('line', 'tip', 'Fesses trop hautes', 'Ton bassin est au-dessus de la ligne épaules–pieds.', 'Descends les hanches pour aligner épaules, bassin et chevilles.');
    if (Math.abs(med) < 0.08) return F('line', 'good', 'Corps gainé', 'Épaules, bassin et pieds restent alignés.');
    return null;
  },
  hipSag(ctx, P, reps) {
    const line = lineSeries(ctx, true);
    const v = perRep(reps, r => line[r.turn]);
    if (!v.length) return null;
    if (median(v) > 0.1) return F('line', 'warn', 'Bas du dos qui se creuse', 'En position allongée, ton bassin descend.', 'Rentre le bassin et serre les abdos ; ne va pas plus loin que ce que tu contrôles.');
    return null;
  },
  fullExt(ctx, P, reps) {
    const hip = jointSeries(ctx, 'hip'), knee = jointSeries(ctx, 'knee');
    const bad = reps.filter(r => { const h = cyc(hip, r).max, k = cyc(knee, r).max; return isNum(h) && isNum(k) && (h < 165 || k < 160); }).length;
    if (bad / reps.length < 0.5) return null;
    return F('ext', 'tip', 'Extension incomplète', `Sur ${bad}/${reps.length} reps, hanches ou genoux ne se tendent pas complètement avant la réception.`, 'Va chercher l’extension complète (chevilles, genoux, hanches) avant de passer sous la barre.');
  },
  lockOverOly(ctx, P, reps) {
    const el = jointSeries(ctx, 'elbow');
    const v = perRep(reps, r => stat(el, r.h1, r.h2)?.max);
    if (!v.length || share(v, x => x < 160) < 0.5) return null;
    return F('lock', 'tip', 'Bras pas verrouillés', `Coudes à ~${r0(median(v))}° au-dessus de la tête.`, 'Réceptionne bras tendus et verrouillés au-dessus de la tête.');
  },
};
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const FEM = new Set(['descente', 'montée', 'poussée', 'flexion', 'fermeture', 'rotation', 'montée de genou']);
const withArt = w => (/^[aeiouéèh]/i.test(w) ? `l’${w}` : FEM.has(w) ? `la ${w}` : `le ${w}`);

// ---------- tenues (gainage, chaise, suspension…) ----------
function analyzeHold(ctx, P) {
  const incl = inclineSeries(ctx);
  let cond;
  if (P.hold === 'line') cond = i => incl[i] >= 50;
  else if (P.hold === 'wallSit') { const k = jointSeries(ctx, 'knee'); cond = i => k[i] >= 55 && k[i] <= 130; }
  else if (P.hold === 'hang') cond = i => { const f = ctx.F[i]; return !!(f.p && (f.p[15].v >= VIS || f.p[16].v >= VIS) && midOf(f.p, f.p, 15, 16).y < f.p[NOSE].y); };
  else if (P.hold === 'lSit') { const h = jointSeries(ctx, 'hip'); cond = i => h[i] < 130; }
  else cond = i => incl[i] < 35;
  // plus longue période où la position est tenue (trous ≤ 0,5 s tolérés)
  let best = null, cur = null, lastOk = -1;
  for (let i = 0; i < ctx.F.length; i++) {
    const ok = !!ctx.F[i].p && cond(i);
    if (ok) {
      if (cur && ctx.t[i] - ctx.t[lastOk] <= 0.5) cur.b = i;
      else cur = { a: i, b: i };
      lastOk = i;
      if (!best || ctx.t[cur.b] - ctx.t[cur.a] > ctx.t[best.b] - ctx.t[best.a]) best = { ...cur };
    }
  }
  const sec = best ? ctx.t[best.b] - ctx.t[best.a] : 0;
  if (sec < 2) return fail('nohold', 'Je n’ai pas vu la position tenue assez longtemps.', P);
  const seg = a => Array.from(a.slice(best.a, best.b + 1));
  const findings = [];
  if (P.checks.includes('holdLine')) {
    const off = median(seg(lineSeries(ctx)));
    if (isNum(off)) {
      if (off > 0.12) findings.push(F('line', 'warn', 'Bassin qui s’affaisse', 'Ton bassin descend sous la ligne épaules–pieds.', 'Serre les fessiers et les abdos, rentre légèrement le bassin.'));
      else if (off < -0.15) findings.push(F('line', 'tip', 'Fesses trop hautes', 'Ton bassin est au-dessus de la ligne épaules–pieds.', 'Descends les hanches pour aligner épaules, bassin et chevilles.'));
      else findings.push(F('line', 'good', 'Alignement', 'Épaules, bassin et pieds alignés pendant la tenue.'));
      // tenue qui se dégrade : comparaison début / fin
      const L = seg(lineSeries(ctx)), n = L.length;
      if (n > 20) {
        const a = median(L.slice(0, Math.floor(n / 3))), b = median(L.slice(-Math.floor(n / 4)));
        if (isNum(a) && isNum(b) && b - a > 0.1 && b > 0.08) findings.push(F('fade', 'tip', 'Fin de tenue difficile', 'Ton bassin s’affaisse sur la fin.', 'Arrête quelques secondes plus tôt plutôt que de perdre l’alignement.'));
      }
    }
  }
  if (P.checks.includes('holdKnee')) {
    const k = median(seg(jointSeries(ctx, 'knee')));
    if (k > 105) findings.push(F('depth', 'tip', 'Pas assez bas', `Genoux à ~${r0(k)}°.`, 'Descends jusqu’à avoir les cuisses parallèles au sol (genoux à 90°).'));
    else if (k < 75) findings.push(F('depth', 'tip', 'Trop bas', `Genoux à ~${r0(k)}°.`, 'Remonte un peu : cuisses parallèles au sol, genoux à 90°.'));
    else if (isNum(k)) findings.push(F('depth', 'good', 'Bonne position', `Genoux à ~${r0(k)}° : cuisses parallèles au sol.`));
  }
  if (P.checks.includes('holdHang')) {
    const e = median(seg(jointSeries(ctx, 'elbow')));
    if (e < 150) findings.push(F('hang', 'tip', 'Bras pliés', `Coudes à ~${r0(e)}°.`, 'Laisse-toi pendre bras tendus, épaules légèrement engagées.'));
    const hx = seg(clean(ctx, ctx.F.map(f => (f.p ? midOf(f.p, f.p, 23, 24).x / (ctx.torso || 0.3) : NaN))));
    if (spread(hx) > 0.3) findings.push(F('swing', 'tip', 'Balancement', 'Ton corps se balance pendant la suspension.', 'Gaine-toi pour rester immobile.'));
  }
  if (P.checks.includes('holdL')) {
    const h = median(seg(jointSeries(ctx, 'hip'))), k = median(seg(jointSeries(ctx, 'knee')));
    if (h > 105) findings.push(F('legs', 'tip', 'Jambes trop basses', `Hanches à ~${r0(h)}°.`, 'Monte les jambes à l’horizontale (ou plie les genoux pour commencer).'));
    else if (isNum(h)) findings.push(F('legs', 'good', 'Jambes à l’horizontale', `Hanches à ~${r0(h)}°.`));
    if (k < 150) findings.push(F('knees', 'tip', 'Genoux pliés', `Genoux à ~${r0(k)}°.`, 'Tends les jambes si tu peux ; sinon garde la version genoux pliés.'));
  }
  if (P.checks.includes('holdUpright')) {
    const l = median(seg(leanSeries(ctx)));
    if (Math.abs(l) > 12) findings.push(F('trunk', 'tip', 'Buste penché', `Ton buste penche d’environ ${r0(Math.abs(l))}°.`, 'Reste grand, épaules en arrière, abdos gainés.'));
    if (ctx.view !== 'side') {
      const tilt = median(seg(clean(ctx, ctx.F.map(f => (f.p && f.p[11].v >= VIS && f.p[12].v >= VIS ? Math.atan2(f.p[11].y - f.p[12].y, Math.abs(f.p[11].x - f.p[12].x)) * DEG : NaN)))));
      if (Math.abs(tilt) > 6) findings.push(F('tilt', 'tip', 'Épaules pas au même niveau', `Ton épaule ${tilt > 0 ? 'gauche' : 'droite'} est plus basse.`, 'Garde les épaules à la même hauteur (charges équilibrées).'));
    }
  }
  findings.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
  const nWarn = findings.filter(f => f.level === 'warn').length, nTip = findings.filter(f => f.level === 'tip').length;
  const score = Math.max(30, 100 - 20 * nWarn - 8 * nTip);
  return {
    ok: true, iso: true, pattern: P.id, label: P.label, view: ctx.view, viewOk: P.view === ctx.view,
    holdSec: Math.round(sec), repCount: 0, reps: [], findings, score,
    verdict: score >= 90 ? 'Propre' : score >= 70 ? 'Correct' : 'À travailler',
    summary: `Tenue de ${Math.round(sec)} s`,
  };
}

/** Le corps est-il assez visible pour démarrer l'enregistrement ? (épaule, hanche et membres utiles d'au moins un côté) */
export function bodyVisible(lm, pattern) {
  if (!lm || lm.length < 33) return false;
  const P = pattern || PATTERNS.generic;
  const arms = ['elbow', 'shoulder', 'wrist', 'gap', 'wristUp', 'wristOut'].includes(P.signal);
  const legs = !arms || ['olympic', 'olympicOver', 'pushUp', 'invRow', 'press', 'pullUp'].includes(P.id);
  const need = s => {
    const S = SIDES[s];
    const ids = [S.sh, S.hip];
    if (arms) ids.push(S.el, S.wr);
    if (legs) ids.push(S.kn, S.an);
    return ids.every(i => (lm[i].visibility ?? 1) >= 0.5 && lm[i].x > 0 && lm[i].x < 1 && lm[i].y > 0 && lm[i].y < 1);
  };
  return need('l') || need('r');
}
