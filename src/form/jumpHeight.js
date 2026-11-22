// Sauts filmés (4.53, demande de Gabin : « que l'analyse vidéo calcule la hauteur des sauts ») : compter les sauts et
// mesurer leur hauteur à partir du squelette (repères MediaPipe, images déjà remises à l'endroit par roll.js).
//
// Repères : y vers le BAS (0 = haut de l'image). Pieds = chevilles (27, 28), bassin = hanches (23, 24), tête = nez (0).
//  - Échelle : debout, la distance cheville → nez vaut ≈ 0,89 × la taille de la personne (proportions anthropométriques
//    usuelles : nez ≈ 93 % de la taille, cheville ≈ 4 %) ; sans taille connue, 175 cm.
//  - Un saut = les pieds quittent le niveau du sol (au-dessus d'un quart de jambe, ou corps qui sort de l'image juste
//    après une flexion), puis y reviennent. Rien ne compte s'il n'y a pas de retour au sol (fin de la vidéo).
//  - Hauteur sautée (saut vertical) : montée du bassin au-dessus de sa hauteur debout, au plus haut du saut (méthode
//    « déplacement du bassin ») ; au plus haut, la vitesse est nulle, donc même à 10-15 images par seconde le sommet est
//    bien saisi. C'est une ESTIMATION (≈ ± 3 à 5 cm) : la vidéo du téléphone ne vaut pas une plateforme de force.
//  - Box jump : hauteur de la caisse = différence entre le niveau des pieds au sol et sur la caisse (médiane des images
//    où la personne est debout sur la caisse).
const quantile = (arr, q) => { const s = arr.filter(Number.isFinite).sort((a, b) => a - b); if (!s.length) return NaN; const i = (s.length - 1) * q; const lo = Math.floor(i); return s[lo] + (s[Math.min(s.length - 1, lo + 1)] - s[lo]) * (i - lo); };

const mid = (a, b) => (a && b ? (a.y + b.y) / 2 : a ? a.y : b ? b.y : null);
const ok = p => !!p && (p.visibility === undefined || p.visibility > 0.3);
const median = a => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };

/** Séries utiles (bassin, pieds, tête) par image ; null quand le repère manque. */
function series(frames) {
  return frames.map(f => {
    const lm = f && f.lm;
    if (!lm) return { t: f ? f.t : 0, hip: null, ank: null, nose: null };
    const ank = mid(ok(lm[27]) ? lm[27] : null, ok(lm[28]) ? lm[28] : null);
    const hip = mid(ok(lm[23]) ? lm[23] : null, ok(lm[24]) ? lm[24] : null);
    return { t: f.t, hip, ank, nose: ok(lm[0]) ? lm[0].y : null };
  });
}

/**
 * @param frames images remises à l'endroit ({ t (ms ou s), lm })
 * @param opts { heightCm, box: true pour le box jump }
 * @returns { count, jumps: [{ t0, t1, cm }], avgCm, maxCm, boxCm, scale } ou null si les pieds ne sont pas visibles
 */
export function jumpMetrics(frames, { heightCm = 175, box = false } = {}) {
  if (!Array.isArray(frames) || frames.length < 10) return null;
  const S = series(frames);
  const tMs = S.length > 1 && S[S.length - 1].t - S[0].t > 300 ? 1 : 1000; // temps en ms (sinon en secondes)
  const sec = i => (S[i].t - S[0].t) / (tMs === 1 ? 1000 : 1);
  const ankAll = S.map(s => s.ank).filter(Number.isFinite);
  if (ankAll.length < 8) return null;
  const floor = quantile(ankAll, 0.75); // niveau des pieds au sol (y le plus bas la plupart du temps)
  const standIdx = S.map((s, i) => i).filter(i => Number.isFinite(S[i].ank) && Math.abs(S[i].ank - floor) < 0.03 && Number.isFinite(S[i].nose) && Number.isFinite(S[i].hip));
  if (standIdx.length < 5) return null;
  // debout ET droit : entre deux sauts on reste souvent penché (mains sur les genoux), la tête basse fausserait l'échelle
  const body = quantile(standIdx.map(i => S[i].ank - S[i].nose), 0.8); // cheville → nez debout (unités d'image)
  const upright = standIdx.filter(i => S[i].ank - S[i].nose >= 0.92 * body);
  const leg = median(upright.map(i => S[i].ank - S[i].hip));
  const hipStand = median(upright.map(i => S[i].hip));
  if (!(body > 0.1) || !(leg > 0.05)) return null;
  const H = Number(heightCm) > 100 && Number(heightCm) < 230 ? Number(heightCm) : 175;
  const cmPer = (0.89 * H) / body; // cm par unité d'image
  const off = i => {
    const s = S[i];
    if (Number.isFinite(s.ank)) return s.ank < floor - 0.25 * leg;
    return true; // corps sorti ou caché : en l'air ou sur la caisse, à confirmer par la durée
  };
  // épisodes « hors du sol » : commencent juste après le sol, finissent au retour au sol
  const eps = [];
  let i = 0;
  while (i < S.length) {
    if (!off(i)) { i++; continue; }
    const start = i;
    while (i < S.length && off(i)) i++;
    const end = i - 1;
    const before = start > 0 && !off(start - 1);
    const back = i < S.length;
    const dur = sec(end) - sec(start) + 0.05;
    const seen = S.slice(start, end + 1).filter(s => Number.isFinite(s.ank)).length;
    if (before && back && dur >= (box ? 0.3 : 0.15) && dur <= 8 && (box || seen >= 1)) eps.push({ start, end });
  }
  // deux épisodes séparés de moins de 0,4 s = le même saut (repère perdu une image)
  const merged = [];
  for (const e of eps) {
    const last = merged[merged.length - 1];
    if (last && sec(e.start) - sec(last.end) < 0.4) last.end = e.end; else merged.push({ ...e });
  }
  const jumps = merged.map(e => {
    let cm = null;
    if (box) {
      const top = S.slice(e.start, e.end + 1).map(s => s.ank).filter(v => Number.isFinite(v) && v < floor - 0.25 * leg);
      if (top.length) cm = Math.round((floor - median(top)) * cmPer);
    } else {
      const peak = Math.min(...S.slice(Math.max(0, e.start - 2), Math.min(S.length, e.end + 3)).map(s => s.hip).filter(Number.isFinite));
      // montée du bassin moins ce qu'il monte déjà pieds tendus au décollage (≈ 5 % de la taille)
      if (Number.isFinite(peak)) cm = Math.max(0, Math.round((hipStand - peak) * cmPer - 0.05 * H));
    }
    return { t0: Math.round(sec(e.start) * 100) / 100, t1: Math.round(sec(e.end) * 100) / 100, cm: cm && cm > 3 && cm < 200 ? cm : null };
  });
  const hs = jumps.map(j => j.cm).filter(Number.isFinite);
  return {
    count: jumps.length,
    jumps,
    avgCm: hs.length ? Math.round(hs.reduce((a, b) => a + b, 0) / hs.length) : null,
    maxCm: hs.length ? Math.max(...hs) : null,
    boxCm: box && hs.length ? Math.round(median(hs)) : null,
    scale: Math.round(cmPer),
  };
}
