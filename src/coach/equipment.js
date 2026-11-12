// Lieu d'entraînement et matériel disponible (4.22). Logique pure, testée dans equipment.test.js.
// coach.place : 'gym' (salle : tout est faisable, comportement d'avant) | 'home' (chez soi) | 'both' (les deux).
// coach.equipment : matériel possédé chez soi (identifiants de HOME_EQUIPMENT). Le poids du corps est toujours disponible.
// Un exercice est « faisable chez soi » si tout ce qu'il demande est dans cette liste ; les machines, poulies, Smith…
// demandent la salle ('gym').
import { EXERCISE_CATALOG } from '../data/catalog';
import { stripAccents } from '../lib/text';

export const PLACES = [
  { id: 'gym', label: 'En salle' },
  { id: 'home', label: 'Chez moi' },
  { id: 'both', label: 'Les deux' },
];

export const HOME_EQUIPMENT = [
  { id: 'dumbbells', label: 'Haltères', icon: '🏋️' },
  { id: 'barbell', label: 'Barre et disques', icon: '🏋️' },
  { id: 'rack', label: 'Rack ou supports de barre', icon: '🧱' },
  { id: 'bench', label: 'Banc', icon: '🪑' },
  { id: 'pullbar', label: 'Barre de traction', icon: '🧗' },
  { id: 'dipbars', label: 'Barres à dips', icon: '🔱' },
  { id: 'kettlebell', label: 'Kettlebell', icon: '🏺' },
];
const HOME_IDS = new Set(HOME_EQUIPMENT.map(e => e.id));
const equipLabel = id => (HOME_EQUIPMENT.find(e => e.id === id) || {}).label || '';

const GYM_EQUIP = new Set(['Machine guidée', 'Hammer Strength', 'Poulie', 'Smith', 'Machine à plaques', 'Traîneau', 'Ballon lesté', 'Sac lesté']);
const norm = s => stripAccents(String(s || '').toLowerCase());

/** Ce qu'un exercice demande : [] = rien (poids du corps), ['gym'] = matériel de salle, sinon identifiants de HOME_EQUIPMENT. */
export function needsOf(item) {
  if (!item) return [];
  const c = item.equip !== undefined || !item.catalogId ? item : EXERCISE_CATALOG.find(x => x.id === item.catalogId) || item;
  const equip = c.equip || '';
  const n = norm(c.name || item.name);
  if (GYM_EQUIP.has(equip)) return ['gym'];
  if (/poulie|presse|machine|anneaux|chaise romaine|banc 45|trap bar|t-bar|pupitre|hyrox|roue abdominale|ab wheel|smith|hack|pec deck|leg (curl|extension)/.test(n)) return ['gym'];
  const out = [];
  const pull = /traction|suspendu|suspension|toes to bar|muscle-up|front lever|dead hang|dragon flag/.test(n);
  if (pull) out.push('pullbar');
  if (/dips/.test(n) && !/banc/.test(n)) out.push('dipbars');
  if (equip === 'Kettlebell') out.push('kettlebell');
  if (equip === 'Haltères' || (!equip && /haltere/.test(n))) out.push('dumbbells');
  if (equip === 'Barre' || (!equip && !pull && !/dips/.test(n) && /barre|souleve de terre|militaire/.test(n))) {
    out.push('barbell');
    if (/squat|fentes|good morning|developpe (couche|incline|decline)|prise serree/.test(n)) out.push('rack');
  }
  if (equip === 'Banc' || /couche|incline|decline|ecartes|pull-over|barre au front|skull|dips sur banc/.test(n)) out.push('bench');
  return [...new Set(out)];
}

export const placeOf = coach => (coach && PLACES.some(p => p.id === coach.place) ? coach.place : 'gym');
export const equipmentOf = coach => ((coach && Array.isArray(coach.equipment) ? coach.equipment : []).filter(id => HOME_IDS.has(id)));

/** Faisable chez soi avec ce matériel ? */
export function doableAtHome(item, coach) {
  const have = new Set(equipmentOf(coach));
  return needsOf(item).every(n => n !== 'gym' && have.has(n));
}
/** Faisable là où la personne s'entraîne ? (salle ou « les deux » : oui ; chez soi : selon son matériel) */
export function doable(item, coach) {
  return placeOf(coach) !== 'home' || doableAtHome(item, coach);
}
/** Ce qui manque pour faire cet exercice chez soi (texte court), ou '' s'il est faisable. */
export function missingText(item, coach) {
  const have = new Set(equipmentOf(coach));
  const miss = needsOf(item).filter(n => n === 'gym' || !have.has(n));
  if (!miss.length) return '';
  return miss.includes('gym') ? 'matériel de salle' : miss.map(equipLabel).join(', ').toLowerCase();
}

/** Exercices que le coach peut programmer : chez soi uniquement, ceux qui sont faisables avec le matériel (les autres restent
 *  dans la liste avec leur historique, et reviennent si la personne retourne en salle). */
export function coachableQuests(state) {
  const coach = (state && state.coach) || {};
  const qs = (state && state.quests) || [];
  return placeOf(coach) === 'home' ? qs.filter(q => q.type !== 'strength' || doableAtHome(q, coach)) : qs;
}

/** Exercices suivis qui ne sont pas faisables chez soi (seulement si la personne ne s'entraîne QUE chez elle). */
export function undoableQuests(state) {
  const coach = (state && state.coach) || {};
  if (placeOf(coach) !== 'home') return [];
  return (state.quests || []).filter(q => q.type === 'strength' && q.goalMode !== 'free_mode' && !q.paused && !doableAtHome(q, coach));
}

// Exercices de départ chez soi : par grand mouvement, le premier faisable avec le matériel (du plus simple au plus complet).
const HOME_SLOTS = [
  ['home_squat', 'fp_goblet', 'fp_bulgarian'],                       // jambes (genoux)
  ['fp_glute_bridge', 'fp_rdl'],                                     // jambes (hanches)
  ['fp_db_bench', 'pushups', 'home_incline_pushups'],                // poussée
  ['fp_db_row', 'pullups', 'fp_superman_hold'],                      // tirage
  ['fp_db_shoulder', 'fp_lateral_db', 'fp_decline_pushups'],         // épaules
  ['fp_plank'],                                                      // gainage
];
// débutant : on commence par la version la plus simple qui reste faisable
const BEGINNER_FIRST = { 2: ['home_incline_pushups', 'fp_db_bench', 'pushups'], 3: ['fp_db_row', 'fp_superman_hold', 'pullups'] };

/** Programme de départ pour s'entraîner chez soi : un exercice par grand mouvement, selon le matériel. */
export function homeStarters(coach, { beginner = true } = {}) {
  const byId = id => EXERCISE_CATALOG.find(c => c.id === id);
  const out = [];
  HOME_SLOTS.forEach((slot, i) => {
    const order = beginner && BEGINNER_FIRST[i] ? BEGINNER_FIRST[i] : slot;
    const id = order.find(x => byId(x) && doableAtHome(byId(x), coach));
    if (id && !out.includes(id)) out.push(id);
  });
  return out;
}

/** Ligne pour le coach IA. */
export function equipmentLine(state) {
  const coach = (state && state.coach) || {};
  const p = placeOf(coach);
  if (p === 'gym') return 'Lieu d’entraînement : en salle.';
  const eq = equipmentOf(coach).map(equipLabel).join(', ').toLowerCase() || 'aucun (poids du corps seulement)';
  return `Lieu d’entraînement : ${p === 'home' ? 'chez soi uniquement' : 'en salle et chez soi'}. Matériel à la maison : ${eq}. ${p === 'home' ? 'Ne propose que des exercices faisables avec ce matériel.' : ''}`.trim();
}
