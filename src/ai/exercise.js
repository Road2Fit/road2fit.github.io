// Créer un exercice absent du catalogue : le coach intelligent (tâche « exercise ») le décrit, le serveur l'ajoute au
// catalogue commun de tous les utilisateurs (table shared_exercises) et l'appli l'ajoute à son catalogue tout de suite.
import { AiError, callAi } from './client';
import { catalogText, dictationContext } from './context';
import { EXERCISE_CATALOG } from '../data/catalog';
import { addSharedExercises } from '../data/sharedExercises';
import { getTodayISODate } from '../lib/dates';

/**
 * @param text ce que la personne demande (« muscle-up lesté », « muscle-up technique, barre fixe »)
 * @returns {Promise<{ entry, reply, created }>} entry = exercice du catalogue (existant ou créé)
 */
export async function createExerciseWithAi(state, text) {
  const ask = String(text || '').trim().slice(0, 600);
  if (ask.length < 2) throw new AiError('Dis-moi quel exercice ajouter.', 'empty');
  // recherche web puis fiche : plus long qu'un appel simple
  const data = await callAi('exercise', { text: ask, context: dictationContext(state, getTodayISODate()), catalog: catalogText() }, { timeoutMs: 150000 });
  const existing = data && data.existing && EXERCISE_CATALOG.find(c => c.id === data.existing && c.type === 'strength');
  if (existing) return { entry: existing, reply: String(data.reply || ''), created: false };
  if (data && data.id && data.exercise && String(data.exercise.name || '').trim()) {
    const [entry] = addSharedExercises([{ id: data.id, data: data.exercise }]);
    if (entry) return { entry, reply: String(data.reply || ''), created: !data.already };
  }
  throw new AiError('Je n’ai pas reconnu d’exercice de musculation dans cette demande.', 'unknown');
}
