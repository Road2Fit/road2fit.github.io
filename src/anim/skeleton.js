// Silhouette « bonhomme » vue de profil (elle regarde vers la droite) pour les animations de mouvement.
// Une pose donne la hanche, l'angle du buste et la cible des mains / des pieds ; la cinématique inverse (2 segments)
// place coudes et genoux. Tout est du calcul pur (testé), le dessin est dans components/MovementPreview.jsx.
//
// Repère : x vers la droite, y vers le BAS (écran), angles en degrés, 0° = vers la droite, -90° = vers le haut.

export const SEG = { thigh: 42, shin: 42, torso: 52, uarm: 28, farm: 26, foot: 11, head: 10 };
export const GROUND = 200;

const rad = d => (d * Math.PI) / 180;
const dir = (deg, len) => [Math.cos(rad(deg)) * len, Math.sin(rad(deg)) * len];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];

/**
 * Cinématique inverse à deux segments : renvoie le coude (ou genou) et l'extrémité atteinte (limitée à la longueur des segments).
 * `bend` = +1 / -1 : côté vers lequel l'articulation se plie (+1 = à gauche du sens racine → cible, vu à l'écran y vers le bas).
 */
export function ik(root, target, l1, l2, bend = 1) {
  const dx = target[0] - root[0];
  const dy = target[1] - root[1];
  const d = Math.hypot(dx, dy) || 0.0001;
  const dd = Math.min(l1 + l2 - 0.01, Math.max(Math.abs(l1 - l2) + 0.01, d));
  const ux = dx / d;
  const uy = dy / d;
  const a = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  return {
    mid: [root[0] + ux * a - bend * uy * h, root[1] + uy * a + bend * ux * h],
    end: [root[0] + ux * dd, root[1] + uy * dd],
  };
}

/** Pose → articulations (points) prêtes à dessiner. */
export function solvePose(p) {
  const hip = p.hip;
  const shoulder = add(add(hip, dir(p.torso, SEG.torso)), [0, -(p.lift || 0)]);
  const headC = add(shoulder, dir(p.torso + (p.neck || 0), SEG.head + 6));
  let elbow; let wrist;
  const handTarget = p.hand || (p.handRel ? [shoulder[0] + p.handRel[0], shoulder[1] + p.handRel[1]] : null); // handRel : main à une position fixe PAR RAPPORT à l'épaule (bras pendants)
  if (handTarget) ({ mid: elbow, end: wrist } = ik(shoulder, handTarget, SEG.uarm, SEG.farm, p.handBend === undefined ? 1 : p.handBend));
  else { elbow = add(shoulder, dir(p.arm[0], SEG.uarm)); wrist = add(elbow, dir(p.arm[1], SEG.farm)); }
  let knee; let ankle;
  if (p.foot) ({ mid: knee, end: ankle } = ik(hip, p.foot, SEG.thigh, SEG.shin, p.footBend === undefined ? -1 : p.footBend));
  else { knee = add(hip, dir(p.leg[0], SEG.thigh)); ankle = add(knee, dir(p.leg[1], SEG.shin)); }
  const toe = add(ankle, dir(p.toe === undefined ? 0 : p.toe, SEG.foot));
  // poing : prolonge l'avant-bras, fléchi de « flex » degrés (curl des poignets)
  const fa = (Math.atan2(wrist[1] - elbow[1], wrist[0] - elbow[0]) * 180) / Math.PI;
  const fist = add(wrist, dir(fa + (p.flex || 0), 10));
  let farElbow = null; let farWrist = null; let farKnee = null; let farAnkle = null;
  if (p.farHand) ({ mid: farElbow, end: farWrist } = ik(shoulder, p.farHand, SEG.uarm, SEG.farm, p.handBend === undefined ? 1 : p.handBend));
  if (p.farFoot) ({ mid: farKnee, end: farAnkle } = ik(hip, p.farFoot, SEG.thigh, SEG.shin, p.farFootBend === undefined ? -1 : p.farFootBend));
  return { hip, shoulder, headC, elbow, wrist, knee, ankle, toe, fist, farElbow, farWrist, farKnee, farAnkle };
}

/** Deux poses qui décrivent un membre différemment (cible / angles) : on convertit les angles en cible pour interpoler proprement. */
function unify(a, b) {
  if (!a.hip || !b.hip) return [a, b];
  let A = a;
  let B = b;
  for (const [target, angles, joint] of [['hand', 'arm', 'wrist'], ['foot', 'leg', 'ankle']]) {
    const has = p => p[target] || (target === 'hand' && p.handRel);
    if (has(A) && !has(B) && B[angles]) B = { ...B, [target]: solvePose(B)[joint] };
    if (has(B) && !has(A) && A[angles]) A = { ...A, [target]: solvePose(A)[joint] };
  }
  return [A, B];
}

const NUM_KEYS = ['torso', 'neck', 'toe', 'handBend', 'footBend', 'lift', 'c', 'hipY', 'flex', 'bend', 'twist'];
const lerp = (a, b, t) => a + (b - a) * t;
const lerpPt = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

/** Interpolation entre deux poses (mêmes types de champs : hand/arm, foot/leg). */
export function lerpPose(a0, b0, t) {
  const [a, b] = unify(a0, b0);
  const out = a.hip ? { hip: lerpPt(a.hip, b.hip, t) } : {};
  if (a.flat) out.flat = true;
  for (const k of NUM_KEYS) {
    if (a[k] !== undefined || b[k] !== undefined) {
      const zero = ['neck', 'toe', 'bend', 'lift', 'twist', 'flex'].includes(k); // absent de la pose = 0 (sinon un buste penché ne se redresserait jamais)
      const va = a[k] === undefined ? (zero ? 0 : b[k]) : a[k];
      const vb = b[k] === undefined ? (zero ? 0 : va) : b[k];
      out[k] = lerp(va, vb, t);
    }
  }
  for (const k of ['hand', 'handRel', 'foot', 'arm', 'leg', 'farHand', 'farFoot', 'knee', 'handL', 'footL', 'kneeL']) {
    const va = a[k] || b[k];
    let vb = b[k] || a[k];
    if (va && (k === 'arm' || k === 'leg')) vb = vb.map((x, i) => x + 360 * Math.round((va[i] - x) / 360)); // angles : chemin le plus court (évite le tour complet autour de ±180°)
    if (va) out[k] = lerpPt(va, vb, t);
  }
  // un membre décrit par cible (hand) dans une pose et par angles (arm) dans l'autre n'est pas supporté : rester cohérent
  return out;
}

export const easeInOut = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** Pose à l'instant `u` ∈ [0,1] d'une séquence de poses (aller simple, de la première à la dernière). */
export function poseAt(keys, u) {
  if (keys.length === 1) return keys[0];
  const x = Math.min(0.9999, Math.max(0, u)) * (keys.length - 1);
  const i = Math.floor(x);
  return lerpPose(keys[i], keys[i + 1], easeInOut(x - i));
}

/** Position de l'instant u de l'animation (0→1→0 en aller-retour, ou 0→1 en boucle). */
export function phaseToU(phase, loop) {
  const p = phase % 1;
  if (loop === 'cycle') return p;
  return p < 0.5 ? p * 2 : (1 - p) * 2; // aller-retour
}

/**
 * Rythme réaliste d'une répétition en aller-retour : la phase d'EFFORT (montée de la charge) est assez rapide (36 % du cycle),
 * la phase de CONTRÔLE (descente, retour) est lente (50 %), avec une courte pause (7 %) à chaque extrémité.
 * `eff` = 0 : l'effort est la 1re phase (clé 0 → clé 1) ; `eff` = 1 : l'effort est la 2e (squat, pompes, dips… : on descend d'abord).
 */
export const TEMPO = { fast: 0.36, slow: 0.5, pause: 0.07 };
const firstLen = eff => (eff ? TEMPO.slow : TEMPO.fast);
export function tempoU(phase, loop, eff = 0) {
  const p = phase % 1;
  if (loop === 'cycle') return p;
  const f = firstLen(eff);
  const s = eff ? TEMPO.fast : TEMPO.slow;
  if (p < f) return p / f;
  if (p < f + TEMPO.pause) return 1;
  if (p < f + TEMPO.pause + s) return 1 - (p - f - TEMPO.pause) / s;
  return 0;
}
/** Fin de la 1re phase (aller) dans le cycle, pour savoir quelle étiquette afficher. */
export const firstPhaseEnd = (eff = 0) => firstLen(eff) + TEMPO.pause;
/** Inverse approché pour la barre de position : u (0→1, aller) → phase. */
export const phaseOfU = (u, loop, eff = 0) => (loop === 'cycle' ? u * 0.999 : u * firstLen(eff));

/** Chemin (liste de points) suivi par une articulation (« wrist », « ankle », « hip », « knee »…) sur toute la séquence. */
export function tracePath(keys, joint = 'wrist', steps = 40) {
  const pts = [];
  for (let i = 0; i <= steps; i++) pts.push(solvePose(poseAt(keys, i / steps))[joint]);
  return pts;
}

// ---- vue de face ----
// pose = { c: x du centre, hipY, lift, hand:[x,y] (main droite, absolue ; la gauche est symétrique), handBend, foot:[x,y], footBend }
export const SHOULDER_HALF = 21;
export const HIP_HALF = 11;

export function solveFront(p) {
  const c = p.c;
  const hy = p.hipY;
  // bend : buste penché en avant (0 = droit, 1 = presque horizontal) : en vue de face les épaules descendent
  const sy = hy - SEG.torso * (1 - 0.75 * (p.bend || 0)) - (p.lift || 0);
  const th = ((p.twist || 0) * Math.PI) / 180;
  const shHalf = SHOULDER_HALF * Math.cos(th);
  const shift = Math.sin(th) * 7;
  const out = { c, hy, sy, shHalf, shift, headC: [c + shift * 0.8, sy - 17 * (1 - 0.4 * (p.bend || 0))] };
  for (const side of [1, -1]) {
    const shoulder = [c + side * shHalf + shift, sy + 4];
    const own = side === -1 ? { hand: p.handL, foot: p.footL, knee: p.kneeL } : {};
    const hand = own.hand ? own.hand : p.hand ? [c + side * (p.hand[0] - c), p.hand[1]] : [shoulder[0] + side * 4, shoulder[1] + 54];
    let a;
    if (p.arm && !own.hand) { // angles du bras droit ; la gauche est le miroir (0° = vers l'extérieur, 90° = vers le bas)
      const el = [shoulder[0] + side * Math.cos(rad(p.arm[0])) * SEG.uarm, shoulder[1] + Math.sin(rad(p.arm[0])) * SEG.uarm];
      a = { mid: el, end: [el[0] + side * Math.cos(rad(p.arm[1])) * SEG.farm, el[1] + Math.sin(rad(p.arm[1])) * SEG.farm] };
    } else {
      a = ik(shoulder, hand, SEG.uarm, SEG.farm, side * (p.handBend === undefined ? 1 : p.handBend));
      const line = [(shoulder[0] + a.end[0]) / 2, (shoulder[1] + a.end[1]) / 2];
      // De face, un bras plié vers l'avant se voit raccourci : le coude reste près de la ligne épaule-main (jamais en travers du buste)
      if (p.flat) a = { mid: line, end: a.end };
      else if (a.end[1] > shoulder[1]) a = { mid: [line[0] + Math.max(0, Math.min(10, Math.abs(a.mid[0] - line[0]))) * side, a.mid[1]], end: a.end };
    }
    const hip = [c + side * HIP_HALF, hy];
    const foot = own.foot ? own.foot : p.foot ? [c + side * (p.foot[0] - c), p.foot[1]] : [hip[0] + side * 2, GROUND - 6];
    let l = ik(hip, foot, SEG.thigh, SEG.shin, side * (p.footBend === undefined ? -1 : p.footBend));
    if (l.end[1] > hip[1] + 40) { const mx = (hip[0] + l.end[0]) / 2; l = { mid: [mx + Math.min(3, Math.abs(l.mid[0] - mx)) * side, l.mid[1]], end: l.end }; } // jambe presque tendue : pas de genoux arqués
    if (own.knee || p.knee) { // assis : cuisse vers le genou, tibia vertical
      const kn = own.knee ? own.knee : [c + side * (p.knee[0] - c), p.knee[1]];
      l = { mid: kn, end: own.foot || p.foot ? foot : [kn[0], kn[1] + SEG.shin] }; // sans pied donné : tibia vertical
    }
    out[side === 1 ? 'R' : 'L'] = { shoulder, elbow: a.mid, wrist: a.end, hip, knee: l.mid, ankle: l.end };
  }
  return out;
}

/** Trajets des deux mains (ou chevilles) en vue de face. */
export function traceFront(keys, joint = 'wrist', steps = 40) {
  const R = [];
  const L = [];
  for (let i = 0; i <= steps; i++) {
    const f = solveFront(poseAt(keys, i / steps));
    R.push(f.R[joint]);
    L.push(f.L[joint]);
  }
  return [R, L];
}

/**
 * Vue de DESSUS (le bonhomme regarde vers le haut de l'écran) : bassin fixe, épaules qui tournent de `twist` degrés (sens horaire), tête, bras.
 * Pose : { c, hipY, twist, hand: [x, y] (main droite, absolue), handL? (sinon miroir), handBend? }.
 */
export function solveTop(p) {
  const th = rad(p.twist || 0);
  const s0 = [p.c, p.hipY - 4];
  const dir = [Math.cos(th), Math.sin(th)];
  const shR = [s0[0] + dir[0] * 20, s0[1] + dir[1] * 20];
  const shL = [s0[0] - dir[0] * 20, s0[1] - dir[1] * 20];
  const handR = p.hand;
  const handL = p.handL || [2 * p.c - p.hand[0], p.hand[1]];
  const b = p.handBend === undefined ? 1 : p.handBend;
  const aR = ik(shR, handR, SEG.uarm, SEG.farm, b);
  const aL = ik(shL, handL, SEG.uarm, SEG.farm, -b);
  return {
    c: p.c, y: p.hipY, s0, head: [s0[0] + Math.sin(th) * 5, s0[1] - Math.cos(th) * 5],
    hipR: [p.c + 13, p.hipY + 8], hipL: [p.c - 13, p.hipY + 8], wrist: aR.end, shoulder: shR,
    R: { shoulder: shR, elbow: aR.mid, wrist: aR.end }, L: { shoulder: shL, elbow: aL.mid, wrist: aL.end },
  };
}

export function traceTop(keys, steps = 40) {
  const R = [];
  const L = [];
  for (let i = 0; i <= steps; i++) {
    const t = solveTop(poseAt(keys, i / steps));
    R.push(t.R.wrist);
    L.push(t.L.wrist);
  }
  return [R, L];
}

/** Effort des muscles (0 à 1) à cet instant du cycle : fort à l'effort, modéré au retour, faible en bas. Donne l'intensité du rouge. */
export function effortAt(phase, loop, eff = 0, hold = false) {
  if (hold || loop === 'cycle') return 0.8;
  const p = phase % 1;
  const f = firstLen(eff);
  const s = eff ? TEMPO.fast : TEMPO.slow;
  if (p < f) return eff ? 0.5 : 0.75 + 0.25 * Math.sin((Math.PI * p) / f);
  if (p < f + TEMPO.pause) return 0.75;
  if (p < f + TEMPO.pause + s) { const k = (p - f - TEMPO.pause) / s; return eff ? 0.75 + 0.25 * Math.sin(Math.PI * k) : 0.55 - 0.25 * k; }
  return 0.25;
}
