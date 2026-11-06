import { coachSlotFor } from './planning';
import { COACH_ARENAS, COACH_TYPES, coachDaysBetween, coachIsCompound, coachRealEntries, coachRound, coachStep, getCoachSettings } from './settings';
import { coachSuggestExercises } from './suggest';
import { composeTemplates, computeExerciseTarget } from './targets';

import { profileOpts } from './profiles';
import { applyMethods } from './methodChoice';
import { planMinutes } from './methods';
import { calculateStrengthCalories } from '../lib/calories';
import { getAllEntries } from '../lib/quests';
import { arenaOf, arenaTier, isAbsArena, isLegArena, isOptimized, pushPullSide, typeArenas } from '../data/muscles';
// poussée / tirage : un exercice du mauvais côté (curl un jour de poussée…) est écarté
const sideOk = (side, q) => { if (!side) return true; const s = pushPullSide(arenaOf(q), q.name); return !s || s === side; };

// Durée estimée d'une séance (échauffement 5 min + séries et repos)
function coachEstimateMin(exercises) {
  // avec une forme de séries (pyramide, dégressive…), le détail série par série donne la durée ; superset : un seul repos pour la paire
  return Math.round(5 + exercises.reduce((s, e) => s + (e.plan ? planMinutes(e.plan) : e.sets * (0.75 + (e.superset && e.superset.first ? 15 : e.restSec) / 60)), 0));
}

// Complète (ou allège) la séance proposée pour tenir la durée voulue par l'utilisateur.
// On ajoute d'abord des séries (jusqu'à 4 par exercice), puis des exercices de ses propres objectifs.
function coachFitDuration(state, exercises, di, opts, targetMin, notes) {
  if (!targetMin || opts.deload || !exercises.length) return exercises;
  let ex = exercises.map(e => ({ ...e, targetReps: e.targetReps.slice() }));
  const startMin = coachEstimateMin(ex);
  const startSets = ex.reduce((s, e) => s + e.sets, 0);
  const startNames = ex.map(e => e.questId);
  const legsAllowed = di.legsOk && !opts.matchWeek;
  const arenaCount = a => ex.filter(e => e.arena === a).length;
  const arenaSets = a => ex.filter(e => e.arena === a).reduce((s, e) => s + e.sets, 0);
  const pool = () =>
    (state.quests || []).filter(q => {
      if (q.type !== 'strength' || q.goalMode === 'free_mode') return false;
      if (ex.some(e => e.questId === q.id)) return false;
      const a = arenaOf(q);
      if (opts.allowedArenas && !opts.allowedArenas.includes(a)) return false;
      if (!sideOk(opts.side, q)) return false;
      if (isLegArena(a) && !legsAllowed) return false;
      return arenaCount(a) < (arenaTier(a) === 1 ? 2 : 1);
    });
  const addSet = e => { e.sets += 1; e.targetReps.push(e.targetReps[e.targetReps.length - 1]); };
  let guard = 0;
  while (coachEstimateMin(ex) < targetMin - 3 && guard++ < 40) {
    const cands = pool().sort((x, y) => {
      const ax = arenaOf(x), ay = arenaOf(y);
      const d = arenaSets(ax) - arenaSets(ay);
      if (d) return d;
      return (coachIsCompound(y.name) ? 1 : 0) - (coachIsCompound(x.name) ? 1 : 0);
    });
    const allThree = ex.every(e => e.sets >= 3);
    const canSet = ex
      .filter(e => e.sets < 4 && !(opts.matchWeek && isLegArena(e.arena)))
      .sort((a, b) => a.sets - b.sets || (b.compound ? 1 : 0) - (a.compound ? 1 : 0));
    if (allThree && cands.length && ex.length < 8) {
      const q = cands[0];
      ex.push(computeExerciseTarget(q, { ...profileOpts(state, di.iso), today: di.iso, deload: false, reduceSets: false }));
    } else if (canSet.length) {
      addSet(canSet[0]);
    } else if (cands.length && ex.length < 8) {
      ex.push(computeExerciseTarget(cands[0], { ...profileOpts(state, di.iso), today: di.iso, deload: false, reduceSets: false }));
    } else break;
  }
  // Allègement si la séance dépasse nettement la durée voulue
  const dropIdx = list => { let best = list.length - 1, bt = 0; list.forEach((e, i) => { const t = arenaTier(e.arena); if (t >= bt) { bt = t; best = i; } }); return best; };
  guard = 0;
  while (coachEstimateMin(ex) > targetMin + 8 && guard++ < 30) {
    const big = ex.filter(e => e.sets > 3).sort((a, b) => b.sets - a.sets)[0];
    if (big) { big.sets -= 1; big.targetReps.pop(); continue; }
    if (ex.length > 3) { ex.splice(dropIdx(ex), 1); continue; } // d'abord les muscles les moins prioritaires (mode optimisé)
    break;
  }
  ex.sort((a, b) => {
    const ia = COACH_ARENAS.indexOf(a.arena), ib = COACH_ARENAS.indexOf(b.arena);
    if (ia !== ib) return ia - ib;
    return (b.compound ? 1 : 0) - (a.compound ? 1 : 0);
  });
  const endMin = coachEstimateMin(ex);
  const endSets = ex.reduce((s, e) => s + e.sets, 0);
  const added = ex.filter(e => !startNames.includes(e.questId));
  if (endSets > startSets || added.length) {
    notes.push(`Séance complétée pour tenir environ ${targetMin} min : ${added.length ? `${added.length} exercice(s) ajouté(s) (${added.map(e => e.name).join(', ')})` : ''}${added.length && endSets - startSets - added.reduce((s, e) => s + e.sets, 0) > 0 ? ' et ' : ''}${endSets - startSets - added.reduce((s, e) => s + e.sets, 0) > 0 ? `${endSets - startSets - added.reduce((s, e) => s + e.sets, 0)} série(s) en plus` : ''}.`);
  } else if (endMin < startMin) {
    notes.push(`Séance allégée pour tenir environ ${targetMin} min.`);
  }
  if (endMin < targetMin - 8) {
    notes.push(`Avec tes exercices actuels, la séance dure environ ${endMin} min (objectif ${targetMin}). Ajoute un ou deux exercices (surtout pour les groupes les moins travaillés) pour la compléter.`);
  }
  return ex;
}

// Durée visée : durée voulue, plafonnée par le créneau de salle de ce jour
function coachTargetMinutes(coach, iso, opts) {
  const base = opts.minutes !== undefined ? Number(opts.minutes) || 0 : Number(coach.sessionMinutes) || 0;
  const slot = coachSlotFor(coach, iso);
  if (base > 0 && slot && slot.min > 0) return Math.min(base, slot.min);
  return base;
}

// Assemble une séance à partir d'une liste d'exercices
// Mode optimisé : un muscle travaillé hier est laissé au repos (repère d'environ 48 h entre deux séances d'un même muscle).
// On ne retire rien si la séance deviendrait trop courte (moins de 3 exercices).
function restMuscles(state, quests, iso, notes) {
  if (!isOptimized()) return quests;
  const tired = new Set();
  getAllEntries(state).forEach(e => {
    if (e.quest.type === 'strength' && e.date < iso && coachDaysBetween(e.date, iso) <= 1) tired.add(arenaOf(e.quest));
  });
  if (!tired.size) return quests;
  const kept = quests.filter(q => !tired.has(arenaOf(q)));
  if (kept.length < 3 || kept.length === quests.length) return quests;
  const left = [...new Set(quests.filter(q => tired.has(arenaOf(q))).map(arenaOf))];
  notes.push(`Repos musculaire : ${left.join(', ')} ${left.length > 1 ? 'ont été travaillés' : 'a été travaillé'} hier, laissé${left.length > 1 ? 's' : ''} de côté aujourd’hui (environ 48 h entre deux séances d’un même muscle).`);
  return kept;
}

function coachAssemble(state, quests, di, opts, notes, allowedArenas) {
  const coach = getCoachSettings(state);
  const eff = { ...opts, deload: !!opts.deload || !!opts.tired, allowedArenas };
  if (opts.tired && !opts.deload) notes.push('Séance allégée (−10 % de charge, une série de moins) parce que tu as indiqué être fatigué aujourd’hui.');
  quests = restMuscles(state, quests, di.iso, notes);
  let exercises = quests.map(q =>
    computeExerciseTarget(q, {
      ...profileOpts(state, di.iso),
      today: di.iso,
      deload: eff.deload,
      reduceSets: !!opts.matchWeek && isLegArena(arenaOf(q))
    })
  );
  const slot = coachSlotFor(coach, di.iso);
  const target = coachTargetMinutes(coach, di.iso, opts);
  if (slot && slot.min > 0) notes.push(`Créneau de salle : ${slot.start}–${slot.end} (${slot.min} min)${target && target < (Number(coach.sessionMinutes) || 0) ? ` : séance adaptée à ${target} min.` : '.'}`);
  exercises = coachFitDuration(state, exercises, di, eff, target, notes);
  const meth = applyMethods(state, exercises, { iso: di.iso, deload: eff.deload, minutes: target || 0 });
  exercises = meth.exercises;
  notes.push(...meth.notes);
  const w = Number(state.userWeightKg) || 82;
  const estMin = coachEstimateMin(exercises);
  const estKcal = exercises.reduce(
    (sum, e) => sum + calculateStrengthCalories({ unit: e.unit, timed: !!e.timed, weightKg: e.kind === 'load' ? e.load : 0, assistanceKg: e.kind === 'assisted' ? e.assist : 0, setDetails: e.targetReps, rpe: 7, userWeightKg: w }),
    0
  );
  const first = exercises.find(e => e.kind === 'load' && e.load >= 20);
  const warmup = first
    ? `Échauffement conseillé sur « ${first.name} » : 1 × 8 à ${coachRound(first.load * 0.5, coachStep({ catalogId: '', name: first.name }, first.load))} kg, puis 1 × 4-5 à ${coachRound(first.load * 0.75, coachStep({ catalogId: '', name: first.name }, first.load))} kg, avant la première série de travail.`
    : '';
  // Suggestions pour compléter une séance trop courte
  let fillSuggestions = [];
  if (target && estMin < target - 8 && !eff.deload) {
    const legsAllowed = di.legsOk && !opts.matchWeek;
    const arenas = (allowedArenas || COACH_ARENAS)
      .filter(a => !isAbsArena(a) && (!isLegArena(a) || legsAllowed) && exercises.filter(e => e.arena === a).length < (arenaTier(a) === 1 ? 2 : 1))
      .sort((x, y) => exercises.filter(e => e.arena === x).length - exercises.filter(e => e.arena === y).length)
      .slice(0, 3);
    arenas.forEach(a => coachSuggestExercises(state, a, 2).forEach(c => fillSuggestions.push({ id: c.id, name: c.name, arena: a })));
  }
  return { exercises, notes, estMin, estKcal, warmup, fillSuggestions, slot, target };
}

// Construit une séance complète (liste d'exercices avec objectifs chiffrés), mode full body A/B
function coachBuildSession(state, templateIdx, di, opts = {}) {
  const coach = getCoachSettings(state);
  const templates = composeTemplates(state.quests, coach.sessionsPerWeek);
  const t = templates[templateIdx % templates.length];
  const notes = [];
  let quests = t.quests;
  if (!di.legsOk) {
    const without = quests.filter(q => !isLegArena(arenaOf(q)));
    if (without.length !== quests.length) notes.push(`Pas d'exercices de jambes (${di.legsWhy}) pour garder les jambes fraîches.`);
    quests = without;
  }
  const r = coachAssemble(state, quests, di, opts, notes, null);
  return { templateIdx, templateId: t.id, date: di.iso, ...r };
}

// Nombre maximal d'exercices par groupe dans une séance typée (mode simple : comme avant ; mode optimisé : un par petit muscle, deux pour les gros)
function typedCaps(type) {
  if (!isOptimized()) {
    if (type === 'PUSH') return { Pectoraux: 3, 'Épaules & Bras': 2, Abdominaux: 1 };
    if (type === 'PULL') return { Dos: 3, 'Épaules & Bras': 2, Abdominaux: 1 };
    return type === 'LEGS' ? { Jambes: 3, Abdominaux: 1 } : type === 'UPPER' ? { Dos: 2, Pectoraux: 2, 'Épaules & Bras': 2, Abdominaux: 1 } : { Jambes: 2, Dos: 2, Pectoraux: 2, 'Épaules & Bras': 2, Abdominaux: 1 };
  }
  const big = type === 'LEGS' ? ['Quadriceps', 'Ischio-jambiers'] : type === 'UPPER' ? ['Dos', 'Pectoraux'] : type === 'PUSH' ? ['Pectoraux', 'Épaules'] : type === 'PULL' ? ['Dos'] : [];
  const caps = {};
  typeArenas(type).forEach(a => { caps[a] = big.includes(a) ? 2 : 1; });
  return caps;
}

// Exercices d'une séance typée : les moins récemment travaillés d'abord
function coachTypedQuests(state, type, legsOk) {
  const arenas = COACH_TYPES[type].arenas;
  const caps = typedCaps(type);
  const side = COACH_TYPES[type].side;
  const qs = (state.quests || []).filter(q => q.type === 'strength' && q.goalMode !== 'free_mode' && sideOk(side, q));
  const lastDate = q => { const es = coachRealEntries(q); return es.length ? es[es.length - 1].date : ''; };
  const out = [];
  COACH_ARENAS.filter(a => arenas.includes(a) && (legsOk || !isLegArena(a))).forEach(a => {
    qs.filter(q => arenaOf(q) === a)
      .sort((x, y) => lastDate(x).localeCompare(lastDate(y)) || (coachIsCompound(y.name) ? 1 : 0) - (coachIsCompound(x.name) ? 1 : 0))
      .slice(0, caps[a])
      .sort((x, y) => (coachIsCompound(y.name) ? 1 : 0) - (coachIsCompound(x.name) ? 1 : 0))
      .forEach(q => out.push(q));
  });
  return out;
}

function coachBuildTypedSession(state, type, di, opts = {}) {
  const notes = [];
  let tp = type;
  if (tp === 'LEGS' && !di.legsOk) {
    tp = 'UPPER';
    notes.push(`Pas de jambes aujourd'hui (${di.legsWhy}) : séance haut du corps à la place.`);
  }
  if (tp === 'FB' && !di.legsOk) notes.push(`Pas d'exercices de jambes (${di.legsWhy}) pour garder les jambes fraîches.`);
  const quests = coachTypedQuests(state, tp, di.legsOk);
  const r = coachAssemble(state, quests, di, { ...opts, side: COACH_TYPES[tp].side }, notes, COACH_TYPES[tp].arenas.filter(a => !isLegArena(a) || di.legsOk));
  return { templateIdx: -1, templateId: COACH_TYPES[tp].label, type: tp, typeLabel: COACH_TYPES[tp].label, date: di.iso, ...r };
}

// Construit la séance prévue (mode A/B ou mode 3 séances)
export function coachBuildPlanned(state, slot, di, opts = {}) {
  return slot.type ? coachBuildTypedSession(state, slot.type, di, opts) : coachBuildSession(state, slot.templateIdx, di, opts);
}

// Séance construite à la main par l'utilisateur (liste d'exercices + date choisie)
export function coachBuildCustomSession(state, questIds, dateIso, opts = {}) {
  const byId = {};
  (state.quests || []).forEach(q => { byId[q.id] = q; });
  const quests = (questIds || []).map(id => byId[id]).filter(q => q && q.type === 'strength' && q.goalMode !== 'free_mode');
  const deloadOn = !!opts.deload || !!opts.tired;
  const exercises = quests.map(q => {
    const e = computeExerciseTarget(q, {
      ...profileOpts(state, dateIso),
      today: dateIso,
      deload: deloadOn,
      reduceSets: !!opts.matchWeek && isLegArena(arenaOf(q))
    });
    const want = opts.sets && Number(opts.sets[q.id]);
    if (!deloadOn && want > e.sets && want <= 8) {
      while (e.sets < want) { e.sets += 1; e.targetReps.push(e.targetReps[e.targetReps.length - 1]); }
    }
    return e;
  });
  const meth = applyMethods(state, exercises, { iso: dateIso, deload: deloadOn, minutes: 0 });
  const exercisesM = meth.exercises;
  const w = Number(state.userWeightKg) || 82;
  const estMin = coachEstimateMin(exercisesM);
  const estKcal = exercisesM.reduce(
    (s, e) => s + calculateStrengthCalories({ unit: e.unit, timed: !!e.timed, weightKg: e.kind === 'load' ? e.load : 0, assistanceKg: e.kind === 'assisted' ? e.assist : 0, setDetails: e.targetReps, rpe: 7, userWeightKg: w }),
    0
  );
  const first = exercisesM.find(e => e.kind === 'load' && e.load >= 20);
  const warmup = first
    ? `Échauffement conseillé sur « ${first.name} » : 1 × 8 à ${coachRound(first.load * 0.5, coachStep({ catalogId: '', name: first.name }, first.load))} kg, puis 1 × 4-5 à ${coachRound(first.load * 0.75, coachStep({ catalogId: '', name: first.name }, first.load))} kg, avant la première série de travail.`
    : '';
  return { templateIdx: -1, templateId: 'Perso', date: dateIso, exercises: exercisesM, notes: [...(opts.tired && !opts.deload ? ['Séance allégée (−10 % de charge, une série de moins) parce que tu as indiqué être fatigué aujourd’hui.'] : []), ...meth.notes], estMin, estKcal, warmup, custom: true };
}
