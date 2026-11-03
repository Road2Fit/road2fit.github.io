// « Erreur fréquente » de la fenêtre « Voir le mouvement » : des erreurs RÉALISTES, propres à la posture de l'exercice
// (jamais un buste qui traverse un banc, un siège ou le sol). Avant (11/2026) : la même rotation du buste pour tous
// les exercices, d'où des corps qui passaient à travers les installations.
//
// Postures (déduites de la pose de départ de la vue de profil) :
//   lying    : allongé (banc, sol) → les fesses décollent (le bassin monte, les épaules restent posées)
//   floor    : allongé au sol (crunch) → on tire sur la nuque
//   bridge   : pont / hip thrust → le bassin monte trop haut, le bas du dos se cambre
//   plank    : gainé face au sol (pompes, planche, roue) → le bassin s'affaisse, le dos se creuse
//   hanging  : suspendu (tractions, relevés de jambes) → balancement des jambes (élan)
//   seated   : assis sur une machine avec dossier → les fesses décollent du siège
//   seatedFree : assis sans dossier (tirages) → le buste bascule en arrière pour tirer
//   standing : debout buste droit (curl, développé, élévations) → le buste part en arrière (cambrure)
//   legs     : squat, fentes → le buste plonge vers l'avant
//   hinge    : buste penché (rowing, soulevé de terre) → le buste plonge, les lombaires prennent la charge
import { GROUND, SEG, poseAt, solvePose } from './skeleton';

const rad = d => (d * Math.PI) / 180;
const deg = r => (r * 180) / Math.PI;

const LEGS = new Set(['squat', 'fp_front_squat', 'fp_smith_squat', 'fp_goblet', 'fp_hack_squat', 'fp_bulgarian', 'fp_walking_lunge', 'fp_barbell_lunge', 'fp_step_up', 'fp_belt_squat', 'fp_wall_ball', 'fp_burpees']);
const BRIDGE = new Set(['fp_hip_thrust_bar', 'fp_hip_thrust_machine', 'fp_glute_bridge']);
const SEATED_FREE = new Set(['fp_seated_row', 'fp_low_row_machine', 'fp_hammer_row', 'lat_pulldown', 'fp_close_pulldown', 'fp_hammer_pulldown', 'fp_vertical_traction', 'cable_crunch']);
const HINGE_STANDING = new Set(['fp_rdl', 'fp_good_morning', 'fp_db_row', 'fp_kickback']); // flexion de hanche / buste penché
// machines où l'on pousse ou tire assis (pieds sur la plateforme ou sous les rouleaux) : les fesses décollent
const SEATED_IDS = new Set(['leg_press', 'fp_leg_press_h', 'fp_calf_press', 'fp_leg_curl_seat', 'tg_total_abdominal']);
const FLOOR_NECK = new Set(['crunches_floor', 'fp_situp', 'fp_decline_crunch']); // crunchs : on tire sur la nuque
const SUSPENDED = new Set(['dips', 'fp_assisted_dip']); // en appui sur les barres : l'élan vient des jambes
// pas d'erreur de posture qui aurait du sens en vue de côté : seulement « trop vite » et « amplitude trop courte »
const ONLY_TEMPO = new Set(['fp_bench_dips', 'fp_calf_standing', 'fp_multihip', 'fp_woodchop', 'fp_pallof', 'fp_concentration_curl', 'fp_wrist_curl', 'fp_reverse_crunch', 'fp_leg_raise_floor', 'fp_back_extension', 'fp_captain_knee', 'fp_standing_leg_curl', 'fp_incline_curl', 'fp_preacher_bar', 'fp_preacher_machine']);

/** Posture de l'exercice (vue de profil). */
export function postureOf(scene, id = '') {
  if (!scene || scene.view || !scene.keys || !scene.keys.length) return 'none';
  const p = poseAt(scene.keys, 0);
  const j = solvePose(p);
  const t = ((((p.torso || 0) % 360) + 540) % 360) - 180; // −180 … 180
  if (ONLY_TEMPO.has(id)) return 'none';
  if (SUSPENDED.has(id)) return 'hanging';
  if (SEATED_IDS.has(id)) return 'seated';
  if (FLOOR_NECK.has(id)) return 'floor';
  if (LEGS.has(id)) return 'legs';
  if (BRIDGE.has(id)) return 'bridge';
  if (SEATED_FREE.has(id)) return 'seatedFree';
  if (HINGE_STANDING.has(id)) return 'hinge';
  if (j.wrist[1] < j.shoulder[1] - 30 && j.ankle[1] < GROUND - 12) return 'hanging';
  if (Math.abs(t) < 30) return 'plank';
  if (Math.abs(t) > 120) return j.hip[1] > GROUND - 14 ? 'floor' : 'lying';
  const feetDown = j.ankle[1] > GROUND - 10;
  if (t >= -62 && t <= -10) return 'hinge';
  if (feetDown && j.hip[1] > 132 && t > -125 && t < -62) return 'seated';
  if (t > -125 && t < -60) return feetDown ? 'standing' : 'none';
  if (t >= -60 && t <= -10) return 'hinge';
  return 'none';
}

const THIRD = {
  lying: { key: 'hips', label: 'Les fesses décollent', text: 'Les fesses décollent du banc : le dos se cambre trop et le bas du dos encaisse. Garde les fesses posées, les pieds à plat.' },
  floor: { key: 'neck', label: 'On tire sur la nuque', text: 'Les mains tirent sur la tête : la nuque force et les abdominaux travaillent moins. Le menton reste à un poing de la poitrine.' },
  bridge: { key: 'arch', label: 'Le bassin monte trop', text: 'Le bassin monte trop haut : le bas du dos se cambre au lieu des fessiers. Arrête-toi quand le corps forme une ligne droite.' },
  plank: { key: 'sag', label: 'Le bassin s’affaisse', text: 'Le bassin s’affaisse : le dos se creuse et les lombaires prennent la charge. Serre les fessiers et les abdominaux, corps bien droit.' },
  seated: { key: 'seat', label: 'Les fesses décollent', text: 'Les fesses décollent du siège pour pousser plus lourd : le dos n’est plus calé et la charge est trop lourde. Reste collé au dossier.' },
  seatedFree: { key: 'back', label: 'Le buste bascule', text: 'Le buste bascule en arrière pour tirer : c’est le dos qui fait le travail par élan, plus les muscles visés. Le buste reste presque fixe.' },
  standing: { key: 'back', label: 'Le buste part en arrière', text: 'Le buste part en arrière et le dos se cambre pour aider : la charge passe sur le bas du dos. Gaine-toi, le buste reste droit.' },
  legs: { key: 'plunge', label: 'Le buste plonge', text: 'Le buste plonge vers l’avant : la charge part sur le bas du dos. Garde la poitrine haute et le poids sur le milieu du pied.' },
  hinge: { key: 'plunge', label: 'Le dos lâche', text: 'Le buste plonge et le dos lâche : les lombaires prennent la charge. Garde le dos plat et la charge près du corps.' },
};

const FAST = { key: 'fast', label: 'Trop vite, avec élan', text: 'Trop vite, avec de l’élan : la charge balance, les muscles ne travaillent presque plus et les articulations encaissent.' };
const SHORT = { key: 'short', label: 'Amplitude trop courte', text: 'Amplitude trop courte : le fantôme montre le trajet complet que tu dois faire.' };

/** Erreurs proposées pour cet exercice (aucune pour un maintien ou une vue principale de face). */
export function mistakesFor(scene, info, id = '') {
  if (!scene || scene.view || (info && info.hold)) return [];
  const post = postureOf(scene, id);
  const list = [FAST, SHORT];
  if (THIRD[post]) list.push(THIRD[post]);
  return list;
}

/** Le bassin monte (ou descend) de `dy` px en gardant les épaules en place : le buste pivote autour des épaules. */
function moveHipKeepShoulder(p, dy) {
  if (!p.hip || !dy) return p;
  const L = SEG.torso;
  const sh = solvePose(p).shoulder;
  const t = rad(p.torso || 0);
  // le buste garde sa longueur : la hanche tourne autour de l'épaule (elle glisse un peu vers les épaules en montant)
  const v = Math.max(-1, Math.min(1, Math.sin(t) - dy / L));
  const t2 = Math.cos(t) >= 0 ? Math.asin(v) : Math.PI - Math.asin(v);
  const hip = [sh[0] - Math.cos(t2) * L, sh[1] + (p.lift || 0) - Math.sin(t2) * L];
  const turns = Math.round(((p.torso || 0) - deg(t2)) / 360) * 360; // même tour d'angle que la pose (interpolations)
  return { ...p, hip, torso: deg(t2) + turns };
}

/** Garde la déformation tant qu'aucune articulation ne passe sous le sol ; sinon la réduit. */
function safe(base, make) {
  for (const f of [1, 0.6, 0.3]) {
    const p = make(f);
    const j = solvePose(p);
    if (['hip', 'shoulder', 'elbow', 'wrist', 'knee', 'ankle', 'headC'].every(k => !j[k] || j[k][1] <= GROUND + 1)) return p;
  }
  return base;
}

/** Buste qui pivote de `d` degrés autour de la hanche, vers l'arrière (opposé au côté où regarde l'exercice) ou l'avant. */
function tiltTorso(p, d, toward) {
  const j = solvePose(p);
  const facing = j.toe[0] >= j.ankle[0] ? 1 : -1; // les pieds pointent du côté où regarde la personne
  const sign = toward === 'back' ? -facing : facing;
  // angle −90 = buste vertical ; pencher vers x positif = angle qui augmente (vers 0)
  return { ...p, torso: (p.torso || 0) + sign * d };
}

/**
 * Pose déformée par l'erreur. u = instant du geste (0 → 1), phase = temps (pour l'élan).
 * Les amplitudes restent modestes et vont toujours dans le sens qui éloigne le corps du matériel.
 */
export function applyMistake(key, pose, scene, id, u, phase) {
  if (!pose || !pose.hip) return pose;
  const post = postureOf(scene, id);
  const k = Math.sin(Math.PI * Math.min(1, Math.max(0, u))) ** 0.7; // surtout au milieu / au bout du geste, rien au départ
  const swing = Math.sin(phase * Math.PI * 4);
  if (key === 'fast') {
    if (post === 'standing' || post === 'hinge') return tiltTorso(pose, 6 * swing, 'back'); // le buste balance un peu
    if (post === 'hanging' && pose.foot) return { ...pose, foot: [pose.foot[0] + 16 * swing, pose.foot[1] - Math.abs(6 * swing)] }; // les jambes balancent
    return pose; // allongé, assis, gainé : seulement trop vite
  }
  if (key === 'short') return pose;
  const mk = f => {
    switch (post) {
      case 'lying': return moveHipKeepShoulder(pose, -9 * k * f); // les fesses décollent (vers le haut, jamais dans le banc)
      case 'bridge': return moveHipKeepShoulder(pose, -7 * k * f);
      case 'seated': return { ...pose, hip: [pose.hip[0], pose.hip[1] - 5 * k * f] }; // tout le corps se soulève du siège en glissant le long du dossier
      case 'plank': return moveHipKeepShoulder(pose, Math.min(12 * k * f, GROUND - 8 - pose.hip[1])); // affaissé, jamais sous le sol
      case 'floor': return { ...pose, neck: (pose.neck || 0) + 28 * k * f * (Math.cos(rad(pose.torso || 0)) < 0 ? 1 : -1) };
      case 'seatedFree': return tiltTorso(pose, 14 * k * f, 'back');
      case 'standing': return tiltTorso(pose, 11 * k * f, 'back');
      case 'legs': return tiltTorso(pose, 16 * k * f, 'front');
      case 'hinge': return tiltTorso(pose, 9 * k * f, 'front');
      default: return pose;
    }
  };
  return safe(pose, mk);
}

export const MISTAKE_LIMITS = { tilt: 16, hip: 9, seg: SEG.torso };
