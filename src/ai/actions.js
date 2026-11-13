// Changements proposés par le coach intelligent : vérifiés un par un (rien d'inconnu ni d'absurde ne passe), puis appliqués à l'état
// seulement quand la personne appuie sur « Appliquer ». Fonctions pures, testées dans actions.test.js.
import { coachRealEntries, getCoachSettings } from '../coach/settings';
import { THEME_IDS, setDayType } from '../coach/dayTheme';
import { STYLE_IDS, missingPlyo, perfSport, setDayStyle } from '../coach/contraction';
import { coachPlanWeek } from '../coach/planning';
import { getWeekStart } from '../lib/dates';
import { EXERCISE_CATALOG } from '../data/catalog';
import { SPORTS } from '../data/sports';
import { makeQuestFromCatalog } from '../lib/questFactory';
import { METHODS, methodFits } from '../coach/methods';
import { GOAL_KINDS } from '../coach/goal';
import { COACH_ARENAS } from '../coach/settings';
import { fromAiDay } from './context';
import { CARDIO_GOALS, CARDIO_KINDS, getCardioSettings, vdotFrom } from '../coach/cardio';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const MINUTES = [0, 45, 60, 75, 90];
const WORK = ['auto', 'puissance', 'hypertrophie', 'endurance'];
const num = v => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const inRange = (v, a, b) => (num(v) !== null && num(v) >= a && num(v) <= b ? num(v) : null);
const dayList = v => (Array.isArray(v) ? [...new Set(v.map(Number).filter(d => Number.isInteger(d) && d >= 1 && d <= 7).map(fromAiDay))].sort((a, b) => a - b) : null);
const dateList = (v, today) => (Array.isArray(v) ? [...new Set(v.map(String).filter(d => ISO.test(d) && d >= today))].sort() : []);
const strengthQuest = (state, id) => (state.quests || []).find(q => q.id === id && q.type === 'strength');
const nearest = (list, v) => list.reduce((best, x) => (Math.abs(x - v) < Math.abs(best - v) ? x : best), list[0]);

function parseArgs(a) {
  if (a && typeof a.args === 'object' && a.args) return a.args;
  try { const o = JSON.parse(String((a && a.args) || '{}')); return o && typeof o === 'object' ? o : {}; } catch { return null; }
}

/** Vérifie et nettoie une action ; null si elle est invalide ou inutile. */
export function normalizeAction(a, state, today) {
  if (!a || typeof a !== 'object') return null;
  const x = parseArgs(a);
  if (!x) return null;
  const coach = getCoachSettings(state);
  let args = null;
  switch (a.type) {
    case 'schedule': {
      const o = {};
      const spw = num(x.sessionsPerWeek);
      // 1 à 6 séances (avant : ramené à 2 ou 3, d'où des réponses à côté pour « 4 séances » ou « push pull legs »)
      if (spw !== null && spw >= 1) o.sessionsPerWeek = Math.max(1, Math.min(6, Math.round(spw)));
      if (['auto', 'ppl', 'upperlower', 'trio'].includes(x.split)) o.split = x.split;
      const m = num(x.sessionMinutes);
      if (m !== null && m >= 0 && m <= 240) o.sessionMinutes = nearest(MINUTES, m);
      const d = dayList(x.gymDays);
      if (d && d.length) o.gymDays = d;
      if (Object.keys(o).length) args = o;
      break;
    }
    case 'sport': {
      const o = {};
      if (typeof x.sport === 'string' && (x.sport === '' || SPORTS.some(s => s.id === x.sport))) o.sport = x.sport;
      const d = dayList(x.days);
      if (d) o.days = d;
      if (Object.keys(o).length) args = o;
      break;
    }
    case 'matches': {
      const add = dateList(x.add, today);
      const remove = Array.isArray(x.remove) ? x.remove.map(String).filter(d => ISO.test(d)) : [];
      if (add.length || remove.length) args = { add, remove };
      break;
    }
    case 'goal':
      if (WORK.includes(x.workProfile)) args = { workProfile: x.workProfile };
      break;
    case 'body': {
      const o = {};
      const h = inRange(x.heightCm, 120, 230);
      const ag = inRange(x.age, 10, 100);
      const tw = inRange(x.targetWeightKg, 30, 250);
      if (h !== null) o.heightCm = Math.round(h);
      if (ag !== null) o.age = Math.round(ag);
      if (x.sex === 'm' || x.sex === 'f') o.sex = x.sex;
      if (tw !== null) o.targetWeightKg = Math.round(tw * 10) / 10;
      if (Object.keys(o).length) args = o;
      break;
    }
    case 'feeling':
      if (['low', 'ok', 'high'].includes(x.level)) args = { level: x.level };
      break;
    case 'session': {
      const seen = new Set();
      const exercises = (Array.isArray(x.exercises) ? x.exercises : [])
        .filter(e => e && strengthQuest(state, e.questId) && !seen.has(e.questId) && seen.add(e.questId))
        .map(e => ({ questId: e.questId, sets: Math.round(inRange(e.sets, 1, 8) || 3) }))
        .slice(0, 12);
      if (exercises.length) args = { date: ISO.test(String(x.date)) && String(x.date) >= today ? String(x.date) : today, exercises };
      break;
    }
    case 'adjust': {
      const q = strengthQuest(state, x.questId);
      if (!q) break;
      const o = { questId: q.id };
      if (q.unit === 'kg' && inRange(x.load, 0, 500) !== null && num(x.load) > 0) o.load = Math.round(num(x.load) * 4) / 4;
      // exercice au poids du corps : aide (> 0) ou lest (< 0, ex. −10 = dips lestés de 10 kg)
      if (q.unit === 'reps' && !q.timed && inRange(x.assist, -150, 80) !== null && x.assist !== undefined) o.assist = Math.round(num(x.assist) * 2) / 2;
      const rd = inRange(x.repsDelta, -5, 5);
      if (rd !== null && Math.round(rd) !== 0) o.repsDelta = Math.round(rd);
      if (Object.keys(o).length > 1) args = o;
      break;
    }
    case 'add_exercise': {
      const c = EXERCISE_CATALOG.find(e => e.id === x.catalogId && e.type !== 'cardio');
      if (c && !(state.quests || []).some(q => q.catalogId === c.id)) args = { catalogId: c.id };
      break;
    }
    case 'create_exercise': {
      // exercice absent du catalogue : créé (et partagé) au moment d'« Appliquer » (CoachChat → ai/exercise.js)
      const name = String(x.name || '').replace(/\s+/g, ' ').trim().slice(0, 60);
      if (name.length >= 2) args = { name, details: String(x.details || '').replace(/\s+/g, ' ').trim().slice(0, 200) };
      break;
    }
    case 'skip': {
      const dates = dateList(x.dates, today);
      if (dates.length) args = { dates };
      break;
    }
    case 'day_theme': {
      // « aujourd'hui je veux une séance de pousser, demain de tirer » (4.36)
      const dates = dateList(x.dates || (x.date ? [x.date] : []), today);
      const theme = x.theme === 'auto' ? null : THEME_IDS[x.theme];
      if (dates.length && (theme || x.theme === 'auto')) args = { dates, theme };
      break;
    }
    case 'day_style': {
      // « aujourd'hui je veux une séance axée sur l'isométrie » (4.42) : iso | iso_hold | ecc | expl | plyo | normal
      const dates = dateList(x.dates || (x.date ? [x.date] : []), today);
      const style = x.style === 'normal' ? null : STYLE_IDS.includes(x.style) ? x.style : undefined;
      if (dates.length && style !== undefined) args = { dates, style };
      break;
    }
    case 'plyo': {
      // pliométrie : séances avec des sauts par semaine (0 à 3) et exercices de sauts à ajouter (pack général ou du sport)
      const perWeek = inRange(x.perWeek, 0, 3);
      const sport = perfSport(x.sport) || perfSport(coach.sport);
      const add = x.add === false ? [] : missingPlyo(state, sport);
      if (perWeek !== null || add.length) args = { perWeek: perWeek === null ? null : Math.round(perWeek), add };
      break;
    }
    case 'extra_session': {
      const add = dateList(x.add || x.dates, today);
      const remove = Array.isArray(x.remove) ? x.remove.map(String).filter(d => ISO.test(d)) : [];
      if (add.length || remove.length) args = { add, remove };
      break;
    }
    case 'remember': {
      const text = String(x.text || '').replace(/\s+/g, ' ').trim().slice(0, 200);
      if (text.length >= 2) args = { text };
      break;
    }
    case 'forget':
      if ((coach.memory || []).some(m => m.id === x.id)) args = { id: x.id };
      break;
    case 'muscle_mode':
      if (x.mode === 'simple' || x.mode === 'optimized') args = { mode: x.mode };
      break;
    case 'method': {
      const q = strengthQuest(state, x.questId);
      if (!q) break;
      const kind = q.unit === 'kg' ? 'load' : Number(q.currentAssistanceKg) !== 0 ? 'assisted' : 'reps';
      if (x.method === 'auto' || (x.method !== 'custom' && METHODS[x.method] && methodFits(x.method, { kind, catalogId: q.catalogId }))) args = { questId: q.id, method: x.method };
      break;
    }
    case 'method_style':
      if (x.style === 'evidence' || x.style === 'classic') args = { style: x.style };
      else if (x.style === 'varied' || x.style === 'variety') args = { style: 'variety' }; // variété demandée explicitement
      break;
    case 'main_goal': {
      if (x.clear) { args = { clear: true }; break; }
      if (!GOAL_KINDS.includes(x.kind)) break;
      const g = { kind: x.kind, text: String(x.text || '').replace(/\s+/g, ' ').trim().slice(0, 120) };
      if (x.kind === 'strength' || x.kind === 'reps') { const q = strengthQuest(state, x.questId); if (!q) break; g.questId = q.id; if (!g.text) g.text = q.name; }
      if (x.kind === 'muscle') { if (!COACH_ARENAS.includes(x.arena)) break; g.arena = x.arena; if (!g.text) g.text = `Plus de muscle : ${x.arena}`; }
      const t = inRange(x.target, 1, 500);
      if (t !== null) g.target = Math.round(t * 2) / 2;
      if (ISO.test(String(x.deadline || '')) && String(x.deadline) >= today) g.deadline = String(x.deadline);
      if (!g.text) g.text = x.kind === 'weight' ? `Poids : ${g.target} kg` : 'Forme générale';
      if (x.kind === 'weight' && !g.target) break;
      args = g;
      break;
    }
    case 'cardio': {
      // séances de cardio proposées par le coach (marche, course, vélo, rameur, elliptique)
      const o = {};
      if (typeof x.on === 'boolean') o.on = x.on;
      if (CARDIO_GOALS.some(g => g.id === x.goal)) o.goal = x.goal;
      if (Array.isArray(x.kinds)) { const k = [...new Set(x.kinds.filter(v => CARDIO_KINDS.some(c => c.id === v)))]; if (k.length) o.kinds = k; }
      const n = inRange(x.perWeek, 1, 5);
      if (n !== null) o.perWeek = Math.round(n);
      const m = inRange(x.minutes, 15, 120);
      if (m !== null) o.minutes = nearest([20, 30, 45, 60, 75, 90], m);
      if (typeof x.runner === 'boolean') o.runner = x.runner;
      if (Array.isArray(x.days)) o.days = dayList(x.days) || [];
      if (vdotFrom(x.refKm, x.refMin)) o.ref = { km: Number(x.refKm), min: Math.round(Number(x.refMin) * 100) / 100 };
      if (Object.keys(o).length) args = o;
      break;
    }
    default:
      return null;
  }
  if (!args) return null;
  const label = String(a.label || '').replace(/\s+/g, ' ').trim().slice(0, 160) || defaultLabel(a.type, args, state);
  return { type: a.type, label, args };
}

function defaultLabel(type, args, state) {
  if (type === 'add_exercise') return `Ajouter ${(EXERCISE_CATALOG.find(c => c.id === args.catalogId) || {}).name}`;
  if (type === 'remember') return `Retenir : ${args.text}`;
  if (type === 'adjust') return `Changer l’objectif de ${(strengthQuest(state, args.questId) || {}).name}`;
  if (type === 'day_style') return args.style ? `Séance axée « ${args.style} » le ${args.dates.join(', ')}` : 'Revenir à des séances normales';
  if (type === 'plyo') return `Pliométrie : ${args.perWeek !== null ? `${args.perWeek} séance${args.perWeek > 1 ? 's' : ''} avec des sauts par semaine` : 'exercices de sauts'}${args.add.length ? `, ${args.add.length} exercice${args.add.length > 1 ? 's' : ''} ajouté${args.add.length > 1 ? 's' : ''}` : ''}`;
  if (type === 'cardio') return args.on === false ? 'Arrêter le cardio du coach' : 'Régler le cardio du coach';
  return 'Changer un réglage du coach';
}

/** Liste propre d'actions (au plus 6, sans doublon de type identique sur le même objet). */
export function normalizeActions(list, state, today) {
  const out = [];
  (Array.isArray(list) ? list : []).forEach(a => {
    const n = normalizeAction(a, state, today);
    if (n && out.length < 6) out.push(n);
  });
  return out;
}

const memId = () => `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/** Applique une action déjà vérifiée. */
export function applyAction(state, a, today) {
  const coach = getCoachSettings(state);
  const withCoach = patch => ({ ...state, coach: { ...coach, ...patch } });
  const x = a.args;
  switch (a.type) {
    case 'schedule': {
      const patch = {};
      if (x.sessionsPerWeek) patch.sessionsPerWeek = x.sessionsPerWeek;
      if (x.split) { patch.splitMode = x.split; if (x.split === 'trio') patch.sessionsPerWeek = 3; }
      if (x.sessionMinutes !== undefined) patch.sessionMinutes = x.sessionMinutes;
      if (x.gymDays) {
        const old = coach.gymSlots || {};
        patch.gymSlots = x.gymDays.reduce((o, d) => ({ ...o, [d]: old[d] || { start: '18:00', end: '19:30' } }), {});
      }
      return withCoach(patch);
    }
    case 'sport': {
      const patch = {};
      if (x.sport !== undefined) patch.sport = x.sport;
      if (x.days) patch.volleyDays = x.days;
      return withCoach(patch);
    }
    case 'matches': {
      const set = new Set(coach.matchDates || []);
      x.add.forEach(d => set.add(d));
      x.remove.forEach(d => set.delete(d));
      return withCoach({ matchDates: [...set].sort() });
    }
    case 'goal':
      return withCoach({ workProfile: x.workProfile });
    case 'body': {
      const { targetWeightKg, ...prof } = x;
      const next = withCoach({ profile: { ...(coach.profile || {}), ...prof } });
      return targetWeightKg ? { ...next, targetWeightKg } : next;
    }
    case 'feeling':
      return withCoach({ readiness: { date: today, level: x.level } });
    case 'session':
      return withCoach({ plan: { date: x.date, questIds: x.exercises.map(e => e.questId), sets: Object.fromEntries(x.exercises.map(e => [e.questId, e.sets])) } });
    case 'adjust':
      return {
        ...state,
        quests: state.quests.map(q => {
          if (q.id !== x.questId) return q;
          const o = { entries: coachRealEntries(q).length };
          if (x.load !== undefined) o.load = x.load;
          if (x.assist !== undefined) o.assist = x.assist;
          if (x.repsDelta) o.repsDelta = x.repsDelta;
          // lest sur un exercice qui était au poids du corps seul : il devient un exercice lesté (réglé en kg, la progression ajoute du lest)
          if (x.assist !== undefined && x.assist < 0 && !(Number(q.currentAssistanceKg) < 0)) return { ...q, currentAssistanceKg: x.assist, coachOverride: o };
          return { ...q, coachOverride: o };
        }),
      };
    case 'add_exercise': {
      const c = EXERCISE_CATALOG.find(e => e.id === x.catalogId);
      if (!c || (state.quests || []).some(q => q.catalogId === c.id)) return state;
      const { quest } = makeQuestFromCatalog(c, state, today, 'ajouté par le coach intelligent');
      return { ...state, quests: [...state.quests, quest] };
    }
    case 'skip':
      return withCoach({ gymSkips: [...new Set([...(coach.gymSkips || []), ...x.dates])].sort() });
    case 'day_theme': {
      // jour sans séance prévue : une séance en plus ce jour-là (avec ce thème)
      let cs = coach;
      const extra = new Set(coach.gymExtra || []);
      x.dates.forEach(d => {
        cs = { ...cs, dayTypes: setDayType(cs, d, x.theme, today) };
        if (x.theme) {
          let planned = false;
          try { planned = coachPlanWeek(state, getWeekStart(d), today).planned.includes(d); } catch (e) { /* rien */ }
          if (!planned) extra.add(d);
        }
      });
      return withCoach({ dayTypes: cs.dayTypes, gymExtra: [...extra].sort(), gymSkips: (coach.gymSkips || []).filter(d => !(x.theme && x.dates.includes(d))) });
    }
    case 'day_style': {
      // jour sans séance prévue : une séance en plus ce jour-là (avec cette façon de travailler)
      let cs = coach;
      const extra = new Set(coach.gymExtra || []);
      x.dates.forEach(d => {
        cs = { ...cs, dayStyles: setDayStyle(cs, d, x.style, today) };
        if (x.style) {
          let planned = false;
          try { planned = coachPlanWeek(state, getWeekStart(d), today).planned.includes(d); } catch (e) { /* rien */ }
          if (!planned) extra.add(d);
        }
      });
      return withCoach({ dayStyles: cs.dayStyles, gymExtra: [...extra].sort(), gymSkips: (coach.gymSkips || []).filter(d => !(x.style && x.dates.includes(d))) });
    }
    case 'plyo': {
      const have = new Set((state.quests || []).map(q => q.catalogId));
      const fresh = x.add.filter(id => !have.has(id)).map(id => EXERCISE_CATALOG.find(c => c.id === id)).filter(Boolean).map(c => makeQuestFromCatalog(c, state, today, 'pliométrie (coach intelligent)').quest);
      const plyo = x.perWeek === null ? coach.plyo : { ...(coach.plyo || {}), perWeek: x.perWeek };
      return { ...state, quests: [...state.quests, ...fresh], coach: { ...coach, plyo } };
    }
    case 'extra_session': {
      const extra = new Set(coach.gymExtra || []);
      x.add.forEach(d => extra.add(d));
      x.remove.forEach(d => extra.delete(d));
      return withCoach({ gymExtra: [...extra].sort(), gymSkips: (coach.gymSkips || []).filter(d => !x.add.includes(d)) });
    }
    case 'remember':
      return withCoach({ memory: [...(coach.memory || []), { id: memId(), text: x.text, at: today }].slice(-30) });
    case 'forget':
      return withCoach({ memory: (coach.memory || []).filter(m => m.id !== x.id) });
    case 'muscle_mode':
      return { ...state, muscleMode: x.mode };
    case 'method':
      return { ...state, quests: state.quests.map(q => (q.id === x.questId ? { ...q, coachMethod: x.method === 'auto' ? undefined : x.method } : q)) };
    case 'method_style':
      return withCoach({ methodStyle: x.style });
    case 'main_goal': {
      if (x.clear) return withCoach({ mainGoal: null });
      const w = (state.weightHistory || []).slice().sort((a, b) => String(a.date).localeCompare(String(b.date))).pop();
      return withCoach({ mainGoal: { ...x, createdAt: today, ...(x.kind === 'weight' ? { startWeight: w ? Number(w.weightKg) : Number(state.userWeightKg) || undefined } : {}) } });
    }
    case 'cardio': {
      const cur = getCardioSettings(state);
      return withCoach({ cardio: { ...cur, ...x, on: x.on === undefined ? true : x.on, asked: true } });
    }
    default:
      return state;
  }
}

// Réglages du coach touchés par chaque type d'action (pour pouvoir annuler)
const COACH_KEYS = {
  schedule: ['sessionsPerWeek', 'sessionMinutes', 'gymSlots', 'splitMode'], sport: ['sport', 'volleyDays'], matches: ['matchDates'], goal: ['workProfile'],
  body: ['profile'], feeling: ['readiness'], session: ['plan'], skip: ['gymSkips'], extra_session: ['gymExtra', 'gymSkips'], day_theme: ['dayTypes', 'gymExtra', 'gymSkips'], day_style: ['dayStyles', 'gymExtra', 'gymSkips'], plyo: ['plyo'], method_style: ['methodStyle'], main_goal: ['mainGoal'], cardio: ['cardio'], remember: ['memory'], forget: ['memory'],
};

/** Ce qu'il faut remettre pour annuler ces actions : anciennes valeurs des réglages touchés (à prendre AVANT d'appliquer). */
export function undoSnapshot(state, actions) {
  const coach = (state && state.coach) || {};
  const snap = { coach: {}, top: {}, overrides: {}, questIds: (state.quests || []).map(q => q.id) };
  (actions || []).forEach(a => {
    (COACH_KEYS[a.type] || []).forEach(k => { if (!(k in snap.coach)) snap.coach[k] = coach[k] === undefined ? null : coach[k]; });
    if (a.type === 'body' && a.args.targetWeightKg && !('targetWeightKg' in snap.top)) snap.top.targetWeightKg = state.targetWeightKg === undefined ? null : state.targetWeightKg;
    if (a.type === 'muscle_mode' && !('muscleMode' in snap.top)) snap.top.muscleMode = state.muscleMode || 'simple';
    if (a.type === 'method') {
      snap.methods = snap.methods || {};
      if (!(a.args.questId in snap.methods)) { const q = (state.quests || []).find(x => x.id === a.args.questId); snap.methods[a.args.questId] = q && q.coachMethod ? q.coachMethod : null; }
    }
    if (a.type === 'adjust' && !(a.args.questId in snap.overrides)) {
      const q = (state.quests || []).find(x => x.id === a.args.questId);
      snap.overrides[a.args.questId] = q && q.coachOverride ? q.coachOverride : null;
    }
  });
  return snap;
}

/** Annule : remet les anciennes valeurs et retire les exercices ajoutés par le coach (s'ils n'ont encore aucune séance). */
export function applyUndo(state, snap) {
  if (!snap) return state;
  const coach = { ...((state && state.coach) || {}) };
  Object.entries(snap.coach || {}).forEach(([k, v]) => { if (v === null) delete coach[k]; else coach[k] = v; });
  const next = { ...state, coach };
  Object.entries(snap.top || {}).forEach(([k, v]) => { if (v === null) delete next[k]; else next[k] = v; });
  const before = new Set(snap.questIds || []);
  next.quests = (state.quests || [])
    .filter(q => before.has(q.id) || coachRealEntries(q).length > 0)
    .map(q => {
      if (snap.methods && q.id in snap.methods) {
        const m = snap.methods[q.id];
        if (m) q = { ...q, coachMethod: m };
        else { const { coachMethod, ...rest } = q; q = rest; }
      }
      if (!(q.id in (snap.overrides || {}))) return q;
      const o = snap.overrides[q.id];
      if (o) return { ...q, coachOverride: o };
      const { coachOverride, ...rest } = q;
      return rest;
    });
  return next;
}

/** Applique une liste d'actions déjà vérifiées par normalizeActions (les jours y sont déjà au format de l'appli). */
export function applyActions(state, actions, today) {
  return (actions || []).reduce((s, a) => {
    if (a.type === 'session') {
      const ids = a.args.exercises.filter(e => strengthQuest(s, e.questId));
      if (!ids.length) return s;
      return applyAction(s, { ...a, args: { ...a.args, exercises: ids } }, today);
    }
    return applyAction(s, a, today);
  }, state);
}
