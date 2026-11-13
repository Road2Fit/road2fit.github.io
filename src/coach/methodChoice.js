// Choix de la forme des séries pour chaque exercice d'une séance, et supersets.
// Réglage coach.methodStyle :
//  - 'evidence' (par défaut) : séries classiques, SAUF quand une étude montre un intérêt pour la personne : séance courte
//    (≤ 45 min) → séries dégressives sur l'isolation (autant de muscle en 2 à 3 fois moins de temps, Sødal 2023) et supersets
//    (≤ 50 min : plus de travail par minute, Robbins 2010) ; objectif de répétitions → repos-pause (plus d'endurance musculaire,
//    Prestes 2019). À volume égal, aucune forme ne fait plus de muscle que les séries classiques (Angleri 2017) : pas de
//    variété « pour varier ».
//  - 'variety' : à la demande de la personne (l'ancienne valeur 'varied', l'ancien défaut, vaut 'evidence'), le coach alterne les formes (rotation toutes les deux semaines) ;
//  - 'classic' : toujours des séries classiques.
// Dans tous les cas : forme choisie pour un exercice (quest.coachMethod) d'abord ; semaine allégée, chronométré, geste en
// apprentissage → séries classiques.
import { methodFits, withMethod } from './methods';
import { dayStylesOf, isPlyo, pickMixed, styleInfo, stylesLabel } from './contraction';
import { repSchemeOf } from './repScheme';
import { profileOpts } from './profiles';
import { entriesBeforeMethods, knowsExercise, knownMethods, priorityArenas } from './experience';
import { getCoachSettings } from './settings';

export const METHOD_WHY = {
  straight: 'Séries classiques : la base la plus étudiée, efficace pour tout.',
  iso_pause: 'Pause isométrique : l’effort dure plus longtemps à l’angle travaillé ; la force gagnée en isométrique est surtout gagnée autour de cet angle (Lum et Barbosa 2019).',
  iso_hold: 'Tenue isométrique : gains de force et de muscle à toutes les intensités, plus de muscle quand la position est étirée (revue Oranchuk 2019).',
  eccentric: 'Excentrique : on est plus fort en freinant ; plus de force qu’en concentrique quand la charge est plus haute (méta-analyse Roig 2009), muscle comparable (Schoenfeld 2017).',
  explosive: 'Explosif : c’est l’intention d’aller vite qui entraîne la vitesse (Behm et Sale 1993) ; s’arrêter loin de l’échec garde la vitesse et la détente (Pareja-Blanco 2017).',
  plyo: 'Pliométrie : améliore la détente verticale (méta-analyse Markovic 2007 ; chez les volleyeurs, Ramirez-Campillo 2020), même à faible volume.',
  pyramid: 'Pyramide montante : de la variété et une montée en charge progressive ; à volume égal, aussi efficace que des séries classiques (Angleri 2017).',
  reverse_pyramid: 'Pyramide inversée : la série la plus lourde quand tu es frais, puis du volume plus léger.',
  top_backoff: 'Série lourde + séries allégées : du travail lourd pour la force, puis du volume propre.',
  drop_set: 'Série dégressive : à volume égal, autant de muscle que des séries classiques, en moins de temps (méta-analyses 2022 et 2023).',
  rest_pause: 'Repos-pause : autant de résultats que des séries classiques en moins de temps, avec un petit avantage possible (Prestes 2019, Enes 2021).',
  myo_reps: 'Myo-reps : beaucoup de travail utile en peu de temps sur un exercice d’isolation (variante du repos-pause).',
  cluster: 'Séries fractionnées : la vitesse et la puissance baissent moins au fil de la série (méta-analyse Latella 2019).',
  amrap: 'Dernière série au maximum : elle mesure ta forme du jour, la suite s’ajuste dessus.',
};

const hash = s => String(s || '').split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
// change toutes les deux semaines (semaines du lundi au dimanche : la séance prévue jeudi est la même si on la fait lundi)
const MONDAY0 = Date.parse('1970-01-05T00:00:00Z');
const blockOf = iso => Math.floor(Math.floor((Date.parse(`${iso}T00:00:00Z`) - MONDAY0) / 604800000) / 2);

// muscles qui se travaillent bien en alternance (pendant que l'un récupère, l'autre travaille)
const PAIRS = [['Biceps', 'Triceps'], ['Quadriceps', 'Ischio-jambiers'], ['Pectoraux', 'Dos'], ['Épaules & Bras', 'Épaules & Bras']];

function pairSupersets(exs, ok) {
  const out = exs.slice();
  const used = new Set();
  let letter = 0;
  for (const [a, b] of PAIRS) {
    const x = out.find(e => !used.has(e.questId) && e.arena === a && (e.method === 'straight' || e.method === 'amrap') && !e.timed && ok(e));
    if (!x) continue;
    used.add(x.questId);
    const y = out.find(e => !used.has(e.questId) && e.arena === b && (e.method === 'straight' || e.method === 'amrap') && !e.timed && ok(e) && !e.compound === !x.compound);
    if (!y) { used.delete(x.questId); continue; }
    used.add(y.questId);
    const id = 'ABCD'[letter++] || 'Z';
    out.splice(out.indexOf(y), 1);
    const ix = out.indexOf(x);
    out.splice(ix + 1, 0, y);
    out[ix] = { ...x, superset: { id, partner: y.questId, first: true } };
    out[ix + 1] = { ...y, superset: { id, partner: x.questId, first: false } };
  }
  return { exercises: out, count: letter };
}

/**
 * Ajoute à chaque exercice sa forme de séries (method, plan, methodWhy) et forme des supersets si c'est utile.
 * @param opts { iso, deload, minutes } minutes = durée visée de la séance (0 = libre)
 * @returns { exercises, notes[] }
 */
export function applyMethods(state, exercises, { iso, deload = false, minutes = 0, dayStyle } = {}) {
  const coach = getCoachSettings(state);
  const style = ['variety', 'classic'].includes(coach.methodStyle) ? coach.methodStyle : 'evidence';
  const goal = coach.mainGoal && typeof coach.mainGoal === 'object' ? coach.mainGoal : null;
  const prof = profileOpts(state, iso).profile;
  const blk = blockOf(iso);
  const byId = Object.fromEntries((state.quests || []).map(q => [q.id, q]));
  const notes = [];
  let goalBoost = false;
  const prio = priorityArenas(state);
  const prioBoost = new Set();
  const known = knownMethods(state);
  // façons de travailler du jour (séance faite en avance : celles du jour PRÉVU, passées par dayStyle) ; plusieurs = séance mixte
  const styles = dayStyle !== undefined ? (Array.isArray(dayStyle) ? dayStyle : dayStyle ? [dayStyle] : []) : dayStylesOf(coach, iso);
  const styleMethods = styles.map(x => (styleInfo(x) || {}).method).filter(Boolean);
  let mixK = 0;

  let out = exercises.map(e => {
    if (e.dictated) return e; // séance dictée : forme de séries telle quelle
    const q = byId[e.questId] || {};
    let ex = e;
    // objectif « plus de muscle » sur un groupe : une série de plus sur ses exercices (relation dose-réponse, Schoenfeld 2017)
    if (goal && goal.kind === 'muscle' && goal.arena && e.arena === goal.arena && !deload && ex.sets < 6 && !e.manualSets) {
      ex = { ...ex, sets: ex.sets + 1, targetReps: [...ex.targetReps, ex.targetReps[ex.targetReps.length - 1]] };
      goalBoost = true;
    } else if (prio.includes(e.arena) && !deload && ex.sets < 6 && !e.manualSets) {
      // muscle prioritaire déclaré (expert) : une série de plus
      ex = { ...ex, sets: ex.sets + 1, targetReps: [...ex.targetReps, ex.targetReps[ex.targetReps.length - 1]] };
      prioBoost.add(e.arena);
    }
    if (q.coachMethod === 'custom') {
      if (Array.isArray(q.coachCustom) && q.coachCustom.length) return withMethod({ ...ex, custom: q.coachCustom }, 'custom', 'Ta forme personnalisée : le coach la reprend à chaque séance, avec des charges qui suivent ta progression.');
    } else if (q.coachMethod && q.coachMethod !== 'auto') return withMethod(ex, q.coachMethod, 'Forme de séries choisie par toi (Ajuster).');
    // sauts et lancers : toujours en pliométrie (peu de reps, repos complet)
    if (isPlyo(q) || isPlyo(e)) return withMethod(ex, 'plyo', METHOD_WHY.plyo);
    // haltérophilie, épreuves HYROX, figures, condition physique : séries simples, la forme propre de l'exercice (repScheme.js)
    const scheme = repSchemeOf(q.catalogId ? q : e);
    if (scheme) return withMethod(ex, 'straight', scheme.why);
    // façon(s) de travailler choisie(s) pour ce jour : sur tous les exercices où elles ont du sens ; plusieurs = réparties
    if (styleMethods.length && !ex.timed) {
      const m = pickMixed(styleMethods.filter(x => methodFits(x, ex)), !!ex.compound, mixK);
      if (m) {
        mixK += 1;
        const head = styleMethods.length > 1 ? `Séance mixte (${stylesLabel(styles.filter(x => x !== 'plyo'))}) : pour cet exercice, ${(styleInfo(styles.find(x => (styleInfo(x) || {}).method === m)) || {}).label.toLowerCase()}.` : `Séance « ${stylesLabel(styles.filter(x => x !== 'plyo'))} » choisie.`;
        return withMethod(ex, m, `${head} ${METHOD_WHY[m] || ''}`);
      }
    }
    if (style === 'classic') return withMethod(ex, 'straight', '');
    if (deload) return withMethod(ex, 'straight', 'Semaine allégée : séries classiques.');
    if (ex.timed) return withMethod(ex, 'straight', '');
    if (!knowsExercise(state, q)) return withMethod(ex, 'straight', `Séries classiques tant que le geste se met en place (moins de ${entriesBeforeMethods(state, q)} séances sur cet exercice).`);
    if (style === 'evidence') {
      if (goal && goal.questId === e.questId && goal.kind === 'reps') return withMethod(ex, 'rest_pause', 'Pour ton objectif de répétitions : le repos-pause a donné plus d’endurance musculaire que des séries classiques chez des pratiquants entraînés (Prestes 2019).');
      if (minutes && minutes <= 45 && !e.compound) return withMethod(ex, 'drop_set', 'Séance courte : la série dégressive donne autant de muscle que des séries classiques, en 2 à 3 fois moins de temps (méta-analyse Sødal 2023).');
      return withMethod(ex, 'straight', '');
    }
    let list;
    let why = 'Variété à ta demande. ';
    if (goal && goal.questId === e.questId && goal.kind === 'strength') {
      list = ['top_backoff', 'cluster'];
      why = 'Variété à ta demande, pour ton objectif de force : ';
    } else if (goal && goal.questId === e.questId && goal.kind === 'reps') {
      list = ['amrap', 'rest_pause'];
      why = 'Variété à ta demande, pour ton objectif de répétitions : ';
    } else if (minutes && minutes <= 45 && !e.compound) {
      list = ['myo_reps', 'rest_pause', 'drop_set'];
      why = 'Variété à ta demande, séance courte : ';
    } else if (prof === 'puissance') {
      list = e.compound ? ['top_backoff', 'cluster', 'straight'] : ['straight', 'rest_pause'];
    } else if (prof === 'endurance') {
      list = e.compound ? ['straight', 'amrap'] : ['myo_reps', 'drop_set', 'rest_pause'];
    } else {
      list = e.compound ? ['straight', 'reverse_pyramid', 'top_backoff', 'pyramid', 'amrap'] : ['straight', 'drop_set', 'myo_reps', 'rest_pause'];
    }
    if (known.length) { const k = list.filter(m => m === 'straight' || known.includes(m)); if (k.length) list = k; }
    const pick = list[(blk + hash(e.questId)) % list.length];
    return withMethod(ex, pick, `${why}${METHOD_WHY[pick] || ''}`);
  });
  if (prioBoost.size) notes.push(`Muscle${prioBoost.size > 1 ? 's' : ''} prioritaire${prioBoost.size > 1 ? 's' : ''} (${[...prioBoost].join(', ')}) : une série de plus.`);
  if (goalBoost) notes.push(`Ton objectif (${goal.text || goal.arena}) : une série de plus sur ${goal.arena}.`);

  // supersets : séance courte (gain de temps documenté) ; en mode varié aussi profil endurance ou une période sur deux
  const supers = style === 'evidence' ? !!(minutes && minutes <= 50) : style === 'variety' && ((minutes && minutes <= 50) || prof === 'endurance' || blk % 2 === 1);
  if (supers && !deload) {
    const r = pairSupersets(out, e => knowsExercise(state, byId[e.questId])); // pas pendant l'apprentissage du geste
    out = r.exercises;
    if (r.count) notes.push(`Superset${r.count > 1 ? 's' : ''} : alterne une série de chaque exercice de la paire, repos après la paire. Plus de travail par minute (Robbins 2010) et des gains comparables aux séries classiques (méta-analyse 2025) : utile quand le temps est court.`);
  }
  return { exercises: out, notes };
}
