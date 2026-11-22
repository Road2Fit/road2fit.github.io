// Mesure de performance des sauts (4.52, demande de Gabin : « box jump en hauteur, pas en lest »).
// Pour ces exercices, la progression ne se lit pas dans le lest mais dans une hauteur ou une distance, en cm :
//  - 'setting' : réglage choisi AVANT la série (hauteur de la caisse du box jump, hauteur de chute du drop jump) :
//    il progresse par paliers quand les réceptions sont propres ;
//  - 'result'  : résultat mesuré APRÈS le saut (longueur du saut, hauteur sautée) : on note le meilleur de la séance.
// Rien à mesurer n'est obligatoire : sans valeur, l'exercice se note comme avant (séries × répétitions).
export const PERF = {
  ply_box_jump: { kind: 'setting', label: 'Hauteur de la caisse', short: 'caisse', step: 5, start: 40, min: 10, max: 150, test: 'Hauteur max sur la caisse' },
  ply_drop_jump: { kind: 'setting', label: 'Hauteur de chute', short: 'chute', step: 5, start: 30, min: 10, max: 100 },
  ply_broad_jump: { kind: 'result', label: 'Meilleur saut (longueur)', short: 'longueur', step: 5, min: 30, max: 400, test: 'Saut en longueur le plus long' },
  ply_single_leg_hop: { kind: 'result', label: 'Meilleur saut sur une jambe (longueur)', short: 'longueur', step: 5, min: 20, max: 300 },
  ply_cmj: { kind: 'result', label: 'Meilleure hauteur sautée', short: 'hauteur', step: 1, min: 5, max: 120, test: 'Saut vertical le plus haut', how: 'Mesure : marque au mur bras tendu au sol, puis au plus haut du saut ; l’écart = la hauteur sautée.' },
  ply_approach_jump: { kind: 'result', label: 'Meilleure hauteur sautée (avec élan)', short: 'hauteur', step: 1, min: 5, max: 130, how: 'Mesure : marque au mur bras tendu au sol, puis au plus haut du saut ; l’écart = la hauteur sautée.' },
  ply_block_jump: { kind: 'result', label: 'Meilleure hauteur sautée (contre)', short: 'hauteur', step: 1, min: 5, max: 120, how: 'Mesure : marque au mur bras tendus au sol, puis au plus haut du contre.' },
  ply_squat_jump: { kind: 'result', label: 'Meilleure hauteur sautée', short: 'hauteur', step: 1, min: 5, max: 100 },
};

export const perfOf = q => {
  const id = q && typeof q.catalogId === 'string' ? q.catalogId : null;
  return id && Object.prototype.hasOwnProperty.call(PERF, id) ? PERF[id] : null;
};
export const fmtCm = cm => { const n = Math.round(Number(cm) || 0); return n >= 200 ? `${String(n / 100).replace('.', ',')} m` : `${n} cm`; };

/** Valeurs notées (cm) des séances d'un exercice, de la plus ancienne à la plus récente : [{ date, cm }]. */
export const perfHistory = q => (q.history || []).filter(e => Number(e.perfCm) > 0 && e.date).map(e => ({ date: e.date, cm: Number(e.perfCm) })).sort((a, b) => a.date.localeCompare(b.date));
/** Meilleure valeur jamais notée (record), ou null. */
export const perfBest = q => { const h = perfHistory(q); return h.length ? h.reduce((b, x) => (x.cm > b.cm ? x : b)) : null; };

/**
 * Réglage proposé pour la prochaine séance (caisse, chute) : la dernière hauteur ; +1 palier si la dernière séance
 * a été notée facile (ressenti 6/10 ou moins, vraiment donné) et que toutes les séries prévues ont été faites.
 * Résultat (longueur, hauteur sautée) : rien à régler, on rappelle le record.
 */
export function perfTarget(q) {
  const p = perfOf(q);
  if (!p) return null;
  const h = perfHistory(q);
  const best = perfBest(q);
  if (p.kind === 'result') return { kind: p.kind, cm: null, best: best ? best.cm : null, reason: best ? `Record : ${fmtCm(best.cm)}. Note ton meilleur saut de la séance.` : 'Note ton meilleur saut de la séance (en cm) pour suivre tes progrès.' };
  const lastE = (q.history || []).filter(e => Number(e.perfCm) > 0).slice(-1)[0];
  const last = h.length ? h[h.length - 1].cm : Number(q.perfStart) || p.start;
  const easy = lastE && lastE.rpeSet && Number(lastE.rpe) <= 6 && (Number(lastE.validatedSets) || 0) >= (Number(lastE.goalSets) || 1);
  const cm = Math.min(p.max, last + (easy ? p.step : 0));
  return { kind: p.kind, cm, best: best ? best.cm : null, reason: easy ? `${p.label} : ${fmtCm(cm)} (+${p.step} cm : ta dernière séance était facile et propre).` : `${p.label} : ${fmtCm(cm)}. Monte de ${p.step} cm quand toutes tes réceptions sont propres et faciles.` };
}
