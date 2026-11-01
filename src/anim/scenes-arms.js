import { ANKLE_Y, G, P, cable, db, flatBench, handle, inclineBench, lever, line, pad, plate, plates, pt, pulley, rect, shoulderOf } from './kit';

const HIP = [150, 111];
const stand = (o = {}) => ({ torso: -90, foot: [150, ANKLE_Y], footBend: -1, ...o });
const seatBase = (hip, backLen = 66) => [
  pad([hip[0] - 14, hip[1] + 6], [hip[0] + 36, hip[1] + 6], 10),
  pad([hip[0] - 14, hip[1] + 4], [hip[0] - 14, hip[1] - backLen], 10),
  line([hip[0] + 4, hip[1] + 12], [hip[0] + 4, G - 4], 4, '#334155'),
  rect(hip[0] - 30, G - 6, 100, 6, '#334155', 2),
];

// ---------------- Curls ----------------
// tool : barbell | db | hammer | cable | incline | concentration | preacher | preacherMachine | machine
export function curl({ tool = 'barbell' }) {
  if (tool === 'incline') {
    const hip = [200, 140]; // assis CONTRE le dossier, pas dedans
    const c = { torso: 240, foot: [240, ANKLE_Y], footBend: -1 };
    return {
      keys: [P(hip, 240, { ...c, arm: [92, 92] }), P(hip, 240, { ...c, arm: [88, -50] })], trace: 'wrist', loop: 'pingpong',
      equip: inclineBench([194, 152], 60, 80, 34, 152), follow: [db('wrist', 8)],
    };
  }
  if (tool === 'concentration') {
    const hip = [140, 136];
    const c = { torso: -38, foot: [186, ANKLE_Y], footBend: -1 };
    return {
      keys: [P(hip, -38, { ...c, arm: [82, 84] }), P(hip, -38, { ...c, arm: [82, -70] })], trace: 'wrist', loop: 'pingpong',
      equip: [pad([112, 148], [160, 148], 9), line([120, 153], [120, G], 3), line([152, 153], [152, G], 3)], follow: [db('wrist', 8)],
    };
  }
  if (tool === 'preacher' || tool === 'preacherMachine') {
    const hip = [150, 148];
    const torso = -84;
    const sh = shoulderOf(hip, torso);
    const c = { torso, foot: [186, ANKLE_Y], footBend: -1 };
    const keys = [P(hip, torso, { ...c, arm: [58, 62] }), P(hip, torso, { ...c, arm: [58, -82] })];
    const eq = [
      pad([hip[0] - 14, hip[1] + 6], [hip[0] + 30, hip[1] + 6], 10), line([hip[0] + 2, hip[1] + 12], [hip[0] + 2, G - 4], 4, '#334155'), rect(hip[0] - 30, G - 6, 130, 6, '#334155', 2),
      pad([sh[0] + 6, sh[1] + 8], [sh[0] + 50, sh[1] + 54], 10), line([sh[0] + 30, sh[1] + 52], [sh[0] + 30, G - 4], 5, '#334155'),
    ];
    const fol = tool === 'preacherMachine' ? [lever([sh[0] + 52, sh[1] + 50], 'wrist', 5), handle('wrist')] : [plate('wrist', 9)];
    if (tool === 'preacherMachine') eq.push(plates(236, 60, 18, 110, 3));
    return { keys, trace: 'wrist', loop: 'pingpong', equip: eq, follow: fol };
  }
  if (tool === 'machine') {
    const hip = [170, 150];
    const torso = -90;
    const sh = shoulderOf(hip, torso);
    const c = { torso, foot: [208, ANKLE_Y], footBend: -1 };
    return {
      keys: [P(hip, torso, { ...c, arm: [62, 70] }), P(hip, torso, { ...c, arm: [62, -78] })], trace: 'wrist', loop: 'pingpong',
      equip: [...seatBase(hip, 66), pad([sh[0] + 6, sh[1] + 8], [sh[0] + 40, sh[1] + 42], 10), plates(100, 40, 18, 100, 3)],
      follow: [lever([sh[0] + 44, sh[1] + 40], 'wrist', 5), handle('wrist')],
    };
  }
  const keys = [P(HIP, -90, stand({ arm: [88, 86] })), P(HIP, -90, stand({ arm: [84, -58] }))];
  const fol = tool === 'barbell' ? [plate('wrist', 9)] : tool === 'cable' ? [cable([262, 192], 'wrist'), handle('wrist')] : [db('wrist', 8)];
  const eq = tool === 'cable' ? [pulley([262, 192], 6), plates(268, 50, 18, 120, 3), rect(240, G - 6, 70, 6, '#334155', 2)] : [];
  return { keys, trace: 'wrist', loop: 'pingpong', equip: eq, follow: fol };
}

// ---------------- Curl des poignets ----------------
export function wristCurl() {
  const hip = [140, 140];
  const torso = -38;
  const c = { torso, foot: [190, ANKLE_Y], footBend: -1 };
  return {
    keys: [P(hip, torso, { ...c, arm: [80, 6], flex: 40 }), P(hip, torso, { ...c, arm: [80, 6], flex: -50 })],
    trace: 'fist', loop: 'pingpong',
    equip: [pad([112, 152], [160, 152], 9), line([120, 157], [120, G], 3), line([152, 157], [152, G], 3)],
    follow: [plate('fist', 8)],
  };
}

// ---------------- Triceps ----------------
export function pushdown({ rope = true }) {
  const sh = shoulderOf(HIP, -90);
  const keys = [P(HIP, -90, stand({ arm: [84, -40] })), P(HIP, -90, stand({ arm: [84, 86] }))];
  return {
    keys, trace: 'wrist', loop: 'pingpong',
    equip: [line([sh[0] + 34, -14], [sh[0] + 34, G], 4), line([sh[0] + 34, -14], [sh[0] + 34, -14], 3), pulley([sh[0] + 34, -14], 6), plates(240, 6, 18, 150, 3), rect(220, G - 6, 70, 6, '#334155', 2)],
    follow: [cable([sh[0] + 34, -14], 'wrist'), rope ? handle('wrist') : { k: 'plate', at: 'wrist', r: 3 }],
  };
}

export function skullCrusher() {
  const hip = [192, 139];
  const c = { torso: 180, neck: 14, foot: [226, ANKLE_Y], footBend: -1 };
  return {
    keys: [P(hip, 180, { ...c, arm: [-84, -90] }), P(hip, 180, { ...c, arm: [-84, 160] })], trace: 'wrist', loop: 'pingpong',
    equip: flatBench(84, 214), follow: [plate('wrist', 9)],
  };
}

export function overheadExtension({ tool = 'db' }) {
  const keys = [P(HIP, -90, stand({ arm: [-86, 118] })), P(HIP, -90, stand({ arm: [-90, -90] }))];
  const cab = tool === 'cable';
  return {
    keys, trace: 'wrist', loop: 'pingpong',
    equip: cab ? [pulley([70, 188], 6), plates(36, 60, 18, 110, 3)] : [],
    follow: cab ? [cable([70, 188], 'wrist'), handle('wrist')] : [db('wrist', 10)],
  };
}

export function kickback() {
  const hip = [120, 110];
  const torso = -20;
  const c = { torso, foot: [118, ANKLE_Y], footBend: -1 };
  return {
    keys: [P(hip, torso, { ...c, arm: [168, 98] }), P(hip, torso, { ...c, arm: [168, 172] })], trace: 'wrist', loop: 'pingpong',
    equip: [pad([170, 134], [236, 134], 9), line([178, 139], [178, G], 3), line([228, 139], [228, G], 3)], follow: [db('wrist', 8)], farHand: [190, 126],
  };
}

export function tricepsMachine() {
  const hip = [172, 152];
  const torso = -92;
  const sh = shoulderOf(hip, torso);
  const c = { torso, foot: [210, ANKLE_Y], footBend: -1 };
  return {
    keys: [P(hip, torso, { ...c, arm: [74, -60] }), P(hip, torso, { ...c, arm: [74, 60] })], trace: 'wrist', loop: 'pingpong',
    equip: [...seatBase(hip, 66), pad([sh[0] + 6, sh[1] + 12], [sh[0] + 36, sh[1] + 36], 10), plates(96, 40, 18, 100, 4)],
    follow: [lever([sh[0] + 14, sh[1] + 46], 'wrist', 5), handle('wrist')],
  };
}
void db; void line; void pt; void pulley; void rect; void ANKLE_Y; void plates; void P;
