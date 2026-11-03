import { PROFILES } from './profiles';
import { normalizeForProgress } from './methods';
import { decideProfileTarget } from './profileTarget';
import { COACH_ARENAS, coachDaysBetween, coachEquip, coachIsCompound, coachKind, coachRealEntries, coachRound, coachSetsOf, coachStep } from './settings';

import { getTodayISODate } from '../lib/dates';
import { evaluateQuestProgress } from '../lib/progress';
import { isTimedQuest } from '../lib/quests';
import { arenaOf, arenaTier, isAbsArena, isOptimized } from '../data/muscles';

// Objectif de la prochaine séance pour UN exercice
export function computeExerciseTarget(q, opts = {}) {
  const today = opts.today || getTodayISODate();
  const kind = coachKind(q);
  const T = isTimedQuest(q);
  const inc = T ? 5 : 1;
  let sets = Math.max(1, Math.min(6, Number(q.goalSets) || 3));
  const R = Math.max(1, Number(q.goalReps) || 6);
  const goalAssist = Number(q.goalAssistanceKg) || 0;
  const entries = coachRealEntries(q);
  // dernière séance, quelle que soit sa forme (pyramide, dégressives, séance dictée…) : ramenée à ce qui juge la progression
  const last = normalizeForProgress(entries[entries.length - 1] || null, kind, R);
  const arena = arenaOf(q);
  const compound = coachIsCompound(q.name);
  const boss = evaluateQuestProgress(q).isBossDefeated;

  let load = kind === 'load' ? Number(q.currentValue) || 0 : 0;
  let assist = kind === 'assisted' ? Number(q.currentAssistanceKg) || 0 : 0;
  let reps = Array(sets).fill(R);
  let change = 'new';
  let reason = '';

  // Profil de travail choisi (puissance / hypertrophie / endurance de force) : il fixe la fourchette de répétitions,
  // les séries, le repos et la charge ; sans profil (« automatique »), c'est l'ancien calcul ci-dessous.
  const pr = opts.profile && PROFILES[opts.profile] && !T
    ? decideProfileTarget({ q, P: PROFILES[opts.profile], kind, last, today, opts, boss, load, assist, compound, goalAssist })
    : null;
  if (pr) {
    sets = pr.sets;
    load = pr.load;
    assist = pr.assist;
    reps = pr.reps;
    change = pr.change;
    reason = pr.reason;
  } else if (!last) {
    change = 'new';
    reason =
      kind === 'load'
        ? `Charge de départ : ${load} kg. Ajuste-la pendant la séance si c'est trop lourd ou trop léger.`
        : kind === 'assisted'
          ? `Départ avec ${assist} kg d'aide.`
          : T ? `Objectif : ${R} s par série. Pars de ce que tu tiens proprement et ajoute environ 5 s par séance.` : `Objectif : ${R} répétitions par série.`;
  } else {
    let prevSets = coachSetsOf(last, sets, R);
    // Charge (ou aide) changée entre deux séries : la référence est celle de la DERNIÈRE série réalisée, et on ne juge
    // les répétitions que sur les séries faites à cette charge ou plus dures (les plus légères servaient à monter / descendre).
    const perSet = kind === 'load' ? last.setLoads : kind === 'assisted' ? last.setAssists : null;
    const mixed = Array.isArray(perSet) && perSet.length === prevSets.length && new Set(perSet.map(Number)).size > 1;
    const refSet = mixed ? Number(perSet[perSet.length - 1]) || 0 : null;
    if (mixed) prevSets = prevSets.filter((_, i) => (kind === 'load' ? Number(perSet[i]) >= refSet : Number(perSet[i]) <= refSet));
    // séries manquantes à la charge de référence : comptées juste sous l'objectif (on garde cette charge et on vise l'objectif)
    const missing = mixed ? Math.max(0, R - inc) : 0;
    const padded = Array.from({ length: sets }, (_, i) => (prevSets[i] !== undefined ? Number(prevSets[i]) || 0 : missing));
    const minReps = Math.min(...padded);
    const excess = minReps - R;
    const rpe = Number(last.rpe) || 7;
    const gap = coachDaysBetween(last.date, today);
    const lastLoad = kind === 'load' ? (mixed ? refSet : Number(last.value) || load) : 0;
    const lastAssist = kind === 'assisted' ? (mixed ? refSet : Number(last.assistanceKg) || 0) : 0;
    load = lastLoad;
    assist = lastAssist;
    const stepL = coachStep(q, load);
    const holdWord = kind === 'load' ? 'charge' : kind === 'assisted' ? 'aide' : 'difficulté';

    if (gap >= 14) {
      change = 'resume';
      const f = gap >= 21 ? 0.9 : 0.95;
      if (kind === 'load') load = Math.max(stepL, coachRound(load * f, stepL));
      if (kind === 'assisted') assist = assist + (gap >= 21 ? 5 : 2.5);
      reps = Array(sets).fill(R);
      reason = `Reprise après ${gap} jours sans cet exercice : on repart un peu plus léger pour retrouver les sensations.`;
    } else if (minReps >= R) {
      if (boss) {
        change = 'goal';
        reason = 'Objectif atteint ! Valide le niveau suivant dans l’onglet Exercices pour définir un nouveau but.';
      } else if (rpe >= 9 && excess < 2) {
        change = 'hold';
        reason = `Séance précédente ressentie très dure (RPE ${rpe}) : on consolide la même ${holdWord} une séance de plus.`;
      } else if (kind === 'load') {
        let pct = excess >= 2 ? 0.05 : excess === 1 ? 0.035 : 0.025;
        const easy = rpe <= 6; // ressenti facile : on peut monter un peu plus fort
        if (easy) pct = Math.min(0.075, pct + 0.025);
        let nl = coachRound(load * (1 + pct), stepL);
        if (nl <= load) nl = coachRound(load + stepL, stepL);
        const goalV = Number(q.goalValue) || 0;
        if (goalV > load && nl > goalV) nl = goalV;
        change = 'up';
        reason = `${R} reps réussies sur toutes les séries (ressenti ${rpe}/10${easy ? ', facile : on monte un peu plus' : ''}) → +${coachRound(nl - load, 0.5)} kg (+${Math.round(((nl - load) / Math.max(1, load)) * 100)} %). Repère ACSM : +2 à 10 %.`;
        load = nl;
      } else if (kind === 'assisted') {
        if (assist <= goalAssist) {
          change = 'goal';
          reason = 'Objectif atteint sans aide ! Valide le niveau suivant dans l’onglet Exercices.';
        } else {
          const easy = rpe <= 6; // ressenti facile : l'aide baisse d'un cran de plus
          const dec = (assist >= 20 ? 5 : 2.5) + (easy ? 2.5 : 0);
          const na = Math.max(goalAssist, assist - dec);
          change = 'assist_down';
          reason = `${R} reps réussies partout (ressenti ${rpe}/10${easy ? ', facile' : ''}) → l’aide passe de ${assist} à ${na} kg.`;
          assist = na;
        }
      } else {
        change = 'goal';
        reason = T ? 'Objectif de durée atteint ! Valide le niveau suivant dans l’onglet Exercices.' : 'Objectif de répétitions atteint ! Valide le niveau suivant dans l’onglet Exercices.';
      }
      reps = Array(sets).fill(R);
    } else {
      change = 'hold';
      reps = padded.map(r => Math.min(R, Math.max(1, r + inc)));
      reason = `Dernière fois : ${padded.join(' - ')}${T ? ' s' : ''}. On garde la même ${holdWord} et on vise +${inc}${T ? ' s' : ' rép'} par série (objectif ${R}${T ? ' s' : ''}).`;
      const prev = entries[entries.length - 2];
      if (prev) {
        const pSets = Array.from({ length: sets }, (_, i) => Number(coachSetsOf(prev, sets, R)[i]) || 0);
        const sameLoad = kind === 'load' ? Number(prev.value) === Number(last.value) : Number(prev.assistanceKg || 0) === Number(last.assistanceKg || 0);
        // un recul n'est justifié que si la dernière séance était vraiment dure (ressenti 8 ou plus)
        if (sameLoad && !mixed && Math.min(...pSets) < R && rpe >= 8) {
          if (kind === 'load') {
            const nl = coachRound(load * 0.93, stepL);
            if (nl < load) {
              load = nl;
              change = 'down';
              reps = Array(sets).fill(R);
              reason = `${R} reps non atteintes 2 séances de suite : on recule d’environ 7 % pour repartir proprement.`;
            }
          } else if (kind === 'assisted') {
            assist = assist + 2.5;
            change = 'down';
            reps = Array(sets).fill(R);
            reason = `${R} reps non atteintes 2 séances de suite : l’aide remonte à ${assist} kg pour consolider.`;
          }
        }
      }
    }
  }

  if (opts.deload) {
    if (kind === 'load') load = Math.max(coachStep(q, load), coachRound(load * 0.9, coachStep(q, load)));
    sets = Math.max(2, sets - 1);
    reason += ' • Semaine allégée : −10 % de charge, une série de moins.';
  } else if (opts.reduceSets && sets > 2) {
    sets = sets - 1;
    reason += ' • Semaine de match : une série de moins.';
  }
  reps = Array.from({ length: sets }, (_, i) => reps[i] !== undefined ? reps[i] : reps[reps.length - 1] || R);
  if (last && last.equivalentOf) reason += ` • Dernière séance à charges différentes : ta meilleure série vaut environ ${last.value} kg pour ${R} reps (max estimé ${last.equivalentOf.best} kg).`;

  // Décision de l'utilisateur : elle prime sur la proposition du coach jusqu'à la prochaine séance de cet exercice
  // (voir « Tu décides » dans l'onglet Coach). On garde la proposition du coach pour pouvoir y revenir.
  const suggested = { load, assist, targetReps: reps.slice(), change };
  const choice = q.coachOverride;
  const manual = !!(choice && choice.entries === entries.length);
  if (manual) {
    if (kind === 'load' && choice.load !== undefined) load = Number(choice.load) || 0;
    if (kind === 'assisted' && choice.assist !== undefined) assist = Math.max(0, Number(choice.assist) || 0);
    if (choice.repsDelta) reps = reps.map(r => Math.max(1, r + choice.repsDelta));
    change = 'manual';
    const was = kind === 'load' ? `${suggested.load} kg` : kind === 'assisted' ? `${suggested.assist} kg d’aide` : suggested.targetReps.join(' - ') + (T ? ' s' : ' reps');
    reason = `Ta décision : tu as choisi toi-même cet objectif. Le coach proposait ${was}.`;
  }

  return {
    questId: q.id, catalogId: q.catalogId, name: q.name, icon: q.icon, arena, kind, compound,
    restSec: pr ? pr.restSec : compound ? 150 : 90, sets, targetReps: reps, goalReps: pr ? pr.hi : R,
    profile: pr ? opts.profile : null, repRange: pr ? [pr.lo, pr.hi] : null,
    load, assist, change, reason, unit: q.unit, equip: coachEquip(q), timed: T, manual, suggested
  };
}

// Répartition des exercices de l'utilisateur dans N séances « corps entier »
export function composeTemplates(quests, N) {
  const strength = (quests || []).filter(q => q.type === 'strength' && q.goalMode !== 'free_mode');
  const byArena = {};
  strength.forEach(q => {
    const a = arenaOf(q);
    (byArena[a] = byArena[a] || []).push(q);
  });
  const templates = Array.from({ length: N }, (_, i) => ({ idx: i, id: 'ABC'[i], quests: [] }));
  COACH_ARENAS.forEach((a, gi) => {
    const list = (byArena[a] || []).slice().sort((x, y) => String(x.id).localeCompare(String(y.id)));
    const tier = arenaTier(a);
    const cap = isAbsArena(a) ? 1 : isOptimized() && tier > 1 ? 1 : 2;
    if (!list.length) return;
    // chaque groupe est travaillé dans chaque séance (fréquence ≥ 2/semaine) :
    // les exercices sont répartis, et s'il y en a moins que de séances, ils sont répétés
    templates.forEach((t, i) => {
      // mode optimisé : les petits muscles (mollets, avant-bras, obliques…) tournent, un séance sur deux, pour garder des séances de durée raisonnable
      if (isOptimized() && tier === 3 && N > 1 && (gi + i) % 2 !== 0) return;
      let mine = list.filter((q, j) => j % N === i).slice(0, cap);
      if (!mine.length) mine = [list[i % list.length]];
      mine.forEach(q => t.quests.push(q));
    });
  });
  templates.forEach(t =>
    t.quests.sort((x, y) => {
      const ax = COACH_ARENAS.indexOf(arenaOf(x));
      const ay = COACH_ARENAS.indexOf(arenaOf(y));
      if (ax !== ay) return ax - ay;
      return (coachIsCompound(y.name) ? 1 : 0) - (coachIsCompound(x.name) ? 1 : 0);
    })
  );
  return templates;
}
