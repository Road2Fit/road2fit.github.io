// Téléphone tenu couché (4.48.4, retour de Gabin : « des fois je filme le téléphone à l'horizontale, même si pour toi la
// vidéo est verticale »). L'écran de l'appli ne tourne pas : la vidéo reste en hauteur et la personne y apparaît tournée
// d'un quart de tour. Or l'analyse suppose que le haut de l'image est le haut du monde (pieds sous les hanches, barre
// au-dessus, hauteur des épaules…) : rejouées tournées, les séries debout de Gabin tombaient de 12 reps à 2 (pogo), de 8
// à rien (tractions). Le capteur de gravité du téléphone dit où est le haut ; l'analyse tourne les repères pour le
// remettre en haut. La vidéo, le squelette dessiné et les images gardées restent tels que filmés.

/** Quarts de tour (sens des aiguilles d'une montre) à appliquer au contenu de l'image pour remettre le haut en haut. */
export function rollFromGravity(g, { screenAngle = 0, front = false, ios = false } = {}) {
  if (!g || !Number.isFinite(g.x) || !Number.isFinite(g.y)) return null;
  // réaction à la gravité dans le repère du téléphone (x vers la droite de l'écran, y vers le haut) : pointe vers le haut
  // du monde. iOS donne les valeurs de signe opposé.
  let x = ios ? -g.x : g.x, y = ios ? -g.y : g.y;
  if (Math.hypot(x, y) < 4) return null; // téléphone presque à plat : on ne sait pas
  // écran tourné par le téléphone (rotation automatique) : l'image de la caméra suit l'écran
  const a = ((Number(screenAngle) || 0) * Math.PI) / 180;
  [x, y] = [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
  // haut du monde dans l'image (y de l'image vers le bas) ; caméra de face : image non retournée, gauche et droite inversées
  const ux = front ? -x : x, uy = -y;
  if (Math.abs(uy) >= Math.abs(ux)) return uy <= 0 ? 0 : 2;
  return ux < 0 ? 1 : 3; // haut à gauche : quart de tour à droite ; haut à droite : quart de tour à gauche
}

const turn = (x, y, k, flip) => {
  for (let i = 0; i < k; i++) [x, y] = flip ? [-y, x] : [1 - y, x];
  return [x, y];
};
/** Repères de l'image (x, y entre 0 et 1) tournés de k quarts de tour. */
export function rotateLm(lm, k) {
  if (!lm || !k) return lm;
  return lm.map(p => { if (!p) return p; const [x, y] = turn(p.x, p.y, k, false); return { ...p, x, y }; });
}
/** Repères 3D (mètres, centrés sur les hanches) tournés de k quarts de tour autour de l'axe de la caméra. */
export function rotateWl(wl, k) {
  if (!wl || !k) return wl;
  return wl.map(p => { if (!p) return p; const [x, y] = turn(p.x, p.y, k, true); return { ...p, x, y }; });
}
/** Images { t, lm, wl, all } tournées ; aspect = largeur / hauteur après rotation. */
export function rotateFrames(frames, k, aspect) {
  k = ((k | 0) % 4 + 4) % 4;
  if (!k) return { frames, aspect };
  const out = (frames || []).map(f => (f ? {
    ...f,
    lm: rotateLm(f.lm, k),
    wl: rotateWl(f.wl, k),
    all: f.all ? f.all.map(p => (p ? { ...p, lm: rotateLm(p.lm, k), wl: rotateWl(p.wl, k) } : p)) : f.all,
  } : f));
  return { frames: out, aspect: k % 2 ? 1 / aspect : aspect };
}

/**
 * Sens retenu pour l'analyse. Sécurité si un téléphone donne le capteur avec les signes inversés (tout serait à
 * l'envers) : « téléphone à l'envers » est traité comme droit, et pour un téléphone couché on garde le côté où la tête
 * est au-dessus des hanches quand le buste est vertical (une personne allongée ne tranche pas : on garde le capteur).
 */
export function settleRoll(frames, roll, aspect) {
  const k = ((roll | 0) % 4 + 4) % 4;
  if (k === 0 || k === 2) return 0;
  const { frames: fr } = rotateFrames(frames, k, aspect);
  let up = 0, down = 0;
  for (const f of fr) {
    const lm = f && f.lm;
    if (!lm || lm.length < 25) continue;
    const sy = (lm[11].y + lm[12].y) / 2, hy = (lm[23].y + lm[24].y) / 2;
    const sx = (lm[11].x + lm[12].x) / 2, hx = (lm[23].x + lm[24].x) / 2;
    const dy = sy - hy, dx = (sx - hx) * (k % 2 ? 1 / aspect : aspect);
    if (Math.abs(dy) < 2 * Math.abs(dx)) continue; // buste penché ou allongé
    if (dy < 0) up++; else down++;
  }
  return down >= 10 && down > 2 * up ? (k + 2) % 4 : k;
}

const isIOS = () => typeof navigator !== 'undefined' && /iP(hone|ad|od)/.test(navigator.userAgent || '');
const screenAngle = () => {
  try {
    if (typeof screen !== 'undefined' && screen.orientation && Number.isFinite(screen.orientation.angle)) return screen.orientation.angle;
    if (typeof window !== 'undefined' && Number.isFinite(window.orientation)) return window.orientation;
  } catch (e) { /* rien */ }
  return 0;
};

/**
 * Écoute le capteur de gravité. get() → { roll (quarts de tour ou null), g: [x, y, z] arrondis } ;
 * stop() arrête l'écoute. Sans capteur (ordinateur, iOS sans autorisation) : roll null → aucune rotation.
 */
export function gravityWatch({ front = false } = {}) {
  let g = null;
  const on = e => {
    const a = e && e.accelerationIncludingGravity;
    if (!a || a.x == null || a.y == null) return;
    const v = { x: +a.x, y: +a.y, z: +(a.z || 0) };
    g = g ? { x: g.x * 0.8 + v.x * 0.2, y: g.y * 0.8 + v.y * 0.2, z: g.z * 0.8 + v.z * 0.2 } : v; // lissé (secousses)
  };
  try { if (typeof window !== 'undefined') window.addEventListener('devicemotion', on); } catch (e) { /* rien */ }
  return {
    get() {
      const mock = typeof window !== 'undefined' && window.__r2fPoseMock;
      if (mock && mock.roll != null) return { roll: mock.roll, g: null }; // tests
      const ang = screenAngle();
      return { roll: rollFromGravity(g, { screenAngle: ang, front, ios: isIOS() }), g: g ? [g.x, g.y, g.z].map(v => Math.round(v * 10) / 10) : null, screen: ang };
    },
    stop() { try { window.removeEventListener('devicemotion', on); } catch (e) { /* rien */ } },
  };
}
