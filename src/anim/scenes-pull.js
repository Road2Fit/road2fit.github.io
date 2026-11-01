import { SEG, ik } from './skeleton';
import { ANKLE_Y, G, P, horn, cable, db, flatBench, handle, lever, line, pad, plate, plates, pt, pulley, rect, shoulderOf } from './kit';

const rad = d => (d * Math.PI) / 180;
const hipFor = (sh, torso) => [sh[0] - SEG.torso * Math.cos(rad(torso)), sh[1] - SEG.torso * Math.sin(rad(torso))];

/** Corps tendu entre une cheville et une épaule (pompes, rowing inversé, planche…) : renvoie hanche + angles. */
export function plank(ankle, shoulder, o = {}) {
  const { mid: hip, end } = ik(ankle, shoulder, 84, 52, -1); // hanche au-dessus de la ligne si le corps est un peu « trop court »
  const t = (Math.atan2(end[1] - hip[1], end[0] - hip[0]) * 180) / Math.PI;
  const back = (Math.atan2(ankle[1] - hip[1], ankle[0] - hip[0]) * 180) / Math.PI;
  return P(hip, t, { leg: [back, back], toe: 75, ...o });
}

/** Abscisse de l'épaule pour que le corps (cheville → épaule) mesure `chord` à la hauteur donnée. */
export const shoulderXFor = (ankle, shoulderY, chord = 134) => ankle[0] + Math.sqrt(Math.max(0, chord * chord - (shoulderY - ankle[1]) ** 2));

// ---------------- Tractions (pronation / supination / assistée / suspension) ----------------
export function pullUp({ grip = 'pro', assisted = false, hang = false }) {
  // barre assez haute pour que les pieds ne touchent jamais le sol ; en montant, les épaules reculent et le buste s'incline pour que la tête passe la barre
  const barY = -14;
  const hx = 152;
  const mk = (sh, torso) => P(hipFor(sh, torso), torso, { hand: [hx, barY], handBend: 1, leg: [92, 112], toe: 60 });
  void grip;
  const bend = 1;
  const hangPose = mk([hx - 2, barY + 53], -92);
  const topPose = mk([hx - 22, barY + 12], -108);
  const eq = [line([hx - 40, barY], [hx + 40, barY], 4), line([hx - 40, barY], [hx - 40, G], 4), line([hx + 40, barY], [hx + 40, G], 4)];
  const fol = [];
  if (assisted) {
    eq.push(plates(236, 40, 18, 110, 5), rect(228, G - 6, 40, 6, '#334155', 2));
    fol.push({ k: 'padAt', at: 'knee', dx: 2, dy: 8, w: 24, h: 6 }, { k: 'cable', from: [245, 40], at: 'knee' });
  }
  if (hang) {
    const slight = P(hangPose.hip, -92, { hand: [hx, barY], handBend: bend, leg: [92, 112], toe: 60, lift: 0 });
    const active = P([hangPose.hip[0], hangPose.hip[1] - 4], -92, { hand: [hx, barY], handBend: bend, leg: [92, 112], toe: 60, lift: 4 });
    return { keys: [slight, active], trace: 'shoulder', loop: 'pingpong', equip: eq, follow: fol, hold: true };
  }
  return { keys: [hangPose, topPose], trace: 'shoulder', loop: 'pingpong', equip: eq, follow: fol };
}

// ---------------- Tirages verticaux (poulie / machines) ----------------
export function pulldown({ close = false, hammer = false, machine = false }) {
  const hip = [180, 152];
  const torso = -100;
  const sh = shoulderOf(hip, torso);
  const c = { torso, foot: [214, ANKLE_Y], footBend: -1, handBend: 1 };
  const upH = pt(sh, close ? 8 : 4, -52);
  const downH = pt(sh, close ? 12 : 16, close ? 12 : 8);
  const keys = [P(hip, torso, { ...c, hand: upH }), P([hip[0], hip[1]], -108, { ...c, torso: -108, hand: pt(shoulderOf(hip, -108), close ? 12 : 16, close ? 12 : 8) })];
  void downH;
  const eq = [
    pad([hip[0] - 14, hip[1] + 6], [hip[0] + 30, hip[1] + 6], 10),
    pad([hip[0] + 6, hip[1] - 22], [hip[0] + 40, hip[1] - 22], 8), // cale-cuisses
    line([hip[0] + 4, hip[1] + 12], [hip[0] + 4, G - 4], 4, '#334155'),
    rect(hip[0] - 30, G - 6, 100, 6, '#334155', 2),
  ];
  const fol = [];
  if (!hammer) eq.push(plates(90, -4, 18, 120, 4));
  if (hammer) eq.push(...horn(hip[0] + 66, -6));
  if (machine || hammer) {
    eq.push(line([100, -12], [hip[0] + 60, -12], 3));
    fol.push(lever([hip[0] + 56, -6], 'wrist', hammer ? 8 : 6), handle('wrist'));
  } else {
    eq.push(line([100, -12], [hip[0] - 4, -12], 3), pulley([hip[0] - 4, -12], 6));
    fol.push(cable([hip[0] - 4, -12], 'wrist'), handle('wrist'));
  }
  return { keys, trace: 'wrist', loop: 'pingpong', equip: eq, follow: fol };
}

// ---------------- Rowings ----------------
export function barbellRow({ tbar = false }) {
  // fesses en arrière : la barre reste au-dessus du milieu du pied
  const hip = [112, 122];
  const torso = -32;
  const sh = shoulderOf(hip, torso);
  const c = { torso, foot: [146, ANKLE_Y], footBend: -1, handBend: 1 };
  const hang = P(hip, torso, { ...c, hand: pt(sh, 3, 53) });
  const pull = P(hip, torso, { ...c, hand: pt(sh, -4, 30) });
  const eq = tbar ? [line([150, G - 12], [212, G - 12], 3), rect(196, G - 14, 18, 14, '#475569', 2)] : [];
  return { keys: [hang, pull], trace: 'wrist', loop: 'pingpong', equip: eq, follow: [plate('wrist', tbar ? 10 : 13)] };
}

export function dbRow() {
  const hip = [126, 108];
  const torso = -12;
  const sh = shoulderOf(hip, torso);
  const c = { torso, foot: [118, ANKLE_Y], footBend: -1, handBend: 1 };
  const down = P(hip, torso, { ...c, hand: pt(sh, 2, 53) });
  const up = P(hip, torso, { ...c, hand: pt(sh, -10, 20) });
  return {
    keys: [down, up], trace: 'wrist', loop: 'pingpong',
    equip: [pad([166, 132], [236, 132], 9), line([176, 137], [176, G], 3), line([226, 137], [226, G], 3)],
    follow: [db('wrist', 9)], farHand: [188, 124],
  };
}

export function seatedRow({ machine = false, hammer = false }) {
  const hip = [136, 152];
  const mk = torso => {
    const sh = shoulderOf(hip, torso);
    return { torso, sh };
  };
  const a = mk(-78);
  const b = mk(-98);
  const c = { foot: [214, 164], footBend: -1, handBend: 1 };
  const start = P(hip, -78, { ...c, torso: -78, hand: pt(a.sh, 52, 8) });
  const end = P(hip, -98, { ...c, torso: -98, hand: pt(b.sh, 14, 36) });
  const eq = [pad([hip[0] - 18, hip[1] + 6], [hip[0] + 28, hip[1] + 6], 10), rect(hip[0] - 34, G - 6, 90, 6, '#334155', 2), line([hip[0], hip[1] + 12], [hip[0], G - 4], 4, '#334155'), rect(204, 168, 30, 32, '#334155', 3)];
  const fol = [];
  if (machine || hammer) {
    eq.push(pad([hip[0] + 52, hip[1] - 52], [hip[0] + 52, hip[1] + 4], 10));
    if (hammer) eq.push(...horn(hip[0] + 74, hip[1] + 2));
    else eq.push(plates(250, 60, 18, 110, 3), line([259, 60], [259, 30], 2, '#cbd5e1'));
    fol.push(lever([hip[0] + 70, hip[1] - 6], 'wrist', hammer ? 8 : 5), handle('wrist'));
  } else {
    eq.push(plates(262, 60, 18, 110, 3), pulley([252, 176], 5));
    fol.push(cable([252, 176], 'wrist'), handle('wrist'));
  }
  return { keys: [start, end], trace: 'wrist', loop: 'pingpong', equip: eq, follow: fol };
}

export function invertedRow() {
  const barY = 110;
  const ankle = [78, 190];
  const barX = shoulderXFor(ankle, 160) - 2;
  const mk = shY => plank(ankle, [shoulderXFor(ankle, shY), shY], { hand: [barX, barY], handBend: -1, toe: -50 });
  return {
    supine: true, keys: [mk(160), mk(128)], trace: 'shoulder', loop: 'pingpong',
    equip: [line([barX - 20, barY], [barX + 20, barY], 4), line([barX - 20, barY], [barX - 20, G], 4), line([barX + 20, barY], [barX + 20, G], 4)],
    follow: [],
  };
}

// ---------------- Lombaires ----------------
export function backExtension({ machine = false, floor = false }) {
  if (floor) {
    // superman : à plat ventre, bras et jambes se lèvent
    const rest = P([146, 188], -2, { leg: [180, 180], toe: 90, arm: [0, 0] });
    const lift = P([146, 188], -12, { leg: [190, 190], toe: 70, arm: [-8, -14], neck: -14 });
    return { keys: [rest, lift], trace: 'wrist', loop: 'pingpong', equip: [rect(40, 192, 240, 8, '#334155', 3)], follow: [], hold: true };
  }
  if (machine) {
    const hip = [176, 152];
    const mk = torso => P(hip, torso, { foot: [214, ANKLE_Y], footBend: -1, hand: pt(shoulderOf(hip, torso), 8, 14), handBend: 1 });
    return {
      keys: [mk(-68), mk(-108)], trace: 'shoulder', loop: 'pingpong',
      equip: [pad([hip[0] - 14, hip[1] + 6], [hip[0] + 36, hip[1] + 6], 10), line([hip[0] + 4, hip[1] + 12], [hip[0] + 4, G - 4], 4, '#334155'), rect(hip[0] - 30, G - 6, 100, 6, '#334155', 2), plates(90, 40, 18, 100, 3), pad([hip[0] + 24, hip[1] - 20], [hip[0] + 24, hip[1] + 2], 8, true)],
      follow: [{ k: 'padAt', at: 'shoulder', dx: -14, dy: -6, w: 8, h: 26 }],
    };
  }
  // banc à 45° : pieds EN BAS sur la plateforme, hanches en haut sur le coussin, face vers le bas ; le buste part vers le sol et remonte dans l'alignement des jambes
  const hip = [140, 96];
  const leg = 135;
  const ankle = [hip[0] + 84 * Math.cos(rad(leg)), hip[1] + 84 * Math.sin(rad(leg))];
  const n = [Math.SQRT1_2, Math.SQRT1_2]; // côté du ventre
  const mk = torso => {
    const sh = shoulderOf(hip, torso);
    const a = rad(torso);
    return P(hip, torso, { leg: [leg, leg], toe: 45, hand: [sh[0] - Math.cos(a) * 14 - Math.sin(a) * 9, sh[1] - Math.sin(a) * 14 + Math.cos(a) * 9], handBend: 1 });
  };
  const padA = [hip[0] - 34 + n[0] * 11, hip[1] + 34 + n[1] * 11];
  const padB = [hip[0] - 2 + n[0] * 11, hip[1] + 2 + n[1] * 11];
  return {
    keys: [mk(78), mk(-45)], trace: 'shoulder', loop: 'pingpong',
    equip: [
      pad(padA, padB, 10), line(padA, [padA[0], G], 4),
      { k: 'circle', c: [ankle[0] - n[0] * 9, ankle[1] - n[1] * 9], r: 5, fill: '#7b8492', stroke: '#6b7280', w: 1 }, // boudin derrière les chevilles
      line([ankle[0] + 2, ankle[1] + 14], [ankle[0] + 24, ankle[1] + 14], 5), line([ankle[0] + 8, ankle[1] + 14], [ankle[0] + 8, G], 4), // plateforme des pieds
    ],
    follow: [],
  };
}

// ---------------- Shrugs (haussements d'épaules), vue de face ----------------
export function shrugs({ bar = false }) {
  const c = 160;
  const mk = lift => ({ c, hipY: 112, lift, hand: [c + 24, 112 - 52 - lift + 4 + 54], handBend: 1 });
  return {
    view: 'front', keys: [mk(0), mk(18)], trace: 'shoulder', loop: 'pingpong',
    equip: [],
    follow: bar ? [{ k: 'hbar', at: 'wrist', ext: 16, r: 11 }] : [{ k: 'db', at: 'wrist', r: 8 }],
  };
}
void db; void flatBench; void line;
