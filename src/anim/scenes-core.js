import { plank, shoulderXFor } from './scenes-pull';
import { ANKLE_Y, G, P, horn, txt, cable, handle, lever, line, pad, plates, pt, pulley, rect, shoulderOf } from './kit';

const FLOOR_HIP = [190, 191]; // posé au sol (le buste touche le sol, sans flotter)

// ---------------- Crunchs et sit-ups au sol ----------------
export function crunch({ sitUp = false, decline = false, reverse = false, legRaise = false }) {
  if (reverse) {
    // les épaules restent au sol : seul le bassin s'enroule
    const mk = (hipY, torso, leg) => P([190, hipY], torso, { leg, arm: [3, 0] });
    return { keys: [mk(191, 180, [-95, 5]), mk(176, 163, [-112, -30])], trace: 'knee', loop: 'pingpong', equip: [], follow: [] };
  }
  if (legRaise) {
    const mk = a => P(FLOOR_HIP, 180, { leg: [a, a], toe: a - 70, arm: [3, 0] });
    return { keys: [mk(-6), mk(-90)], trace: 'ankle', loop: 'pingpong', equip: [], follow: [] };
  }
  if (decline) {
    // banc décliné : pieds EN HAUT calés sous le boudin, tête EN BAS ; le buste s'enroule depuis le banc
    const hip = [190, 110];
    const mk = torso => P(hip, torso, { foot: [238, 126], footBend: -1, toe: -30, hand: pt(shoulderOf(hip, torso), -10, -8), handBend: 1 });
    return {
      keys: [mk(158), mk(218)], trace: 'shoulder', loop: 'pingpong',
      equip: [pad([90, 160], [212, 111], 9), line([104, 160], [104, G], 3), line([200, 120], [200, G], 3), line([200, 120], [240, 136], 3), { k: 'circle', c: [244, 136], r: 6, fill: '#7b8492', stroke: '#6b7280', w: 1 }],
      follow: [],
    };
  }
  const mk = torso => {
    const sh = shoulderOf(FLOOR_HIP, torso);
    return P(FLOOR_HIP, torso, { foot: [222, ANKLE_Y], footBend: -1, hand: pt(sh, -12, -8), handBend: 1, neck: torso > 190 ? 12 : 0 });
  };
  return { keys: [mk(180), mk(sitUp ? 264 : 206)], trace: 'shoulder', loop: 'pingpong', equip: [], follow: [] };
}

// ---------------- Suspension : relevés de jambes / genoux ----------------
export function hangingRaise({ mode = 'legs' }) {
  const barY = -14;
  const hx = 152;
  const top = [hx - 2, barY + 53];
  // l'épaule reste sous la barre (bras tendus) : la hanche se déduit du buste
  const mk = (leg, torso) => P([top[0] - 52 * Math.cos((torso * Math.PI) / 180), top[1] - 52 * Math.sin((torso * Math.PI) / 180)], torso, { hand: [hx, barY], handBend: 1, leg, toe: 40 });
  const eq = [line([hx - 40, barY], [hx + 40, barY], 4), line([hx - 40, barY], [hx - 40, G], 4), line([hx + 40, barY], [hx + 40, G], 4)];
  const hang = mk([96, 96], -100);
  const keys = mode === 'knees' ? [hang, mk([20, 100], -100)] : mode === 'toes' ? [hang, mk([-62, -62], -118)] : [hang, mk([-4, -4], -104)];
  return { keys, trace: 'ankle', loop: 'pingpong', equip: eq, follow: [] };
}

export function captainChair() {
  const hip = [150, 106];
  const sh = shoulderOf(hip, -90);
  const mk = leg => P(hip, -90, { leg, toe: 40, hand: [sh[0] + 22, sh[1] + 30], handBend: 1 });
  return {
    keys: [mk([92, 92]), mk([6, 96])], trace: 'knee', loop: 'pingpong',
    equip: [pad([hip[0] - 14, hip[1] - 70], [hip[0] - 14, hip[1] + 6], 10), line([hip[0] - 18, hip[1] + 8], [hip[0] - 18, G], 4), pad([hip[0] + 8, sh[1] + 32], [hip[0] + 40, sh[1] + 32], 8), line([hip[0] + 24, sh[1] + 38], [hip[0] + 24, G], 4)],
    follow: [],
  };
}

// ---------------- Roue abdominale ----------------
export function abWheel() {
  // l'épaule est posée au-dessus de la roue (bras tendus ou presque) ; la hanche et les cuisses se déduisent du buste (genoux au sol)
  // les genoux restent FIXES au sol : la cuisse pivote autour d'eux pendant que la roue part devant
  const KNEE = [120, 192];
  const mk = (thigh, torso, wheelX) => {
    const hip = [KNEE[0] + 42 * Math.cos((thigh * Math.PI) / 180), KNEE[1] + 42 * Math.sin((thigh * Math.PI) / 180)];
    return P(hip, torso, { leg: [thigh + 180, 180], toe: -10, hand: [wheelX, 188], handBend: 1 });
  };
  return {
    keys: [mk(-75, -18, 182), mk(-30, -5, 256)], trace: 'wrist', loop: 'pingpong',
    equip: [rect(60, G - 4, 220, 4, '#334155', 1)], follow: [{ k: 'db', at: 'wrist', r: 8 }],
  };
}

// ---------------- Crunch poulie haute ----------------
export function cableCrunch() {
  const hip = [150, 150];
  const mk = torso => {
    const sh = shoulderOf(hip, torso);
    return P(hip, torso, { leg: [90, 180], hand: pt(sh, 8, -2), handBend: 1, neck: torso > -60 ? 20 : 0 });
  };
  return {
    keys: [mk(-84), mk(-22)], trace: 'shoulder', loop: 'pingpong',
    equip: [pulley([176, -14], 6), line([176, -14], [176, -14], 2), line([110, -14], [190, -14], 3), plates(86, 0, 18, 140, 4), rect(60, G - 4, 200, 4, '#334155', 1)],
    follow: [cable([176, -14], 'wrist'), handle('wrist')],
  };
}

// ---------------- Machines abdominales ----------------
// Crunch sur machine à pile (Selection / Select) : coussin sur la poitrine, mains aux poignées
export function abMachine() {
  const hip = [168, 152];
  const mk = torso => P(hip, torso, { foot: [208, ANKLE_Y], footBend: -1, hand: pt(shoulderOf(hip, torso), 12, 16), handBend: 1 });
  return {
    keys: [mk(-98), mk(-62)], trace: 'shoulder', loop: 'pingpong',
    equip: [
      pad([hip[0] - 14, hip[1] + 6], [hip[0] + 34, hip[1] + 6], 10), pad([hip[0] - 14, hip[1] + 4], [hip[0] - 22, hip[1] - 50], 10),
      line([hip[0] + 4, hip[1] + 12], [hip[0] + 4, G - 4], 4, '#334155'), rect(hip[0] - 30, G - 6, 100, 6, '#334155', 2), plates(86, 40, 18, 100, 3),
    ],
    follow: [{ k: 'padAt', at: 'shoulder', dx: 6, dy: 2, w: 8, h: 26 }, lever([hip[0] + 40, hip[1] - 70], 'shoulder', 4)],
  };
}

// Hammer Strength « Abdominal / Oblique Crunch » (à plaques) : DOUBLE ACTION. Le buste s'enroule vers l'avant (longues poignées par-dessus les épaules)
// ET les genoux montent vers la poitrine (coussin de jambes sur les tibias, qui pivote avec le levier). Siège pivotant verrouillable G / centre / D.
export function hsObliqueCrunch() {
  const hip = [172, 154];
  const mk = (torso, foot) => P(hip, torso, { foot, footBend: -1, hand: pt(shoulderOf(hip, torso), 6, -4), handBend: 1 });
  return {
    keys: [mk(-97, [214, ANKLE_Y]), mk(-52, [212, 164])], trace: 'shoulder', loop: 'pingpong',
    equip: [
      // siège pivotant : plateau rond sur un pied, avec ses trois verrouillages
      pad([hip[0] - 18, hip[1] + 6], [hip[0] + 30, hip[1] + 6], 10),
      line([hip[0] + 6, hip[1] + 12], [hip[0] + 6, G - 8], 5, '#334155'),
      { k: 'circle', c: [hip[0] + 6, G - 8], r: 12, fill: '#1e293b', stroke: '#94a3b8', w: 2 },
      rect(hip[0] - 40, G - 6, 120, 6, '#334155', 2),
      txt([hip[0] - 34, G - 18], 'siège pivotant', 8, '#94a3b8'),
      txt([hip[0] - 34, G - 28], 'G · centre · D', 8, '#38bdf8'),
      txt([hip[0] + 40, hip[1] - 78], 'les genoux montent', 8, '#38bdf8'),
      txt([hip[0] + 40, hip[1] - 68], 'en même temps', 8, '#38bdf8'),
      ...horn(hip[0] - 96, hip[1] - 52),
    ],
    follow: [
      { k: 'padAt', at: 'shoulder', dx: -2, dy: -8, w: 16, h: 8 }, lever([hip[0] - 60, hip[1] - 52], 'shoulder', 5), handle('wrist'),
      lever([hip[0] + 66, G - 30], 'ankle', 5), { k: 'padAt', at: 'ankle', dx: -8, dy: -12, w: 16, h: 8 }, // coussin de jambes
    ],
  };
}

// Technogym Selection « Total Abdominal » : siège ergonomique sans réglage, coussin postérieur sous le bassin, appui des jambes
// (on pousse activement avec les jambes pour stabiliser le bassin), mouvement à double action, pile de plaques.
export function tgTotalAbdominal() {
  const hip = [166, 154];
  const mk = (torso, lift) => P([hip[0], hip[1] - lift], torso, { foot: [214, ANKLE_Y - 6], footBend: -1, hand: pt(shoulderOf([hip[0], hip[1] - lift], torso), 10, 14), handBend: 1 });
  return {
    keys: [mk(-100, 0), mk(-54, 0)], trace: 'shoulder', loop: 'pingpong',
    equip: [
      pad([hip[0] - 16, hip[1] + 6], [hip[0] + 32, hip[1] + 6], 10),
      pad([hip[0] - 20, hip[1] - 12], [hip[0] - 20, hip[1] + 6], 9, true), // coussin postérieur sous le bassin
      line([hip[0] + 4, hip[1] + 12], [hip[0] + 4, G - 4], 4, '#334155'), rect(hip[0] - 34, G - 6, 120, 6, '#334155', 2),
      pad([226, ANKLE_Y - 30], [226, ANKLE_Y + 2], 9), // appui des pieds
      txt([234, ANKLE_Y - 36], 'pousse avec', 8, '#38bdf8'), txt([234, ANKLE_Y - 26], 'les jambes', 8, '#38bdf8'),
      plates(80, 40, 18, 100, 3),
    ],
    follow: [{ k: 'padAt', at: 'shoulder', dx: 6, dy: 2, w: 8, h: 26 }, lever([hip[0] - 50, hip[1] - 66], 'shoulder', 4), { k: 'cable', from: [89, 40], at: 'shoulder', dash: '2 3' }],
  };
}

// ---------------- Gainages (statiques) ----------------
export function plankHold({ side = false }) {
  const forearmY = 192;
  const shY = forearmY - 26;
  const ankle = [72, 190];
  const mk = dy => plank(ankle, [shoulderXFor(ankle, shY + dy), shY + dy], { arm: [90, 5], toe: 75 });
  const keys = [mk(0), mk(2)];
  if (side) {
    // de profil : appui sur un avant-bras, l'autre bras tendu vers le haut
    const m2 = dy => plank(ankle, [shoulderXFor(ankle, shY + dy), shY + dy], { arm: [90, 5], toe: 75, farHand: [shoulderXFor(ankle, shY + dy) + 4, shY - 56] });
    return { keys: [m2(0), m2(2)], trace: false, loop: 'pingpong', equip: [], follow: [], hold: true };
  }
  return { keys, trace: false, loop: 'pingpong', equip: [], follow: [], hold: true };
}

export function hollowHold() {
  const mk = (t, l) => P([176, 191], t, { leg: [l, l], toe: l - 60, arm: [t - 8, t - 8] });
  return { keys: [mk(206, -16), mk(209, -19)], trace: false, loop: 'pingpong', equip: [], follow: [], hold: true };
}
void ANKLE_Y;
