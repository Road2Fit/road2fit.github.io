// Zoom sur la personne avant la détection (4.47.8, retour de Gabin : « en vertical ça marche vraiment moins bien »).
// Le détecteur de MediaPipe réduit TOUTE l'image à un petit carré (≈ 224 px) pour trouver le corps : en vertical, une
// personne allongée (développé couché…) n'y occupe que la largeur de l'image, soit environ la moitié de ce qu'elle
// occupe en horizontal ; elle est alors mal trouvée dès qu'elle est perdue (barre devant le corps, saut…).
// Ici on découpe l'image autour de la personne suivie (avec une marge) et on donne ce morceau au détecteur : elle y
// paraît aussi grande quel que soit le sens du téléphone. Les repères sont ensuite remis dans l'image entière, donc
// l'analyse ne voit aucune différence. Découpe stable (changée seulement si la personne s'approche du bord ou change
// de taille), retour à l'image entière dès qu'on ne trouve plus personne dans le morceau.

export const CROP_MARGIN = 2; // côté du morceau = 2 × la diagonale du corps
export const CROP_USEFUL = 0.8; // morceau presque aussi grand que l'image : inutile, on garde l'image entière
export const CROP_LOST = 8; // images sans personne dans le morceau avant de revenir à l'image entière

/**
 * Morceau de l'image (en pixels) autour d'une personne. box = { cx, cy, size } en hauteurs d'image (x multiplié par
 * l'aspect, comme personBox). Renvoie { x, y, w, h } ou null (image entière).
 */
export function cropFor(box, vw, vh) {
  if (!box || !(box.size > 0) || !(vw > 0) || !(vh > 0)) return null;
  const side = box.size * vh * CROP_MARGIN;
  const w = Math.min(vw, side), h = Math.min(vh, side);
  if (w * h >= CROP_USEFUL * vw * vh) return null;
  const cx = box.cx * vh, cy = box.cy * vh; // x en hauteurs d'image → pixels
  const x = Math.max(0, Math.min(vw - w, cx - w / 2));
  const y = Math.max(0, Math.min(vh - h, cy - h / 2));
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

/** Le morceau actuel convient-il encore (personne loin des bords, même taille) ? */
export function cropStillFits(crop, box, vw, vh) {
  if (!crop || !box) return false;
  const cx = box.cx * vh, cy = box.cy * vh, half = (box.size * vh) / 2;
  const inX = cx - half >= crop.x + crop.w * 0.08 || crop.x === 0;
  const inX2 = cx + half <= crop.x + crop.w * 0.92 || crop.x + crop.w >= vw;
  const inY = cy - half >= crop.y + crop.h * 0.08 || crop.y === 0;
  const inY2 = cy + half <= crop.y + crop.h * 0.92 || crop.y + crop.h >= vh;
  const want = cropFor(box, vw, vh);
  if (!want) return false;
  const ratio = (want.w * want.h) / (crop.w * crop.h);
  return inX && inX2 && inY && inY2 && ratio > 0.6 && ratio < 1.6;
}

/** Repères trouvés dans le morceau → coordonnées de l'image entière (0-1). */
export function uncrop(lm, crop, vw, vh) {
  if (!lm || !crop) return lm;
  return lm.map(p => (p ? { ...p, x: (crop.x + p.x * crop.w) / vw, y: (crop.y + p.y * crop.h) / vh, z: p.z * (crop.w / vw) } : p));
}

/**
 * Suivi de la découpe d'une image à l'autre. next(box, found) : box = personne suivie (ou null), found = personne trouvée
 * à l'image précédente. Renvoie le morceau à utiliser pour l'image suivante (ou null).
 */
export function cropTracker() {
  let crop = null, lost = 0;
  return {
    get crop() { return crop; },
    next(box, found, vw, vh) {
      if (!found) {
        if (crop && ++lost >= CROP_LOST) { crop = null; lost = 0; }
        return crop;
      }
      lost = 0;
      if (!cropStillFits(crop, box, vw, vh)) crop = cropFor(box, vw, vh);
      return crop;
    },
    reset() { crop = null; lost = 0; },
  };
}
