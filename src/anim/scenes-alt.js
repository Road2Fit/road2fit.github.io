import { G, line, pad, plates, pulley, rect, txt } from './kit';

// Vues supplémentaires (de face ou de dos) pour les exercices dont le mouvement est masqué de profil :
// bras qui s'ouvrent sur les côtés, bras tendus qui se ressemblent, largeur de prise, trajet des coudes…
// Repère : bonhomme de face, centré en x = 160 ; la main / le pied DROIT est donné, le gauche est son miroir.
const C = 160;
const F = (hy, o = {}) => ({ c: C, hipY: hy, ...o });
const bar = (at = 'wrist', o = {}) => ({ k: 'hbar', at, ...o });
const floorRect = (w = 120) => rect(C - w / 2, G - 6, w, 6, '#334155', 2);
const seat = (hy = 150, w = 60) => [pad([C - w / 2, hy + 8], [C + w / 2, hy + 8], 10), line([C, hy + 14], [C, G - 4], 4, '#334155'), floorRect(100)];

// ---------------- Allongé : vue depuis les pieds (développés, écartés) ----------------
const benchEnd = () => [pad([C - 22, 152], [C + 22, 152], 10), line([C - 14, 158], [C - 14, G], 3), line([C + 14, 158], [C + 14, G], 3), txt([C - 38, 190], 'vue depuis les pieds', 8, '#94a3b8')];
const lyingBase = { noLegs: true, noHead: true, box: [50, 50, 220, 160] };

export function lyingPressFront({ tool = 'barbell', grip = 34 }) {
  const mk = (y, g) => F(149, { bend: 1, hand: [C + g, y], handBend: 1 });
  return {
    view: 'front', ...lyingBase, trace: 'wrist', loop: 'pingpong',
    keys: [mk(122, grip), mk(86, grip - 2)],
    equip: tool === 'smith' ? [...benchEnd(), line([C - 56, 20], [C - 56, G], 3), line([C + 56, 20], [C + 56, G], 3)] : benchEnd(),
    follow: tool === 'db' ? [{ k: 'db', at: 'wrist', r: 9 }] : [bar('wrist', { ext: 14, r: 12 })],
  };
}

export function lyingFlyFront() {
  const mk = (x, y) => F(149, { bend: 1, hand: [C + x, y], handBend: 1 });
  return { view: 'front', ...lyingBase, trace: 'wrist', loop: 'pingpong', keys: [mk(66, 138), mk(46, 106), mk(12, 88)], equip: benchEnd(), follow: [{ k: 'db', at: 'wrist', r: 9 }] };
}

// ---------------- Machines de poitrine (de face) ----------------
export function pecDeckFront() {
  const hy = 150;
  const mk = x => F(hy, { hand: [C + x, 106], handBend: 1, knee: [C + 22, hy] });
  return {
    view: 'front', trace: 'wrist', loop: 'pingpong', keys: [mk(70), mk(12)],
    equip: [...seat(hy), pad([C - 18, 128], [C + 18, 128], 9, true), plates(40, 40, 18, 100, 3), plates(262, 40, 18, 100, 3)],
    follow: [{ k: 'padAt', at: 'elbow', dx: -3, dy: -14, w: 8, h: 28 }, { k: 'handle', at: 'wrist' }],
  };
}

export function chestMachineFront({ hammer = false }) {
  const hy = 150;
  const mk = (x, y) => F(hy, { hand: [C + x, y], handBend: 1, knee: [C + 22, hy] });
  return {
    view: 'front', trace: 'wrist', loop: 'pingpong', keys: [mk(52, 112), mk(20, 104)],
    equip: [...seat(hy), pad([C - 18, 120], [C + 18, 120], 9, true), txt([C - 56, -6], hammer ? 'bras indépendants (iso-latéral) : trajet convergent' : 'trajet guidé, mains qui se rapprochent', 8, '#94a3b8')],
    follow: [{ k: 'handle', at: 'wrist' }],
  };
}

export function cableFlyFront() {
  const mk = (x, y) => F(112, { hand: [C + x, y], handBend: 1, foot: [C + 14, 194] });
  const pol = [C + 96, 2];
  return {
    view: 'front', trace: 'wrist', loop: 'pingpong', keys: [mk(72, 60), mk(8, 120)],
    equip: [line([C - 96, 2], [C - 96, G], 4), line([C + 96, 2], [C + 96, G], 4), pulley([C - 96, 2], 6), pulley([C + 96, 2], 6), plates(36, 40, 16, 110, 3), plates(268, 40, 16, 110, 3), floorRect(240)],
    follow: [{ k: 'cable', from: pol, at: 'wrist' }, { k: 'handle', at: 'wrist' }],
  };
}

// ---------------- Tractions (de dos) ----------------
export function pullUpBack({ grip = 36, assisted = false, hang = false }) {
  const mk = (hy, lift = 0) => F(hy, { lift, hand: [C + grip, 8], handBend: 1, knee: [C + 8, hy + 34] });
  const keys = hang ? [mk(110, 0), mk(106, 6)] : [mk(110), mk(75)];
  return {
    view: 'front', back: true, trace: 'shoulder', loop: 'pingpong', keys, hold: hang,
    equip: [line([C - 56, 8], [C + 56, 8], 4), line([C - 56, 8], [C - 56, G], 4), line([C + 56, 8], [C + 56, G], 4), txt([C - 30, 196], assisted ? 'contrepoids : genoux sur le support' : 'vue de dos', 8, '#94a3b8')],
    follow: [],
  };
}

// ---------------- Tirages verticaux (de face) ----------------
export function pulldownFront({ grip = 38 }) {
  const hy = 150;
  const mk = (x, y) => F(hy, { hand: [C + x, y], handBend: 1, knee: [C + 22, hy] });
  return {
    view: 'front', trace: 'wrist', loop: 'pingpong', keys: [mk(grip, 46), mk(Math.max(12, grip - 6), 112)],
    equip: [...seat(hy), pad([C - 30, hy - 6], [C + 30, hy - 6], 8, true), line([C - 40, -14], [C + 40, -14], 3), pulley([C, -14], 6)],
    follow: [{ k: 'cable', from: [C + 6, -14], at: 'wrist' }, { k: 'handle', at: 'wrist' }],
  };
}

// ---------------- Rowings (de dos / de face) ----------------
export function rowBack({ tool = 'barbell' }) {
  const mk = (x, y) => F(112, { bend: 1, hand: [C + x, y], handBend: -1, foot: [C + 16, 194] });
  const keys = [mk(24, 158), mk(32, 116)];
  if (tool === 'db') {
    const mkd = (x, y) => F(112, { bend: 1, hand: [C + x, y], handL: [C - 44, 134], handBend: -1, foot: [C + 16, 194] });
    return {
      view: 'front', back: true, trace: 'wrist', loop: 'pingpong', keys: [mkd(24, 158), mkd(34, 118)],
      equip: [pad([C - 76, 140], [C - 28, 140], 9), line([C - 68, 145], [C - 68, G], 3), line([C - 36, 145], [C - 36, G], 3)],
      follow: [{ k: 'db', at: 'wrist', r: 9, side: 'R' }],
    };
  }
  return { view: 'front', back: true, trace: 'wrist', loop: 'pingpong', keys, equip: [], follow: [bar('wrist', { ext: 12, r: tool === 'tbar' ? 8 : 12, plates: tool !== 'tbar' })] };
}

export function seatedRowFront({ hammer = false }) {
  const hy = 150;
  const mk = (x, y) => F(hy, { hand: [C + x, y], handBend: -1, knee: [C + 22, hy] });
  return {
    view: 'front', trace: 'wrist', loop: 'pingpong', keys: [mk(12, 118), mk(28, 126)],
    equip: [...seat(hy), pad([C - 24, 124], [C + 24, 124], 8, true), hammer ? txt([C - 56, -6], 'bras indépendants (iso-latéral)', 8, '#94a3b8') : txt([C - 40, -6], 'les coudes passent derrière le dos', 8, '#94a3b8')],
    follow: [{ k: 'handle', at: 'wrist' }],
  };
}

// ---------------- Développés épaules (de face) ----------------
export function overheadFront({ tool = 'barbell' }) {
  const seated = tool !== 'barbell' && tool !== 'smith';
  const hy = seated ? 150 : 112;
  const base = seated ? { knee: [C + 22, hy] } : { foot: [C + 14, 194] };
  const sy = hy - 52 + 4;
  const mk = (x, y) => F(hy, { hand: [C + x, y], handBend: 1, ...base });
  const keys = tool === 'arnold'
    ? [mk(8, sy + 10), mk(36, sy + 4), mk(24, sy - 52)]
    : [mk(30, sy - 2), mk(22, sy - 54)];
  return {
    view: 'front', trace: 'wrist', loop: 'pingpong', keys,
    equip: seated ? seat(hy) : tool === 'smith' ? [line([C - 50, -20], [C - 50, G], 3), line([C + 50, -20], [C + 50, G], 3)] : [floorRect(80)],
    follow: tool === 'barbell' || tool === 'smith' ? [bar('wrist', { ext: 16, r: 11 })] : tool === 'db' || tool === 'arnold' ? [{ k: 'db', at: 'wrist', r: 9 }] : [{ k: 'handle', at: 'wrist' }],
  };
}

export function facePullFront() {
  const mk = (x, y) => F(112, { hand: [C + x, y], handBend: 1, foot: [C + 14, 194] });
  return {
    view: 'front', trace: 'wrist', loop: 'pingpong', keys: [mk(14, 70), mk(26, 42)],
    equip: [floorRect(80), txt([C - 48, -8], 'la corde vient vers le visage', 8, '#94a3b8')],
    follow: [{ k: 'cable', from: [C + 2, 62], at: 'wrist', dash: '2 3' }, { k: 'handle', at: 'wrist' }],
  };
}

export function uprightRowFront() {
  const hy = 112;
  const mk = arm => F(hy, { arm, foot: [C + 14, 194] });
  return {
    view: 'front', trace: 'wrist', loop: 'pingpong', keys: [mk([95, 85]), mk([-22, 128])],
    equip: [floorRect(80)], follow: [bar('wrist', { ext: 10, r: 8 })],
  };
}

// ---------------- Squat (de face : genoux dans l'axe des pieds) ----------------
export function squatFrontView({ tool = 'barbell' } = {}) {
  // le genou reste au-dessus du pied (tibia vertical) : en bas, cuisses presque horizontales vues de face
  const handFor = (hy, bend) => {
    const sy = hy - 52 * (1 - 0.75 * bend);
    if (tool === 'goblet') return [C + 7, sy + 22];
    if (tool === 'free') return [C + 26, sy + 8]; // mains aux poignées, à hauteur d'épaules
    return [C + 36, sy + 6];
  };
  const mk = (hy, bend, kx, ky) => F(hy, { bend, knee: [C + kx, ky], hand: handFor(hy, bend), handBend: 1 });
  return {
    view: 'front', trace: 'shoulder', loop: 'pingpong', keys: [mk(112, 0, 13, 152), mk(152, 0.4, 27, 154)],
    equip: [floorRect(120), txt([C - 56, -8], 'genoux dans l’axe des pieds', 8, '#94a3b8')],
    follow: tool === 'goblet' ? [{ k: 'ball', at: 'wrist', r: 8, dx: -7, side: 'R' }] : tool === 'free' ? [] : [bar('shoulder', { dy: -5, ext: 22, r: 11 })],
  };
}

// ---------------- Fentes (de face) : le buste descend à la verticale, le genou reste dans l'axe du pied ----------------
export function lungeFront({ barbell = false } = {}) {
  const mk = hy => F(hy, { knee: [C + 15, 152], hand: barbell ? [C + 36, hy - 46] : [C + 25, hy + 6], handBend: 1 });
  return {
    view: 'front', trace: 'shoulder', loop: 'pingpong', keys: [mk(112), mk(142)],
    equip: [floorRect(110)],
    follow: barbell ? [bar('shoulder', { dy: -5, ext: 22, r: 11 })] : [{ k: 'db', at: 'wrist', r: 7 }],
  };
}

// ---------------- Extension nuque (de dos) : les coudes restent hauts, les mains descendent derrière la tête ----------------
export function overheadExtBack({ cable = false } = {}) {
  const mk = (x, y) => F(112, { hand: [C + x, y], handBend: -1 });
  return {
    view: 'front', back: true, trace: 'wrist', loop: 'pingpong', keys: [mk(12, 46), mk(9, 12)],
    equip: cable ? [floorRect(100), { k: 'pulley', c: [C, 182], r: 6 }] : [floorRect(100)],
    follow: cable ? [{ k: 'cable', from: [C, 182], at: 'wrist' }, { k: 'handle', at: 'wrist' }] : [{ k: 'db', at: 'wrist', r: 7 }],
  };
}

// ---------------- Mollets debout (de dos) : les talons montent, les jambes restent tendues ----------------
export function calfBack() {
  const mk = (hy, fy) => F(hy, { foot: [C + 11, fy], handBend: 1, hand: [C + 25, hy + 6] });
  return {
    view: 'front', back: true, trace: 'ankle', loop: 'pingpong', keys: [mk(110, 192), mk(100, 182)],
    equip: [floorRect(110)],
    follow: [],
  };
}

// ---------------- Pompes et dips (de face) ----------------
export function pushUpFront({ narrow = false }) {
  const g = narrow ? 8 : 34;
  const mk = hy => F(hy, { bend: 1, hand: [C + g, 196], handBend: -1 });
  return {
    view: 'front', noLegs: true, trace: 'shoulder', loop: 'pingpong', keys: [mk(151), mk(181)],
    equip: [floorRect(160), txt([C - 56, 14], 'vue depuis la tête', 8, '#94a3b8')], follow: [],
  };
}

export function dipsFront() {
  const mk = hy => F(hy, { hand: [C + 31, 124], handBend: -1 });
  return {
    view: 'front', noLegs: true, trace: 'shoulder', loop: 'pingpong', keys: [mk(118), mk(148)],
    equip: [pad([C - 42, 128], [C - 22, 128], 7), pad([C + 22, 128], [C + 42, 128], 7), line([C - 32, 132], [C - 32, G], 4), line([C + 32, 132], [C + 32, G], 4)], follow: [],
  };
}

// ---------------- Abduction de hanche (machine multi-hanche, de face) ----------------
export function multiHipFront() {
  const mk = x => F(110, { hand: [C + 26, 112], handBend: 1, foot: [C + x, x > 20 ? 176 : 194], footL: [C - 14, 194] });
  return {
    view: 'front', trace: 'ankle', loop: 'pingpong', keys: [mk(14), mk(60)],
    equip: [floorRect(160), pad([C - 40, 120], [C - 40, 160], 7, true)], follow: [],
  };
}

// ---------------- Soulevé de terre : vue de face (barre contre les cuisses, genoux alignés sur les pieds) ----------------
export function deadliftFront({ sumo = false } = {}) {
  const kx = C + (sumo ? 46 : 18); // genou : tibias verticaux (les cuisses partent vers la caméra, donc raccourcies)
  const hx = C + (sumo ? 14 : 24);
  const foot = sumo ? { foot: [kx, 194] } : {};
  const bottom = F(134, { bend: 0.8, knee: [kx, 152], hand: [hx, 168], handBend: 1, ...foot });
  const top = F(112, { knee: sumo ? [C + 28, 153] : [kx, 152], hand: [hx, 118], handBend: 1, ...foot });
  return {
    view: 'front', trace: 'wrist', loop: 'pingpong', keys: [bottom, top],
    equip: [floorRect(sumo ? 150 : 110)],
    follow: [bar('wrist', { ext: 16, r: 15, dy: 0 })],
  };
}

// ---------------- Curl : vue de face (les coudes restent le long du corps ; en alternance : un bras monte pendant que l'autre descend) ----------------
export function curlFront({ alternate = false } = {}) {
  const down = [C + 24, 116];
  const up = [C + 33, 74];
  const both = (r, l) => F(112, { hand: r, handL: [2 * C - l[0], l[1]], handBend: 1 });
  const keys = alternate ? [both(up, down), both(down, up)] : [both(down, down), both(up, up)];
  return {
    view: 'front', trace: 'wrist', loop: 'pingpong', keys,
    equip: [floorRect(100)],
    follow: alternate ? [{ k: 'db', at: 'wrist', r: 7 }] : [bar('wrist', { ext: 12, r: 6 })],
  };
}

// ---------------- Shrugs : vue de face (les épaules montent vers les oreilles, bras tendus) ----------------
export function shrugFront() {
  const mk = lift => F(112, { lift, hand: [C + 25, 116 - lift], handBend: 1 });
  return {
    view: 'front', trace: 'shoulder', loop: 'pingpong', keys: [mk(0), mk(12)],
    equip: [floorRect(100)],
    follow: [{ k: 'db', at: 'wrist', r: 8 }],
  };
}

// ---------------- Vues de DESSUS : exercices de rotation et d'anti-rotation ----------------
const TOPY = 120;
const rotOf = (th, x, y) => {
  const a = (th * Math.PI) / 180;
  return [C + x * Math.cos(a) - y * Math.sin(a), TOPY - 4 + x * Math.sin(a) + y * Math.cos(a)];
};
const topPose = (th, hand, handL) => ({ c: C, hipY: TOPY, twist: th, hand, handL, handBend: 1 });

export function rotaryTop() {
  const mk = th => ({ ...topPose(th, rotOf(th, 8, -26), rotOf(th, -8, -26)), handBend: -1 });
  return {
    view: 'top', box: [70, 24, 180, 135], legs: 'seated', trace: 'wrist', loop: 'pingpong', keys: [mk(-38), mk(0), mk(38)],
    equip: [rect(C - 30, TOPY - 14, 60, 40, '#334155', 10), txt([76, 36], 'vue de dessus : seuls les épaules', 7, '#94a3b8'), txt([76, 46], 'et le buste tournent, le bassin reste fixe', 7, '#94a3b8')],
    follow: [],
  };
}

export function woodchopTop() {
  const mk = th => topPose(th, rotOf(th, 4, -46), rotOf(th, -6, -46));
  return {
    view: 'top', box: [70, 24, 180, 135], legs: 'standing', trace: 'wrist', loop: 'pingpong', keys: [mk(34), mk(0), mk(-34)],
    equip: [pulley([C + 84, 40], 7), txt([76, 36], 'vue de dessus : le buste pivote,', 7, '#94a3b8'), txt([76, 46], 'les pieds restent fixes', 7, '#94a3b8')],
    follow: [{ k: 'handle', at: 'wrist' }, { k: 'cable', from: [C + 84, 40], at: 'wrist', dash: '2 3' }],
  };
}

export function pallofTop() {
  const mk = reach => topPose(0, [C + 3, TOPY - 4 - reach], [C - 3, TOPY - 4 - reach]);
  return {
    view: 'top', box: [70, 24, 180, 135], legs: 'standing', trace: 'wrist', loop: 'pingpong', keys: [mk(16), mk(46)],
    equip: [pulley([C + 84, TOPY - 16], 7), txt([76, 36], 'vue de dessus : le câble tire sur le côté,', 7, '#94a3b8'), txt([76, 46], 'le buste résiste et ne tourne pas', 7, '#94a3b8')],
    follow: [{ k: 'handle', at: 'wrist' }, { k: 'cable', from: [C + 84, TOPY - 16], at: 'wrist', dash: '2 3' }],
  };
}
