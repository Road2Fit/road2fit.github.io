// Chez soi : remplacer les exercices qui demandent du matériel qu'on n'a pas (4.22).
// Rien n'est supprimé : l'ancien exercice garde son historique (le coach ne le programme plus tant qu'on s'entraîne chez soi),
// un exercice faisable du même muscle est ajouté s'il n'y en a pas déjà un.
import { EXERCISE_CATALOG } from '../data/catalog';
import { fineGroupOf } from '../data/muscles';
import { doableAtHome, undoableQuests } from '../coach/equipment';
import { makeQuestFromCatalog } from './questFactory';

const fineOfCatalog = c => fineGroupOf({ catalogId: c.id, name: c.name, category: c.category, type: 'strength' });
const ORDER = ['Poids du corps', '', 'Haltères', 'Kettlebell', 'Barre', 'Banc'];

/** Exercice du catalogue faisable chez soi pour le même muscle (pas encore suivi), ou null. */
export function homeAlternative(q, state) {
  const coach = state.coach || {};
  const muscle = fineGroupOf(q);
  const owned = new Set((state.quests || []).map(x => x.catalogId));
  const list = EXERCISE_CATALOG
    .filter(c => c.type === 'strength' && !owned.has(c.id) && doableAtHome(c, coach) && fineOfCatalog(c) === muscle && !/\(en secondes\)/.test(c.name) === !q.timed)
    .sort((a, b) => (a.unit === q.unit ? 0 : 1) - (b.unit === q.unit ? 0 : 1) || ORDER.indexOf(a.equip || '') - ORDER.indexOf(b.equip || ''));
  return list[0] || null;
}

/** Plan de remplacement : pour chaque exercice infaisable, ce qui le remplace ({ quest, alt | covered | null }). */
export function homeSwapPlan(state) {
  const coach = state.coach || {};
  const taken = new Set();
  const doableMuscles = new Set((state.quests || []).filter(q => q.type === 'strength' && doableAtHome(q, coach)).map(fineGroupOf));
  return undoableQuests(state).map(q => {
    const muscle = fineGroupOf(q);
    if (doableMuscles.has(muscle) || taken.has(muscle)) return { quest: q, covered: true };
    const alt = homeAlternative(q, state);
    if (alt) taken.add(muscle);
    return { quest: q, alt };
  });
}

/** Ajoute les remplaçants du plan. Renvoie { state, added: [noms] }. */
export function applyHomeSwap(state, today) {
  let next = state;
  const added = [];
  homeSwapPlan(state).forEach(({ alt }) => {
    if (!alt) return;
    const { quest } = makeQuestFromCatalog(alt, next, today, 'ajouté pour s’entraîner chez soi');
    next = { ...next, quests: [...next.quests, quest] };
    added.push(alt.name);
  });
  return { state: next, added };
}
