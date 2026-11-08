// Calculateur de disques : quels disques mettre de chaque côté d'une barre olympique pour une charge donnée.
// Disques courants en salle (kg). Barre droite olympique : 20 kg (barre EZ, Smith, machines : pas de calcul, leur poids varie).
import { stripAccents } from './text';

export const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
export const BAR_KG = 20;

/** Exercice fait avec une barre droite olympique ? (d'après le nom) */
export function isBarbell(name) {
  const n = stripAccents(String(name || '').toLowerCase());
  if (/\bez\b|smith|guide|machine|poulie|traction|parallele|landmine|trap bar|hexagonale|haltere|kettlebell/.test(n)) return false;
  return /barre|souleve de terre|deadlift|hip thrust|militaire|epaule[- ]jete|epaule en force|arrache|clean|snatch|jerk|\bjete\b|push press|overhead squat|squat bras tendus|developpe couche prise serree|bench press|back squat|front squat|good morning|rowing pendlay|barbell/.test(n);
}

/** Disques d'un côté pour `total` kg (barre comprise). null si la charge est sous le poids de la barre.
 *  Renvoie { perSide: [25, 5, 1.25], rest } : rest = kg qu'on ne peut pas faire avec ces disques (0 en général). */
export function platesFor(total, bar = BAR_KG) {
  const t = Number(total) || 0;
  if (t < bar) return null;
  let side = Math.round(((t - bar) / 2) * 100) / 100;
  const perSide = [];
  for (const p of PLATES) {
    while (side + 1e-9 >= p) { perSide.push(p); side = Math.round((side - p) * 100) / 100; }
  }
  return { perSide, rest: Math.round(side * 2 * 100) / 100 };
}

/** Texte court : « 25 + 5 + 1,25 de chaque côté », « barre seule ». */
export function platesText(total, bar = BAR_KG) {
  const r = platesFor(total, bar);
  if (!r) return '';
  if (!r.perSide.length) return 'barre seule';
  const fmt = v => String(v).replace('.', ',');
  return `${r.perSide.map(fmt).join(' + ')} de chaque côté`;
}
