// Type d'une séance de musculation d'après ses exercices (règle de Gabin, 08/11/2026) :
// on compte les exercices du haut du corps et ceux du bas du corps (les abdos ne comptent ni pour l'un ni pour l'autre) ;
// plus de 70 % en haut → « Haut du corps », plus de 70 % en bas → « Bas du corps », sinon (≈ 50/50) → « Corps entier ».
import { arenaOf, isAbsArena, isLegArena } from '../data/muscles';

export const FOCUS = {
  upper: { id: 'upper', label: 'Haut du corps' },
  lower: { id: 'lower', label: 'Bas du corps' },
  full: { id: 'full', label: 'Corps entier' },
};

/** items : exercices d'une séance (avec `arena`) ou quêtes. → { id, label, upper, lower, upperPct } ou null si rien à compter. */
export function sessionFocus(items) {
  let upper = 0;
  let lower = 0;
  (items || []).forEach(x => {
    if (!x) return;
    const a = x.arena || arenaOf(x);
    if (!a || isAbsArena(a)) return;
    if (isLegArena(a)) lower += 1;
    else upper += 1;
  });
  const total = upper + lower;
  if (!total) return null;
  const upperPct = upper / total;
  const f = upperPct > 0.7 ? FOCUS.upper : upperPct < 0.3 ? FOCUS.lower : FOCUS.full;
  return { ...f, upper, lower, upperPct };
}
