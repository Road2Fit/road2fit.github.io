// Pliométrie (4.42) : sauts et lancers explosifs, de profil. Une pose = hanche, angle du buste, pieds / mains.
// Bras : arm [épaule→coude, coude→poignet] en degrés (90 = pendants, 0 = devant, −90 = en l'air, 150 = en arrière).
// Pieds en l'air = au-dessus du sol (le validateur n'exige l'appui que pour les pieds au sol).
import { plank, shoulderXFor } from './scenes-pull';
import { ANKLE_Y, G, P, ball, pt, rect, shoulderOf } from './kit';

const FOOT = [150, ANKLE_Y];
const stand = (arm = [90, 90]) => P([150, 111], -90, { foot: FOOT, footBend: -1, arm });
const crouch = (arm = [150, 150], hip = [130, 146], torso = -62) => P(hip, torso, { foot: FOOT, footBend: -1, arm });
const air = (arm = [-82, -86], dx = 0) => P([150 + dx, 86], -90, { foot: [152 + dx, 168], footBend: -1, arm });

/** Squat sauté / saut vertical : swing = élan des bras (bras en arrière à la flexion, en l'air au saut). */
export function squatJump({ swing = true, tuck = false } = {}) {
  const down = swing ? crouch([150, 150]) : crouch([110, 30]);
  const up = tuck ? P([150, 84], -84, { foot: [160, 128], footBend: -1, arm: [10, 20] }) : air(swing ? [-82, -86] : [110, 30]);
  const land = crouch(swing ? [20, 20] : [110, 30], [134, 140], -66);
  return { keys: [stand(), down, up, land, stand()], trace: 'hip', loop: 'cycle', equip: [], follow: [] };
}

/** Sautillements chevilles (pogo) : petits rebonds, genoux presque tendus. */
export function pogo() {
  const low = P([150, 112], -90, { foot: FOOT, footBend: -1, arm: [80, 70] });
  const high = P([150, 98], -90, { foot: [150, 180], footBend: -1, arm: [80, 70] });
  return { keys: [low, high], trace: 'hip', loop: 'pingpong', equip: [], follow: [] };
}

/** Saut sur une caisse : flexion, saut, réception accroupie sur la caisse, debout dessus. */
export function boxJump() {
  const top = G - 40;
  const box = rect(178, top, 64, 40, '#334155', 3);
  const fly = P([176, 82], -88, { foot: [184, 150], footBend: -1, arm: [-70, -80] });
  const land = P([180, 110], -68, { foot: [204, top - 6], footBend: -1, arm: [10, 20] });
  const onBox = P([204, 71], -90, { foot: [204, top - 6], footBend: -1, arm: [90, 90] });
  return { keys: [stand(), crouch(), fly, land, onBox], trace: 'hip', loop: 'cycle', equip: [box], follow: [] };
}

/** Saut en contrebas (drop jump) : se laisser tomber de la caisse, rebond immédiat vers le haut. */
export function dropJump() {
  const top = G - 40;
  const box = rect(64, top, 64, 40, '#334155', 3);
  const onBox = P([96, 71], -90, { foot: [96, top - 6], footBend: -1, arm: [90, 90] });
  const off = P([128, 76], -88, { foot: [136, 156], footBend: -1, arm: [60, 60] });
  const land = P([150, 138], -68, { foot: [168, ANKLE_Y], footBend: -1, arm: [150, 150] });
  const up = P([162, 86], -90, { foot: [164, 168], footBend: -1, arm: [-82, -86] });
  const end = P([166, 111], -90, { foot: [166, ANKLE_Y], footBend: -1, arm: [90, 90] });
  return { keys: [onBox, off, land, up, end], trace: 'hip', loop: 'cycle', equip: [box], follow: [] };
}

/** Saut en longueur pieds joints : élan des bras, envol vers l'avant, réception amortie. */
export function broadJump() {
  const take = P([158, 108], -62, { foot: [150, 186], footBend: -1, arm: [-40, -40] });
  const fly = P([188, 100], -70, { foot: [214, 150], footBend: -1, arm: [10, 10] });
  const land = P([206, 146], -62, { foot: [228, ANKLE_Y], footBend: -1, arm: [10, 20] });
  return { keys: [stand(), crouch(), take, fly, land], trace: 'hip', loop: 'cycle', equip: [], follow: [] };
}

/** Fentes sautées : fente basse, saut, réception en fente (on change de jambe à chaque saut). */
export function splitJump() {
  const low = P([150, 152], -90, { foot: [186, ANKLE_Y], footBend: -1, farFoot: [112, 190], arm: [70, 60] });
  const up = P([150, 96], -90, { foot: [170, 172], footBend: -1, farFoot: [128, 172], arm: [-30, -40] });
  return { keys: [low, up], trace: 'hip', loop: 'pingpong', equip: [], follow: [] };
}

/** Sauts sur une jambe : l'autre jambe repliée derrière. */
export function singleLegHop() {
  const down = P([146, 132], -72, { foot: FOOT, footBend: -1, farFoot: [118, 160], arm: [130, 130] });
  const up = P([150, 92], -88, { foot: [152, 174], footBend: -1, farFoot: [124, 150], arm: [-60, -70] });
  return { keys: [down, up], trace: 'hip', loop: 'pingpong', equip: [], follow: [] };
}

/** Saut d'attaque (volley) : dernier appui bras en arrière, envol, bras de frappe armé puis frappe, réception. */
export function approachJump() {
  const step = P([136, 144], -58, { foot: FOOT, footBend: -1, arm: [160, 160] });
  const fly = P([156, 82], -88, { foot: [160, 164], footBend: -1, arm: [-100, -150] });
  const hit = P([158, 84], -86, { foot: [162, 166], footBend: -1, arm: [-60, -50] });
  const land = P([160, 140], -66, { foot: [176, ANKLE_Y], footBend: -1, arm: [30, 30] });
  return { keys: [stand([110, 110]), step, fly, hit, land], trace: 'hip', loop: 'cycle', equip: [], follow: [] };
}

/** Saut de contre (volley) : mains devant le visage, petite flexion, bras tendus au-dessus du filet. */
export function blockJump() {
  const ready = P([150, 114], -90, { foot: FOOT, footBend: -1, arm: [-40, -100] });
  const dip = P([140, 132], -80, { foot: FOOT, footBend: -1, arm: [-30, -100] });
  const up = P([150, 86], -90, { foot: [152, 168], footBend: -1, arm: [-84, -86] });
  return { keys: [ready, dip, up, dip, ready], trace: 'hip', loop: 'cycle', equip: [rect(176, 20, 4, 180, '#475569', 1)], follow: [] };
}

/** Pompes claquées : descente, poussée explosive, mains qui quittent le sol. */
export function clapPushUp() {
  const ankle = [70, 190];
  const handX = shoulderXFor(ankle, 142);
  const down = plank(ankle, [shoulderXFor(ankle, 172), 172], { hand: [handX, 196], handBend: 1 });
  const up = plank(ankle, [shoulderXFor(ankle, 142), 142], { hand: [handX, 196], handBend: 1 });
  const fly = plank(ankle, [shoulderXFor(ankle, 128), 128], { hand: [handX + 2, 178], handBend: 1 });
  return { keys: [up, down, fly, up], trace: 'shoulder', loop: 'cycle', equip: [], follow: [] };
}

/** Lancer de médecine-ball au sol (slam) : ballon au-dessus de la tête, lancé fort vers le sol. */
export function ballSlam() {
  const sh1 = shoulderOf([150, 106], -90);
  const up = P([150, 106], -90, { foot: [150, 190], footBend: -1, hand: pt(sh1, 6, -52), handBend: 1 });
  const down = P([132, 138], -45, { foot: [154, ANKLE_Y], footBend: -1, hand: [166, 154], handBend: 1 });
  return { keys: [up, down], trace: 'wrist', loop: 'pingpong', equip: [], follow: [ball('wrist', 9)] };
}

/** Passe poitrine au médecine-ball contre un mur : ballon contre la poitrine, poussée explosive bras tendus. */
export function chestPass() {
  const sh = shoulderOf([150, 111], -90);
  const a = P([150, 111], -90, { foot: FOOT, footBend: -1, hand: pt(sh, 16, 10), handBend: 1 });
  const b = P([150, 111], -90, { foot: FOOT, footBend: -1, hand: pt(sh, 50, 2), handBend: 1 });
  return { keys: [a, b], trace: 'wrist', loop: 'pingpong', equip: [rect(232, -24, 6, 224, '#4b5563', 2)], follow: [ball('wrist', 9)] };
}
