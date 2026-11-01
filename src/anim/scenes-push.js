import { plank, shoulderXFor } from './scenes-pull';
import { ANKLE_Y, G, P, horn, cable, db, flatBench, handle, inclineBench, lever, line, pad, plate, plates, pt, pulley, rect, shoulderOf, stack } from './kit';

// ---------------- Développés couchés (barre, haltères, Smith) ----------------
// ang : inclinaison du banc en degrés (0 plat, 30 incliné, -15 décliné)
export function benchPress({ tool = 'barbell', ang = 0, closeGrip = false }) {
  const flat = ang === 0;
  const hip = [192, flat ? 139 : ang > 0 ? 138 : 135];
  const torso = 180 + ang;
  const sh = shoulderOf(hip, torso);
  const start = pt(sh, 4 + ang * 0.1, -17);
  const end = pt(sh, 2 + ang * 0.25, -53);
  const common = { torso, neck: 14, foot: [226, ANKLE_Y], footBend: -1, handBend: 1 };
  const keys = [P(hip, torso, { ...common, hand: start }), P(hip, torso, { ...common, hand: end })];
  const bench = flat
    ? flatBench(84, 214)
    : ang > 0
      ? inclineBench([196, 152], ang, 76, 36, 152)
      : [pad([90, 128], [214, 150], 9), line([100, 134], [100, G], 3), line([204, 156], [204, G], 3)];
  const eq = [...bench];
  const fol = [];
  if (tool === 'barbell') {
    const rx = sh[0] - 36;
    eq.push(line([rx, end[1] - 20], [rx, G], 4), line([rx, end[1] + 4], [end[0] - 6, end[1] + 4], 3, '#94a3b8'));
    fol.push(plate('wrist', 13));
  } else if (tool === 'db') fol.push(db('wrist', 9));
  else if (tool === 'smith') {
    const x = sh[0] + 6;
    eq.push(line([x - 15, 30], [x - 15, G], 3), line([x + 15, 30], [x + 15, G], 3), line([x - 15, 24], [x + 15, 24], 3), line([x - 15, end[1] + 40], [x + 15, end[1] + 40], 3, '#475569'));
    fol.push(plate('wrist', 13));
  }
  return { keys, trace: 'wrist', loop: 'pingpong', equip: eq, follow: fol, closeGrip };
}

// ---------------- Développés / poussées assis sur machine ----------------
// angle : inclinaison du dossier (90 = vertical), incline = poussée vers le haut-avant
export function machinePress({ hammer = false, incline = false }) {
  const hip = [176, 152];
  const torso = incline ? -112 : -94;
  const sh = shoulderOf(hip, torso);
  const startH = incline ? pt(sh, 20, -2) : pt(sh, 17, 4);
  const endH = incline ? pt(sh, 40, -36) : pt(sh, 54, 2);
  const c = { torso, foot: [214, ANKLE_Y], footBend: -1, handBend: 1 };
  const keys = [P(hip, torso, { ...c, hand: startH }), P(hip, torso, { ...c, hand: endH })];
  const backTop = [hip[0] - 14 + (incline ? -22 : 0), hip[1] - 66];
  const eq = [
    pad([hip[0] - 14, hip[1] + 6], [hip[0] + 36, hip[1] + 6], 10),
    pad([hip[0] - 14, hip[1] + 4], backTop, 10),
    line([hip[0] + 4, hip[1] + 12], [hip[0] + 4, G - 4], 4, '#334155'),
    rect(hip[0] - 30, G - 6, 100, 6, '#334155', 2),
    ...(hammer
      ? horn(hip[0] - 84, sh[1] + 4)
      : [plates(90, 40, 18, 100, 4), line([99, 40], [99, 24], 2, '#cbd5e1'), pulley([110, 24], 5), line([110, 24], [hip[0] - 14, 24], 1.6, '#cbd5e1'), line([hip[0] - 14, 24], [hip[0] - 14, backTop[1] - 6], 1.6, '#cbd5e1')]),
  ];
  const fol = [handle('wrist'), { k: 'lever', pivot: [hip[0] + (incline ? -4 : -10), sh[1] + 4], at: 'wrist', w: hammer ? 8 : 5 }];
  return { keys, trace: 'wrist', loop: 'pingpong', equip: eq, follow: fol };
}

// ---------------- Pompes et variantes ----------------
export function pushUp({ feetUp = 0, narrow = false }) {
  const ankle = [70, 190 - feetUp];
  const handX = shoulderXFor(ankle, 142);
  const mk = shY => plank(ankle, [shoulderXFor(ankle, shY), shY], { hand: [handX, 196], handBend: 1 });
  const eq = [];
  if (feetUp) eq.push(rect(46, 190 - feetUp + 4, 50, feetUp + 6, '#475569', 3));
  return { keys: [mk(142), mk(172)], trace: 'shoulder', loop: 'pingpong', equip: eq, follow: [], narrow };
}

// ---------------- Dips ----------------
export function dips({ benchDips = false, machine = false }) {
  if (benchDips) {
    // mains sur un banc derrière soi, jambes tendues devant
    const mk = hipY => P([132, hipY], -90, { foot: [176, ANKLE_Y], footBend: -1, hand: [116, 122], handBend: 1 });
    return {
      keys: [mk(122), mk(150)], trace: 'shoulder', loop: 'pingpong',
      equip: [pad([84, 130], [126, 130], 9), line([92, 135], [92, G], 3), line([118, 135], [118, G], 3)], follow: [],
    };
  }
  if (machine) {
    // dips assis sur machine : poussée vers le bas de poignées devant les hanches
    const hip = [170, 150];
    const sh = shoulderOf(hip, -92);
    const c = { torso: -92, foot: [208, ANKLE_Y], footBend: -1, handBend: 1 };
    const up = P(hip, -92, { ...c, hand: pt(sh, 6, 20) });
    const down = P(hip, -92, { ...c, hand: pt(sh, 10, 52) });
    return {
      keys: [up, down], trace: 'wrist', loop: 'pingpong',
      equip: [pad([hip[0] - 14, hip[1] + 6], [hip[0] + 34, hip[1] + 6], 10), pad([hip[0] - 14, hip[1] + 4], [hip[0] - 14, hip[1] - 66], 10), line([hip[0] + 4, hip[1] + 12], [hip[0] + 4, G - 4], 4, '#334155'), rect(hip[0] - 30, G - 6, 100, 6, '#334155', 2), plates(90, 40, 18, 100, 3)],
      follow: [{ k: 'lever', pivot: [hip[0] - 4, sh[1] - 4], at: 'wrist', w: 5 }, handle('wrist')],
    };
  }
  // barres parallèles : bras tendus en haut, coudes à 90° en bas, jambes pliées derrière
  const up = P([146, 120], -72, { foot: [106, 158], footBend: -1, hand: [160, 124], handBend: 1 });
  const down = P([142, 146], -72, { foot: [102, 176], footBend: -1, hand: [160, 124], handBend: 1 });
  return {
    keys: [up, down], trace: 'shoulder', loop: 'pingpong',
    equip: [pad([146, 128], [186, 128], 6), line([184, 128], [184, G], 4), line([150, 128], [150, G], 4)], follow: [],
  };
}

// ---------------- Écartés ----------------
export function fly({ tool = 'db', ang = 0 }) {
  if (tool === 'pecdeck') {
    const hip = [176, 152];
    const sh = shoulderOf(hip, -92);
    const c = { torso: -92, foot: [214, ANKLE_Y], footBend: -1, handBend: 1 };
    // vue de profil : les bras s'ouvrent vers l'arrière puis se referment devant
    const open = P(hip, -92, { ...c, hand: pt(sh, 6, 4), handBend: 1 });
    const closed = P(hip, -92, { ...c, hand: pt(sh, 52, 6), handBend: 1 });
    return {
      keys: [open, closed], trace: 'wrist', loop: 'pingpong',
      equip: [pad([hip[0] - 14, hip[1] + 6], [hip[0] + 36, hip[1] + 6], 10), pad([hip[0] - 14, hip[1] + 4], [hip[0] - 14, hip[1] - 66], 10), line([hip[0] + 4, hip[1] + 12], [hip[0] + 4, G - 4], 4, '#334155'), rect(hip[0] - 30, G - 6, 100, 6, '#334155', 2), plates(90, 40, 18, 100, 3)],
      follow: [{ k: 'lever', pivot: [hip[0] + 30, sh[1] - 10], at: 'wrist', w: 5 }, handle('wrist')],
    };
  }
  if (tool === 'cable') {
    const hip = [150, 112];
    const sh = shoulderOf(hip, -80);
    const c = { torso: -80, foot: [150, ANKLE_Y], footBend: -1, handBend: 1 };
    const wide = P(hip, -80, { ...c, hand: [sh[0] - 36, sh[1] + 10] });
    const close = P(hip, -80, { ...c, hand: [sh[0] + 34, sh[1] + 30] });
    return {
      keys: [wide, close], trace: 'wrist', loop: 'pingpong',
      equip: [line([70, 20], [70, G], 4), pulley([70, 20], 6), plates(36, 40, 18, 110, 3), rect(36, G - 6, 120, 6, '#334155', 2)],
      follow: [cable([70, 20], 'wrist'), handle('wrist')],
    };
  }
  // haltères allongé (plat ou incliné)
  const flat = ang === 0;
  const hip = [192, flat ? 139 : 138];
  const torso = 180 + ang;
  const sh = shoulderOf(hip, torso);
  const c = { torso, neck: 14, foot: [226, ANKLE_Y], footBend: -1, handBend: 1 };
  const top = P(hip, torso, { ...c, hand: pt(sh, 3, -52) });
  const low = P(hip, torso, { ...c, hand: pt(sh, -6, -10) });
  return {
    keys: [low, top], trace: 'wrist', loop: 'pingpong',
    equip: flat ? flatBench(84, 214) : inclineBench([196, 152], ang, 76, 36, 152),
    follow: [db('wrist', 9)],
  };
}

// ---------------- Pull-over ----------------
export function pullover({ tool = 'db' }) {
  if (tool === 'cable') {
    const hip = [150, 112];
    const c = { foot: [150, ANKLE_Y], footBend: -1, handBend: 1 };
    // bras TENDUS tout le long : l'arc de cercle se fait avec l'épaule, le coude ne bouge pas (poulie devant soi)
    const up = P(hip, -70, { ...c, torso: -70, arm: [-55, -55], handBend: undefined });
    const down = P(hip, -70, { ...c, torso: -70, arm: [78, 78], handBend: undefined });
    return {
      keys: [up, down], trace: 'wrist', loop: 'pingpong',
      equip: [line([232, 6], [232, G], 4), pulley([232, 6], 6), plates(244, 40, 18, 110, 3), rect(220, G - 6, 60, 6, '#334155', 2)],
      follow: [cable([232, 6], 'wrist'), handle('wrist')],
    };
  }
  const hip = [196, 139];
  const sh = shoulderOf(hip, 180);
  // bras presque tendus : arc de cercle de derrière la tête jusqu'au-dessus de la poitrine
  const c = { torso: 180, neck: 14, foot: [228, ANKLE_Y], footBend: -1 };
  void sh;
  const over = P(hip, 180, { ...c, arm: [-88, -82] });
  const back = P(hip, 180, { ...c, arm: [176, 182] });
  return { keys: [back, over], trace: 'wrist', loop: 'pingpong', equip: flatBench(112, 218), follow: [db('wrist', 10)] };
}
void stack;
