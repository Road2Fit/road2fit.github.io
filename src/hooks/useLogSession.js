import { profileOpts } from '../coach/profiles';
import { computeExerciseTarget } from '../coach/targets';
import { DEFAULT_CARDIO_INPUT, calculateCardioCalories, calculateStrengthCalories, cardioHasElevation, cardioInputNote } from '../lib/calories';
import { getTodayISODate } from '../lib/dates';
import { applyStrengthSession } from '../lib/sessionRecord';
import { getSetDetailsArray, isTimedQuest } from '../lib/quests';
import { weightedMean } from '../lib/setLoads';
import { playGameSound } from '../lib/sound';
import { useMemo, useState } from 'react';
import { computeXp, xpNote } from '../lib/xp';

export function useLogSession({
  gameState, openLevelUpModal, selectedDate, setGameState, setSelectedDate, setSelectedJournalDay,
  triggerToast,
}) {
  // Modale "Noter Séance"
  const [logModalQuest, setLogModalQuest] = useState(null);

  const [logDate, setLogDate] = useState(getTodayISODate());

  const [logValue, setLogValue] = useState(0);

  const [logUseAssistance, setLogUseAssistance] = useState(false);

  const [logAssistanceKg, setLogAssistanceKg] = useState(0);

  const [logEntryMode, setLogEntryMode] = useState('per_set');

  const [logUniformSets, setLogUniformSets] = useState(3);

  const [logUniformReps, setLogUniformReps] = useState(6);

  const [logSetDetails, setLogSetDetails] = useState([6, 6, 6]);

  const [logDurationMin, setLogDurationMin] = useState(25);

  const [logElevationM, setLogElevationM] = useState(30);

  // saisie « vitesse + durée » et/ou pente en % (cardio)
  const [logCardioInput, setLogCardioInputRaw] = useState(DEFAULT_CARDIO_INPUT);
  const setLogCardioInput = p => setLogCardioInputRaw(prev => ({ ...prev, ...p }));
  // distance, durée et dénivelé réellement retenus pour une sortie (selon le mode de saisie)
  const cardioFigures = quest => {
    const ci = logCardioInput;
    const isKm = quest.unit === 'km';
    const dur = isKm ? Number(logDurationMin) || 25 : Number(logValue) || 20;
    let dist = isKm ? Number(logValue) || 0 : (dur / 60) * 5.2;
    if (ci.inputMode === 'speed') dist = Math.round(Math.max(0, Number(ci.speedKmh) || 0) * dur / 60 * 100) / 100;
    const elev = !cardioHasElevation(quest.cardioMode) ? 0 : ci.slopeMode === 'percent' ? Math.round(Math.max(0, Number(ci.slopePct) || 0) / 100 * dist * 1000) : Math.max(0, Number(logElevationM) || 0);
    return { distanceKm: dist, durationMin: dur, elevationM: elev };
  };

  const [logRpe, setLogRpe] = useState(7); // 7 par défaut pour les calories
  const [logRpeSet, setLogRpeSet] = useState(false); // ressenti vraiment choisi (sinon la séance ne compte pas dans le max)
  const chooseLogRpe = v => { if (logRpeSet && logRpe === v) { setLogRpe(7); setLogRpeSet(false); return; } setLogRpe(v); setLogRpeSet(true); };

  const [logNote, setLogNote] = useState('');

  // Charge (ou aide) différente selon la série : une valeur propre à certaines séries, la valeur de base vaut pour les autres
  const [logPerSetLoad, setLogPerSetLoad] = useState(false);
  const [logSetOverrides, setLogSetOverrides] = useState([]);
  const perSetActive = logPerSetLoad && logEntryMode === 'per_set';
  const perSetValues = base =>
    logSetDetails.map((_, i) => {
      const o = logSetOverrides[i];
      return o === undefined || o === '' ? Number(base) || 0 : Number(o) || 0;
    });

  const liveModalCalories = useMemo(() => {
    if (!logModalQuest) return 0;
    if (logModalQuest.type === 'cardio') {
      const { distanceKm, durationMin, elevationM } = cardioFigures(logModalQuest);
      return calculateCardioCalories({
        cardioMode: logModalQuest.cardioMode || 'run',
        distanceKm,
        durationMin,
        elevationM,
        rpe: logRpe,
        userWeightKg: gameState.userWeightKg
      });
    } else {
      const activeSets =
        logEntryMode === 'per_set'
          ? logSetDetails
          : Array(Math.max(1, Number(logUniformSets) || 1)).fill(
              Math.max(0, Number(logUniformReps) || 0)
            );
      return calculateStrengthCalories({
        unit: logModalQuest.unit,
        timed: isTimedQuest(logModalQuest),
        weightKg: logModalQuest.unit === 'kg' ? (perSetActive ? weightedMean(activeSets, perSetValues(logValue)) : logValue) : 0,
        assistanceKg:
          logModalQuest.unit === 'reps' && logUseAssistance
            ? perSetActive ? weightedMean(activeSets, perSetValues(logAssistanceKg)) : logAssistanceKg
            : 0,
        setDetails: activeSets,
        rpe: logRpe,
        userWeightKg: gameState.userWeightKg
      });
    }
  }, [
    logModalQuest,
    logValue,
    logUseAssistance,
    logAssistanceKg,
    logEntryMode,
    logUniformSets,
    logUniformReps,
    logSetDetails,
    logPerSetLoad,
    logSetOverrides,
    logDurationMin,
    logElevationM,
    logCardioInput,
    logRpe,
    gameState.userWeightKg
  ]);

  // ==========================================
  // ACTIONS
  // ==========================================
  const openLogModal = quest => {
    playGameSound('click', gameState.soundEnabled);
    setLogModalQuest(quest);
    setLogDate(selectedDate || getTodayISODate());
    setLogRpe(7);
    setLogRpeSet(false);
    setLogNote('');
    setLogCardioInputRaw(DEFAULT_CARDIO_INPUT);
    setLogPerSetLoad(false);
    setLogSetOverrides([]);

    if (quest.type === 'cardio') {
      setLogValue(Number(quest.currentValue) || Number(quest.startValue) || 5);
      setLogDurationMin(Number(quest.durationMin) || 28);
      setLogElevationM(Number(quest.elevationM) || 30);
    } else {
      const targetSets = Math.max(1, Number(quest.goalSets) || 3);
      const targetReps = Math.max(1, Number(quest.goalReps) || Number(quest.goalValue) || 6);
      const existingSets = getSetDetailsArray(quest, targetSets, targetReps);
      const initialSets =
        existingSets.length > 0 ? [...existingSets] : Array(targetSets).fill(targetReps);

      setLogSetDetails(initialSets);
      setLogUniformSets(initialSets.length);
      setLogUniformReps(initialSets[0] || targetReps);
      setLogEntryMode('per_set');

      if (quest.unit === 'kg') {
        setLogValue(Number(quest.currentValue) || Number(quest.startValue) || 40);
        setLogUseAssistance(false);
        setLogAssistanceKg(0);
      } else {
        setLogValue(Math.max(...initialSets, targetReps));
        const currAssist = Number(quest.currentAssistanceKg) || 0;
        setLogUseAssistance(currAssist > 0);
        setLogAssistanceKg(currAssist);
      }
    }
  };

  // « Comme prévu par le coach » : remplit séries, répétitions et charge (ou aide) avec la proposition du coach pour cet exercice
  const applyCoachTarget = () => {
    const q = logModalQuest;
    if (!q || q.type !== 'strength') return;
    const today = getTodayISODate();
    const t = computeExerciseTarget(q, { ...profileOpts(gameState, today), today });
    const reps = t.targetReps.map(r => Math.max(0, Number(r) || 0));
    setLogSetDetails(reps);
    setLogUniformSets(reps.length);
    setLogUniformReps(reps[0] || 0);
    setLogEntryMode('per_set');
    setLogPerSetLoad(false);
    setLogSetOverrides([]);
    if (t.kind === 'load') setLogValue(t.load);
    else if (t.kind === 'assisted') { setLogUseAssistance(t.assist > 0); setLogAssistanceKg(t.assist); }
    triggerToast('Proposition du coach reprise', 'Ajuste si besoin, puis valide la séance.', 0, '🧠');
  };

  const handleUpdateSingleSetRep = (index, deltaOrValue, isAbsolute = false) => {
    setLogSetDetails(prev => {
      const next = [...prev];
      const current = Number(next[index]) || 0;
      next[index] = isAbsolute
        ? Math.max(0, Number(deltaOrValue) || 0)
        : Math.max(0, current + deltaOrValue);
      return next;
    });
  };

  const handleAddSetSlot = () => {
    const defaultRep =
      logSetDetails[logSetDetails.length - 1] ||
      Number(logModalQuest?.goalReps) ||
      6;
    setLogSetDetails(prev => [...prev, defaultRep]);
  };

  const handleRemoveSetSlot = () => {
    if (logSetDetails.length <= 1) return;
    setLogSetDetails(prev => prev.slice(0, -1));
    setLogSetOverrides(prev => prev.slice(0, logSetDetails.length - 1));
  };

  // Active / coupe « charge différente selon la série » (cela impose la saisie série par série)
  const togglePerSetLoad = on => {
    setLogPerSetLoad(on);
    if (on) setLogEntryMode('per_set');
    else setLogSetOverrides([]);
  };
  const handleSetOverride = (index, value) =>
    setLogSetOverrides(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });

  const handleApplyUniformToSets = (setsCount, repsCount) => {
    const s = Math.max(1, Math.min(12, Number(setsCount) || 1));
    const r = Math.max(0, Number(repsCount) || 0);
    setLogUniformSets(s);
    setLogUniformReps(r);
    setLogSetDetails(Array(s).fill(r));
  };

  const handleSaveSession = e => {
    e.preventDefault();
    if (!logModalQuest) return;

    const quest = logModalQuest;
    const calories = liveModalCalories;
    let xpEarned = 50 + Math.round(calories * 0.15);
    let bannerTitle = 'Séance Validée !';
    let bannerSubtitle = `+${calories} kcal brûlées`;
    let bannerBadge = '🎵';
    let questForAutoLevelUp = null;

    const newUnlocked = new Set(gameState.unlockedAchievements);
    newUnlocked.add('first_blood');

    const updatedQuests = gameState.quests.map(q => {
      if (q.id !== quest.id) return q;

      if (q.type === 'cardio') {
        const fig = cardioFigures(q);
        const val = Math.max(0.1, q.unit === 'km' ? fig.distanceKm : Number(logValue) || 0);
        const dur = Math.max(1, fig.durationMin);
        const elev = fig.elevationM;
        const how = cardioInputNote(logCardioInput);
        const isPR = val > (Number(q.currentValue) || 0);
        const isBoss = val >= (Number(q.goalValue) || 10);

        if (isPR) {
          xpEarned += 120;
          bannerTitle = 'Nouveau Record Cardio !';
          bannerBadge = '🏃';
        }
        if (isBoss) {
          xpEarned += 400;
          bannerTitle = 'Objectif Cardio Vaincu !';
          bannerBadge = '👑';
          newUnlocked.add('boss_slayer');
        }

        const newEntry = {
          id: `h_${Date.now()}`,
          date: logDate,
          value: val,
          durationMin: dur,
          ...(cardioHasElevation(q.cardioMode) ? { elevationM: elev } : {}),
          rpe: logRpe,
          calories,
          goalBeaten: isBoss,
          note:
            logNote.trim() ||
            `Sortie ${q.name} : ${val} ${q.unit} en ${dur} min${how ? ', ' + how : ''} (${calories} kcal)`
        };

        const updatedCardioQuest = {
          ...q,
          currentValue: Math.max(Number(q.currentValue) || 0, val),
          durationMin: dur,
          elevationM: elev,
          history: [...(q.history || []), newEntry]
        };

        if (isBoss) questForAutoLevelUp = updatedCardioQuest;
        return updatedCardioQuest;
      }

      const finalSetDetails =
        logEntryMode === 'per_set'
          ? logSetDetails.map(r => Math.max(0, Number(r) || 0))
          : Array(Math.max(1, Number(logUniformSets) || 1)).fill(
              Math.max(0, Number(logUniformReps) || 0)
            );
      const n = finalSetDetails.length;
      // charge / aide de chaque série (une même valeur partout, sauf si « différente selon la série » est coché)
      const loads = q.unit === 'kg' ? (perSetActive ? perSetValues(logValue) : Array(n).fill(Number(logValue) || 0)) : null;
      const assists = q.unit === 'reps' && logUseAssistance
        ? (perSetActive ? perSetValues(logAssistanceKg) : Array(n).fill(Number(logAssistanceKg) || 0))
        : null;
      const r = applyStrengthSession(q, {
        date: logDate, setDetails: finalSetDetails, loads, assists, rpe: logRpe, rpeSet: logRpeSet, calories, note: logNote.trim(),
      });
      xpEarned = r.xp;
      r.unlocked.forEach(u => newUnlocked.add(u));
      bannerTitle = r.banner.title;
      bannerSubtitle = r.banner.subtitle;
      bannerBadge = r.banner.badge;
      if (r.bossDefeated) questForAutoLevelUp = r.quest;
      return r.quest;
    });

    const hasStrength = updatedQuests.some(
      q => q.type === 'strength' && (q.history || []).length > 0
    );
    const hasCardio = updatedQuests.some(
      q => q.type === 'cardio' && (q.history || []).length > 0
    );
    if (hasStrength && hasCardio) newUnlocked.add('hybrid_athlete');

    const totalCaloriesAfter = updatedQuests.reduce(
      (sum, q) =>
        sum +
        (q.history || []).reduce((s, h) => s + (Number(h.calories) || 0), 0),
      0
    );
    if (totalCaloriesAfter >= 1000) newUnlocked.add('calorie_furnace');

    const xpDay = getTodayISODate();
    const award = computeXp(gameState, xpEarned, xpDay, 'session');
    setGameState(prev => ({
      ...prev,
      ...computeXp(prev, xpEarned, xpDay, 'session').patch,
      unlockedAchievements: Array.from(new Set([...(prev.unlockedAchievements || []), ...newUnlocked])),
      quests: updatedQuests
    }));

    setSelectedDate(logDate);
    setSelectedJournalDay(logDate);
    setLogModalQuest(null);
    playGameSound(
      bannerBadge === '👑' ? 'boss' : 'xp',
      gameState.soundEnabled
    );
    triggerToast(bannerTitle, bannerSubtitle + xpNote(award), award.gained, bannerBadge);

    if (questForAutoLevelUp) {
      openLevelUpModal(questForAutoLevelUp);
    }
  };

  return { logRpe, logRpeSet, chooseLogRpe, logModalQuest, setLogModalQuest, logDate, setLogDate, logValue, setLogValue, logUseAssistance, setLogUseAssistance, logAssistanceKg, setLogAssistanceKg, logEntryMode, setLogEntryMode, logUniformSets, logUniformReps, logSetDetails, logDurationMin, setLogDurationMin, logElevationM, setLogElevationM, logCardioInput, setLogCardioInput, cardioFigures, logNote, setLogNote, liveModalCalories, openLogModal, handleUpdateSingleSetRep, handleAddSetSlot, handleRemoveSetSlot, handleApplyUniformToSets, handleSaveSession, applyCoachTarget, logPerSetLoad, logSetOverrides, togglePerSetLoad, handleSetOverride };
}
