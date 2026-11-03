import { isTimedQuest } from '../lib/quests';
import { playGameSound } from '../lib/sound';
import { useState } from 'react';
import { computeXp } from '../lib/xp';
import { getTodayISODate } from '../lib/dates';

export function useLevelUp({ gameState, setGameState, triggerToast }) {
  // Modale "Objectif Validé & Passage au Niveau Supérieur"
  const [levelUpModalQuest, setLevelUpModalQuest] = useState(null);

  const [nextGoalMode, setNextGoalMode] = useState('sets_reps');

  const [nextGoalValue, setNextGoalValue] = useState(60);

  const [nextGoalSets, setNextGoalSets] = useState(3);

  const [nextGoalReps, setNextGoalReps] = useState(8);

  const [nextGoalAssistanceKg, setNextGoalAssistanceKg] = useState(0);

  const openLevelUpModal = quest => {
    playGameSound('boss', gameState.soundEnabled);
    setLevelUpModalQuest(quest);
    const gMode = quest.goalMode || 'sets_reps';
    setNextGoalMode(gMode);

    if (quest.type === 'cardio') {
      setNextGoalValue(Math.round((Number(quest.goalValue) || 5) * 1.25 * 10) / 10);
    } else if (quest.unit === 'kg') {
      setNextGoalValue((Number(quest.goalValue) || Number(quest.currentValue) || 40) + 5);
      setNextGoalSets(Number(quest.goalSets) || 3);
      setNextGoalReps(Number(quest.goalReps) || 8);
      setNextGoalAssistanceKg(0);
    } else {
      const currAssist = Number(quest.currentAssistanceKg) || 0;
      // déjà lesté : le niveau suivant vise 5 kg de lest en plus ; sinon 5 kg d'aide en moins (jamais en dessous de 0)
      const nextAssist = currAssist < 0 ? currAssist - 5 : Math.max(0, currAssist - 5);
      setNextGoalAssistanceKg(nextAssist);
      setNextGoalSets(Number(quest.goalSets) || 3);
      const nextReps = currAssist === 0 ? (Number(quest.goalReps) || 6) + (isTimedQuest(quest) ? 10 : 2) : Number(quest.goalReps) || 6;
      setNextGoalReps(nextReps);
      setNextGoalValue(nextReps);
    }
  };

  const handleConfirmLevelUp = e => {
    e.preventDefault();
    if (!levelUpModalQuest) return;

    const q = levelUpModalQuest;
    const newLevel = (Number(q.level) || 1) + 1;
    const newUnlocked = new Set(gameState.unlockedAchievements);
    newUnlocked.add('level_up_exo');
    newUnlocked.add('boss_slayer');

    setGameState(prev => ({
      ...prev,
      ...computeXp(prev, 300, getTodayISODate(), 'reward').patch,
      unlockedAchievements: Array.from(new Set([...(prev.unlockedAchievements || []), ...newUnlocked])),
      quests: prev.quests.map(item => {
        if (item.id !== q.id) return item;
        if (item.type === 'cardio') {
          return {
            ...item,
            level: newLevel,
            startValue: item.currentValue,
            goalValue: Math.max(1, Number(nextGoalValue) || item.goalValue + 2)
          };
        }
        const gSets = Math.max(1, Number(nextGoalSets) || 3);
        const gReps = Math.max(1, Number(nextGoalReps) || 6);
        const gVal =
          item.unit === 'reps'
            ? gReps
            : Math.max(1, Number(nextGoalValue) || item.goalValue + 2.5);
        return {
          ...item,
          level: newLevel,
          goalMode: nextGoalMode,
          startValue: item.currentValue,
          goalValue: gVal,
          goalSets: gSets,
          goalReps: gReps,
          startAssistanceKg: item.currentAssistanceKg || 0,
          goalAssistanceKg: item.unit === 'reps' ? Number(nextGoalAssistanceKg) || 0 : 0 // négatif = lest visé
        };
      })
    }));

    setLevelUpModalQuest(null);
    playGameSound('boss', gameState.soundEnabled);
    triggerToast(
      `🎵 Niveau ${newLevel} débloqué sur ${q.name} !`,
      `Nouvel objectif enregistré pour viser le Niveau ${newLevel + 1} !`,
      300,
      '👑'
    );
  };

  return { levelUpModalQuest, setLevelUpModalQuest, nextGoalMode, setNextGoalMode, nextGoalValue, setNextGoalValue, nextGoalSets, setNextGoalSets, nextGoalReps, setNextGoalReps, nextGoalAssistanceKg, setNextGoalAssistanceKg, openLevelUpModal, handleConfirmLevelUp };
}
