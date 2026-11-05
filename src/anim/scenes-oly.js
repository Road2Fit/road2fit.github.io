// Haltérophilie (arraché, épaulé, jeté…), stations HYROX et figures de calisthénie.
// Mêmes conventions que les autres scènes : profil, tête à droite, pieds au sol (ANKLE_Y), barre = disque suivant le poignet.
import { ANKLE_Y, G, P, db, line, plate, pt, rect, shoulderOf } from './kit';
import { SEG } from './skeleton';

const FOOT = [150, ANKLE_Y];
const HIP = [150, 111];
const base = { foot: FOOT, footBend: -1 };
const rad = d => (d * Math.PI) / 180;
const hipFor = (sh, torso) => [sh[0] - SEG.torso * Math.cos(rad(torso)), sh[1] - SEG.torso * Math.sin(rad(torso))];

// bras tendus au-dessus de la tête, mains à la verticale du milieu du pied (barre « empilée » sur les appuis)
const overhead = (hip, torso, o = {}) => {
  const sh = shoulderOf(hip, torso);
  const target = [152, sh[1] - 60];
  const d = Math.hypot(target[0] - sh[0], target[1] - sh[1]);
  const k = 52 / d;
  return P(hip, torso, { ...base, ...o, hand: [sh[0] + (target[0] - sh[0]) * k, sh[1] + (target[1] - sh[1]) * k], handBend: 1 });
};
// barre posée sur l'avant des épaules (rack), coudes hauts devant
const rack = (hip, torso, o = {}) => P(hip, torso, { ...base, ...o, hand: pt(shoulderOf(hip, torso), 12, -4), handBend: 1 });
// bras pendants, barre contre les cuisses / les tibias
const hangArms = (hip, torso, o = {}) => { const sh = shoulderOf(hip, torso); return P(hip, torso, { ...base, ...o, hand: [sh[0] + 3, sh[1] + 53], handBend: 1 }); };
// barre sur la nuque (départ du snatch balance)
const backRack = (hip, torso, o = {}) => P(hip, torso, { ...base, ...o, hand: pt(shoulderOf(hip, torso), -4, 0), handBend: 1 });

const FLOOR = hangArms([118, 157], -38);
const KNEE = hangArms([126, 136], -56);
const HANG = hangArms([140, 120], -72); // barre au-dessus des genoux (départ « suspendu »)
const EXT = hangArms([152, 108], -94); // extension complète : hanches et genoux tendus, épaules au-dessus de la barre
const HIGH = (() => { const sh = shoulderOf(HIP, -90); return P(HIP, -90, { ...base, hand: pt(sh, 10, 8), handBend: 1 }); })(); // coudes hauts, barre au niveau du sternum
const RACK_STAND = rack(HIP, -90);
const RACK_SQUAT = rack([128, 150], -72);
const RACK_POWER = rack([140, 130], -80);
const OH_STAND = overhead(HIP, -90);
const OH_SQUAT = overhead([128, 150], -70);
const OH_POWER = overhead([140, 130], -82);

/**
 * kind : clean | power_clean | hang_clean | snatch | power_snatch | hang_snatch | muscle_snatch | clean_pull | snatch_pull | high_pull
 */
export function olyLift({ kind = 'clean' }) {
  const bar = [plate('wrist', 19)];
  const seq = {
    clean: [FLOOR, KNEE, EXT, RACK_SQUAT, RACK_STAND, FLOOR],
    power_clean: [FLOOR, KNEE, EXT, RACK_POWER, RACK_STAND, FLOOR],
    hang_clean: [HANG, EXT, RACK_POWER, RACK_STAND, HANG],
    snatch: [FLOOR, KNEE, EXT, OH_SQUAT, OH_STAND, FLOOR],
    power_snatch: [FLOOR, KNEE, EXT, OH_POWER, OH_STAND, FLOOR],
    hang_snatch: [HANG, EXT, OH_POWER, OH_STAND, HANG],
    muscle_snatch: [EXT, HIGH, OH_STAND, EXT],
    clean_pull: [FLOOR, KNEE, EXT, FLOOR],
    snatch_pull: [FLOOR, KNEE, EXT, FLOOR],
    high_pull: [HANG, EXT, HIGH, HANG],
  }[kind];
  return { keys: seq, trace: 'wrist', loop: 'cycle', equip: [], follow: bar };
}

/** Épaulé-jeté : épaulé (squat) puis jeté fente. */
const DRIVE = overhead([150, 104], -90, { foot: [154, ANKLE_Y - 12], farFoot: [140, ANKLE_Y - 12] }); // poussée : pieds qui décollent
const SPLIT = overhead([146, 128], -90, { foot: [184, ANKLE_Y], farFoot: [110, 190] });
const STEP_BACK = overhead([148, 116], -90, { foot: [166, ANKLE_Y - 12], farFoot: [118, 190] }); // on ramène le pied avant

export function cleanAndJerk() {
  const dip = rack([148, 124], -90);
  return { keys: [FLOOR, KNEE, EXT, RACK_SQUAT, RACK_STAND, dip, DRIVE, SPLIT, STEP_BACK, OH_STAND, FLOOR], trace: 'wrist', loop: 'cycle', equip: [], follow: [plate('wrist', 19)] };
}

/** kind : push_press (jambes poussent, bras finissent) | push_jerk (réception jambes fléchies) | split_jerk (réception en fente) */
export function jerk({ kind = 'push_press' }) {
  const dip = rack([148, 124], -90);
  const keys = kind === 'split_jerk' ? [RACK_STAND, dip, DRIVE, SPLIT, STEP_BACK, OH_STAND, RACK_STAND]
    : kind === 'push_jerk' ? [RACK_STAND, dip, overhead([147, 122], -88), OH_STAND, RACK_STAND]
    : [RACK_STAND, dip, OH_STAND, RACK_STAND];
  return { keys, trace: 'wrist', loop: 'cycle', equip: [], follow: [plate('wrist', 14)] };
}

/** Squat bras tendus (overhead squat) ; snatch balance : de la barre sur la nuque à la réception bras tendus. */
export function overheadSquat({ balance = false }) {
  if (balance) {
    const back = backRack(HIP, -90);
    const dip = backRack([148, 122], -90);
    return { keys: [back, dip, OH_SQUAT, OH_STAND, back], trace: 'wrist', loop: 'cycle', equip: [], follow: [plate('wrist', 14)] };
  }
  return { keys: [OH_STAND, OH_SQUAT], trace: 'hip', loop: 'pingpong', equip: [], follow: [plate('wrist', 14)] };
}

// ---------------- HYROX ----------------
/** Poussée de traîneau : buste penché, mains sur les montants, pas courts et puissants. */
export function sledPush() {
  const hip = [132, 120];
  const torso = -32;
  const sh = shoulderOf(hip, torso);
  const hands = pt(sh, 20, 6);
  const a = P(hip, torso, { foot: [176, ANKLE_Y], footBend: -1, farFoot: [104, 188], hand: hands, handBend: 1 });
  const mid = P(hip, torso, { foot: [140, ANKLE_Y - 14], footBend: -1, farFoot: [140, 188], hand: hands, handBend: 1 });
  const b = P(hip, torso, { foot: [104, 188], footBend: -1, farFoot: [176, ANKLE_Y], hand: hands, handBend: 1 });
  const sled = [rect(hands[0] + 6, G - 26, 56, 20, '#475569', 3), line([hands[0], hands[1]], [hands[0] + 12, G - 26], 4, '#94a3b8'), rect(hands[0] + 18, G - 44, 28, 18, '#334155', 2)];
  return { keys: [a, mid, b], trace: 'ankle', loop: 'pingpong', equip: sled, follow: [] };
}

/** Tirage de traîneau : buste en arrière, la corde passe main sur main. */
export function sledPull() {
  const hip = [136, 114];
  const torso = -104;
  const sh = shoulderOf(hip, torso);
  const a = P(hip, torso, { foot: [158, ANKLE_Y], footBend: -1, farFoot: [118, ANKLE_Y], hand: pt(sh, 50, 14), handBend: 1 });
  const b = P(hip, torso, { foot: [158, ANKLE_Y], footBend: -1, farFoot: [118, ANKLE_Y], hand: pt(sh, 10, 42), handBend: 1 });
  return {
    keys: [a, b], trace: 'wrist', loop: 'pingpong',
    equip: [rect(232, G - 22, 50, 18, '#475569', 3)],
    follow: [{ k: 'cable', from: [232, G - 14], at: 'wrist' }],
  };
}

/** Marche du fermier : debout, épaules basses, une charge dans chaque main, pas réguliers. */
export function farmersCarry() {
  const hip = [150, 112];
  const sh = shoulderOf(hip, -90);
  const hand = [sh[0] + 3, sh[1] + 53];
  const a = P(hip, -90, { foot: [166, ANKLE_Y], footBend: -1, farFoot: [134, ANKLE_Y], hand, handBend: 1 });
  const mid = P([150, 110], -90, { foot: [150, ANKLE_Y - 12], footBend: -1, farFoot: [150, ANKLE_Y], hand, handBend: 1 });
  const b = P(hip, -90, { foot: [134, ANKLE_Y], footBend: -1, farFoot: [166, ANKLE_Y], hand, handBend: 1 });
  return { keys: [a, mid, b], trace: false, loop: 'pingpong', equip: [], follow: [db('wrist', 9)] };
}

// ---------------- Calisthénie ----------------
const BAR_Y = -14;
const BAR_X = 152;
const pullBar = [line([BAR_X - 40, BAR_Y], [BAR_X + 40, BAR_Y], 4), line([BAR_X - 40, BAR_Y], [BAR_X - 40, G], 4), line([BAR_X + 40, BAR_Y], [BAR_X + 40, G], 4)];

/** Muscle-up : traction explosive, passage des épaules au-dessus de la barre, puis poussée bras tendus. */
export function muscleUp({ rings = false }) {
  const mk = (sh, torso, o = {}) => P(hipFor(sh, torso), torso, { hand: [BAR_X, BAR_Y], handBend: 1, leg: [92, 112], toe: 60, ...o });
  const hang = mk([BAR_X - 2, BAR_Y + 53], -92);
  const pull = mk([BAR_X - 18, BAR_Y + 8], -112);
  const over = mk([BAR_X - 2, BAR_Y - 14], -70, { leg: [100, 120] });
  const top = mk([BAR_X + 2, BAR_Y - 50], -86, { leg: [96, 100] });
  const eq = rings
    ? [line([BAR_X, -60], [BAR_X, BAR_Y - 4], 2, '#94a3b8'), { k: 'circle', c: [BAR_X, BAR_Y], r: 5, stroke: '#cbd5e1', w: 2 }]
    : pullBar;
  return { keys: [hang, pull, over, top, hang], trace: 'shoulder', loop: 'cycle', equip: eq, follow: [] };
}

/** Pompes en équilibre (handstand push-up) ; hold = équilibre tenu. Tête en bas, pieds contre le mur. */
export function handstand({ hold = false }) {
  const mk = shY => {
    const sh = [150, shY];
    const hip = [150, shY - SEG.torso];
    return P(hip, 90, { hand: [150, 196], handBend: 1, leg: [-90, -90], toe: -90 }) || sh;
  };
  const wall = [rect(172, -30, 8, 230, '#334155', 2)];
  if (hold) return { keys: [mk(146), mk(147)], trace: false, loop: 'pingpong', equip: wall, follow: [], hold: true };
  return { keys: [mk(146), mk(176)], trace: 'shoulder', loop: 'pingpong', equip: wall, follow: [] };
}

/** L-sit : appui bras tendus sur des parallettes, jambes tendues à l'horizontale. */
export function lSit() {
  const mk = dy => P([150, 164 + dy], -90, { hand: [152, 168 + dy], handBend: 1, leg: [0, 0], toe: -20 });
  return {
    keys: [mk(0), mk(1)], trace: false, loop: 'pingpong', hold: true, follow: [],
    equip: [line([138, 170], [166, 170], 4), line([142, 170], [142, G], 3), line([162, 170], [162, G], 3)],
  };
}

/** Front lever : suspendu à la barre, corps tendu à l'horizontale, bras tendus. */
export function frontLever() {
  const mk = dy => {
    const sh = [BAR_X - 20, BAR_Y + 50 + dy];
    return P(hipFor(sh, 0), 0, { hand: [BAR_X, BAR_Y], handBend: 1, leg: [180, 180], toe: 180 });
  };
  return { keys: [mk(0), mk(1)], trace: false, loop: 'pingpong', hold: true, equip: pullBar, follow: [] };
}

/** Planche : corps à l'horizontale porté par les bras tendus, épaules en avant des mains. */
export function plancheHold() {
  const mk = dy => {
    const sh = [162, 146 + dy];
    return P(hipFor(sh, 0), 0, { hand: [150, 196], handBend: 1, leg: [180, 180], toe: 180 });
  };
  return { keys: [mk(0), mk(1)], trace: false, loop: 'pingpong', hold: true, equip: [], follow: [] };
}

/** Pistol squat : squat sur une jambe, l'autre tendue devant. */
export function pistolSquat() {
  const top = P(HIP, -90, { ...base, farFoot: [184, 150], arm: [0, 0] });
  const bottom = P([138, 168], -66, { ...base, farFoot: [214, 156], arm: [0, 0] });
  return { keys: [top, bottom], trace: 'hip', loop: 'pingpong', equip: [], follow: [] };
}
void G;
