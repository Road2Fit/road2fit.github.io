import { suggestStart } from '../coach/startSuggestion';
import { aiStatus } from '../ai/client';
import { createExerciseWithAi } from '../ai/exercise';
import { normalizeArenaGroup } from '../data/arenas';
import { EXERCISE_CATALOG } from '../data/catalog';
import { calculateCardioCalories, calculateStrengthCalories } from '../lib/calories';
import { getTodayISODate } from '../lib/dates';
import { isStartEntry, isTimedCatalog, isTimedQuest } from '../lib/quests';
import { playGameSound } from '../lib/sound';
import { useState } from 'react';
import { computeXp } from '../lib/xp';
import { pick } from '../edition';

export function useQuestForm({ gameState, setGameState, setSelectedChartQuestId, triggerToast }) {
  // Modale "Ajouter / Ajuster un Objectif"
  const [questModalOpen, setQuestModalOpen] = useState(false);

  const [editingQuestId, setEditingQuestId] = useState(null);

  const [formCatalogId, setFormCatalogId] = useState('pullups');

  const [formCustomName, setFormCustomName] = useState('');

  const [formCategory, setFormCategory] = useState('Dos');
  const [formMuscle2, setFormMuscle2] = useState(''); // 2e muscle (facultatif) ; 'none' = aucun, même si l'exercice du catalogue en a un
  const [formMuscle, setFormMuscle] = useState(''); // mode optimisé : muscle précis choisi à la main (exercices personnalisés)

  const [formType, setFormType] = useState('strength');

  const [formUnit, setFormUnit] = useState('reps');

  const [formTimed, setFormTimed] = useState(false);

  const [formGoalMode, setFormGoalMode] = useState('sets_reps');

  const [formCardioMode, setFormCardioMode] = useState('run');

  const [formIcon, setFormIcon] = useState('🦅');

  const [formStartValue, setFormStartValue] = useState(4);

  const [formCurrentValue, setFormCurrentValue] = useState(4);

  const [formGoalValue, setFormGoalValue] = useState(6);

  const [formGoalSets, setFormGoalSets] = useState(3);

  const [formGoalReps, setFormGoalReps] = useState(6);

  const [formStartAssistanceKg, setFormStartAssistanceKg] = useState(15);

  // Explication de la charge / des séries proposées pour l'exercice choisi (d'après tes maxima et ton profil du moment)
  const [formSuggestion, setFormSuggestion] = useState('');

  const [formGoalAssistanceKg, setFormGoalAssistanceKg] = useState(0);

  const openCreateQuestModal = () => {
    const def = EXERCISE_CATALOG[0];
    setEditingQuestId(null);
    setFormCatalogId(def.id);
    setFormCustomName(def.name);
    setFormCategory(def.category);
    setFormMuscle('');
    setFormMuscle2('');
    setFormType(def.type);
    setFormUnit(def.unit);
    setFormTimed(isTimedCatalog(def));
    setFormGoalMode(def.defaultGoalMode || 'sets_reps');
    setFormCardioMode(def.cardioMode || 'run');
    setFormIcon(def.icon);
    setFormStartValue(def.defaultStart);
    setFormCurrentValue(def.defaultStart);
    setFormGoalValue(def.defaultGoal);
    setFormGoalSets(def.defaultGoalSets || 3);
    setFormGoalReps(def.defaultGoalReps || 6);
    setFormStartAssistanceKg(def.defaultStartAssistance || 0);
    setFormGoalAssistanceKg(def.defaultGoalAssistance || 0);
    setQuestModalOpen(true);
  };

  const openEditQuestModal = quest => {
    setEditingQuestId(quest.id);
    setFormCatalogId(quest.catalogId || 'custom');
    setFormCustomName(quest.name);
    setFormCategory(normalizeArenaGroup(quest.category, quest.type));
    setFormMuscle(quest.muscle || '');
    setFormMuscle2(quest.muscle2 || '');
    setFormType(quest.type || 'strength');
    setFormUnit(quest.unit || 'reps');
    setFormTimed(isTimedQuest(quest));
    setFormGoalMode(quest.goalMode || 'sets_reps');
    setFormCardioMode(quest.cardioMode || 'run');
    setFormIcon(quest.icon || '⚔️');
    setFormStartValue(Number(quest.startValue) || 0);
    setFormCurrentValue(Number(quest.currentValue) || 0);
    setFormGoalValue(Number(quest.goalValue) || 6);
    setFormGoalSets(Number(quest.goalSets) || 3);
    setFormGoalReps(Number(quest.goalReps) || Number(quest.goalValue) || 6);
    setFormStartAssistanceKg(Number(quest.startAssistanceKg) || 0);
    setFormGoalAssistanceKg(Number(quest.goalAssistanceKg) || 0);
    setFormSwapNote('');
    setQuestModalOpen(true);
  };

  const handleSelectCatalogExercise = catId => {
    setFormCatalogId(catId);
    // exercice du catalogue commun (créé par le coach) : son muscle vient de sa fiche
    const shared = EXERCISE_CATALOG.find(c => c.id === catId && c.shared);
    setFormMuscle(shared ? shared.muscle || '' : '');
    setFormMuscle2(shared ? shared.muscle2 || '' : '');
    setFormSuggestion('');
    if (catId === 'custom_strength') {
      setFormCustomName('');
      setFormCategory('Pectoraux');
      setFormType('strength');
      setFormUnit('kg');
      setFormTimed(false);
      setFormGoalMode('sets_reps');
      setFormIcon('⚔️');
      setFormStartValue(20);
      setFormCurrentValue(20);
      setFormGoalValue(40);
      setFormGoalSets(3);
      setFormGoalReps(8);
      setFormStartAssistanceKg(0);
      setFormGoalAssistanceKg(0);
      return;
    }
    if (catId === 'custom_bodyweight') {
      setFormCustomName('');
      setFormCategory('Dos');
      setFormType('strength');
      setFormUnit('reps');
      setFormTimed(false);
      setFormGoalMode('sets_reps');
      setFormIcon('🦅');
      setFormStartValue(4);
      setFormCurrentValue(4);
      setFormGoalValue(8);
      setFormGoalSets(3);
      setFormGoalReps(8);
      setFormStartAssistanceKg(10);
      setFormGoalAssistanceKg(0);
      return;
    }
    const found = EXERCISE_CATALOG.find(item => item.id === catId);
    if (!found) return;
    setFormCustomName(found.name);
    setFormCategory(normalizeArenaGroup(found.category, found.type));
    setFormType(found.type);
    setFormUnit(found.unit);
    setFormTimed(isTimedCatalog(found));
    setFormGoalMode(found.defaultGoalMode || 'sets_reps');
    setFormCardioMode(found.cardioMode || 'run');
    setFormIcon(found.icon);
    setFormStartValue(found.defaultStart);
    setFormCurrentValue(found.defaultStart);
    setFormGoalValue(found.defaultGoal);
    setFormGoalSets(found.defaultGoalSets || 3);
    setFormGoalReps(found.defaultGoalReps || 6);
    setFormStartAssistanceKg(found.defaultStartAssistance || 0);
    setFormGoalAssistanceKg(found.defaultGoalAssistance || 0);
    // charge de départ, séries et répétitions adaptées à tes maxima et à ton profil de travail
    const s = suggestStart(found, gameState, getTodayISODate(), EXERCISE_CATALOG);
    setFormStartValue(s.startValue);
    setFormCurrentValue(s.startValue);
    setFormGoalValue(s.goalValue);
    setFormGoalSets(s.goalSets);
    setFormGoalReps(s.goalReps);
    setFormSuggestion(s.note);
  };

  // « Changer d'exercice » depuis Ajuster : seule l'identité change (nom, icône, arène, fiche de mouvement, machine) ;
  // l'historique, la charge actuelle, l'objectif, les séries / répétitions et l'aide restent tels quels.
  // Seuls les exercices de même type et de même unité (kg / répétitions / durée) sont proposés.
  const [formSwapNote, setFormSwapNote] = useState('');
  const isSwapCompatible = c => c.type === formType && c.unit === formUnit && isTimedCatalog(c) === formTimed;
  // Mesure de l'exercice, en un seul choix : « body » (poids du corps, avec aide élastique = charge négative), « kg » (charge) ou « timed » (durée).
  // Elle se règle à la création, ou tant que l'exercice n'a aucune séance enregistrée (sinon l'historique ne suivrait plus).
  const measure = formType !== 'strength' ? null : formTimed ? 'timed' : formUnit === 'kg' ? 'kg' : 'body';
  const editedQuest = editingQuestId ? (gameState.quests || []).find(q => q.id === editingQuestId) : null;
  const canChangeMeasure = !editedQuest || !(editedQuest.history || []).some(h => !isStartEntry(h));
  const changeMeasure = m => {
    if (m === measure || !canChangeMeasure) return;
    setFormTimed(m === 'timed');
    setFormUnit(m === 'kg' ? 'kg' : 'reps');
    if (formGoalMode === 'weight_only' && m !== 'kg') setFormGoalMode('sets_reps');
    const set = (start, goal, reps) => {
      setFormStartValue(start);
      setFormCurrentValue(start);
      setFormGoalValue(goal);
      setFormGoalReps(reps);
    };
    if (m === 'kg') { set(20, 40, 8); setFormStartAssistanceKg(0); setFormGoalAssistanceKg(0); }
    else if (m === 'timed') { set(20, 30, 30); setFormStartAssistanceKg(0); setFormGoalAssistanceKg(0); }
    else { set(10, 15, 15); setFormStartAssistanceKg(0); setFormGoalAssistanceKg(0); }
  };

  // Exercice d'une autre unité (ex. répétitions au lieu de kg) : l'historique ne peut pas suivre, on propose d'en faire un NOUVEL exercice
  const [swapOther, setSwapOther] = useState(null);
  const handleReplaceExercise = catId => {
    setSwapOther(null);
    const found = EXERCISE_CATALOG.find(item => item.id === catId);
    if (!found || !isSwapCompatible(found)) return;
    setFormCatalogId(catId);
    setFormCustomName(found.name);
    setFormCategory(normalizeArenaGroup(found.category, found.type));
    setFormMuscle('');
    setFormMuscle2('');
    setFormIcon(found.icon);
    setFormCardioMode(found.cardioMode || formCardioMode);
    setFormSwapNote(`Exercice remplacé par « ${found.name} ». Tout l’historique, la charge et l’objectif sont conservés : enregistre pour valider.`);
  };

  const handleSaveQuestForm = e => {
    e.preventDefault();
    const cleanName = formCustomName.trim() || 'Nouvel Exercice';
    const gSets = formGoalMode === 'reps_only' ? 1 : Math.max(1, Number(formGoalSets) || 3);
    const gReps = Math.max(1, Number(formGoalReps) || 6);
    const effectiveUnit =
      formType === 'strength' && formGoalMode === 'weight_only' ? 'kg' : formUnit;
    const finalGoalValue =
      formType === 'strength' && effectiveUnit === 'reps'
        ? gReps
        : Math.max(1, Number(formGoalValue) || gReps);

    if (editingQuestId) {
      setGameState(prev => ({
        ...prev,
        quests: prev.quests.map(q => {
          if (q.id !== editingQuestId) return q;
          return {
            ...q,
            catalogId: formCatalogId && formCatalogId !== 'custom' ? formCatalogId : q.catalogId,
            name: cleanName,
            category: formCategory,
            muscle: formMuscle || undefined,
            muscle2: formMuscle2 || undefined,
            type: formType,
            unit: effectiveUnit,
            timed: formType === 'strength' && effectiveUnit === 'reps' ? formTimed : undefined,
            goalMode: formGoalMode,
            cardioMode: formCardioMode,
            icon: formIcon,
            startValue: Number(formStartValue) || 0,
            currentValue: Number(formCurrentValue) || 0,
            goalValue: finalGoalValue,
            goalSets: gSets,
            goalReps: gReps,
            startAssistanceKg:
              effectiveUnit === 'reps' && !formTimed ? Number(formStartAssistanceKg) || 0 : 0,
            goalAssistanceKg:
              effectiveUnit === 'reps' && !formTimed ? Number(formGoalAssistanceKg) || 0 : 0
          };
        })
      }));
      triggerToast('Objectif ajusté !', `${cleanName} mis à jour.`, 25, '🛠️');
    } else {
      const startRepsOrVal = Number(formStartValue) || 0;
      const initialSetDetails =
        formType === 'strength'
          ? Array(gSets).fill(effectiveUnit === 'reps' ? startRepsOrVal : gReps)
          : [];

      const initialCalories =
        formType === 'cardio'
          ? calculateCardioCalories({
              cardioMode: formCardioMode,
              distanceKm: startRepsOrVal,
              durationMin: 25,
              elevationM: 20,
              rpe: 7,
              userWeightKg: gameState.userWeightKg
            })
          : calculateStrengthCalories({
              unit: effectiveUnit,
              timed: formTimed,
              weightKg: effectiveUnit === 'kg' ? startRepsOrVal : 0,
              assistanceKg:
                effectiveUnit === 'reps' && !formTimed ? Number(formStartAssistanceKg) || 0 : 0,
              setDetails: initialSetDetails,
              rpe: 7,
              userWeightKg: gameState.userWeightKg
            });

      const newQuest = {
        id: `q_${Date.now()}`,
        catalogId: formCatalogId,
        name: cleanName,
        category: formCategory,
            muscle: formMuscle || undefined,
            muscle2: formMuscle2 || undefined,
        type: formType,
        cardioMode: formCardioMode,
        unit: effectiveUnit,
        timed: formType === 'strength' && effectiveUnit === 'reps' ? formTimed : undefined,
        goalMode: formGoalMode,
        level: 1,
        icon: formIcon,
        startValue: startRepsOrVal,
        currentValue: Number(formCurrentValue) || startRepsOrVal,
        goalValue: finalGoalValue,
        goalSets: gSets,
        goalReps: gReps,
        setDetails: initialSetDetails,
        startAssistanceKg:
          effectiveUnit === 'reps' && !formTimed ? Number(formStartAssistanceKg) || 0 : 0,
        currentAssistanceKg:
          effectiveUnit === 'reps' && !formTimed ? Number(formStartAssistanceKg) || 0 : 0,
        goalAssistanceKg:
          effectiveUnit === 'reps' && !formTimed ? Number(formGoalAssistanceKg) || 0 : 0,
        history: [
          {
            id: `h_start_${Date.now()}`,
            date: getTodayISODate(),
            value: Number(formCurrentValue) || startRepsOrVal,
            sets: gSets,
            reps: effectiveUnit === 'reps' ? startRepsOrVal : gReps,
            setDetails: initialSetDetails,
            assistanceKg:
              effectiveUnit === 'reps' && !formTimed ? Number(formStartAssistanceKg) || 0 : 0,
            rpe: 7,
            calories: initialCalories,
            goalBeaten: false,
            note: `Point de départ — Niveau 1 (${cleanName})`
          }
        ]
      };

      setGameState(prev => ({
        ...prev,
        ...computeXp(prev, 40, getTodayISODate(), 'minor').patch,
        quests: [newQuest, ...prev.quests]
      }));
      setSelectedChartQuestId(newQuest.id);
      triggerToast('Nouvel exercice créé !', pick(`${cleanName} ajouté au Pokédex.`, `${cleanName} ajouté à ta liste.`), 40, formIcon);
    }

    setQuestModalOpen(false);
    playGameSound('xp', gameState.soundEnabled);
  };

  // exercice introuvable : le coach intelligent le crée (et le partage avec tous les utilisateurs)
  const createWithAi = aiStatus(gameState) === 'ok' ? async text => (await createExerciseWithAi(gameState, text)).entry.id : null;

  return { createWithAi, questModalOpen, setQuestModalOpen, editingQuestId, formCatalogId, formCustomName, setFormCustomName, formCategory, setFormCategory, formMuscle, setFormMuscle, formMuscle2, setFormMuscle2, formType, formUnit, setFormUnit, formTimed, setFormTimed, formGoalMode, setFormGoalMode, formStartValue, setFormStartValue, setFormCurrentValue, formGoalValue, setFormGoalValue, formGoalSets, setFormGoalSets, formGoalReps, setFormGoalReps, formStartAssistanceKg, setFormStartAssistanceKg, formGoalAssistanceKg, setFormGoalAssistanceKg, openCreateQuestModal, openEditQuestModal, handleSelectCatalogExercise, handleSaveQuestForm, formSuggestion, formSwapNote, handleReplaceExercise, isSwapCompatible, formIcon, swapOther, setSwapOther, measure, changeMeasure, canChangeMeasure };
}
