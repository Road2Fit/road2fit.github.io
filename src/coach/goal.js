// Objectif principal donné au coach (coach.mainGoal) : où en est la personne. Fonctions pures.
// mainGoal = { kind: 'strength' | 'muscle' | 'reps' | 'weight' | 'general', text, questId?, arena?, target?, deadline?, startWeight?, createdAt }
import { coachBalance } from './advice';
import { coachRealEntries, coachSetsOf } from './settings';
import { estimateQuestMax } from '../lib/maxima';
import { addDaysISO } from '../lib/dates';

export const GOAL_KINDS = ['strength', 'muscle', 'reps', 'weight', 'general'];

const lastWeight = state => {
  const w = (state.weightHistory || []).slice().sort((a, b) => String(a.date).localeCompare(String(b.date))).pop();
  return w ? Number(w.weightKg) : Number(state.userWeightKg) || 0;
};

/** { current, target, unit, pct (0-100 ou null), label, weeksLeft } */
export function goalProgress(state, goal, today) {
  if (!goal || !goal.kind) return null;
  const weeksLeft = goal.deadline ? Math.max(0, Math.ceil((Date.parse(`${goal.deadline}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 604800000)) : null;
  const q = goal.questId ? (state.quests || []).find(x => x.id === goal.questId) : null;
  const target = Number(goal.target) || 0;
  const out = (current, unit, label) => ({ current, target, unit, label, weeksLeft, pct: target > 0 && current !== null ? Math.max(0, Math.min(100, Math.round((current / target) * 100))) : null });
  if (goal.kind === 'strength' && q) {
    const est = estimateQuestMax(q, state, { today });
    const cur = est && !est.empty && est.estimate ? Math.round(est.estimate * 2) / 2 : null;
    return out(cur, 'kg', cur ? `Max estimé : ${cur} kg${target ? ` sur ${target} kg visés` : ''}` : 'Max estimé après quelques séances');
  }
  if (goal.kind === 'reps' && q) {
    const since = addDaysISO(today, -90);
    const best = coachRealEntries(q).filter(e => e.date >= since).reduce((b, e) => Math.max(b, ...coachSetsOf(e, 1, 0).map(Number)), 0);
    return out(best || null, 'reps', best ? `Meilleure série : ${best} reps${target ? ` sur ${target} visées` : ''}` : 'Pas encore de séance récente');
  }
  if (goal.kind === 'muscle' && goal.arena) {
    const row = coachBalance(state, today).rows.find(r => r.arena === goal.arena);
    const t = target || (row ? row.band.good : 10);
    const cur = row ? row.avg : 0;
    return { ...out(cur, 'séries / semaine', `${goal.arena} : ${String(cur).replace('.', ',')} séries par semaine (repère ${t}+)`), target: t, pct: Math.max(0, Math.min(100, Math.round((cur / t) * 100))) };
  }
  if (goal.kind === 'weight' && target) {
    const cur = lastWeight(state);
    const start = Number(goal.startWeight) || cur;
    const done = start !== target ? Math.max(0, Math.min(100, Math.round(((start - cur) / (start - target)) * 100))) : 100;
    return { current: cur, target, unit: 'kg', weeksLeft, pct: done, label: `${cur} kg aujourd’hui, objectif ${target} kg` };
  }
  return { current: null, target: 0, unit: '', pct: null, weeksLeft, label: '' };
}
