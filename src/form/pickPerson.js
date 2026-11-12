// Choisir la bonne personne quand la caméra en voit plusieurs (4.31, retour de Gabin : l'appli comptait parfois quelqu'un
// à l'arrière-plan). Le détecteur cherche jusqu'à MAX_POSES personnes ; on garde :
//  - avant l'enregistrement : la plus GRANDE à l'image (la plus proche du téléphone = celle qui se filme) ;
//  - pendant l'enregistrement : la MÊME personne d'une image à l'autre (centre proche de celui de l'image d'avant), sauf si
//    une autre devient nettement plus grande (la personne suivie était en fait derrière).
export const MAX_POSES = 3;
const NEAR = 0.6; // déplacement max d'une image à l'autre, en tailles de corps
const BIGGER = 1.6; // une autre personne bien plus grande reprend la main

/** Taille et centre d'une personne (repères assez visibles), en hauteurs d'image. */
export function personBox(lm, aspect = 9 / 16) {
  if (!lm || !lm.length) return null;
  let pts = lm.filter(p => (p.visibility ?? 1) >= 0.5);
  if (pts.length < 6) pts = lm;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { const x = p.x * aspect; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, size: Math.hypot(x1 - x0, y1 - y0) };
}

/**
 * poses = [{ lm, wl }] ; prev = dernière personne suivie ({ cx, cy, size }) ou null ; follow = suivre la même personne.
 * Renvoie { pose, track } (pose = null si personne).
 */
export function pickPerson(poses, aspect, prev = null, follow = false) {
  const list = (poses || []).map(p => ({ p, b: personBox(p.lm, aspect) })).filter(x => x.b);
  if (!list.length) return { pose: null, track: prev };
  const biggest = list.reduce((a, b) => (b.b.size > a.b.size ? b : a));
  let pick = biggest;
  if (follow && prev) {
    const near = list
      .map(x => ({ ...x, d: Math.hypot(x.b.cx - prev.cx, x.b.cy - prev.cy) / (prev.size || 0.3) }))
      .filter(x => x.d < NEAR && x.b.size > prev.size * 0.6 && x.b.size < prev.size * 1.67) // même endroit ET même taille
      .sort((a, b) => a.d - b.d)[0];
    if (near && !(biggest !== near && biggest.b.size > near.b.size * BIGGER)) pick = near;
    // la personne suivie a disparu et il ne reste que quelqu'un de plus petit (au fond) : on ne le suit pas
    else if (!near && biggest.b.size < prev.size * 0.6) return { pose: null, track: prev };
  }
  return { pose: pick.p, track: pick.b };
}
