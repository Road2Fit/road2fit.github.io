// Thème de séance choisi pour un jour (4.36, demande de Gabin) : haut du corps, bas du corps, pousser (push), tirer (pull)
// ou corps entier. coach.dayTypes = { 'AAAA-MM-JJ': 'UPPER' | 'LEGS' | 'PUSH' | 'PULL' | 'FB' }.
// Le planning (coachPlanWeek) donne ce type à la séance de ce jour ; le coach la construit avec ses règles habituelles
// (exercices des bons muscles, les moins récemment travaillés d'abord). Rien choisi = le coach décide (comme avant).
import { COACH_TYPES } from './settings';

export const DAY_THEMES = [
  { id: 'UPPER', label: 'Haut du corps', short: 'Haut' },
  { id: 'LEGS', label: 'Bas du corps', short: 'Bas' },
  { id: 'PUSH', label: 'Pousser (push)', short: 'Push' },
  { id: 'PULL', label: 'Tirer (pull)', short: 'Pull' },
  { id: 'FB', label: 'Corps entier', short: 'Complet' },
];
// identifiants compris par le coach IA
export const THEME_IDS = { upper: 'UPPER', lower: 'LEGS', push: 'PUSH', pull: 'PULL', full: 'FB' };

export const themeLabel = t => (DAY_THEMES.find(x => x.id === t) || {}).label || '';

export function dayTypeOf(coach, iso) {
  const t = coach && coach.dayTypes && coach.dayTypes[iso];
  return t && COACH_TYPES[t] ? t : null;
}

/** Nouveau `coach.dayTypes` : `type` pour ce jour (null = le coach décide) ; les jours passés sont retirés. */
export function setDayType(coach, iso, type, today) {
  const m = {};
  Object.entries((coach && coach.dayTypes) || {}).forEach(([d, t]) => { if (d >= today && d !== iso && COACH_TYPES[t]) m[d] = t; });
  if (type && COACH_TYPES[type]) m[iso] = type;
  return m;
}
