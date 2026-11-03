import { countValidatedSets, formatSetsBreakdown, getSetDetailsArray, isTimedQuest, repUnit } from './quests';
import { assistText } from './assist';

// Progression d'un exercice (objectif atteint, niveau suivant) et comparaison avec la séance précédente.
export function evaluateQuestProgress(quest) {
  if (quest.type === 'cardio') {
if (quest.goalMode === 'free_mode') return { percent: 100, isBossDefeated: false, validatedSets: 1, goalSets: 1, goalReps: 1, setDetails: [] };
    const start = Number(quest.startValue) || 0;
    const current = Number(quest.currentValue) || 0;
    const goal = Number(quest.goalValue) || 1;
    if (current >= goal) return { percent: 100, isBossDefeated: true, validatedSets: 1, goalSets: 1 };
    if (goal <= start) return { percent: 100, isBossDefeated: true, validatedSets: 1, goalSets: 1 };
    const pct = Math.round(((current - start) / (goal - start)) * 100);
    return { percent: Math.max(5, Math.min(99, pct)), isBossDefeated: false, validatedSets: 0, goalSets: 1 };
  }

  const goalMode = quest.goalMode || 'sets_reps';
if (goalMode === 'free_mode') return { percent: 100, isBossDefeated: false, validatedSets: 1, goalSets: 1, goalReps: 1, setDetails: [] };
  const goalSets = Math.max(1, Number(quest.goalSets) || 3);
  const goalReps = Math.max(1, Number(quest.goalReps) || Number(quest.goalValue) || 6);
  const setDetails = getSetDetailsArray(quest, goalSets, goalReps);
  const validatedSets = countValidatedSets(setDetails, goalReps);
  const bestReps = Math.max(...setDetails, Number(quest.currentValue) || 0);

  if (goalMode === 'weight_only') {
    const startKg = Number(quest.startValue) || 0;
    const currKg = Number(quest.currentValue) || 0;
    const goalKg = Number(quest.goalValue) || 1;
    if (currKg >= goalKg) {
      return { percent: 100, isBossDefeated: true, validatedSets, goalSets, goalReps, setDetails };
    }
    const ratio = goalKg > startKg ? (currKg - startKg) / (goalKg - startKg) : 0.5;
    return { percent: Math.max(5, Math.min(99, Math.round(ratio * 100))), isBossDefeated: false, validatedSets, goalSets, goalReps, setDetails };
  }

  const startAssist = Number(quest.startAssistanceKg) || 0;
  const currAssist = Number(quest.currentAssistanceKg) || 0;
  const goalAssist = Number(quest.goalAssistanceKg) || 0;
  const assistGoalMet = quest.unit !== 'reps' || currAssist <= goalAssist;

  let assistRatio = 1;
  if (quest.unit === 'reps') {
    if (startAssist > goalAssist) {
      assistRatio = Math.max(0, Math.min(1, (startAssist - currAssist) / (startAssist - goalAssist)));
    } else if (currAssist > goalAssist) {
      assistRatio = Math.max(0, 1 - (currAssist - goalAssist) / 25);
    }
  }

  if (goalMode === 'reps_only') {
    const startR = Number(quest.startValue) || 0;
    const targetR = goalReps;
    const repsMet = bestReps >= targetR;
    const loadMet = quest.unit !== 'kg' || (Number(quest.currentValue) || 0) >= (Number(quest.goalValue) || 0);

    if (repsMet && assistGoalMet && loadMet) {
      return { percent: 100, isBossDefeated: true, validatedSets, goalSets: 1, goalReps: targetR, setDetails };
    }
    const repRatio = targetR > startR ? Math.max(0, Math.min(1, (bestReps - startR) / (targetR - startR))) : Math.min(1, bestReps / Math.max(1, targetR));
    const combined = quest.unit === 'reps' && (startAssist > goalAssist || currAssist > goalAssist)
      ? repRatio * 0.65 + assistRatio * 0.35
      : repRatio;
    return { percent: Math.max(5, Math.min(99, Math.round(combined * 100))), isBossDefeated: false, validatedSets, goalSets: 1, goalReps: targetR, setDetails };
  }

  let achievedTargetRepsSum = 0;
  for (let i = 0; i < goalSets; i++) {
    const r = Number(setDetails[i]) || 0;
    achievedTargetRepsSum += Math.min(r, goalReps);
  }
  const setsRepsRatio = achievedTargetRepsSum / (goalSets * goalReps);
  const allSetsValidated = validatedSets >= goalSets;

  if (quest.unit === 'reps') {
    if (allSetsValidated && assistGoalMet) {
      return { percent: 100, isBossDefeated: true, validatedSets, goalSets, goalReps, setDetails };
    }
    const combined = startAssist > goalAssist || currAssist > goalAssist
      ? setsRepsRatio * 0.65 + assistRatio * 0.35
      : setsRepsRatio;
    return { percent: Math.max(5, Math.min(99, Math.round(combined * 100))), isBossDefeated: false, validatedSets, goalSets, goalReps, setDetails };
  } else {
    const startKg = Number(quest.startValue) || 0;
    const currKg = Number(quest.currentValue) || 0;
    const goalKg = Number(quest.goalValue) || 1;
    const loadGoalMet = currKg >= goalKg;
    let loadRatio = 1;
    if (goalKg > startKg) {
      loadRatio = Math.max(0, Math.min(1, (currKg - startKg) / (goalKg - startKg)));
    }
    if (loadGoalMet && allSetsValidated) {
      return { percent: 100, isBossDefeated: true, validatedSets, goalSets, goalReps, setDetails };
    }
    const combined = loadRatio * 0.55 + setsRepsRatio * 0.45;
    return { percent: Math.max(5, Math.min(99, Math.round(combined * 100))), isBossDefeated: false, validatedSets, goalSets, goalReps, setDetails };
  }
}

export function compareWithPreviousSession(quest, currentEntry, prevEntry) {
  if (!prevEntry) {
    return {
      isFirst: true,
      improved: false,
      goalBeaten: Boolean(currentEntry.goalBeaten),
      badges: ['🌟 Première séance sur cet exercice'],
      prevSummary: null,
      currSummary: null
    };
  }

  const badges = [];
  let improved = false;

  if (quest.type === 'cardio') {
    const currVal = Number(currentEntry.value) || 0;
    const prevVal = Number(prevEntry.value) || 0;
    const diffVal = +(currVal - prevVal).toFixed(2);
    if (diffVal > 0) {
      improved = true;
      badges.push(`🏃 +${diffVal} ${quest.unit} parcourus`);
    }
    const currDur = Number(currentEntry.durationMin) || 0;
    const prevDur = Number(prevEntry.durationMin) || 0;
    if (currVal >= prevVal && currDur > 0 && prevDur > 0 && currDur < prevDur) {
      improved = true;
      badges.push(`⚡ -${prevDur - currDur} min (plus rapide)`);
    }
    return {
      isFirst: false,
      improved,
      goalBeaten: Boolean(currentEntry.goalBeaten || currVal >= (Number(quest.goalValue) || 999)),
      badges,
      prevSummary: `${prevVal} ${quest.unit} (${prevDur || 25} min)`,
      currSummary: `${currVal} ${quest.unit} (${currDur || 25} min)`
    };
  }

  const goalReps = Number(currentEntry.goalReps || quest.goalReps || quest.goalValue || 6);
  const goalSets = Number(currentEntry.goalSets || quest.goalSets || 3);
  const currSetsArr = getSetDetailsArray(currentEntry, goalSets, goalReps);
  const prevSetsArr = getSetDetailsArray(prevEntry, goalSets, goalReps);

  const currValidSets = countValidatedSets(currSetsArr, goalReps);
  const prevValidSets = countValidatedSets(prevSetsArr, goalReps);

  const currTotalReps = currSetsArr.reduce((a, b) => a + b, 0);
  const prevTotalReps = prevSetsArr.reduce((a, b) => a + b, 0);

  if (quest.unit === 'kg') {
    const currKg = Number(currentEntry.value) || 0;
    const prevKg = Number(prevEntry.value) || 0;
    const diffKg = +(currKg - prevKg).toFixed(1);
    if (diffKg > 0) {
      improved = true;
      badges.push(`🏋️ +${diffKg} kg sur la barre`);
    }
  } else if (quest.unit === 'reps') {
    const currAssist = Number(currentEntry.assistanceKg) || 0;
    const prevAssist = Number(prevEntry.assistanceKg) || 0;
    if (currAssist < prevAssist) {
      improved = true;
      badges.push(currAssist < 0 ? `🪢 +${+(prevAssist <= 0 ? prevAssist - currAssist : -currAssist).toFixed(1)} kg de lest` : `🪢 -${+(prevAssist - currAssist).toFixed(1)} kg d'aide élastique`);
    }
  }

  if (currValidSets > prevValidSets) {
    improved = true;
    badges.push(`🔴 +${currValidSets - prevValidSets} série(s) cible(s) validée(s)`);
  }

  if (currTotalReps > prevTotalReps) {
    improved = true;
    badges.push(`🔁 +${currTotalReps - prevTotalReps} ${repUnit(quest)} au volume total`);
  }

  const prevSummary = quest.unit === 'kg'
    ? `${prevEntry.value} kg • [${formatSetsBreakdown(prevSetsArr)}]`
    : isTimedQuest(quest) ? `[${formatSetsBreakdown(prevSetsArr)}] s` : `[${formatSetsBreakdown(prevSetsArr)}] (${Number(prevEntry.assistanceKg) ? assistText(prevEntry.assistanceKg) : 'Strict 0kg'})`;

  const currSummary = quest.unit === 'kg'
    ? `${currentEntry.value} kg • [${formatSetsBreakdown(currSetsArr)}]`
    : isTimedQuest(quest) ? `[${formatSetsBreakdown(currSetsArr)}] s` : `[${formatSetsBreakdown(currSetsArr)}] (${Number(currentEntry.assistanceKg) ? assistText(currentEntry.assistanceKg) : 'Strict 0kg'})`;

  return {
    isFirst: false,
    improved,
    goalBeaten: Boolean(currentEntry.goalBeaten),
    badges,
    prevSummary,
    currSummary
  };
}
