// Exercices au poids du corps : aide et lest sur une seule échelle (champ « aide » des exercices en répétitions).
//   aide > 0  : aide (élastique, machine d'assistance), en kg ;
//   aide = 0  : poids du corps seul ;
//   aide < 0  : LEST (ceinture, gilet), −10 = 10 kg ajoutés.
// La progression continue naturellement : moins d'aide → poids du corps → lest de plus en plus lourd.
// Les calculs de charge soulevée (lib/maxima.js : poids du corps − aide) restent justes avec une aide négative.

const n1 = x => String(Math.round(x * 10) / 10).replace('.', ',');

/** Texte court : « aide 10 kg », « lest +10 kg », « poids du corps ». */
export function assistText(a) {
  const v = Number(a) || 0;
  if (v > 0) return `aide ${n1(v)} kg`;
  if (v < 0) return `lest +${n1(-v)} kg`;
  return 'poids du corps';
}

/** Un exercice en répétitions avec de l'aide OU du lest se règle en kg (sinon : répétitions seules). */
export const hasAssistOrLoad = q => (Number(q.startAssistanceKg) || 0) !== 0 || (Number(q.currentAssistanceKg) || 0) !== 0 || (Number(q.goalAssistanceKg) || 0) < 0;

/**
 * Cran suivant quand toutes les répétitions sont réussies : moins d'aide, ou plus de lest.
 * goal = objectif d'aide de l'exercice (0 = sans aide ; négatif = lest visé).
 * @returns {{ value, reached, lest }} reached = objectif déjà atteint (on ne change rien)
 */
export function nextAssistDown(assist, goal = 0, extra = 0) {
  const a = Number(assist) || 0;
  const g = Number(goal) || 0;
  const dec = (Math.abs(a) >= 20 ? 5 : 2.5) + extra;
  // déjà lesté sans lest visé : on ajoute du lest sans limite ; sinon on descend jusqu'à l'objectif (0 = sans aide, négatif = lest visé)
  const floor = a < 0 && g >= 0 ? -Infinity : g;
  if (a <= floor) return { value: a, reached: true, lest: a < 0 || g < 0 };
  const value = Math.max(floor, a - dec);
  return { value, reached: false, lest: value < 0 };
}

/** Phrase de progression : « l’aide passe de 10 à 7,5 kg » / « le lest passe de +5 à +7,5 kg ». */
export function assistChangeText(from, to) {
  const f = Number(from) || 0;
  const t = Number(to) || 0;
  if (f <= 0 && t <= 0) return `le lest passe de +${n1(-f)} à +${n1(-t)} kg`;
  if (t < 0) return `l’aide disparaît et tu ajoutes ${n1(-t)} kg de lest`;
  return `l’aide passe de ${n1(f)} à ${n1(t)} kg`;
}
