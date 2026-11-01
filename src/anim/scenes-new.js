import { dips } from './scenes-push';
import { ANKLE_Y, G, P, cable, db, handle, horn, lever, line, pad, plates, pt, pulley, rect, shoulderOf, txt } from './kit';

const C = 160;
const seatFront = (hy = 150) => [pad([C - 30, hy + 8], [C + 30, hy + 8], 10), line([C, hy + 14], [C, G - 4], 4, '#334155'), rect(C - 50, G - 6, 100, 6, '#334155', 2)];
const seatSide = (hip, backLen = 66) => [
  pad([hip[0] - 14, hip[1] + 6], [hip[0] + 36, hip[1] + 6], 10),
  pad([hip[0] - 14, hip[1] + 4], [hip[0] - 14, hip[1] - backLen], 10),
  line([hip[0] + 4, hip[1] + 12], [hip[0] + 4, G - 4], 4, '#334155'),
  rect(hip[0] - 30, G - 6, 100, 6, '#334155', 2),
];

// ---------------- Rotary Torso : rotation du buste assis (vue de face) ----------------
export function rotaryTorso() {
  const hy = 150;
  const mk = twist => ({ c: C, hipY: hy, twist, knee: [C + 18, hy + 6], hand: [C + 8 + twist * 0.25, 120], handL: [C - 8 + twist * 0.25, 122], handBend: 1 });
  return {
    view: 'front', trace: 'wrist', loop: 'pingpong', keys: [mk(-48), mk(48)],
    equip: [...seatFront(hy), pad([C - 34, 156], [C + 34, 156], 6, true), pad([C - 36, 108], [C - 36, 138], 7, true), pad([C + 36, 108], [C + 36, 138], 7, true), plates(36, 40, 18, 100, 3), txt([C - 60, -6], 'on tourne le buste, bassin et genoux fixes', 8, '#94a3b8')],
    follow: [],
  };
}

// ---------------- Pull-over machine (coudes sur les coussins) ----------------
export function pulloverMachine() {
  const hip = [176, 152];
  const torso = -100;
  const sh = shoulderOf(hip, torso);
  const c = { torso, foot: [214, ANKLE_Y], footBend: -1 };
  return {
    keys: [P(hip, torso, { ...c, arm: [-112, -112] }), P(hip, torso, { ...c, arm: [58, 58] })], trace: 'elbow', loop: 'pingpong',
    equip: [...seatSide(hip, 70), plates(86, 40, 18, 100, 3)],
    follow: [{ k: 'padAt', at: 'elbow', dx: -6, dy: -5, w: 12, h: 12 }, lever([sh[0] - 40, sh[1] - 40], 'elbow', 5)],
  };
}

// ---------------- High row iso-latéral (tirage haut, à plaques) ----------------
export function highRow() {
  const hip = [168, 152];
  const torso = -92;
  const sh = shoulderOf(hip, torso);
  const c = { torso, foot: [206, ANKLE_Y], footBend: -1, handBend: 1 };
  return {
    keys: [P(hip, torso, { ...c, hand: pt(sh, 44, -32) }), P(hip, torso, { ...c, hand: pt(sh, 10, 14) })], trace: 'wrist', loop: 'pingpong',
    equip: [...seatSide(hip, 40), pad([sh[0] + 14, sh[1] - 6], [sh[0] + 14, sh[1] + 40], 10, true), ...horn(hip[0] + 62, sh[1] - 76), line([hip[0] + 62, sh[1] - 76], [hip[0] + 62, sh[1] - 80], 2)],
    follow: [lever([hip[0] + 70, sh[1] - 74], 'wrist', 7), handle('wrist')],
  };
}

// ---------------- Développé décliné machine (iso-latéral) ----------------
export function declineMachine() {
  const hip = [176, 152];
  const torso = -82;
  const sh = shoulderOf(hip, torso);
  const c = { torso, foot: [214, ANKLE_Y], footBend: -1, handBend: 1 };
  return {
    keys: [P(hip, torso, { ...c, hand: pt(sh, 15, 14) }), P(hip, torso, { ...c, hand: pt(sh, 46, 26) })], trace: 'wrist', loop: 'pingpong',
    equip: [...seatSide(hip, 62), ...horn(hip[0] - 86, sh[1] + 14)],
    follow: [lever([hip[0] - 14, sh[1] + 16], 'wrist', 8), handle('wrist')],
  };
}

// ---------------- Dips assistés (machine à contrepoids) ----------------
export function assistedDip() {
  const base = dips({});
  return {
    ...base,
    equip: [...base.equip, plates(236, 40, 18, 110, 5), rect(228, G - 6, 40, 6, '#334155', 2)],
    follow: [{ k: 'padAt', at: 'knee', dx: -4, dy: 6, w: 24, h: 6 }, cable([245, 40], 'knee')],
  };
}

// ---------------- Shrug machine (vue de face, poignées sur les côtés) ----------------
export function shrugMachine() {
  const mk = lift => ({ c: C, hipY: 112, lift, hand: [C + 24, 118 - lift], handBend: 1 });
  return {
    view: 'front', keys: [mk(0), mk(14)], trace: false, loop: 'pingpong',
    equip: [rect(C - 62, G - 6, 124, 6, '#334155', 2), line([C - 44, 110], [C - 44, G], 4), line([C + 44, 110], [C + 44, G], 4), ...horn(C + 52, 150)],
    follow: [{ k: 'handle', at: 'wrist' }],
  };
}

// ---------------- Leg curl debout (une jambe à la fois) ----------------
export function standingLegCurl() {
  const hip = [150, 108];
  const sh = shoulderOf(hip, -80);
  const c = { torso: -80, farFoot: [150, ANKLE_Y], hand: pt(sh, 16, 30), handBend: 1 };
  return {
    keys: [P([hip[0], hip[1] - 2], -80, { ...c, leg: [92, 92], toe: 20 }), P([hip[0], hip[1] - 2], -80, { ...c, leg: [92, 172], toe: 110 })], trace: 'ankle', loop: 'pingpong',
    equip: [pad([hip[0] + 8, sh[1] + 6], [hip[0] + 40, sh[1] + 40], 10, true), line([hip[0] + 30, sh[1] + 44], [hip[0] + 30, G], 4, '#334155'), rect(hip[0] - 40, G - 6, 120, 6, '#334155', 2), plates(236, 60, 18, 110, 3)],
    follow: [{ k: 'padAt', at: 'ankle', dx: -10, dy: -14, w: 12, h: 12 }],
  };
}

// ---------------- Belt squat (ceinture sur les hanches, charge sous la plateforme) ----------------
export function beltSquat() {
  const mk = (hip, torso) => P(hip, torso, { foot: [150, ANKLE_Y - 8], footBend: -1, hand: [hip[0] + 24, hip[1] - 4], handBend: 1 });
  return {
    keys: [mk([150, 104], -90), mk([138, 146], -82)], trace: 'hip', loop: 'pingpong',
    equip: [rect(100, G - 14, 100, 14, '#334155', 3), line([220, 40], [220, G - 14], 4), pad([208, 40], [236, 40], 6, true), ...horn(236, G - 30)],
    follow: [{ k: 'padAt', at: 'hip', dx: -8, dy: -4, w: 16, h: 8 }, cable([150, G - 14], 'hip', '3 3')],
  };
}

// ---------------- Soulevé de terre machine (leviers à plaques) ----------------
export function deadliftMachine() {
  const top = P([150, 112], -90, { foot: [150, ANKLE_Y], footBend: -1, handRel: [8, 54], handBend: 1 });
  const bottom = P([124, 160], -48, { foot: [150, ANKLE_Y], footBend: -1, handRel: [4, 52], handBend: 1 });
  return {
    keys: [bottom, top], trace: 'wrist', loop: 'pingpong',
    equip: [rect(96, G - 8, 110, 8, '#334155', 3), ...horn(30, 168)],
    follow: [lever([60, 168], 'wrist', 6), handle('wrist')],
  };
}

// ---------------- Bûcheron à la poulie (diagonale haute → basse) ----------------
export function woodchop() {
  const hip = [150, 111];
  const sh = shoulderOf(hip, -90);
  const c = { torso: -90, foot: [150, ANKLE_Y], footBend: -1, handBend: 1 };
  return {
    keys: [P(hip, -90, { torso: -90, foot: c.foot, footBend: -1, arm: [-50, -50] }), P(hip, -90, { torso: -90, foot: c.foot, footBend: -1, arm: [95, 85] })], trace: 'wrist', loop: 'pingpong',
    equip: [line([262, -14], [262, G], 4), pulley([262, -14], 6), plates(268, 10, 18, 140, 3), rect(240, G - 6, 70, 6, '#334155', 2), txt([96, -6], 'tourne le buste en même temps', 8, '#94a3b8')],
    follow: [cable([262, -14], 'wrist'), handle('wrist')],
  };
}

// ---------------- Pallof press (anti-rotation, poulie à hauteur de poitrine) ----------------
export function pallof() {
  const hip = [150, 111];
  const sh = shoulderOf(hip, -90);
  const c = { torso: -90, foot: [150, ANKLE_Y], footBend: -1, handBend: 1 };
  return {
    keys: [P(hip, -90, { ...c, hand: pt(sh, 16, 22) }), P(hip, -90, { ...c, hand: pt(sh, 54, 8) })], trace: 'wrist', loop: 'pingpong', hold: false,
    equip: [rect(120, G - 6, 70, 6, '#334155', 2), txt([40, -6], 'câble perpendiculaire (sur le côté) : le buste résiste à la rotation', 8, '#94a3b8'), line([150, sh[1] + 14], [150, sh[1] + 14], 2)],
    follow: [handle('wrist'), { k: 'cable', from: [150, sh[1] + 14], at: 'wrist', dash: '2 3' }],
  };
}
void db;

// Bûcheron : vue de face (diagonale du haut à droite vers le bas à gauche, le buste suit)
export function woodchopFront() {
  const mk = (x, y, tw, xl, yl) => ({ c: C, hipY: 112, twist: tw, foot: [C + 14, 194], hand: [C + x, y], handL: [C + xl, yl], handBend: 1 });
  return {
    view: 'front', trace: 'wrist', loop: 'pingpong', keys: [mk(46, 36, 30, 34, 48), mk(4, 116, -30, -4, 118)],
    equip: [rect(C - 40, G - 6, 80, 6, '#334155', 2), line([C + 96, -14], [C + 96, G], 4), pulley([C + 96, -14], 6)],
    follow: [{ k: 'handle', at: 'wrist', side: 'R' }, { k: 'cable', from: [C + 96, -14], at: 'wrist', side: 'R', dash: '3 3' }],
  };
}
