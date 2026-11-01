import { plank, shoulderXFor } from './scenes-pull';
import { ANKLE_Y, G, P, ball, cable, db, flatBench, handle, lever, line, pad, plate, plates, pt, pulley, rect, shoulderOf } from './kit';
import { SEG } from './skeleton';

const rad = d => (d * Math.PI) / 180;
const HIP = [150, 111];
const FOOT = [150, ANKLE_Y];
const seatBase = (hip, backLen = 62) => [
  pad([hip[0] - 14, hip[1] + 6], [hip[0] + 36, hip[1] + 6], 10),
  pad([hip[0] - 14, hip[1] + 4], [hip[0] - 14, hip[1] - backLen], 10),
  line([hip[0] + 4, hip[1] + 12], [hip[0] + 4, G - 4], 4, '#334155'),
  rect(hip[0] - 30, G - 6, 100, 6, '#334155', 2),
];

// ---------------- Squats ----------------
// tool : barbell | front | smith | goblet | hack
export function squat({ tool = 'barbell' }) {
  const up = { hip: HIP, torso: -90 };
  if (tool === 'hack') {
    const mk = (hip, torso) => P(hip, torso, { foot: [178, ANKLE_Y], footBend: -1, arm: [100, 40] });
    return {
      keys: [mk([142, 112], -104), mk([122, 152], -92)], trace: 'hip', loop: 'pingpong',
      equip: [line([96, 186], [190, 6], 4), rect(150, G - 10, 70, 10, '#334155', 2), plates(236, 40, 18, 110, 5)],
      follow: [{ k: 'seg', a: 'hip', b: 'shoulder', dx: -11, dy: -3, w: 10 }, { k: 'padAt', at: 'shoulder', dx: -16, dy: -8, w: 8, h: 14 }],
    };
  }
  const foot = tool === 'smith' ? [166, ANKLE_Y] : FOOT;
  const down = tool === 'front' ? { hip: [128, 150], torso: -72 } : tool === 'goblet' ? { hip: [128, 150], torso: -78 } : { hip: [128, 151], torso: -60 };
  const armPose = { barbell: [118, -70], front: [10, -140], smith: [118, -70], goblet: null };
  const mk = s => {
    const base = { foot, footBend: -1 };
    if (tool === 'goblet') {
      const sh = shoulderOf(s.hip, s.torso);
      return P(s.hip, s.torso, { ...base, hand: pt(sh, 14, 14), handBend: 1 });
    }
    return P(s.hip, s.torso, { ...base, arm: armPose[tool] });
  };
  const eq = tool === 'smith' ? [line([128, -20], [128, G], 3), line([180, -20], [180, G], 3)] : tool === 'goblet' ? [] : [line([96, 30], [96, G], 4), line([96, 30], [108, 30], 3, '#94a3b8')];
  const fol = tool === 'goblet' ? [ball('wrist', 9)] : [{ k: 'plate', at: 'shoulder', r: 12, dx: tool === 'front' ? 8 : -3, dy: tool === 'front' ? 2 : -4 }];
  return { keys: [mk(up), mk(down)], trace: tool === 'goblet' ? 'wrist' : 'shoulder', loop: 'pingpong', equip: eq, follow: fol };
}

export function bulgarianSquat() {
  const mk = hip => P(hip, -90, { foot: [176, ANKLE_Y], footBend: -1, arm: [90, 90], farFoot: [64, 142] });
  return {
    keys: [mk([152, 114]), mk([138, 150])], trace: 'hip', loop: 'pingpong',
    equip: [pad([40, 148], [80, 148], 9), line([48, 153], [48, G], 3), line([72, 153], [72, G], 3)], follow: [db('wrist', 8)],
  };
}

export function wallSit() {
  const mk = dy => P([118, 152 + dy], -90, { foot: [160, ANKLE_Y], footBend: -1, arm: [90, 60] });
  return { keys: [mk(0), mk(3)], trace: false, loop: 'pingpong', equip: [rect(100, -20, 8, 220, '#334155', 2)], follow: [], hold: true };
}

// ---------------- Fentes et step-up ----------------
export function lunge({ barbell = false }) {
  const mk = hipY => P([150, hipY], -90, { foot: [186, ANKLE_Y], footBend: -1, farFoot: [112, 190], arm: barbell ? [118, -70] : [90, 90] });
  return {
    keys: [mk(118), mk(156)], trace: 'hip', loop: 'pingpong', equip: [],
    follow: barbell ? [{ k: 'plate', at: 'shoulder', r: 11, dx: -3, dy: -4 }] : [db('wrist', 8)],
  };
}

export function stepUp() {
  const box = 52;
  const top = G - box;
  const a = P([166, 128], -90, { foot: [190, top - 6], footBend: -1, farFoot: [150, ANKLE_Y], arm: [90, 90] });
  const b = P([188, top - 6 - 84], -90, { foot: [190, top - 6], footBend: -1, farFoot: [194, top - 40], arm: [90, 90] });
  return { keys: [a, b], trace: 'hip', loop: 'pingpong', equip: [rect(164, top, 70, box, '#334155', 3)], follow: [db('wrist', 8)] };
}

// ---------------- Presses à cuisses ----------------
export function legPress({ kind = 'horizontal', calf = false }) {
  if (kind === '45') {
    const hip = [120, 156];
    const torso = -135;
    const mkP = foot => P(hip, torso, { foot, footBend: -1, hand: pt(shoulderOf(hip, torso), 6, 8), handBend: 1, toe: calf ? 60 : -45 });
    const keys = calf ? [mkP([162, 100]), mkP([165, 96])] : [mkP([140, 130]), mkP([172, 92])];
    return {
      keys, trace: 'ankle', loop: 'pingpong',
      equip: [line([98, 176], [236, 40], 5, '#475569'), pad([hip[0] - 22, hip[1] + 4], [shoulderOf(hip, torso)[0] - 20, shoulderOf(hip, torso)[1] - 2], 10), rect(80, G - 6, 180, 6, '#334155', 2)],
      follow: [{ k: 'padAt', at: 'ankle', dx: 4, dy: -34, w: 8, h: 60 }],
    };
  }
  const hip = [104, 152];
  const torso = -116;
  const mkP = foot => P(hip, torso, { foot, footBend: -1, hand: pt(shoulderOf(hip, torso), 4, 12), handBend: 1, toe: calf ? 60 : 0 });
  const keys = calf ? [mkP([178, 130]), mkP([181, 126])] : [mkP([158, 118]), mkP([182, 118])];
  return {
    keys, trace: 'ankle', loop: 'pingpong',
    equip: [pad([hip[0] - 20, hip[1] + 6], [hip[0] + 24, hip[1] + 6], 10), pad([hip[0] - 20, hip[1] + 6], [hip[0] - 50, hip[1] - 34], 10), line([hip[0], hip[1] + 12], [hip[0], G - 4], 4, '#334155'), rect(70, G - 6, 190, 6, '#334155', 2), plates(250, 60, 18, 110, 4)],
    follow: [{ k: 'padAt', at: 'ankle', dx: 6, dy: -26, w: 8, h: 54 }],
  };
}

// ---------------- Extensions / curls de jambes (machines) ----------------
export function legExtension() {
  const hip = [140, 150];
  const torso = -98;
  const sh = shoulderOf(hip, torso);
  const c = { torso, hand: [hip[0] + 8, hip[1] + 4], handBend: 1 };
  return {
    keys: [P(hip, torso, { ...c, leg: [0, 92], toe: 70 }), P(hip, torso, { ...c, leg: [0, -6], toe: 20 })], trace: 'ankle', loop: 'pingpong',
    equip: [...seatBase(hip, 66), pad([hip[0] + 4, hip[1] - 10], [hip[0] + 36, hip[1] - 10], 7, true), plates(86, 40, 18, 100, 4)],
    follow: [{ k: 'padAt', at: 'ankle', dx: 2, dy: -14, w: 8, h: 18 }],
    _sh: sh,
  };
}

export function legCurl({ lying = false }) {
  if (lying) {
    const hip = [188, 154];
    const c = { torso: 180, hand: [128, 150], handBend: 1 };
    return {
      supine: true,
      keys: [P(hip, 180, { ...c, leg: [0, 0], toe: 80 }), P(hip, 180, { ...c, leg: [0, -105], toe: 80 })], trace: 'ankle', loop: 'pingpong',
      equip: [pad([100, 168], [196, 168], 9), pad([196, 168], [236, 176], 9), line([112, 173], [112, G], 3), line([180, 173], [180, G], 3), plates(250, 80, 18, 100, 4)],
      follow: [{ k: 'padAt', at: 'ankle', dx: -8, dy: -14, w: 10, h: 12 }],
    };
  }
  const hip = [130, 150];
  const torso = -96;
  const c = { torso, hand: [hip[0] + 8, hip[1] + 4], handBend: 1 };
  return {
    keys: [P(hip, torso, { ...c, leg: [0, -2], toe: 20 }), P(hip, torso, { ...c, leg: [0, 100], toe: 60 })], trace: 'ankle', loop: 'pingpong',
    equip: [...seatBase(hip, 66), pad([hip[0] + 4, hip[1] - 10], [hip[0] + 36, hip[1] - 10], 7, true), plates(80, 40, 18, 100, 4)],
    follow: [{ k: 'padAt', at: 'ankle', dx: -6, dy: -8, w: 10, h: 16 }],
  };
}

// ---------------- Adducteurs / abducteurs (vue de face, assis) ----------------
export function hipMachine({ adduct = true }) {
  const c = 160;
  const hy = 150;
  const open = { c, hipY: hy, hand: [c + 24, hy - 14], handBend: 1, knee: [c + 42, hy + 8] };
  const closed = { c, hipY: hy, hand: [c + 24, hy - 14], handBend: 1, knee: [c + 12, hy + 8] };
  return {
    view: 'front', keys: adduct ? [open, closed] : [closed, open], trace: 'knee', loop: 'pingpong',
    equip: [pad([c - 28, hy + 12], [c + 28, hy + 12], 10), pad([c - 14, hy - 62], [c + 14, hy - 62], 9, true), line([c, hy + 16], [c, G - 4], 4, '#334155'), rect(c - 50, G - 6, 100, 6, '#334155', 2), plates(40, 60, 18, 100, 3)],
    follow: [{ k: 'padAt', at: 'knee', dx: -4, dy: -6, w: 8, h: 22 }],
  };
}

// ---------------- Mollets ----------------
export function calfRaise({ machine = false, seated = false }) {
  if (seated) {
    const hip = [124, 138];
    const mk = (ankleY, toe) => P(hip, -90, { foot: [166, ankleY], footBend: -1, arm: [90, 30], toe });
    return {
      box: [70, 96, 160, 122], keys: [mk(ANKLE_Y, 0), mk(ANKLE_Y - 12, 50)], trace: 'ankle', loop: 'pingpong',
      equip: [pad([hip[0] - 18, hip[1] + 6], [hip[0] + 24, hip[1] + 6], 10), line([hip[0], hip[1] + 12], [hip[0], G - 4], 4, '#334155'), rect(90, G - 6, 120, 6, '#334155', 2), pad([hip[0] + 24, hip[1] - 12], [hip[0] + 46, hip[1] - 12], 12, true)],
      follow: [{ k: 'padAt', at: 'knee', dx: -8, dy: -10, w: 22, h: 8 }],
    };
  }
  const mk = (dy, toe) => P([HIP[0], HIP[1] - dy], -90, { foot: [150, ANKLE_Y - dy], footBend: -1, arm: [90, 90], toe });
  return {
    box: [90, 96, 160, 122], keys: [mk(0, 0), mk(16, 62)], trace: 'ankle', loop: 'pingpong',
    equip: machine ? [rect(120, G - 4, 60, 4, '#334155', 1), plates(240, 40, 18, 120, 4)] : [rect(140, G - 4, 40, 4, '#334155', 1)],
    follow: machine ? [{ k: 'padAt', at: 'shoulder', dx: -12, dy: -8, w: 24, h: 10 }] : [],
  };
}

// ---------------- Charnière de hanche (soulevés) ----------------
// Soulevés : les bras restent pendants sous l'épaule (handRel), le dos reste plat ; disques de 45 cm (rayon ≈ 20 px) posés au sol
export function deadlift({ kind = 'conventional' }) {
  const foot = kind === 'sumo' ? [156, ANKLE_Y] : FOOT;
  const top = P([150, 112], -90, { foot, footBend: -1, handRel: [3, 54], handBend: 1 });
  const cfg = {
    conventional: { hip: [118, 157], torso: -38, r: 19 },
    sumo: { hip: [140, 164], torso: -58, r: 19 },
    trap: { hip: [128, 150], torso: -56, r: 15 },
  }[kind];
  if (kind === 'rdl') {
    const down = P([110, 120], -22, { foot: FOOT, footBend: -1, handRel: [3, 54], handBend: 1 });
    return { keys: [top, down], trace: 'wrist', loop: 'pingpong', equip: [], follow: [plate('wrist', 17)] };
  }
  const bottom = P(cfg.hip, cfg.torso, { foot, footBend: -1, handRel: [3, 54], handBend: 1 });
  return { keys: [bottom, top], trace: 'wrist', loop: 'pingpong', equip: [], follow: [plate('wrist', cfg.r)] };
}

export function goodMorning() {
  const mk = (hip, torso) => P(hip, torso, { foot: FOOT, footBend: -1, arm: [118, -72] });
  return {
    keys: [mk(HIP, -90), mk([112, 119], -25)], trace: 'shoulder', loop: 'pingpong', equip: [],
    follow: [{ k: 'plate', at: 'shoulder', r: 11, dx: -3, dy: -4 }],
  };
}

// ---------------- Fessiers ----------------
export function hipThrust({ machine = false }) {
  const mk = (hip, torso) => P(hip, torso, { foot: [172, ANKLE_Y], footBend: -1, hand: [hip[0] + 4, hip[1] - 8], handBend: 1 });
  const keys = [mk([150, 174], 200), mk([146, 136], 180)];
  const eq = [pad([62, 150], [108, 150], 10), line([70, 156], [70, G], 3), line([100, 156], [100, G], 3)];
  return {
    keys, trace: 'hip', loop: 'pingpong',
    equip: machine ? [...eq, plates(236, 60, 18, 110, 4)] : eq,
    follow: machine ? [{ k: 'padAt', at: 'hip', dx: -4, dy: -14, w: 10, h: 16 }, cable([245, 60], 'hip')] : [plate('hip', 12)],
  };
}

export function gluteBridge() {
  const mk = (hip, torso) => P(hip, torso, { foot: [176, ANKLE_Y], footBend: -1, arm: [0, 0] });
  return { keys: [mk([146, 186], 180), mk([136, 151], 133)], trace: 'hip', loop: 'pingpong', equip: [], follow: [] };
}

export function gluteKickback() {
  const hip = [124, 112];
  const torso = -48;
  const sh = shoulderOf(hip, torso);
  const mk = foot => P(hip, torso, { foot, footBend: -1, farFoot: [128, ANKLE_Y], hand: pt(sh, 30, 8), handBend: 1 });
  return {
    keys: [mk([156, 166]), mk([70, 150])], trace: 'ankle', loop: 'pingpong',
    equip: [pulley([238, 190], 6), plates(236, 60, 18, 110, 3), line([170, 120], [232, 120], 5, '#475569')],
    follow: [cable([238, 190], 'ankle'), { k: 'padAt', at: 'ankle', dx: -4, dy: -3, w: 10, h: 8 }],
  };
}

export function multiHip() {
  const hip = [150, 108];
  const sh = shoulderOf(hip, -90);
  const mk = foot => P(hip, -90, { foot, footBend: -1, farFoot: [150, ANKLE_Y], hand: pt(sh, 14, 10), handBend: 1 });
  return {
    keys: [mk([150, ANKLE_Y]), mk([118, 160])], trace: 'ankle', loop: 'pingpong',
    equip: [pad([hip[0] + 20, sh[1] - 10], [hip[0] + 20, hip[1] + 10], 10, true), rect(110, G - 6, 120, 6, '#334155', 2), plates(232, 60, 18, 110, 3)],
    follow: [{ k: 'padAt', at: 'ankle', dx: -6, dy: -8, w: 8, h: 14 }],
  };
}

// ---------------- Wall ball, burpees, mountain climbers ----------------
export function wallBall() {
  const sh0 = shoulderOf([128, 151], -66);
  const down = P([128, 151], -66, { foot: FOOT, footBend: -1, hand: pt(sh0, 14, 8), handBend: 1 });
  const sh1 = shoulderOf(HIP, -90);
  const up = P(HIP, -90, { foot: FOOT, footBend: -1, hand: pt(sh1, 8, -54), handBend: 1 });
  return {
    keys: [down, up], trace: 'wrist', loop: 'pingpong',
    equip: [rect(268, -24, 6, 224, '#334155', 2), { k: 'circle', c: [271, -6], r: 8, stroke: '#fbbf24', w: 2 }],
    follow: [ball('wrist', 9)],
  };
}

export function burpee() {
  const ankle = [70, 190];
  const handX = shoulderXFor(ankle, 142);
  const plankUp = plank(ankle, [handX, 142], { hand: [handX, 196], handBend: 1 });
  const plankDown = plank(ankle, [shoulderXFor(ankle, 172), 172], { hand: [handX, 196], handBend: 1 });
  const stand = P([150, 112], -90, { foot: FOOT, footBend: -1, arm: [90, 90] });
  const squat = P([124, 150], -20, { foot: [158, ANKLE_Y], footBend: -1, hand: [166, 188], handBend: 1 });
  const reach = P([132, 138], -45, { foot: [154, ANKLE_Y], footBend: -1, hand: [166, 156], handBend: 1 });
  const jump = P([150, 90], -90, { foot: [150, 166], footBend: -1, arm: [-80, -85] });
  return { keys: [stand, reach, squat, plankUp, plankDown, plankUp, squat, jump], trace: 'hip', loop: 'cycle', equip: [], follow: [] };
}

export function mountainClimber() {
  const ankle = [70, 190];
  const handX = shoulderXFor(ankle, 142);
  const base = plank(ankle, [handX, 142], { hand: [handX, 196], handBend: 1 });
  const a = { ...base, foot: [66, 188], footBend: -1, farFoot: [150, 168], leg: undefined };
  const b = { ...base, foot: [150, 168], footBend: -1, farFoot: [66, 188], leg: undefined };
  return { keys: [a, b], trace: 'ankle', loop: 'pingpong', equip: [], follow: [] };
}
void db; void flatBench; void handle; void lever; void line; void plate; void plates; void rect; void SEG; void rad;
