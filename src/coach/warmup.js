import { coachRound, coachStep } from './settings';
import { coarseOf } from '../data/muscles';

// Échauffement d'un exercice de la séance guidée : 1 ou 2 séries légères avant les séries de travail.
//  - charge : montée progressive vers la charge de travail (pourcentages usuels : ~50 % × 8, puis 70-80 % × 3-5),
//    2 séries pour le premier exercice d'une arène (muscles encore froids) si la charge compte, sinon 1 seule série ;
//  - exercice déjà « chaud » (un exercice de la même arène est passé avant) ou charge légère : 1 série à ~60 % ;
//  - travail lourd (≤ 6 reps ou profil Puissance) : séries plus proches de la charge, moins de répétitions ;
//  - aide élastique : 1 série avec plus d'aide ; poids du corps / chronométré : 1 série à ~la moitié du travail.
// Les séries d'échauffement ne sont jamais enregistrées dans l'historique (ni EXP, ni calories, ni coach).

const round5 = x => Math.max(5, Math.round(x / 5) * 5);

/** @returns {{ load?, assist?, reps, restSec, label }[]} */
export function warmupSets(item, previousItems = [], loadNow, assistNow) {
  if (!item) return [];
  const firstWork = Number(item.targetReps && item.targetReps[0]) || Number(item.goalReps) || 8;
  const warm = previousItems.some(p => coarseOf(p.arena) === coarseOf(item.arena)); // un seul échauffement par grande région, même en mode optimisé

  if (item.timed) {
    return [{ reps: round5(firstWork * 0.5), restSec: 30, label: 'Tenue facile' }];
  }

  if (item.kind === 'load') {
    const W = Number(loadNow !== undefined ? loadNow : item.load) || 0;
    if (!(W > 0)) return [];
    const step = coachStep({ catalogId: '', name: item.name }, W);
    const heavy = firstWork <= 6 || item.profile === 'puissance';
    const plan = [];
    if (!warm && W >= 15 && (item.compound || W >= 40)) {
      plan.push({ pct: 0.5, reps: 8, restSec: 45 });
      plan.push(heavy ? { pct: 0.8, reps: 3, restSec: 60 } : { pct: 0.7, reps: 5, restSec: 60 });
    } else if (W >= 15) {
      plan.push(heavy ? { pct: 0.7, reps: 4, restSec: 45 } : { pct: 0.6, reps: 6, restSec: 45 });
    } else {
      plan.push({ pct: 0.5, reps: 10, restSec: 30 });
    }
    const out = [];
    for (const p of plan) {
      const load = Math.max(step, coachRound(W * p.pct, step));
      if (load >= W) continue; // jamais aussi lourd que le travail
      if (out.length && out[out.length - 1].load >= load) continue;
      out.push({ load, reps: p.reps, restSec: p.restSec, label: `${p.reps} reps à ${load} kg` });
    }
    return out;
  }

  const A0 = Number(assistNow !== undefined ? assistNow : item.assist) || 0;
  // aide élastique : un peu plus d'aide ; lesté (aide négative) : échauffement au poids du corps, plus bas
  if (item.kind === 'assisted' && A0 > 0) {
    const A = A0;
    const assist = A + 10;
    const reps = Math.max(3, Math.round(firstWork * 0.5));
    return [{ assist, reps, restSec: 45, label: `${reps} reps avec ${assist} kg d’aide` }];
  }

  // poids du corps
  const reps = Math.max(3, Math.round(firstWork * 0.5));
  return [{ reps, restSec: 30, label: `${reps} reps faciles` }];
}
