import { STORAGE_KEY } from '../config';
import { INITIAL_STATE } from './initialState';
import { fixRepSchemes } from '../coach/repScheme';

/** Complète une sauvegarde (locale, sauvegarde en ligne, fichier importé…) avec les valeurs par défaut des nouveaux champs. */
export function normalizeState(parsed) {
  return {
    ...INITIAL_STATE,
    ...parsed,
    weightHistory: Array.isArray(parsed.weightHistory) ? parsed.weightHistory : INITIAL_STATE.weightHistory,
    // 4.46 : sauts, haltérophilie, HYROX, figures… ajoutés avec la forme d'un profil (3 × 8 sauts) → forme du catalogue
    ...(Array.isArray(parsed.quests) ? { quests: fixRepSchemes(parsed.quests) } : {}),
  };
}

/** État enregistré dans ce navigateur, ou l'état de départ la toute première fois. */
export function loadLocalState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.quests)) return normalizeState(parsed);
    }
  } catch (e) {}
  return INITIAL_STATE;
}
