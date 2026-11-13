// Exercices dont les séries et répétitions NE suivent PAS le profil de travail (4.46, audit demandé par Gabin après un
// « 3 × 8 » donné à des sauts). Le profil (Puissance 3-5, Hypertrophie 8-12, Endurance 15-20 reps) est fait pour la
// musculation classique ; appliqué à ces exercices il donnait des séances absurdes ou risquées : 3 × 20 arrachés,
// 3 × 12 poussées de traîneau de 25 m, 3 × 20 muscle-ups, 12 sauts par série… Ces exercices gardent la forme du catalogue
// (séries × reps choisies pour eux) et une progression qui leur est propre. Fonctions pures, testées dans repScheme.test.js.
import { EXERCISE_CATALOG } from '../data/catalog';

const has = list => id => list.includes(id);
export const REP_SCHEMES = [
  {
    id: 'plyo', test: id => /^ply_/.test(id),
    why: 'Pliométrie : peu de répétitions, chacune au maximum avec une réception propre ; on arrête dès que la qualité baisse. Pas de fourchette de musculation.',
  },
  {
    id: 'olympic', test: id => /^wl_/.test(id),
    why: 'Haltérophilie : mouvements très techniques, faits en séries courtes (1 à 5 répétitions) pour garder une technique propre ; jamais 8 à 20 répétitions.',
  },
  {
    id: 'distance', test: has(['hx_sled_push', 'hx_sled_pull', 'hx_farmers_carry', 'hx_sandbag_lunges']),
    why: 'Épreuve sur une distance : une « répétition » = un trajet (25 ou 50 m). La progression se fait sur la charge, pas sur le nombre de trajets.',
  },
  {
    id: 'skill', test: has(['cal_muscle_up', 'cal_ring_muscle_up', 'cal_hspu', 'cal_pistol', 'cal_archer_pullup', 'cal_archer_pushup', 'cal_pseudo_planche', 'cal_dragon_flag']),
    why: 'Figure de calisthénie : on progresse sur la qualité de quelques répétitions difficiles, pas sur de longues séries.',
  },
  {
    id: 'conditioning', test: has(['fp_burpees', 'fp_mountain', 'fp_wall_ball', 'hx_burpee_broad_jump']),
    why: 'Exercice de condition physique : le nombre de répétitions est un format d’effort (HYROX, circuit), pas une fourchette de musculation.',
  },
];

/** Forme propre à l'exercice (ou null : il suit le profil de travail). `item` : exercice du catalogue ou quête (catalogId). */
export function repSchemeOf(item) {
  if (!item) return null;
  const id = String(item.catalogId || item.id || '');
  return REP_SCHEMES.find(r => r.test(id)) || null;
}

const realEntries = q => (q.history || []).filter(h => h && !h.isStart && !/point de d[ée]part/i.test(String(h.note || '')) && h.date);

/**
 * Remet aux valeurs du catalogue les exercices « à forme propre » qui avaient reçu la forme d'un profil (avant 4.46) et
 * n'ont encore aucune séance : séries, répétitions, objectif. Une seule fois par exercice (`schemeFixed`), pour ne jamais
 * écraser un réglage fait ensuite par la personne. Renvoie les quêtes (même tableau si rien ne change).
 */
export function fixRepSchemes(quests) {
  if (!Array.isArray(quests)) return quests;
  let changed = false;
  const out = quests.map(q => {
    if (!q || q.schemeFixed || q.type !== 'strength' || !repSchemeOf(q)) return q;
    const c = EXERCISE_CATALOG.find(x => x.id === q.catalogId);
    if (!c) return q;
    const sets = c.defaultGoalSets || 3;
    const reps = c.defaultGoalReps || 5;
    if (realEntries(q).length || (Number(q.goalSets) === sets && Number(q.goalReps) === reps)) return { ...q, schemeFixed: 1 };
    changed = true;
    return {
      ...q, schemeFixed: 1, goalSets: sets, goalReps: reps,
      ...(q.unit === 'kg' ? {} : { goalValue: c.defaultGoal, setDetails: Array(sets).fill(Number(q.startValue) || c.defaultStart || reps) }),
    };
  });
  return changed || out.some((q, i) => q !== quests[i]) ? out : quests;
}
