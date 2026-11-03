// Épreuves de rang : pour franchir un nouveau rang, il ne suffit pas d'avoir assez d'EXP, il faut aussi
// réussir une épreuve (séances, régularité, exercices montés de niveau, calories). Tant qu'elle n'est pas réussie,
// le niveau reste bloqué juste avant le rang ; l'EXP gagnée continue de s'accumuler en réserve.
import { getAllEntries } from '../lib/quests';
import { weekStreak } from '../lib/xp';
import { getWeekStart } from '../lib/dates';

/**
 * Conditions par rang (clé = niveau du rang), recalculées le 03/11/2026 (Gabin bloqué avec 15 000 EXP) : une épreuve ne doit
 * pas pouvoir bloquer plus d'environ 2 500 EXP.
 *  - Seules des conditions qui avancent avec l'entraînement et ne reculent jamais : jours d'entraînement et semaines
 *    actives (au total, pas d'affilée). Les « semaines d'affilée » et les « exercices niveau 2 » pouvaient bloquer sans fin
 *    (une semaine ratée, des objectifs jamais atteints) : retirés.
 *  - Calibrage sur le cas le plus rapide : environ 600 à 700 EXP par jour d'entraînement (séance + records + objectifs,
 *    plafond du jour) et 7 jours sur 7. Il faut alors que jours × 700 et semaines × 4 900 restent sous l'EXP du rang + 2 500.
 *    Vérifié par simulation dans src/lib/xp.test.js (3, 5 et 7 séances par semaine).
 */
export const RANK_TRIALS = {
  4: { days: 2 },
  8: { days: 8, weeks: 2 },
  14: { days: 20, weeks: 4 },
  22: { days: 40, weeks: 8 },
  35: { days: 80, weeks: 16 },
  50: { days: 140, weeks: 28 },
};

const LABELS = {
  days: n => `${n} jours d’entraînement`,
  weeks: n => `${n} semaines avec au moins une séance (pas forcément d’affilée)`,
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
    weeks: new Set(entries.filter(e => e.date).map(e => getWeekStart(e.date))).size,
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
