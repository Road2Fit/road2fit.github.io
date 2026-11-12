import { coachFmt } from './labels';
import { assistText } from '../lib/assist';
import { programNext, programSession } from './program';
import { coachDayInfo, coachNextTemplateIdx, coachPlanWeek } from './planning';
import { coachBuildPlanned } from './sessions';
import { COACH_ARENAS, COACH_TYPES, coachDayLabel, coachDaysBetween, coachKind, coachRealEntries, coachSetsOf, getCoachSettings } from './settings';
import { coachSuggestExercises } from './suggest';
import { coachableQuests } from './equipment';
import { composeTemplates, computeExerciseTarget } from './targets';

import { addDaysISO, getWeekStart } from '../lib/dates';
import { profileOpts } from './profiles';
import { getAllEntries, isStartEntry, isTimedQuest } from '../lib/quests';
import { entryAssists, entryLoads, entryTonnage, fmtLoads } from '../lib/setLoads';
import { stripAccents } from '../lib/text';
import { sportInfo } from '../data/sports';
import { arenaOf, arenasOf, arenaBand, isOptimized, pushPullSide } from '../data/muscles';
import { isBeginnerForVolume, personalBand } from './experience';

// ---- Conseils du jour (volley / match) ----
export function coachDayAdvice(state, today) {
  const coach = getCoachSettings(state);
  const t = coachDayInfo(today, coach);
  const n = coachDayInfo(addDaysISO(today, 1), coach);
  const y = coachDayInfo(addDaysISO(today, -1), coach);
  const out = [];
  if (t.isMatch) out.push({ icon: '🏆', text: 'Match aujourd’hui : pas de muscu. Échauffe bien les épaules et les jambes, hydrate-toi et mange des glucides avant de jouer.' });
  else if (n.isMatch) out.push({ icon: '🏆', text: 'Match demain : pas de jambes aujourd’hui. Si tu fais de la muscu, reste sur le haut du corps et les abdos, garde des séries loin de l’échec, et dors bien.' });
  else if (y.isMatch) out.push({ icon: '🛌', text: 'Lendemain de match : récupération (marche, mobilité). Évite les jambes lourdes aujourd’hui.' });
  if (!t.isMatch && t.isVolley) out.push({ icon: t.sport.icon, text: `${t.sport.cap} ce soir : si tu fais de la muscu aujourd’hui, privilégie le haut du corps et finis-la plusieurs heures avant.` + (t.sport.shoulders ? ' Prévois 2 à 3 minutes d’échauffement d’épaules (rotations externes à l’élastique).' : '') });
  else if (!t.isMatch && !n.isMatch && n.isVolley) out.push({ icon: n.sport.icon, text: `${n.sport.cap} demain : pas de jambes lourdes aujourd’hui pour garder de l’énergie.` });
  return out;
}

// ---- Séances manquées / semaine à recaler ----
export function coachMissed(state, today) {
  const coach = getCoachSettings(state);
  const ws = getWeekStart(today);
  const wk = coachPlanWeek(state, ws, today);
  const doneN = wk.days.filter(d => d.status === 'done').length;
  const msgs = [];
  const pastFree = wk.days.filter(d => d.iso < today && d.avail && d.status !== 'done');
  if (doneN === 0 && pastFree.length) {
    msgs.push(`Tu n’as pas fait de séance depuis lundi (jour libre : ${coachDayLabel(pastFree[0].iso)}). Pas grave : le coach a recalé ta semaine à partir d’aujourd’hui.`);
  }
  if (wk.shortfall > 0) {
    const withSport = (coach.volleyDays || []).length > 0 || (coach.matchDates || []).length > 0;
    msgs.push(`Il reste ${wk.remaining} séance(s) à faire cette semaine mais seulement ${wk.planned.length} créneau(x) libre(s)${withSport ? ` avec ${sportInfo(coach.sport).poss} et tes matchs` : ''}. Tu peux en reporter une, ou ajouter un jour de salle dans « Ma semaine ».`);
  }
  return msgs;
}

/**
 * Séance ratée à rattraper : la plus récente séance de muscu prévue ces 3 derniers jours qui n'a pas été faite,
 * à condition qu'aucune séance n'ait été faite depuis (sinon elle est déjà rattrapée). null s'il n'y en a pas.
 */
export function coachMissedSession(state, today) {
  const coach = getCoachSettings(state);
  const dismissed = new Set(coach.missedDismissed || []);
  const strength = getAllEntries(state).filter(e => e.quest.type === 'strength' && !isStartEntry(e)).map(e => e.date);
  for (let k = 1; k <= 3; k++) {
    const d = addDaysISO(today, -k);
    if (strength.some(x => x >= d)) return null;
    if (dismissed.has(d)) return null;
    // le planning tel qu'il était ce jour-là (aucune séance faite depuis : il n'a pas bougé)
    if (coachPlanWeek(state, getWeekStart(d), d).planned.includes(d)) return { iso: d };
  }
  return null;
}

// ---- Évolution de la force (1RM estimé, formule d'Epley) ----
export function coachStrengthTrend(state, today) {
  const diffs = [];
  (state.quests || []).forEach(q => {
    if (coachKind(q) !== 'load') return;
    const es = coachRealEntries(q);
    if (es.length < 2) return;
    const e1 = e => {
      const reps = Math.max(0, ...coachSetsOf(e, 3, 6));
      return (Number(e.value) || 0) * (1 + reps / 30);
    };
    const last = es[es.length - 1];
    if (coachDaysBetween(last.date, today) > 21) return;
    const refs = es.filter(e => coachDaysBetween(e.date, last.date) >= 14);
    if (!refs.length) return;
    const ref = refs.reduce((best, e) => Math.abs(coachDaysBetween(e.date, last.date) - 28) < Math.abs(coachDaysBetween(best.date, last.date) - 28) ? e : best);
    if (e1(ref) > 0) diffs.push((e1(last) / e1(ref) - 1) * 100);
  });
  if (!diffs.length) return null;
  return { pct: Math.round((diffs.reduce((a, b) => a + b, 0) / diffs.length) * 10) / 10, n: diffs.length };
}

// ---- Calories et protéines (estimation, Mifflin-St Jeor) ----
export function coachNutrition(state, today) {
  const coach = getCoachSettings(state);
  const p = coach.profile || {};
  const h = Number(p.heightCm), age = Number(p.age);
  const pace = coachWeightPace(state, today);
  const w = Number(pace.current) || Number(state.userWeightKg) || 0;
  if (!(h >= 120 && h <= 230 && age >= 16 && age <= 90 && w > 0)) return { needsProfile: true };
  const male = p.sex !== 'f';
  const bmr = 10 * w + 6.25 * h - 5 * age + (male ? 5 : -161);
  const from = addDaysISO(today, -27);
  const exKcal = getAllEntries(state)
    .filter(e => e.date >= from && e.date <= today && !isStartEntry(e))
    .reduce((s, e) => s + (Number(e.calories) || 0), 0) / 28;
  const tdee = bmr * 1.2 + exKcal;
  const target = Number(state.targetWeightKg) || 0;
  const losing = w > target;
  let kgWeek = losing ? Math.round(w * 0.007 * 100) / 100 : 0;
  let deficit = (kgWeek * 7700) / 7;
  const floor = male ? 1500 : 1200;
  deficit = Math.min(deficit, tdee * 0.25);
  kgWeek = Math.round(((deficit * 7) / 7700) * 100) / 100;
  let goalKcal = tdee - deficit;
  let capped = false;
  if (goalKcal < floor) {
    goalKcal = floor;
    deficit = Math.max(0, tdee - floor);
    kgWeek = Math.round(((deficit * 7) / 7700) * 100) / 100;
    capped = true;
  }
  const r10 = x => Math.round(x / 10) * 10;
  return { needsProfile: false, bmr: r10(bmr), tdee: r10(tdee), exKcal: Math.round(exKcal), goalKcal: r10(goalKcal), deficit: r10(deficit), kgWeek, losing, capped, floor: r10(floor), weight: w };
}

// ---- Objectifs de la semaine ----
export function coachWeeklyGoals(state, today) {
  const coach = getCoachSettings(state);
  const ws = getWeekStart(today);
  const act = coachWeekActivity(state, ws);
  const end = addDaysISO(ws, 6);
  const weigh = (state.weightHistory || []).filter(w => w.date >= ws && w.date <= end).length;
  const goals = [
    { id: 'strength', icon: '💪', label: 'Séances de muscu', value: act.strengthDays, target: coach.sessionsPerWeek, unit: '' },
    { id: 'cardio', icon: sportInfo(coach.sport).icon, label: `Endurance (${sportInfo(coach.sport).label} + cardio)`, value: act.aerobicMin, target: 150, unit: ' min' },
    { id: 'weigh', icon: '⚖️', label: 'Pesées', value: weigh, target: 3, unit: '' }
  ].map(g => ({ ...g, done: g.value >= g.target }));
  return { weekStart: ws, goals, allDone: goals.every(g => g.done), claimed: (coach.weeklyClaimed || []).includes(ws), xp: 150 };
}

// ---- Remplacer un exercice : équivalents du même groupe ----
export function coachSwapOptions(state, questId, sessionIds) {
  const q = (state.quests || []).find(x => x.id === questId);
  if (!q) return { own: [], catalog: [] };
  const arena = arenaOf(q);
  const own = (state.quests || []).filter(x => x.id !== questId && x.type === 'strength' && x.goalMode !== 'free_mode' && !sessionIds.includes(x.id) && arenaOf(x) === arena);
  const catalog = coachSuggestExercises(state, arena, 3);
  return { own, catalog, arena };
}

// ---- Bilan de fin de séance guidée ----
export function coachSessionRecap(oldQuests, newQuests, g, today, xp, state = null) {
  const rows = [];
  let tonnage = 0, prevTonnage = 0, kcal = 0, prs = 0;
  const tonOf = e => entryTonnage(e);
  g.items.forEach(it => {
    const nq = newQuests.find(q => q.id === it.questId);
    const oq = oldQuests.find(q => q.id === it.questId);
    if (!nq || !oq || nq.history.length === oq.history.length) return;
    const entry = nq.history[nq.history.length - 1];
    const prior = (oq.history || []).filter(h => !isStartEntry(h) && h.date);
    const kind = coachKind(nq);
    const best = Math.max(0, ...(entry.setDetails || [0]));
    let pr = '';
    if (prior.length) {
      if (kind === 'load' && entry.value > Math.max(0, ...prior.map(h => Number(h.value) || 0))) pr = `nouveau record de charge : ${coachFmt(entry.value)} kg`;
      else if (kind !== 'load' && best > Math.max(0, ...prior.map(h => Math.max(0, ...(h.setDetails || [0]))))) pr = `nouveau record : ${best} ${nq.timed === true || isTimedQuest(nq) ? 's' : 'reps'} sur une série`;
      else if (kind === 'assisted' && (Number(entry.assistanceKg) || 0) < Math.min(...prior.map(h => Number(h.assistanceKg) || 0))) pr = `moins d’aide qu’avant : ${coachFmt(entry.assistanceKg)} kg`;
    }
    if (pr) prs++;
    kcal += Number(entry.calories) || 0;
    const ton = kind === 'load' ? tonOf(entry) : 0;
    if (kind === 'load' && prior.length) { tonnage += ton; prevTonnage += tonOf(prior[prior.length - 1]); }
    const nt = computeExerciseTarget(nq, { ...(state ? profileOpts(state, addDaysISO(today, 3)) : {}), today: addDaysISO(today, 3) });
    const nextTxt = nt.kind === 'load' ? `${nt.sets} × ${nt.goalReps} à ${coachFmt(nt.load)} kg` : nt.kind === 'assisted' ? `${nt.sets} × ${nt.goalReps}, ${assistText(nt.assist)}` : `${nt.sets} × ${nt.goalReps} ${nt.timed ? 's' : 'reps'}`;
    rows.push({
      name: nq.name, icon: nq.icon, pr,
      summary: `${(entry.setDetails || []).join(' - ')} ${isTimedQuest(nq) ? 's' : 'reps'}${kind === 'load' ? ` à ${fmtLoads(entryLoads(entry))}` : kind === 'assisted' ? ` · aide ${fmtLoads(entryAssists(entry))}` : ''}`,
      next: nextTxt, ton
    });
  });
  return { rows, prs, tonnage: Math.round(tonnage), prevTonnage: Math.round(prevTonnage), kcal: Math.round(kcal), xp, minutes: Math.max(1, Math.round((Date.now() - g.startedAt) / 60000)) };
}

// Prochaine séance + plan des 2 prochaines semaines
export function coachOverview(state, today, extra = {}) {
  const coach = getCoachSettings(state);
  const ws0 = getWeekStart(today);
  const ws1 = addDaysISO(ws0, 7);
  const w0p = coachPlanWeek(state, ws0, today);
  const priorForW1 = w0p.planned.map(iso => {
    const tp = w0p.plannedTypes[iso];
    return tp ? { iso, legs: COACH_TYPES[tp].legs && coachDayInfo(iso, coach).legsOk, upper: COACH_TYPES[tp].upper } : { iso, legs: true, upper: true };
  });
  const weeks = [w0p, coachPlanWeek(state, ws1, today, priorForW1)];
  const templates = composeTemplates(coachableQuests(state), coach.sessionsPerWeek);
  const nextIdx = templates.length ? coachNextTemplateIdx(state, templates) : 0;
  const plannedAll = [];
  weeks.forEach(w => w.planned.forEach(d => plannedAll.push({ iso: d, week: w })));
  plannedAll.forEach((p, k) => { p.templateIdx = (nextIdx + k) % Math.max(1, templates.length); p.type = p.week.plannedTypes[p.iso] || null; });
  const first = plannedAll.find(p => p.iso >= today) || null;
  const hasExercises = templates.some(t => t.quests.length > 0) || ((coach.splitMode === 'trio' || coach.splitMode === 'ppl' || coach.splitMode === 'upperlower' || Number(coach.sessionsPerWeek) >= 4) && (state.quests || []).some(q => q.type === 'strength' && q.goalMode !== 'free_mode'));
  let session = null;
  if (first && hasExercises) {
    const di = coachDayInfo(first.iso, coach);
    const tired = !!(coach.readiness && coach.readiness.date === today && coach.readiness.level === 'low' && first.iso === today);
    session = coachBuildPlanned(state, first, di, { deload: first.week.deload, matchWeek: first.week.matchInWeek, tired, minutes: extra.minutes });
  }
  // Programme d'un coach extérieur : sa prochaine séance remplace celle que l'appli aurait choisie
  const pNext = programNext(state, today);
  if (pNext) {
    const ps = programSession(state, pNext);
    if (ps && ps.exercises.length) return { coach, weeks, templates, plannedAll, first: { iso: pNext.date, week: w0p, templateIdx: -1, type: null }, session: ps, hasExercises: true, nextIdx, program: pNext };
  }
  return { coach, weeks, templates, plannedAll, first, session, hasExercises, nextIdx };
}

// Volume hebdomadaire par arène (moyenne des 28 derniers jours) et équilibre poussée/tirage.
// Mode optimisé : un exercice à deux muscles compte une série pour le muscle principal et une DEMI-série pour le second
// (séries « indirectes » comptées pour moitié : Pelland 2024). Les repères dépendent de l'objectif du moment et du niveau (débutant < 12 semaines).
export function coachBalance(state, today) {
  const from = addDaysISO(today, -27);
  const sets = {}, days = {};
  COACH_ARENAS.forEach(a => { sets[a] = 0; days[a] = new Set(); });
  let push = 0, pull = 0;
  const all = getAllEntries(state).filter(e => e.quest.type === 'strength');
  all.forEach(e => {
    if (e.date < from || e.date > today) return;
    const a = arenaOf(e.quest);
    const n = Array.isArray(e.setDetails) ? e.setDetails.length : Number(e.sets) || 0;
    if (sets[a] === undefined) return;
    arenasOf(e.quest).forEach((x, i) => { if (sets[x] === undefined) return; sets[x] += i === 0 ? n : n / 2; days[x].add(e.date); });
    const side = pushPullSide(a, e.quest.name);
    if (side === 'pull') pull += n;
    else if (side === 'push') push += n;
  });
  const first = all.map(e => e.date).sort()[0];
  const beginner = isBeginnerForVolume(state, first ? coachDaysBetween(first, today) / 7 : 0);
  const profile = profileOpts(state, today).profile;
  const rows = COACH_ARENAS.map(a => {
    const band = personalBand(arenaBand(a, { profile, beginner }), state);
    const avg = Math.round((sets[a] / 4) * 10) / 10;
    const status = avg < band.min ? 'low' : avg < band.good ? 'mid' : isOptimized() && avg > band.max ? 'high' : 'good';
    const missing = status === 'low' || status === 'mid' ? Math.max(1, Math.ceil(band.good - avg)) : 0;
    return { arena: a, avg, perWeekFreq: Math.round((days[a].size / 4) * 10) / 10, band, status, missing };
  });
  const ratio = push > 0 ? Math.round((pull / push) * 100) / 100 : null;
  // Alertes d'équilibre (mode optimisé) : conseils, pas des seuils médicaux
  const alerts = [];
  if (isOptimized()) {
    const v = id => (rows.find(r => r.arena === id) || {}).avg || 0;
    if (v('Quadriceps') >= 6 && v('Ischio-jambiers') < v('Quadriceps') * 0.5) alerts.push({ id: 'hq', arenas: ['Ischio-jambiers'], text: 'Tes ischio-jambiers sont nettement moins travaillés que tes quadriceps. Un peu plus d’ischios (leg curl, soulevé de terre roumain) équilibre la cuisse et protège les ischios, surtout si tu fais du sport avec des sprints.' });
    if (v('Triceps') >= 4 && v('Biceps') < v('Triceps') * 0.4) alerts.push({ id: 'bt', arenas: ['Biceps'], text: 'Beaucoup plus de triceps que de biceps : ajoute un peu de curl pour équilibrer le bras.' });
    if (v('Biceps') >= 4 && v('Triceps') < v('Biceps') * 0.4) alerts.push({ id: 'tb', arenas: ['Triceps'], text: 'Beaucoup plus de biceps que de triceps : le triceps fait pourtant les deux tiers du bras, ajoute-lui des séries.' });
    if (v('Abdominaux') + v('Obliques') > 0 && v('Lombaires') === 0 && v('Abdominaux') >= 4) alerts.push({ id: 'ab-lo', arenas: ['Lombaires'], text: 'Tu travailles les abdos mais pas le bas du dos : quelques séries de lombaires (extensions, superman) équilibrent le tronc.' });
  }
  return { rows, push, pull, ratio, alerts, beginner, profile };
}

// Stagnation : aucune amélioration sur les 3 dernières séances
export function coachPlateau(q) {
  const es = coachRealEntries(q);
  if (es.length < 4) return false;
  const kind = coachKind(q);
  const tuple = e => {
    const sets = coachSetsOf(e, 3, 6);
    const loadScore = kind === 'load' ? Number(e.value) || 0 : kind === 'assisted' ? -(Number(e.assistanceKg) || 0) : 0;
    return [loadScore, sets.reduce((a, b) => a + (Number(b) || 0), 0)];
  };
  const better = (a, b) => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);
  let best = tuple(es[0]);
  const improved = [false];
  for (let i = 1; i < es.length; i++) {
    const t = tuple(es[i]);
    improved.push(better(t, best));
    if (better(t, best)) best = t;
  }
  return !improved.slice(-3).some(Boolean);
}

// Date estimée d'atteinte de l'objectif (tendance sur les dernières séances)
export function coachEta(q, today) {
  const kind = coachKind(q);
  const es = coachRealEntries(q).slice(-6);
  const goal = kind === 'load' ? Number(q.goalValue) || 0 : kind === 'assisted' ? Number(q.goalAssistanceKg) || 0 : Number(q.goalReps) || 0;
  const val = e => kind === 'load' ? Number(e.value) || 0 : kind === 'assisted' ? Number(e.assistanceKg) || 0 : Math.max(0, ...coachSetsOf(e, 3, 6));
  const cur = es.length ? val(es[es.length - 1]) : kind === 'load' ? Number(q.currentValue) || 0 : 0;
  const reached = kind === 'assisted' ? cur <= goal : cur >= goal;
  if (reached && es.length) return { done: true };
  const dates = [...new Set(es.map(e => e.date))];
  if (es.length < 3 || dates.length < 3 || coachDaysBetween(es[0].date, es[es.length - 1].date) < 7) return { unknown: true };
  const t0 = es[0].date;
  const xs = es.map(e => coachDaysBetween(t0, e.date));
  const ys = es.map(val);
  const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  if (den === 0) return { unknown: true };
  const slope = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / den;
  const needed = kind === 'assisted' ? cur - goal : goal - cur;
  const rate = kind === 'assisted' ? -slope : slope;
  const minRate = kind === 'load' ? 0.02 : 0.01;
  if (rate < minRate) return { stalled: true };
  const days = Math.min(730, Math.ceil(needed / rate));
  return { days, date: addDaysISO(today, days), perWeek: Math.round(rate * 7 * 10) / 10 };
}

// Rythme de perte de poids et estimation de la date d'arrivée
export function coachWeightPace(state, today) {
  const hist = (state.weightHistory || []).filter(w => w.date && w.date <= today).sort((a, b) => a.date.localeCompare(b.date));
  const target = Number(state.targetWeightKg) || 0;
  const current = hist.length ? Number(hist[hist.length - 1].weightKg) : Number(state.userWeightKg) || 0;
  const from = addDaysISO(today, -28);
  const win = hist.filter(w => w.date >= from);
  if (win.length < 2 || coachDaysBetween(win[0].date, win[win.length - 1].date) < 5) return { current, target, unknown: true };
  const t0 = win[0].date;
  const xs = win.map(w => coachDaysBetween(t0, w.date));
  const ys = win.map(w => Number(w.weightKg) || 0);
  const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  if (den === 0) return { current, target, unknown: true };
  const slope = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / den;
  const kgWeek = Math.round(slope * 7 * 100) / 100;
  const pct = Math.round((kgWeek / Math.max(1, current)) * 1000) / 10;
  let eta = null;
  if (current > target && slope < -0.005) {
    const days = Math.min(900, Math.ceil((current - target) / -slope));
    eta = { days, date: addDaysISO(today, days) };
  }
  let level = 'ok';
  if (pct <= -1.0) level = 'fast';
  else if (pct > -0.25) level = 'slow';
  return { current, target, kgWeek, pct, eta, level };
}

// Activité de la semaine : minutes d'endurance (volley inclus) et jours de renforcement
export function coachWeekActivity(state, weekStart) {
  const end = addDaysISO(weekStart, 6);
  let aerobicMin = 0;
  const strengthDays = new Set();
  getAllEntries(state).forEach(e => {
    if (e.date < weekStart || e.date > end) return;
    if (e.quest.type === 'strength') strengthDays.add(e.date);
    else aerobicMin += Number(e.durationMin) || (e.quest.unit === 'min' ? Number(e.value) || 0 : 0);
  });
  return { aerobicMin: Math.round(aerobicMin), strengthDays: strengthDays.size };
}

// Nombre de semaines consécutives avec au moins une séance de muscu
export function coachTrainingWeeks(state, today) {
  const days = new Set(getAllEntries(state).filter(e => e.quest.type === 'strength').map(e => e.date));
  let ws = getWeekStart(today);
  const has = w => Array.from({ length: 7 }, (_, i) => addDaysISO(w, i)).some(d => days.has(d));
  if (!has(ws)) ws = addDaysISO(ws, -7);
  let n = 0;
  while (has(ws) && n < 60) { n++; ws = addDaysISO(ws, -7); }
  return n;
}
