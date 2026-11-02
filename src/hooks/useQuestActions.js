import { makeQuestFromCatalog } from '../lib/questFactory';
import { getCoachSettings } from '../coach/settings';
import { normalizeArenaGroup } from '../data/arenas';
import { EXERCISE_CATALOG } from '../data/catalog';
import { getTodayISODate } from '../lib/dates';
import { questAfterHistoryChange, rebuildEntry } from '../lib/history';
import { getSetDetailsArray, isTimedCatalog } from '../lib/quests';
import { playGameSound } from '../lib/sound';
import { computeXp } from '../lib/xp';
import { pick } from '../edition';

export function useQuestActions({ gameState, registerUndo, setGameState, triggerToast }) {
  const handleClaimWeekly = ws => {
    setGameState(prev => {
      const cs = getCoachSettings(prev);
      if ((cs.weeklyClaimed || []).includes(ws)) return prev;
      return { ...prev, ...computeXp(prev, 150, getTodayISODate(), 'reward').patch, coach: { ...cs, weeklyClaimed: [...(cs.weeklyClaimed || []), ws] } };
    });
    playGameSound('boss', gameState.soundEnabled);
    triggerToast('Objectifs de la semaine accomplis !', 'Muscu, endurance et pesées : bravo.', 150, '🏅');
  };

  const addQuestFromCatalog = catId => {
    const c = EXERCISE_CATALOG.find(x => x.id === catId);
    if (!c) return null;
    const existing = gameState.quests.find(q => q.catalogId === catId);
    if (existing) {
      triggerToast('Déjà dans tes objectifs', c.name, 0, 'ℹ️');
      return existing.id;
    }
    // charge de départ, séries et répétitions adaptées à tes maxima et à ton profil de travail du moment
    const { quest: newQuest, note } = makeQuestFromCatalog(c, gameState, getTodayISODate());
    const sug = { note };
    setGameState(prev => ({ ...prev, ...computeXp(prev, 40, getTodayISODate(), 'minor').patch, quests: [newQuest, ...prev.quests] }));
    triggerToast('Exercice ajouté !', `${c.name} : ${sug.note || 'ajuste la charge de départ dans « Exercices » (✏️).'}`, 40, c.icon);
    return newQuest.id;
  };

  // ==========================================
  // ACTION : SUPPRIMER UNE SÉANCE (BILAN DU JOUR OU JOURNAL)
  // ==========================================
  // Correction d'une séance enregistrée (onglet Journal) : le coach repart des valeurs corrigées.
  const handleEditSessionEntry = (questId, entryId, patch) => {
    const quest = gameState.quests.find(q => q.id === questId);
    registerUndo('Séance corrigée');
    playGameSound('click', gameState.soundEnabled);
    setGameState(prev => ({
      ...prev,
      quests: prev.quests.map(q => {
        if (q.id !== questId) return q;
        const history = (q.history || []).map(h => (h.id === entryId ? rebuildEntry(q, h, patch, prev.userWeightKg) : h));
        return questAfterHistoryChange(q, history);
      }),
    }));
    triggerToast('Séance corrigée', `${quest ? quest.name : 'Exercice'} : le coach repart de tes nouvelles valeurs.`, 0, '✏️');
  };

  const handleDeleteSessionEntry = (questId, entryId) => {
    registerUndo('Séance supprimée');
    playGameSound('click', gameState.soundEnabled);
    let deletedQuestName = 'Séance';

    setGameState(prev => {
      const updatedQuests = prev.quests.map(q => {
        if (q.id !== questId) return q;
        deletedQuestName = q.name;
        const remainingHistory = (q.history || []).filter(h => h.id !== entryId);

        if (remainingHistory.length === 0) {
          const gSets = Math.max(1, Number(q.goalSets) || 3);
          const gReps = Math.max(1, Number(q.goalReps) || Number(q.goalValue) || 6);
          const resetVal = Number(q.startValue) || 0;
          return {
            ...q,
            currentValue: resetVal,
            currentAssistanceKg: q.unit === 'reps' ? Number(q.startAssistanceKg) || 0 : 0,
            setDetails: q.type === 'strength'
              ? Array(gSets).fill(q.unit === 'reps' ? resetVal : gReps)
              : [],
            history: []
          };
        }

        const last = remainingHistory[remainingHistory.length - 1];
        if (q.type === 'cardio') {
          const maxVal = remainingHistory.reduce(
            (max, h) => Math.max(max, Number(h.value) || 0),
            Number(q.startValue) || 0
          );
          return {
            ...q,
            currentValue: maxVal,
            durationMin: last.durationMin || q.durationMin,
            elevationM: last.elevationM !== undefined ? last.elevationM : q.elevationM,
            history: remainingHistory
          };
        }

        const gSets = Math.max(1, Number(q.goalSets) || 3);
        const gReps = Math.max(1, Number(q.goalReps) || Number(q.goalValue) || 6);
        const restoredSets = getSetDetailsArray(last, gSets, gReps);

        return {
          ...q,
          currentValue: Number(last.value) || Number(q.startValue) || 0,
          currentAssistanceKg: q.unit === 'reps' ? Number(last.assistanceKg) || 0 : 0,
          setDetails: restoredSets,
          history: remainingHistory
        };
      });

      return {
        ...prev,
        quests: updatedQuests
      };
    });

    triggerToast(
      'Séance supprimée',
      `${deletedQuestName} a été retirée du bilan et vos statistiques ont été recalculées.`,
      0,
      '🗑️'
    );
  };

  const handleDeleteQuest = questId => {
    registerUndo('Exercice retiré');
    setGameState(prev => ({
      ...prev,
      quests: prev.quests.filter(q => q.id !== questId)
    }));
    triggerToast('Exercice retiré', pick('L’exercice a été retiré du Pokédex.', 'L’exercice a été retiré.'), 0, '🗑️');
  };

  return { handleClaimWeekly, addQuestFromCatalog, handleDeleteSessionEntry, handleEditSessionEntry, handleDeleteQuest };
}
