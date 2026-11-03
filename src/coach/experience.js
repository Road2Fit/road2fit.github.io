import { getCoachSettings, coachRealEntries } from './settings';
import { getWeekStart } from '../lib/dates';

// Niveau réel en musculation déclaré par la personne (assistant d'accueil, Coach → Réglages) : coach.experience.
//  - beginner : l'appli fait tout (exercices de départ choisis, charges prudentes, séries classiques au début) ;
//  - advanced : maxima et exercices déjà pratiqués saisis → pas de traitement « débutant » ;
//  - expert : en plus, années de pratique, arrêt, séries par semaine, reps en réserve, formes connues, muscles prioritaires,
//    périodisation, semaine allégée, limites (blessures) → réglages du coach.
// Repères : ACSM 2009 (novice / intermédiaire / avancé), Rhea 2003 (le statut d'entraînement change la dose utile),
// Santos Junior 2021 (classer le niveau : ancienneté, arrêt, technique, force), Scarpelli 2020 (volume adapté au volume
// habituel), Moesgaard 2022 (périodisation et force), Bosquet 2013 (perte de force après un arrêt), Zourdos 2016 / Halperin 2022.

export const LEVELS = [
  { id: 'beginner', label: 'Débutant', text: 'Je débute ou je reprends de zéro. L’appli choisit tout pour moi.' },
  { id: 'advanced', label: 'Avancé', text: 'Je m’entraîne depuis un moment : je connais mes exercices et à peu près mes charges.' },
  { id: 'expert', label: 'Expert', text: 'Plusieurs années de pratique sérieuse : je veux régler précisément mon entraînement.' },
];

/** Exercices de départ d'un débutant : machines et poulies simples, un par grand mouvement. */
export const BEGINNER_STARTERS = ['leg_press', 'fp_leg_curl_seat', 'fp_chest_press', 'lat_pulldown', 'fp_seated_row', 'fp_machine_shoulder', 'fp_plank'];

export const PERIODIZATIONS = [
  { id: 'none', label: 'Pas de préférence' },
  { id: 'blocks', label: 'Par blocs (volume puis force)' },
];

export const BREAKS = [
  { id: 0, label: 'Je m’entraîne en ce moment' },
  { id: 2, label: 'Arrêt de 1 à 3 mois' },
  { id: 6, label: 'Arrêt de 3 à 12 mois' },
  { id: 18, label: 'Arrêt de plus d’un an' },
];

export function getExperience(state) {
  const e = getCoachSettings(state).experience;
  return e && LEVELS.some(l => l.id === e.level) ? e : null;
}

/** Avancé ou expert déclaré. */
export const isExperienced = state => {
  const e = getExperience(state);
  return !!e && e.level !== 'beginner';
};

/**
 * Charge de départ après un arrêt (Bosquet 2013 : la force baisse avec la durée de l'arrêt ; chiffres = repère prudent
 * de l'appli, pas ceux de l'étude). breakMonths = mois sans entraînement.
 */
export function detrainFactor(breakMonths) {
  const m = Number(breakMonths) || 0;
  if (m >= 12) return 0.8;
  if (m >= 3) return 0.9;
  if (m >= 1) return 0.95;
  return 1;
}

/** Nombre de séances sur un exercice avant de varier la forme des séries (apprentissage du geste). */
export function entriesBeforeMethods(state, q) {
  if (!isExperienced(state)) return 6;
  return q && q.known ? 0 : 2;
}

/** L'exercice est-il assez maîtrisé pour des formes variées ou un superset ? */
export const knowsExercise = (state, q) => coachRealEntries(q || {}).length >= entriesBeforeMethods(state, q);

/** « Débutant » pour les repères de séries : niveau déclaré d'abord, sinon moins de 12 semaines de suivi. */
export function isBeginnerForVolume(state, weeksTracked) {
  const e = getExperience(state);
  if (e) return e.level === 'beginner' || (Number(e.breakMonths) >= 12 && weeksTracked < 12);
  return weeksTracked < 12;
}

/**
 * Repère de séries par semaine ajusté au volume habituel déclaré par un expert (Scarpelli 2020 : partir de son volume
 * habituel, +20 % environ, plutôt que d'une valeur standard).
 */
export function personalBand(band, state) {
  const e = getExperience(state);
  const s = e && e.level === 'expert' ? Number(e.weeklySets) : 0;
  if (!(s >= 4 && s <= 40)) return band;
  const good = Math.round(s * 1.2);
  const min = Math.max(1, Math.min(good - 1, Math.round(s * 0.8)));
  return { ...band, min, good, max: Math.max(band.max, good + 4), personal: true };
}

/** Muscles prioritaires (expert) : une série de plus sur leurs exercices. */
export const priorityArenas = state => {
  const e = getExperience(state);
  return e && Array.isArray(e.priorities) ? e.priorities : [];
};

/** Formes de séries que l'expert dit connaître (vide = toutes). */
export const knownMethods = state => {
  const e = getExperience(state);
  return e && e.level === 'expert' && Array.isArray(e.methods) ? e.methods : [];
};

/**
 * Réglages du coach déduits de l'expérience (appelé à l'enregistrement) : cycles (périodisation par blocs / semaine allégée),
 * limites ajoutées à la mémoire du coach IA.
 */
export function experienceCoachPatch(coach, exp, today) {
  const patch = { experience: exp };
  if (!exp || exp.level !== 'expert') return patch;
  const every = Math.max(0, Math.min(12, Number(exp.deloadEvery) || 0));
  if (exp.periodization === 'blocks') {
    patch.cycleWeeks = every || 4;
    patch.cycleStart = coach.cycleStart || getWeekStart(today);
    patch.cycleProfiles = ['hypertrophie', 'puissance'];
  } else if (every) {
    patch.cycleWeeks = every;
    patch.cycleStart = coach.cycleStart || getWeekStart(today);
  }
  const mem = (Array.isArray(coach.memory) ? coach.memory : []).filter(m => !String(m.text || m).startsWith('Limites physiques : '));
  const lim = String(exp.limits || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  if (lim) mem.push({ id: `m_lim_${today}`, text: `Limites physiques : ${lim}`, at: today });
  patch.memory = mem;
  return patch;
}

/** Une ligne pour le coach IA. */
export function experienceLine(state) {
  const e = getExperience(state);
  if (!e) return 'Niveau déclaré : non précisé.';
  const lv = (LEVELS.find(l => l.id === e.level) || {}).label;
  const bits = [`Niveau déclaré : ${lv}`];
  if (e.years) bits.push(`${e.years} an(s) de pratique`);
  if (Number(e.breakMonths)) bits.push(`arrêt récent d'environ ${e.breakMonths} mois`);
  if (e.weeklySets) bits.push(`habitué à ${e.weeklySets} séries par muscle et par semaine`);
  if (e.rir) bits.push('sait estimer ses répétitions en réserve');
  if ((e.methods || []).length) bits.push(`formes connues : ${e.methods.join(', ')}`);
  if ((e.priorities || []).length) bits.push(`muscles prioritaires : ${e.priorities.join(', ')}`);
  if (e.periodization === 'blocks') bits.push('périodisation par blocs');
  return `${bits.join(', ')}.`;
}
