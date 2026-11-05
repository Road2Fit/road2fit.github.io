// Repos entre les séries, calculé pour chaque exercice d'après ce qui est proposé (répétitions visées = charge relative,
// taille de l'exercice, chronométré ou non).
// Ce que disent les revues :
//  - Singer et al. 2024, Frontiers in Sports and Active Living (revue et méta-analyse bayésienne, 9 études) : petit gain
//    de muscle en se reposant plus de 60 s ; pas de différence nette au-delà de 90 s ;
//  - Grgic et al. 2018, Sports Medicine (revue, 23 études) : pour la force, plus de 2 min chez les pratiquants entraînés ;
//    60 à 120 s suffisent chez les débutants ;
//  - Schoenfeld et al. 2016, J Strength Cond Res (essai, hommes entraînés, 3 séries de 8 à 12 RM) : 3 min de repos ont donné
//    plus de force et de muscle que 1 min ;
//  - de Salles et al. 2009, Sports Medicine (revue, 35 études) : à 50-90 % du max, 3 à 5 min permettent de refaire plus de
//    répétitions sur plusieurs séries.
// Repères de l'appli (pratiques, pas des frontières) : plus la charge est lourde (peu de répétitions) et plus l'exercice
// mobilise de muscles (squat, soulevé de terre, tractions, développés…), plus le repos est long ; les exercices d'isolation
// légers et les petits muscles récupèrent plus vite. Jamais moins de 60 s pour une série de travail.

import { stripAccents } from '../lib/text';

const BIG_LOWER = /squat|souleve|terre|presse|hack|fente|hip thrust|good morning|romanian|rdl/;
const BIG = /squat|souleve|terre|presse|hack|fente|hip thrust|good morning|developpe|rowing|tirage|traction|dips|pompes|muscle.?up|chin|pull/;
const SMALL = /mollet|biceps|curl|triceps|elevation|oiseau|face pull|rotation|avant.?bras|poignet|shrug|haussement|crunch|abdo|gainage|planche|releve|obliques/;

const round15 = s => Math.round(s / 15) * 15;

/**
 * Repos conseillé (secondes) pour un exercice.
 * @param {{ name: string, reps?: number, timed?: boolean, compound?: boolean, arena?: string }} ex
 * @returns {{ sec: number, why: string }}
 */
export function restFor({ name = '', reps = 10, timed = false, compound, arena = '' } = {}) {
  const n = stripAccents(String(name).toLowerCase());
  if (timed) return { sec: 60, why: 'exercice tenu : 1 min suffit pour refaire une tenue de même durée' };
  const r = Math.max(1, Number(reps) || 10);
  const big = !SMALL.test(n) && (compound !== undefined ? !!compound : BIG.test(n)); // « mollets à la presse » reste un petit muscle
  const lower = big && (BIG_LOWER.test(n) || /jambe/i.test(arena));
  const small = !big && (SMALL.test(n) || /abdo/i.test(arena));

  // base selon la charge relative (répétitions visées)
  let sec = r <= 5 ? 180 : r <= 8 ? 150 : r <= 12 ? 105 : r <= 15 ? 90 : 75;
  if (big) sec += 30; // gros exercice poly-articulaire : plus long à récupérer (Schoenfeld 2016, de Salles 2009)
  if (lower && r <= 12) sec += 30; // squat, soulevé de terre, presse : très exigeants pour tout le corps
  if (small) sec -= r <= 8 ? 15 : 30; // petits muscles, isolation : récupération plus rapide
  sec = Math.min(big ? 300 : 180, Math.max(60, round15(sec)));
  // abdos et gainage : petits muscles qui récupèrent vite, charge légère → 1 min à 1 min 30, jamais plus
  if (/crunch|abdo|gainage|planche|releve|obliques|roue/.test(n) || /abdo|oblique/i.test(arena)) sec = Math.min(sec, 90);

  const heavy = r <= 5 ? 'charge lourde' : r <= 8 ? 'charge assez lourde' : r <= 12 ? 'charge modérée' : 'charge légère';
  const kind = lower ? 'gros exercice de jambes' : big ? 'exercice qui sollicite plusieurs muscles' : small ? 'petit muscle' : 'exercice d’isolation';
  return { sec, why: `${heavy} (${r} reps), ${kind}` };
}

/** « 2 min 30 », « 45 s » */
export function restText(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const rest = s % 60;
  if (!m) return `${rest} s`;
  return rest ? `${m} min ${rest}` : `${m} min`;
}
