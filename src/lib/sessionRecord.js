import { evaluateQuestProgress } from './progress';
import { assistText } from './assist';
import { countValidatedSets, formatSetsBreakdown, getSetDetailsArray, isTimedQuest, repUnit } from './quests';
import { fmtLoads, isMixed } from './setLoads';

// Enregistrement d'une séance de musculation sur un exercice : UNE seule règle pour « Noter séance » et la séance guidée
// (entrée d'historique, records, EXP, trophées, bannière). Fonction pure : ne touche ni à l'état ni à l'écran.
//
// input :
//   date, setDetails (répétitions des séries RÉALISÉES), rpe, calories, note ('' = note automatique)
//   loads  : charge de chaque série réalisée (exercices en kg), sinon null
//   assists: aide élastique de chaque série réalisée (exercices en répétitions avec élastique), sinon null
//   guidedLabel : « A », « B »… pour la note automatique d'une séance guidée
// résultat : { quest, entry, xp, unlocked[], banner: {title, subtitle, badge}, bossDefeated }
export function applyStrengthSession(q, input) {
  const { date, setDetails, loads = null, assists = null, rpe, rpeSet, calories, note = '', guidedLabel, method = null, kinds = null, perf = null } = input;
  const perfCm = Number(perf) > 0 && Number(perf) <= 1000 ? Math.round(Number(perf) * 10) / 10 : 0; // saut : hauteur ou distance en cm (4.52)
  const isKg = q.unit === 'kg';
  const goalSets = Math.max(1, Number(q.goalSets) || 3);
  const goalReps = Math.max(1, Number(q.goalReps) || Number(q.goalValue) || 6);
  const validatedNow = countValidatedSets(setDetails, goalReps);
  const best = Math.max(...setDetails, 0);
  const unlocked = [];
  let xp = 50 + Math.round(calories * 0.15);
  const banner = { title: 'Séance Validée !', subtitle: `+${calories} kcal brûlées`, badge: '🎵' };

  const loadList = isKg && loads ? loads.map(x => Math.max(0, Number(x) || 0)) : null;
  const assistList = !isKg && assists ? assists.map(x => Number(x) || 0) : null; // négatif = lest (lib/assist.js)
  // valeur « de record » : charge la plus lourde, aide la plus faible
  // test de max : seuls les essais réussis (au moins 1 rep) comptent
  const effectiveValue = isKg ? Math.max(...(loadList || [0]).filter((_, i) => method !== 'max_test' || Number(setDetails[i]) > 0), 0) : best;
  // test de max : seuls les essais réussis comptent (un essai lesté manqué n'est pas un record)
  const assistOk = assistList && method === 'max_test' ? assistList.filter((_, i) => Number(setDetails[i]) > 0) : assistList;
  const assistanceUsed = assistOk && assistOk.length ? Math.min(...assistOk) : 0;

  const prevDetails = getSetDetailsArray(q, goalSets, goalReps);
  // moins d'aide élastique qu'avant (le lest ajouté ne compte pas pour ce trophée)
  const reducedAssistance = !isKg && Number(q.currentAssistanceKg) > 0 && assistanceUsed < Number(q.currentAssistanceKg);
  const increasedLoad = isKg && effectiveValue > (Number(q.currentValue) || 0);
  const moreSetsValidated = validatedNow > countValidatedSets(prevDetails, goalReps);

  if (reducedAssistance) { unlocked.push('elastic_drop'); xp += 100; }
  if (validatedNow >= goalSets) {
    unlocked.push('sets_master');
    xp += 150;
    banner.title = `Format ${goalSets}×${goalReps} Validé !`;
    banner.subtitle = `${validatedNow}/${goalSets} séries de ${goalReps}+ ${repUnit(q)} réussies (${formatSetsBreakdown(setDetails)})`;
    banner.badge = '🔴';
  } else if (moreSetsValidated || increasedLoad || reducedAssistance) {
    xp += 120;
    banner.title = 'Progression sur l’Objectif !';
    banner.subtitle = `${validatedNow}/${goalSets} séries de ${goalReps} ${repUnit(q)} validées (${formatSetsBreakdown(setDetails)})`;
    banner.badge = '🔥';
  }

  // test de max (4.50) : l'objectif de l'exercice (charge, séries de travail) ne change pas, seul le record compte
  const isTest = method === 'max_test';
  const candidate = isTest ? (({ maxTestLoad, maxTestAssist, ...rest }) => rest)(q) : { ...q, currentValue: effectiveValue, currentAssistanceKg: !isKg ? assistanceUsed : 0, setDetails };
  const ev = isTest ? { isBossDefeated: false } : evaluateQuestProgress(candidate);
  if (ev.isBossDefeated) {
    xp += 500;
    unlocked.push('boss_slayer');
    banner.title = `🎵 OBJECTIF VAINCU : ${q.name} !`;
    banner.subtitle = `Passage au Niveau ${(Number(q.level) || 1) + 1} disponible !`;
    banner.badge = '👑';
  }

  const loadTxt = loadList && isMixed(loadList) ? fmtLoads(loadList) : `${effectiveValue} kg`;
  const assistTxt = assistList && assistanceUsed ? (isMixed(assistList) ? `${assistanceUsed > 0 ? 'Aide' : 'Lest'} ${fmtLoads(assistList.map(Math.abs))}` : assistText(assistanceUsed)) : 'Strict 0 kg';
  const defaultNote = guidedLabel !== undefined
    ? `Séance guidée ${guidedLabel || ''} • ${isKg ? fmtLoads(loadList || [effectiveValue]) + ' • ' : assistList && assistanceUsed ? assistTxt + ' • ' : ''}${setDetails.join(' - ')} reps`
    : isTimedQuest(q)
      ? `Séries : ${formatSetsBreakdown(setDetails)} s • ${validatedNow}/${goalSets} séries validées`
      : !isKg
        ? `Séries : ${formatSetsBreakdown(setDetails)} reps (${assistTxt}) • ${validatedNow}/${goalSets} séries validées`
        : `${loadTxt} • Séries : ${formatSetsBreakdown(setDetails)} reps (${validatedNow}/${goalSets} validées)`;

  const entry = {
    id: `h_${Date.now()}_${q.id}`,
    date,
    value: effectiveValue,
    sets: setDetails.length,
    reps: best,
    setDetails,
    validatedSets: validatedNow,
    goalSets,
    goalReps,
    assistanceKg: assistanceUsed,
    ...(loadList && isMixed(loadList) ? { setLoads: loadList } : {}),
    // forme de séries (pyramide, dégressive…) et type de chaque série : la progression ne juge que les séries principales
    ...(method ? { method } : {}),
    ...(Array.isArray(kinds) && kinds.length === setDetails.length && kinds.some(k => k && k !== 'work') ? { setKinds: kinds } : {}),
    ...(assistList && isMixed(assistList) ? { setAssists: assistList } : {}),
    ...(perfCm ? { perfCm } : {}),
    rpe,
    ...(rpeSet !== undefined ? { rpeSet: !!rpeSet } : {}), // ressenti vraiment donné (sinon 7 par défaut) : seul un vrai ressenti compte pour le max
    calories,
    goalBeaten: ev.isBossDefeated,
    note: note || (perfCm ? `${defaultNote} • ${perfCm} cm` : defaultNote),
  };
  const quest = { ...candidate, history: [...(q.history || []), entry] };
  return { quest, entry, xp, unlocked, banner, bossDefeated: ev.isBossDefeated };
}
