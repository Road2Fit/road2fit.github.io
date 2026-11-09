import { coachSessionRecap } from '../coach/advice';
import { coachKind, coachRealEntries } from '../coach/settings';
import { computeExerciseTarget } from '../coach/targets';
import { profileOpts } from '../coach/profiles';
import { EXERCISE_CATALOG } from '../data/catalog';
import { fineGroupOf } from '../data/muscles';
import { makeQuestFromCatalog } from '../lib/questFactory';
import { calculateStrengthCalories, warmupCalories } from '../lib/calories';
import { warmupSets } from '../coach/warmup';
import { getTodayISODate } from '../lib/dates';
import { isTimedQuest } from '../lib/quests';
import { applyStrengthSession } from '../lib/sessionRecord';
import { assistsOf, loadsOf, weightedMean } from '../lib/setLoads';
import { playGameSound } from '../lib/sound';
import { useEffect, useState } from 'react';
import { computeXp, xpNote } from '../lib/xp';

export function useGuidedSession({
  gameState, openLevelUpModal, setGameState, setSelectedDate, setSelectedJournalDay, triggerToast,
}) {
  // ---- Coach : séance guidée ----
  const GUIDED_KEY = 'rondoufit_guided_v1';

  const [guided, setGuided] = useState(() => {
    try { const s = localStorage.getItem(GUIDED_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  });

  const [guidedOpen, setGuidedOpen] = useState(false);

  useEffect(() => {
    try {
      if (guided) localStorage.setItem(GUIDED_KEY, JSON.stringify(guided));
      else localStorage.removeItem(GUIDED_KEY);
    } catch (e) {}
  }, [guided]);

  // séance précédente de l'exercice (affichée discrètement sous chaque série : « La dernière fois : … »)
  const prevOf = questId => {
    const q = (gameState.quests || []).find(x => x.id === questId);
    const es = q ? coachRealEntries(q) : [];
    const last = es[es.length - 1];
    if (!last || !Array.isArray(last.setDetails) || !last.setDetails.length) return null;
    const reps = last.setDetails;
    return { date: last.date, reps, loads: Array.isArray(last.setLoads) ? last.setLoads : reps.map(() => Number(last.value) || 0), assists: Array.isArray(last.setAssists) ? last.setAssists : reps.map(() => Number(last.assistanceKg) || 0) };
  };

// meilleures performances de l'exercice (pour fêter un record pendant la séance) : 1RM estimé (Epley), répétitions au poids du corps, secondes tenues
  const bestOf = questId => {
    const q = (gameState.quests || []).find(x => x.id === questId);
    const es = q ? coachRealEntries(q) : [];
    if (!es.length) return null;
    let e1rm = 0; let reps = 0; let sec = 0;
    es.forEach(h => (h.setDetails || []).forEach((r, i) => {
      const n = Number(r) || 0;
      const l = Array.isArray(h.setLoads) ? Number(h.setLoads[i]) || 0 : Number(h.value) || 0;
      const as = Array.isArray(h.setAssists) ? Number(h.setAssists[i]) || 0 : Number(h.assistanceKg) || 0;
      if (q.unit === 'kg') e1rm = Math.max(e1rm, l * (1 + n / 30));
      else if (isTimedQuest(q)) sec = Math.max(sec, n);
      else if (as === 0) reps = Math.max(reps, n);
    }));
    return { e1rm, reps, sec };
  };

  const startGuided = session => {
    if (!session || !session.exercises.length) return;
    const data = {};
    session.exercises.forEach(e => { data[e.questId] = dataFor(e); });
    setGuided({
      startedAt: Date.now(),
      templateId: session.templateId,
      items: session.exercises,
      data,
      idx: 0,
      phase: 'run',
      rpe: 7,
      warmup: session.warmup || '',
      programKey: session.program ? session.program.key : null,
    });
    setGuidedOpen(true);
  };

  // forme de séries (pyramide, dégressive…) : charge, aide et type de chaque série viennent du détail e.plan
  const dataFor = e => {
      const plan = Array.isArray(e.plan) && e.plan.length ? e.plan : null;
      return {
        reps: plan ? plan.map(p => p.reps) : e.targetReps.slice(),
        loads: plan ? plan.map(p => p.load || 0) : e.targetReps.map(() => e.load || 0),     // charge de chaque série (modifiable entre deux séries)
        assists: plan ? plan.map(p => p.assist || 0) : e.targetReps.map(() => e.assist || 0), // aide de chaque série
        kinds: plan ? plan.map(p => p.kind) : null,
        done: (plan || e.targetReps).map(() => false),
        load: e.load || 0,
        assist: e.assist || 0,
        prev: prevOf(e.questId),
        best: bestOf(e.questId),
      };
  };

  // ---- « Machine prise » : changer l'exercice en cours pour un équivalent (même muscle, même façon de mesurer), annulable ----
  const swapChoices = questId => {
    if (!guided) return [];
    const it = guided.items.find(x => x.questId === questId);
    const q = (gameState.quests || []).find(x => x.id === questId);
    if (!it || !q) return [];
    const muscle = fineGroupOf(q);
    const inSession = new Set(guided.items.map(x => x.questId));
    const mine = (gameState.quests || []).filter(x => x.type === 'strength' && x.goalMode !== 'free_mode' && !inSession.has(x.id) && fineGroupOf(x) === muscle && coachKind(x) === coachKind(q) && !!x.timed === !!q.timed)
      .map(x => ({ questId: x.id, name: x.name }));
    const known = new Set((gameState.quests || []).map(x => x.catalogId));
    const fromCatalog = EXERCISE_CATALOG.filter(c => c.type === 'strength' && !known.has(c.id) && c.unit === q.unit && fineGroupOf({ catalogId: c.id, name: c.name, category: c.category, type: 'strength' }) === muscle)
      .slice(0, Math.max(0, 5 - mine.length))
      .map(c => ({ catalogId: c.id, name: c.name, isNew: true }));
    return [...mine, ...fromCatalog].slice(0, 5);
  };
  const swapExercise = (questId, choice) => {
    if (!guided || !choice) return;
    const idx = guided.items.findIndex(x => x.questId === questId);
    if (idx < 0) return;
    const today = getTodayISODate();
    let quest = choice.questId ? (gameState.quests || []).find(x => x.id === choice.questId) : null;
    let added = null;
    if (!quest && choice.catalogId) {
      const c = EXERCISE_CATALOG.find(x => x.id === choice.catalogId);
      if (!c) return;
      quest = makeQuestFromCatalog(c, gameState, today, 'ajouté pendant la séance (machine prise)').quest;
      added = quest.id;
      setGameState(prev => ({ ...prev, quests: [...prev.quests, quest] }));
    }
    if (!quest) return;
    const e = computeExerciseTarget(quest, { ...profileOpts(gameState, today), today });
    const old = guided.items[idx];
    setGuided(prev => {
      const items = prev.items.slice();
      items[idx] = e;
      return { ...prev, items, data: { ...prev.data, [e.questId]: dataFor(e) }, rest: null, swap: { at: idx, item: old, data: prev.data[old.questId], newId: e.questId, added } };
    });
  };
  const undoSwap = () => {
    if (!guided || !guided.swap) return;
    const sw = guided.swap;
    setGuided(prev => {
      const items = prev.items.slice();
      items[sw.at] = sw.item;
      const data = { ...prev.data, [sw.item.questId]: sw.data };
      delete data[sw.newId];
      return { ...prev, items, data, swap: null, idx: sw.at };
    });
    // exercice créé pour l'occasion et jamais fait : on le retire
    if (sw.added) setGameState(prev => ({ ...prev, quests: prev.quests.filter(q => q.id !== sw.added || coachRealEntries(q).length > 0) }));
  };

  const handleFinishGuided = g => {
    try { window.dispatchEvent(new CustomEvent('rondoufit-rest-stop')); } catch (e) { /* rien */ } // séance finie : plus de repos
    const today = getTodayISODate();
    let xpEarned = 0;
    let bossQuest = null;
    let doneEx = 0;
    const newUnlocked = new Set(gameState.unlockedAchievements || []);
    const updatedQuests = gameState.quests.map(q => {
      const it = g.items.find(x => x.questId === q.id);
      if (!it) return q;
      const dd = g.data[q.id];
      const setDetails = dd.reps.map(r => Math.max(0, Number(r) || 0)).filter((r, i) => dd.done[i]);
      if (!setDetails.length) return q;
      const isKg = q.unit === 'kg';
      // charge / aide de chaque série réalisée
      const doneLoads = loadsOf(dd).filter((_, i) => dd.done[i]).map(x => Math.max(0, Number(x) || 0));
      const doneAssists = assistsOf(dd).filter((_, i) => dd.done[i]).map(x => Math.max(0, Number(x) || 0));
      doneEx++;
      // ressenti de cet exercice (1 à 10) ; sinon le ressenti global de la séance
      const exerciseRpe = Math.min(10, Math.max(1, Number(dd.rpe) || g.rpe || 7));
      const avgLoad = isKg && setDetails.reduce((a, r) => a + r, 0) > 0 ? weightedMean(setDetails, doneLoads) : Math.max(...doneLoads, 0);
      const avgAssist = !isKg && it.kind === 'assisted' && setDetails.reduce((a, r) => a + r, 0) > 0 ? weightedMean(setDetails, doneAssists) : (it.kind === 'assisted' ? Math.min(...doneAssists) : 0);
      // échauffement fait (séries cochées) : ajouté aux calories de l'exercice
      const idx = g.items.indexOf(it);
      const warmDone = warmupSets(it, g.items.slice(0, Math.max(0, idx)), dd.load, dd.assist).filter((_, k) => dd.wdone && dd.wdone[k]);
      const warmKcal = warmupCalories({ unit: q.unit, timed: isTimedQuest(q), userWeightKg: gameState.userWeightKg }, warmDone);
      const calories = warmKcal + calculateStrengthCalories({
        unit: q.unit,
        timed: isTimedQuest(q),
        weightKg: isKg ? avgLoad : 0,
        assistanceKg: avgAssist,
        setDetails,
        rpe: exerciseRpe,
        userWeightKg: gameState.userWeightKg
      });
      const r = applyStrengthSession(q, {
        date: today,
        setDetails,
        loads: isKg ? doneLoads : null,
        assists: !isKg && it.kind === 'assisted' ? doneAssists : null,
        rpe: exerciseRpe,
        rpeSet: !!(Number(dd.rpe) || Number(g.rpe)),
        calories,
        guidedLabel: g.templateId || '',
        method: it.method && it.method !== 'straight' ? it.method : null,
        kinds: Array.isArray(dd.kinds) ? dd.reps.map((_, i) => dd.kinds[i] || 'work').filter((_, i) => dd.done[i]) : null,
      });
      xpEarned += r.xp;
      r.unlocked.forEach(u => newUnlocked.add(u));
      if (r.bossDefeated && !bossQuest) bossQuest = r.quest;
      return r.quest;
    });
    if (doneEx === 0) {
      setGuided(null); setGuidedOpen(false);
      triggerToast('Séance vide', 'Aucune série validée : rien n’a été enregistré.', 0, 'ℹ️');
      return;
    }
    newUnlocked.add('first_blood');
    const award = computeXp(gameState, xpEarned, today, 'session');
    setGameState(prev => ({
      ...prev,
      ...computeXp(prev, xpEarned, today, 'session').patch,
      unlockedAchievements: Array.from(new Set([...(prev.unlockedAchievements || []), ...newUnlocked])),
      quests: updatedQuests
    }));
    setSelectedDate(today);
    setSelectedJournalDay(today);
    setGameState(prev => { const cs = prev.coach; return cs && cs.plan && cs.plan.date <= today ? { ...prev, coach: { ...cs, plan: null } } : prev; });
    // séance du programme de ton coach : marquée comme faite, la suivante prend sa place
    if (g.programKey) setGameState(prev => { const cs = prev.coach || {}; return cs.program ? { ...prev, coach: { ...cs, program: { ...cs.program, log: { ...(cs.program.log || {}), [g.programKey]: today } } } } : prev; });
    setGuided(null);
    setGuidedOpen(false);
    playGameSound(bossQuest ? 'boss' : 'xp', gameState.soundEnabled);
    triggerToast('Séance guidée terminée !', `${doneEx} exercice(s) enregistré(s)` + xpNote(award), award.gained, bossQuest ? '👑' : '🎵');
    try { setRecap(coachSessionRecap(gameState.quests, updatedQuests, g, today, award.gained, gameState)); } catch (err) {}
    if (bossQuest) openLevelUpModal(bossQuest);
  };

  const [recap, setRecap] = useState(null);

  return { guided, setGuided, guidedOpen, setGuidedOpen, startGuided, handleFinishGuided, recap, setRecap, swapChoices, swapExercise, undoSwap };
}
