import { ANKLE_Y, G, P, horn, cable, db, handle, lever, line, pad, plate, plates, pt, pulley, rect, shoulderOf } from './kit';

const standPose = (o = {}) => ({ torso: -90, foot: [150, ANKLE_Y], footBend: -1, ...o });
const HIP = [150, 111];
const machineSeat = (hip, back = 66) => [
  pad([hip[0] - 14, hip[1] + 6], [hip[0] + 36, hip[1] + 6], 10),
  pad([hip[0] - 14, hip[1] + 4], [hip[0] - 14, hip[1] - back], 10),
  line([hip[0] + 4, hip[1] + 12], [hip[0] + 4, G - 4], 4, '#334155'),
  rect(hip[0] - 30, G - 6, 100, 6, '#334155', 2),
];

// ---------------- Développés épaules ----------------
export function overheadPress({ tool = 'barbell' }) {
  if (tool === 'machine' || tool === 'hammer') {
    const hip = [176, 152];
    const sh = shoulderOf(hip, -92);
    const c = { torso: -92, foot: [214, ANKLE_Y], footBend: -1, handBend: 1 };
    const keys = [P(hip, -92, { ...c, hand: pt(sh, 16, -4) }), P(hip, -92, { ...c, hand: pt(sh, 8, -52) })];
    return {
      keys, trace: 'wrist', loop: 'pingpong',
      equip: [...machineSeat(hip, 70), ...(tool === 'hammer' ? horn(hip[0] + 46, sh[1] - 4) : [plates(90, 40, 18, 100, 4)])],
      follow: [lever([hip[0] + 40, sh[1] - 4], 'wrist', tool === 'hammer' ? 8 : 5), handle('wrist')],
    };
  }
  if (tool === 'db' || tool === 'arnold') {
    const hip = [170, 144];
    const sh = shoulderOf(hip, -92);
    const c = { torso: -92, foot: [206, ANKLE_Y], footBend: -1, handBend: 1 };
    const end = P(hip, -92, { ...c, hand: pt(sh, 6, -53) });
    const keys = tool === 'arnold'
      ? [P(hip, -92, { ...c, hand: pt(sh, 24, -2) }), P(hip, -92, { ...c, hand: pt(sh, 22, -30) }), end]
      : [P(hip, -92, { ...c, hand: pt(sh, 13, -6) }), end];
    return {
      keys, trace: 'wrist', loop: 'pingpong',
      equip: [pad([hip[0] - 14, hip[1] + 8], [hip[0] + 34, hip[1] + 8], 10), pad([hip[0] - 14, hip[1] + 6], [hip[0] - 16, hip[1] - 70], 10), line([hip[0] - 4, hip[1] + 14], [hip[0] - 4, G], 3), line([hip[0] + 26, hip[1] + 14], [hip[0] + 26, G], 3)],
      follow: [db('wrist', 9)],
    };
  }
  // barre debout (ou Smith)
  const sh0 = shoulderOf(HIP, -90);
  const cc = standPose({ handBend: 1 });
  const keys = [P(HIP, -90, { ...cc, hand: pt(sh0, 12, -4) }), P(HIP, -90, { ...cc, hand: pt(sh0, 4, -54) })];
  const eq = tool === 'smith'
    ? [line([128, -20], [128, G], 3), line([178, -20], [178, G], 3), line([128, -22], [178, -22], 3)]
    : [line([100, 20], [100, G], 4), line([100, 40], [114, 40], 3, '#94a3b8')];
  return { keys, trace: 'wrist', loop: 'pingpong', equip: eq, follow: [plate('wrist', 12)] };
}

// ---------------- Élévations latérales (vue de face) ----------------
export function lateralRaise({ tool = 'db' }) {
  const c = 160;
  const hy = 112;
  const sy = hy - 52;
  const down = { c, hipY: hy, hand: [c + 27, hy + 8], handBend: -1 };
  const up = { c, hipY: hy, hand: [c + 70, sy + 6], handBend: -1 };
  const eq = [];
  const fol = [];
  if (tool === 'cable') {
    eq.push(pulley([c + 66, 192], 6), plates(262, 60, 18, 110, 3), pulley([c - 66, 192], 6), plates(40, 60, 18, 110, 3));
    fol.push({ k: 'cable', from: [c + 66, 192], at: 'wrist' }, handle('wrist'));
  } else if (tool === 'machine') {
    eq.push(pad([c - 34, 142], [c + 34, 142], 9), line([c, 148], [c, G - 4], 4, '#334155'), rect(c - 40, G - 6, 80, 6, '#334155', 2));
    fol.push({ k: 'padAt', at: 'elbow', dx: -4, dy: -3, w: 10, h: 8 }, handle('wrist'));
  } else fol.push(db('wrist', 8));
  return { view: 'front', keys: [down, up], trace: 'wrist', loop: 'pingpong', equip: eq, follow: fol };
}

// ---------------- Élévations frontales ----------------
export function frontRaise() {
  return {
    keys: [P(HIP, -90, standPose({ arm: [88, 88] })), P(HIP, -90, standPose({ arm: [-6, -6] }))],
    trace: 'wrist', loop: 'pingpong', equip: [], follow: [db('wrist', 9)],
  };
}

// ---------------- Oiseau (deltoïdes postérieurs) ----------------
export function rearFly({ machine = false }) {
  const c = 160;
  if (machine) {
    // reverse pec deck : assis face à la machine, bras horizontaux qui s'ouvrent
    const hy = 150;
    const sy = hy - 52;
    const closed = { c, hipY: hy, flat: true, hand: [c + 16, sy + 8], knee: [c + 20, hy + 6] };
    const open = { c, hipY: hy, flat: true, hand: [c + 70, sy + 6], knee: [c + 20, hy + 6] };
    return {
      view: 'front', keys: [closed, open], trace: 'wrist', loop: 'pingpong',
      equip: [pad([c - 30, hy + 10], [c + 30, hy + 10], 10), line([c, hy + 14], [c, G - 4], 4, '#334155'), rect(c - 40, G - 6, 80, 6, '#334155', 2), pad([c - 18, sy + 18], [c + 18, sy + 18], 9, true), plates(40, 60, 18, 100, 3)],
      follow: [handle('wrist')],
    };
  }
  const hy = 112;
  return {
    view: 'front', keys: [{ c, hipY: hy, bend: 1, hand: [c + 26, hy - 13 + 60], handBend: -1 }, { c, hipY: hy, bend: 1, hand: [c + 72, hy - 13 + 12], handBend: -1 }],
    trace: 'wrist', loop: 'pingpong', equip: [], follow: [db('wrist', 8)],
  };
}

// ---------------- Face pull ----------------
export function facePull() {
  const hip = HIP;
  const sh = shoulderOf(hip, -90);
  const c = standPose({ handBend: 1 });
  return {
    keys: [P(hip, -90, { ...c, hand: pt(sh, 54, 2) }), P(hip, -90, { ...c, hand: pt(sh, 10, -12), handBend: 1 })],
    trace: 'wrist', loop: 'pingpong',
    equip: [line([262, sh[1] - 4], [262, G], 4), pulley([262, sh[1] - 4], 6), plates(266, 60, 18, 120, 3), rect(240, G - 6, 70, 6, '#334155', 2)],
    follow: [cable([262, sh[1] - 4], 'wrist'), handle('wrist')],
  };
}

// ---------------- Tirage menton ----------------
export function uprightRow() {
  const sh = shoulderOf(HIP, -90);
  const c = standPose({ handBend: -1 });
  return {
    keys: [P(HIP, -90, { ...c, hand: pt(sh, 8, 52) }), P(HIP, -90, { ...c, hand: pt(sh, 14, 6) })],
    trace: 'wrist', loop: 'pingpong', equip: [], follow: [plate('wrist', 10)],
  };
}

// ---------------- Rotation externe (coiffe), vue de face ----------------
export function externalRotation() {
  const c = 160;
  const hy = 112;
  const sy = hy - 52;
  const inside = { c, hipY: hy, hand: [c + 4, sy + 36], handBend: -1 };
  const outside = { c, hipY: hy, hand: [c + 52, sy + 36], handBend: -1 };
  return {
    view: 'front', keys: [inside, outside], trace: 'wrist', loop: 'pingpong',
    equip: [pulley([c - 80, sy + 36], 6), line([c - 80, sy + 36], [c - 80, G], 4), plates(40, 60, 18, 110, 3)],
    follow: [handle('wrist')],
  };
}
void rect;
