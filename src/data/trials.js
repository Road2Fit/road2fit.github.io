// Épreuves de rang : pour franchir un nouveau rang, il ne suffit pas d'avoir assez d'EXP, il faut aussi
// réussir une épreuve (séances, régularité, exercices montés de niveau, calories). Tant qu'elle n'est pas réussie,
// le niveau reste bloqué juste avant le rang ; l'EXP gagnée continue de s'accumuler en réserve.
import { getAllEntries } from '../lib/quests';
import { weekStreak } from '../lib/xp';

/**
 * Conditions par rang (clé = niveau du rang). Simplifiées le 03/11/2026 (Gabin bloqué avec 15 000 EXP) : peu de conditions,
 * atteignables avec une pratique régulière ; et au-delà de MAX_RESERVE EXP en réserve, le rang est franchi tout seul (lib/levels.js).
 */
export const RANK_TRIALS = {
  4: { days: 2 },
  8: { days: 6, streak: 2 },
  14: { days: 15, streak: 3 },
  22: { days: 30, streak: 4, leveled: 2 },
  35: { days: 60, streak: 6, leveled: 4 },
  50: { days: 100, streak: 8, leveled: 6 },
};

const LABELS = {
  days: n => `${n} jours d’entraînement`,
  streak: n => `${n} semaines d’affilée avec au moins une séance`,
  leveled: n => `${n} exercices passés au niveau 2 ou plus`,
  kcal: n => `${n.toLocaleString('fr-FR')} kcal brûlées au total`,
};

/** Avancement d'une épreuve : liste de tâches (valeur actuelle / objectif) et réussite globale. */
export function evaluateTrial(minLevel, state, today) {
  const rules = RANK_TRIALS[minLevel] || {};
  const entries = getAllEntries(state);
  const values = {
    days: new Set(entries.map(e => e.date)).size,
    streak: weekStreak(state, today),
    leveled: (state.quests || []).filter(q => (Number(q.level) || 1) >= 2).length,
    kcal: Math.round(entries.reduce((sum, e) => sum + (Number(e.calories) || 0), 0)),
  };
  const tasks = Object.entries(rules).map(([key, target]) => ({
    key,
    label: LABELS[key](target),
    current: Math.min(values[key], target),
    target,
    done: values[key] >= target,
  }));
  return { tasks, done: tasks.every(t => t.done) };
}
