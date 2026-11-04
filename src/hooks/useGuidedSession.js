import { coachSessionRecap } from '../coach/advice';
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

  const startGuided = session => {
    if (!session || !session.exercises.length) return;
    const data = {};
    session.exercises.forEach(e => {
      // forme de séries (pyramide, dégressive…) : charge, aide et type de chaque série viennent du détail e.plan
      const plan = Array.isArray(e.plan) && e.plan.length ? e.plan : null;
      data[e.questId] = {
        reps: plan ? plan.map(p => p.reps) : e.targetReps.slice(),
        loads: plan ? plan.map(p => p.load || 0) : e.targetReps.map(() => e.load || 0),     // charge de chaque série (modifiable entre deux séries)
        assists: plan ? plan.map(p => p.assist || 0) : e.targetReps.map(() => e.assist || 0), // aide de chaque série
        kinds: plan ? plan.map(p => p.kind) : null,
        done: (plan || e.targetReps).map(() => false),
        load: e.load || 0,
        assist: e.assist || 0
      };
    });
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

  return { guided, setGuided, guidedOpen, setGuidedOpen, startGuided, handleFinishGuided, recap, setRecap };
}
