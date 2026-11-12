import { coachIsCompound } from './settings';

import { EXERCISE_CATALOG } from '../data/catalog';
import { stripAccents } from '../lib/text';
import { arenaOf } from '../data/muscles';
import { doable, placeOf } from './equipment';

// Suggestions d'exercices du catalogue pour une arène en retard
export function coachSuggestExercises(state, arena, count = 3) {
  const owned = new Set((state.quests || []).map(q => q.catalogId));
  const ownedNames = new Set((state.quests || []).map(q => stripAccents(q.name || '')));
  const coach = state.coach || {};
  // chez soi : seulement ce qui est faisable avec le matériel, le plus simple d'abord
  const pref = placeOf(coach) === 'home' ? ['Poids du corps', '', 'Haltères', 'Kettlebell', 'Barre', 'Banc'] : ['Machine guidée', 'Hammer Strength', 'Poulie', 'Smith', 'Haltères', 'Barre', 'Poids du corps'];
  return EXERCISE_CATALOG
    .filter(c => c.type === 'strength' && doable(c, coach) && arenaOf(c) === arena && !owned.has(c.id) && !ownedNames.has(stripAccents(c.name)))
    .sort((a, b) => {
      const ca = coachIsCompound(a.name) ? 0 : 1, cb = coachIsCompound(b.name) ? 0 : 1;
      if (ca !== cb) return ca - cb;
      const pa = pref.indexOf(a.equip || ''), pb = pref.indexOf(b.equip || '');
      return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb);
    })
    .slice(0, count);
}
