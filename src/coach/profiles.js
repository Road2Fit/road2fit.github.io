import { getWeekStart } from '../lib/dates';
import { coachDaysBetween, getCoachSettings } from './settings';

// Profils de travail du coach : puissance (force), hypertrophie, endurance de force.
// Repères (« continuum des répétitions », ACSM 2009 et NSCA) :
//  - force / puissance : 1 à 6 répétitions à 85 % du 1RM ou plus, repos de 2 à 5 minutes ;
//  - hypertrophie : 6 à 12 répétitions à 67-85 % du 1RM, repos plus courts (30 s à 2 min selon les sources) ;
//  - endurance de force : 12 répétitions ou plus à 67 % ou moins (ACSM : 40-60 %), repos courts (90 s ou moins).
// Mises à jour de la recherche (Schoenfeld et al. 2021 ; Lopez et al. 2021) : la force progresse mieux avec des charges
// lourdes, alors que l'hypertrophie peut s'obtenir sur une large plage de charges si les séries sont proches de l'échec.
// Les fourchettes ci-dessous sont donc des repères pratiques, pas des frontières strictes.

export const PROFILES = {
  puissance: {
    id: 'puissance',
    label: 'Puissance',
    icon: '🚀',
    lo: 3, hi: 5,
    sets: 4, setsAccessory: 3,
    pctStart: 85, pctText: '85 à 93 %',
    restCompound: 210, restAccessory: 150,
    restText: '2 min 45 à 4 min selon l’exercice',
    summary: 'Charges lourdes, peu de répétitions, longs repos. Pour gagner en force maximale.',
  },
  hypertrophie: {
    id: 'hypertrophie',
    label: 'Hypertrophie',
    icon: '💪',
    lo: 8, hi: 12,
    sets: 4, setsAccessory: 3,
    pctStart: 72, pctText: '67 à 80 %',
    restCompound: 120, restAccessory: 75,
    restText: '1 min 15 à 3 min 30 selon l’exercice',
    summary: 'Charges modérées, 8 à 12 répétitions proches de l’échec. Pour prendre du volume musculaire.',
  },
  endurance: {
    id: 'endurance',
    label: 'Endurance de force',
    icon: '🔁',
    lo: 15, hi: 20,
    sets: 3, setsAccessory: 3,
    pctStart: 58, pctText: '50 à 65 %',
    restCompound: 75, restAccessory: 45,
    restText: '1 min à 1 min 30',
    summary: 'Charges légères, beaucoup de répétitions, repos courts. Pour tenir l’effort plus longtemps.',
  },
};
const PROFILE_IDS = Object.keys(PROFILES);
export const PROFILE_CHOICES = [{ id: 'auto', label: 'Automatique (selon ton objectif)' }, ...PROFILE_IDS.map(id => ({ id, label: `${PROFILES[id].icon} ${PROFILES[id].label}` }))];

// % du 1RM selon le nombre de répétitions possibles (tableau NSCA jusqu'à 12 ; au-delà, estimation approchée)
const POINTS = [[1, 100], [2, 95], [3, 93], [4, 90], [5, 87], [6, 85], [7, 83], [8, 80], [9, 77], [10, 75], [12, 67], [15, 62], [20, 55], [30, 45]];
export function pctForReps(reps) {
  const r = Math.max(1, Number(reps) || 1);
  for (let i = 1; i < POINTS.length; i++) {
    if (r <= POINTS[i][0]) {
      const [r0, p0] = POINTS[i - 1];
      const [r1, p1] = POINTS[i];
      return p0 + ((p1 - p0) * (r - r0)) / (r1 - r0);
    }
  }
  return POINTS[POINTS.length - 1][1];
}

/**
 * Profil actif à une date : celui du cycle en cours (si « un profil par cycle » est réglé), sinon le profil général.
 * @returns {{ id: string|null, fromCycle: boolean, cycleIndex: number|null }} id = null → mode automatique
 */
export function coachProfileAt(coach, iso) {
  const seq = (coach.cycleProfiles || []).filter(p => p === 'auto' || PROFILES[p]);
  const len = Number(coach.cycleWeeks) || 0;
  if (len && coach.cycleStart && seq.length) {
    const diff = Math.round(coachDaysBetween(coach.cycleStart, getWeekStart(iso)) / 7);
    const k = diff < 0 ? 0 : Math.floor(diff / len);
    const id = seq[k % seq.length];
    return { id: PROFILES[id] ? id : null, fromCycle: true, cycleIndex: k };
  }
  const id = coach.workProfile;
  return { id: PROFILES[id] ? id : null, fromCycle: false, cycleIndex: null };
}

// Profil automatique selon l'objectif de poids (poids visé comparé au dernier poids, écart d'au moins 1 kg).
// Ce que disent les études :
//  - pour perdre du gras, c'est le déficit calorique qui compte : à effort égal (séries jusqu'à l'échec), charges lourdes
//    (≈ 80 % du max) ou légères (≈ 60 %) font perdre autant de gras (Carlson et al. 2022, essai croisé randomisé, PMID 35998256) ;
//  - pendant un déficit, la force se maintient mais la prise de muscle est freinée, surtout au-delà de ≈ 500 kcal par jour
//    (Murphy et Koehler 2022, méta-analyse, Scand J Med Sci Sports, doi 10.1111/sms.14075) ;
//  - les revues pour la sèche conseillent de garder un entraînement de musculation exigeant pour protéger le muscle,
//    avec une perte de 0,5 à 1 % du poids par semaine (Helms et al. 2014, JISSN, PMC4033492).
// Donc : perdre du poids → hypertrophie (charges modérées à lourdes, près de l'échec) plutôt que l'endurance de force,
// qui ne fait pas perdre plus de gras ; prendre du poids → hypertrophie ; maintenir → réglage d'origine.
const lastWeightOf = state => {
  const w = ((state && state.weightHistory) || []).slice().sort((a, b) => String(a.date).localeCompare(String(b.date))).pop();
  return w ? Number(w.weightKg) || 0 : Number(state && state.userWeightKg) || 0;
};

/** 'lose' | 'gain' | 'keep' | null (pas de poids visé ou pas de poids connu) */
export function weightDirection(state) {
  const coach = getCoachSettings(state || {});
  const g = coach.mainGoal && coach.mainGoal.kind === 'weight' ? Number(coach.mainGoal.target) || 0 : 0;
  // le poids visé par défaut de l'appli ne compte pas : il faut un objectif « poids » donné au coach ou au moins une pesée
  if (!g && !((state && state.weightHistory) || []).length) return null;
  const target = g || Number(state && state.targetWeightKg) || 0;
  const cur = lastWeightOf(state);
  if (!target || !cur) return null;
  if (target <= cur - 1) return 'lose';
  if (target >= cur + 1) return 'gain';
  return 'keep';
}

export const WEIGHT_PROFILE_WHY = {
  lose: 'Tu veux perdre du poids : le coach garde des charges modérées à lourdes, près de l’échec, pour protéger tes muscles. C’est le déficit calorique qui fait perdre le gras, pas les séries longues.',
  gain: 'Tu veux prendre du poids : le coach vise la prise de muscle (8 à 12 répétitions proches de l’échec).',
};

/** Profil réellement utilisé à une date : choisi par la personne (ou par cycle), sinon déduit de l'objectif de poids. */
/**
 * Profil appliqué à UN exercice (4.46) : en Puissance, seuls les exercices poly-articulaires passent à 3-5 reps lourdes ;
 * l'isolation et la prévention (rotation externe, Pallof, curl…) restent en 8 à 12 reps (risque inutile de charger lourd
 * une petite articulation). Les autres profils s'appliquent tels quels.
 */
export function profileFor(id, compound) {
  const P = id ? PROFILES[id] : null;
  if (!P) return null;
  if (P.id === 'puissance' && !compound) return { ...PROFILES.hypertrophie, id: 'puissance', label: 'Puissance (isolation : 8 à 12 reps)' };
  return P;
}

export function activeProfile(state, iso) {
  const coach = getCoachSettings(state || {});
  const p = coachProfileAt(coach, iso);
  if (p.id) return { ...p, fromWeight: null };
  const dir = weightDirection(state);
  if (dir === 'lose' || dir === 'gain') return { ...p, id: 'hypertrophie', fromWeight: dir };
  return { ...p, fromWeight: null };
}

/** Options à passer à computeExerciseTarget pour le jour `iso`. */
export function profileOpts(state, iso) {
  return { profile: activeProfile(state, iso).id, maxRecords: (state && state.maxRecords) || {} };
}
