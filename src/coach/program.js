// Programme d'un coach extérieur : la personne saisit à l'avance ses séances (semaine par semaine) ; l'appli les suit
// dans l'ordre, puis propose la SUITE en analysant ce qui a été prévu (progression par la charge ou par les répétitions,
// semaines allégées, volume) et ce qui a vraiment été réussi. Tout est pur (testé dans program.test.js).
//
// coach.program = { name, startDate (lundi AAAA-MM-JJ), weeks: [{ sessions: [{ id, name, dow (1 = lundi … 7 = dimanche, ou null),
//   exercises: [{ questId, sets, reps: [..] (une valeur par série ; secondes si chronométré), load (kg ou null), assist (kg ou null), rest (s ou null) }] }] }],
//   log: { 'w0:s1': '2026-11-03' } (séances faites ou passées), skipped: { clé: true }, paused }
import { EXERCISE_CATALOG, normSearch } from '../data/catalog';
import { normalizeSlang } from '../data/slang';
import { arenaOf } from '../data/muscles';
import { addDaysISO, getWeekStart } from '../lib/dates';
import { isTimedQuest } from '../lib/quests';
import { parseSpokenWorkout } from '../voice/parser';
import { assistText } from '../lib/assist';
import { profileOpts } from './profiles';
import { coachDaysBetween, coachKind, coachRealEntries, coachRound, coachStep } from './settings';
import { computeExerciseTarget } from './targets';

export const DAY_SHORT = ['', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const fmt = n => String(Math.round(n * 100) / 100).replace('.', ',');
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : 0; };
const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
export const sessionKey = (w, s) => `w${w}:s${s}`;

// ---------------- Saisie : une ligne = un exercice ----------------
/** Nom de l'exercice dans une ligne de programme (« Muscle-up lesté top set 1x2 +17,5 kg RIR 2 » → « Muscle-up lesté »). */
export function programLineName(line) {
  return String(line || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(top set|back-?off|singles?|standard comp[ée]tition|biset|superset|dernière série.*)$/gi, ' ')
    .split(/\s\+?\d/)[0]
    .replace(/\b(top set|back-?off|singles?|standard comp[ée]tition)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * « Développé couché 4x8 60kg », « Tractions 3x6 aide 10kg », « Dips lestés 3x8 +52,5 kg », « Planche 3x45s », « Curl 12 10 8 »
 * → exercice du programme. opts.pick = identifiant d'exercice imposé (choisi par le coach intelligent pour une ligne incertaine).
 * uncertain = le nom trouvé ne couvre pas la moitié des mots de la ligne (« Rowing appui poitrine » → rowing barre ?) :
 * à la sauvegarde, le coach intelligent tranche (exercice existant ou nouvel exercice).
 */
export function parseProgramLine(line, quests = [], opts = {}) {
  const written = String(line || '').replace(/(\d),(\d)/g, '$1.$2').trim();
  if (!written) return null;
  const text = normalizeSlang(written); // argot de salle traduit (« dc », « rdl », « 2 plaques de chaque côté »…)
  const [p0] = parseSpokenWorkout(text, quests).filter(x => x.type === 'strength');
  // Nom écrit en entier (« Curl haltères ») : il passe avant la reconnaissance vocale, plus approximative (« curl » → curl barre)
  const STOP = new Set(['kg', 'kilo', 'kilos', 'aide', 'elastique', 'series', 'serie', 'reps', 'sec', 'min', 'avec', 'les', 'des', 'sur', 'top', 'set', 'back', 'off', 'rir', 'rpe', 'derniere', 'singles', 'single', 'standard', 'competition', 'biset', 'poids', 'corps', 'leste', 'lestee', 'lestes', 'lestees']);
  // mots ramenés à leur racine (« assise » = « assis », « haltères » = « haltère », « tractions » = « traction »)
  const stem = w => { let x = w; while (x.length > 4 && /(es|s|e)$/.test(x)) x = x.replace(/(es|s|e)$/, ''); return x; };
  const words = t => [...new Set((normSearch(String(t).replace(/\([^)]*\)/g, ' ')).match(/[a-z]{3,}/g) || []).filter(w => !STOP.has(w)).map(stem))];
  const EQUIP = new Set(['poulie', 'haltere', 'barre', 'machine', 'smith', 'kettlebell', 'corde', 'assis', 'debout', 'allonge', 'incline', 'decline', 'unilateral', 'hammer', 'guidee'].map(stem));
  const lineW = new Set(words(text));
  const lineEq = [...lineW].filter(w => EQUIP.has(w));
  const aide = /aide|elastique|assist/i.test(normSearch(text));
  const lest = /\+\s*\d/.test(text) || /lest/i.test(normSearch(text)) || aide; // lest ou aide : exercice au poids du corps
  const absKg = /(^|\s)\d+(\.\d+)?\s*kg/i.test(text) && !lest;
  // score : mots en commun (le matériel compte double), mots en trop, matériel qui contredit la ligne (poulie ≠ barre), mesure cohérente
  const score = (n, unit) => {
    const w = words(n);
    const hits = w.filter(x => lineW.has(x));
    if (!hits.length) return null;
    const eqHit = hits.filter(x => EQUIP.has(x)).length;
    const clash = lineEq.length && w.some(x => EQUIP.has(x) && !lineW.has(x)) && !eqHit ? 1 : 0;
    const unitBonus = (lest && unit === 'reps') || (absKg && unit === 'kg') ? 0.5 : 0;
    return [hits.length + eqHit - clash + unitBonus, -(w.length - hits.length), hits.length];
  };
  const pool = [
    ...quests.filter(q => q.type === 'strength').map(q => ({ name: q.name, quest: q, unit: q.unit })),
    ...EXERCISE_CATALOG.filter(c => c.type === 'strength').map(c => ({ name: c.name, catalog: c, unit: c.unit })),
  ];
  const forced = opts.pick ? pool.find(x => (x.quest && x.quest.catalogId === opts.pick) || (x.catalog && x.catalog.id === opts.pick)) : null;
  const named = forced ? { ...forced, sc: [99, 0, 99] } : lineW.size === 0 ? null : pool
    .map(x => ({ ...x, sc: score(x.name, x.unit) }))
    .filter(x => x.sc && x.sc[2] >= Math.min(2, lineW.size))
    .sort((x, y) => y.sc[0] - x.sc[0] || y.sc[1] - x.sc[1] || (x.quest ? -1 : 0) - (y.quest ? -1 : 0))[0] || null;
  // exercice imposé ou trouvé par son nom sans que la dictée le reconnaisse : la ligne est lue quand même
  const p = p0 || (named ? { ...(parseSpokenWorkout(`squat ${text.replace(/^[^\d+]*/, '')}`, [])[0] || { setDetails: [8, 8, 8], unit: 'reps', assistanceKg: 0 }), questId: null, catalogRef: null, timed: false } : null);
  if (!p && !named) return { ok: false, raw: written, name: programLineName(written) };
  let quest = !forced && p0 && p0.questId ? quests.find(q => q.id === p0.questId) : null;
  let catalog = quest || forced ? null : (p0 && p0.catalogRef) || null;
  const parsedHits = (quest || catalog) ? (score((quest || catalog).name, (quest || catalog).unit) || [0])[0] : 0;
  if (named && (forced || named.sc[0] > parsedHits)) {
    quest = named.quest || quests.find(q => named.catalog && q.catalogId === named.catalog.id) || null;
    catalog = quest ? null : named.catalog;
  }
  if (!p || (!quest && !catalog)) return { ok: false, raw: written, name: programLineName(written) };
  // « 2x5s » sur un exercice qui ne se compte pas en secondes : ce n'est pas le même exercice (isométrie…)
  const chosen = quest || catalog;
  const secs = /\d+\s*(?:x|×)\s*\d+\s*s\b/i.test(text);
  const chosenTimed = quest ? isTimedQuest(quest) : !!(catalog && (catalog.timed || /secondes|gainage|planche|isom/i.test(normSearch(catalog.name))));
  if (!forced && secs && !chosenTimed) return { ok: false, raw: written, name: programLineName(written) };
  const covered = words(chosen.name).filter(x => lineW.has(x)).length;
  const uncertain = !forced && lineW.size >= 2 && covered / lineW.size < 0.5;
  const plain = text.toLowerCase().replace(/rir\s*\d+(?:-\d+)?|rpe\s*\d+/g, ' ').replace(/(?:elastique|aide|assiste|delestage)\s*(?:de|a)?\s*\d+(?:\.\d+)?\s*(?:kg|kilos?)?/g, ' ');
  const kg = /(\d+(?:\.\d+)?)\s*(?:kg|kilo)/.exec(plain);
  // séries × répétitions lues directement dans la ligne (plus sûr que la dictée) : « 4x8 », « 4 x 8 », « 12 10 8 », « 3x45s »
  const rest = plain.replace(/(\d+(?:\.\d+)?)\s*(?:kg|kilos?)/g, ' ');
  const nxm = /(\d+)\s*(?:x|×|\*|series? de|fois)\s*(\d+)/.exec(rest);
  const nums = (rest.match(/\d+/g) || []).map(Number).filter(n => n > 0 && n <= 600);
  const reps = (nxm ? Array(Math.min(10, Math.max(1, Number(nxm[1])))).fill(Number(nxm[2])) : nums.length >= 2 ? nums.slice(0, 10) : nums.length === 1 ? Array(3).fill(nums[0]) : p.setDetails).slice(0, 10);
  const unit = quest ? quest.unit : catalog ? catalog.unit : p.unit;
  return {
    ok: true,
    raw: written,
    questId: quest ? quest.id : null,
    catalogId: quest ? quest.catalogId : catalog ? catalog.id : null,
    name: (quest || catalog || p).name,
    icon: (quest || catalog || p).icon,
    sets: reps.length,
    reps,
    load: unit === 'kg' && kg ? Number(kg[1]) : null,
    // poids du corps : aide (« aide 10 kg ») positive ; kilos ajoutés (« +52,5 kg », « lesté ») = lest, aide négative (lib/assist.js)
    assist: unit !== 'reps' || isTimedQuest(chosen) ? null : p0 && p0.assistanceKg > 0 && /aide|elastique|assist/i.test(normSearch(text)) ? p0.assistanceKg : kg ? -Number(kg[1]) : null,
    timed: !!p.timed,
    uncertain,
  };
}

/** Ligne de texte à partir d'un exercice déjà enregistré (pour modifier un programme). */
export function programLine(ex, quest) {
  const reps = ex.reps || [];
  const uniform = reps.length && reps.every(r => r === reps[0]);
  const s = uniform ? `${reps.length}x${reps[0]}` : reps.join(' ');
  const t = quest && isTimedQuest(quest) ? 's' : '';
  return `${quest ? quest.name : 'Exercice'} ${s}${t}${ex.load ? ` ${fmt(ex.load)}kg` : ''}${ex.assist > 0 ? ` aide ${fmt(ex.assist)}kg` : ex.assist < 0 ? ` +${fmt(-ex.assist)}kg` : ''}`;
}

// ---------------- Analyse du programme ----------------
const volumeOf = week => week.sessions.reduce((n, s) => n + s.exercises.reduce((m, e) => m + (Number(e.sets) || 0), 0), 0);

/** Semaines allégées repérées dans le programme (volume ou charges nettement plus bas que la semaine d'avant). */
function deloadWeeks(program) {
  const ws = program.weeks || [];
  const out = new Set();
  ws.forEach((w, i) => {
    if (i === 0) return;
    const prev = ws[i - 1];
    const v0 = volumeOf(prev);
    const v1 = volumeOf(w);
    const loads0 = prev.sessions.flatMap(s => s.exercises.map(e => [e.questId, e.load]));
    const drops = w.sessions.flatMap(s => s.exercises).filter(e => {
      const p = loads0.find(([id, l]) => id === e.questId && l);
      return p && e.load && e.load < p[1] * 0.93;
    }).length;
    const withLoad = w.sessions.flatMap(s => s.exercises).filter(e => e.load).length;
    if ((v0 > 0 && v1 < v0 * 0.8) || (withLoad > 0 && drops >= withLoad / 2)) out.add(i);
  });
  return out;
}

/** Suite des valeurs d'un exercice (même séance, même exercice) au fil des semaines saisies. */
function seriesOf(program, sIdx, questId) {
  return (program.weeks || []).map((w, wi) => {
    const s = w.sessions[sIdx] || w.sessions.find(x => x.exercises.some(e => e.questId === questId));
    const e = s && s.exercises.find(x => x.questId === questId);
    return e ? { week: wi, sets: e.sets, reps: avg(e.reps), min: Math.min(...e.reps), max: Math.max(...e.reps), load: e.load, assist: e.assist } : null;
  });
}

/** Comment un exercice progresse dans le programme : par la charge, par les répétitions, ou stable. */
export function exerciseTrend(series, deloads) {
  const pts = series.filter(p => p && !deloads.has(p.week));
  const dLoad = [];
  const dReps = [];
  const dAssist = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const gap = Math.max(1, b.week - a.week);
    if (a.load && b.load) dLoad.push((b.load - a.load) / gap);
    if (a.assist !== null && a.assist !== undefined && b.assist !== null && b.assist !== undefined) dAssist.push((a.assist - b.assist) / gap);
    dReps.push((b.reps - a.reps) / gap);
  }
  const up = d => d.filter(x => x > 0.01);
  const mostly = d => d.length > 0 && up(d).length >= d.length / 2;
  const loadStep = mostly(dLoad) ? median(up(dLoad)) : 0;
  const assistStep = mostly(dAssist) ? median(up(dAssist)) : 0;
  const repStep = mostly(dReps) ? Math.max(1, Math.round(median(up(dReps)))) : 0;
  const pattern = loadStep > 0 ? 'load' : assistStep > 0 ? 'assist' : repStep > 0 ? 'reps' : pts.length > 1 ? 'stable' : 'single';
  const repMin = Math.min(...pts.map(p => p.min));
  const repMax = Math.max(...pts.map(p => p.max));
  return { pattern, loadStep, assistStep, repStep, repMin, repMax };
}

export function analyzeProgram(program, state) {
  const ws = program.weeks || [];
  const W = ws.length;
  const byId = Object.fromEntries((state.quests || []).map(q => [q.id, q]));
  const deloads = deloadWeeks(program);
  const last = ws[W - 1] || { sessions: [] };
  const trends = {};
  last.sessions.forEach((s, si) => s.exercises.forEach(e => { trends[`${si}:${e.questId}`] = exerciseTrend(seriesOf(program, si, e.questId), deloads); }));
  const firstDeload = [...deloads].sort((a, b) => a - b)[0];
  const deloadEvery = firstDeload !== undefined ? firstDeload + 1 : W >= 3 ? 5 : 0;
  const spw = Math.round(avg(ws.map(w => w.sessions.length)) * 10) / 10;
  const days = [...new Set(ws.flatMap(w => w.sessions.map(s => s.dow)).filter(Boolean))].sort().map(d => DAY_SHORT[d]);
  const allReps = ws.flatMap(w => w.sessions.flatMap(s => s.exercises.filter(e => !isTimedQuest(byId[e.questId] || {})).flatMap(e => e.reps)));
  const names = (pattern) => [...new Set(Object.entries(trends).filter(([, t]) => t.pattern === pattern).map(([k]) => (byId[k.split(':')[1]] || {}).name).filter(Boolean))];
  const steps = (pattern, key) => median(Object.values(trends).filter(t => t.pattern === pattern).map(t => t[key]));
  // volume moyen par muscle et par semaine
  const vol = {};
  ws.forEach(w => w.sessions.forEach(s => s.exercises.forEach(e => { const q = byId[e.questId]; if (q) vol[arenaOf(q)] = (vol[arenaOf(q)] || 0) + (Number(e.sets) || 0) / Math.max(1, W); })));
  const topVol = Object.entries(vol).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([a, v]) => `${a} ${fmt(Math.round(v * 10) / 10)}`);
  const summary = [];
  summary.push(`${W} semaine${W > 1 ? 's' : ''}, ${fmt(spw)} séance${spw > 1 ? 's' : ''} par semaine${days.length ? ` (${days.join(', ')})` : ''}.`);
  if (allReps.length) summary.push(`Répétitions entre ${Math.min(...allReps)} et ${Math.max(...allReps)} par série.`);
  if (names('load').length) summary.push(`Progression par la charge (environ +${fmt(steps('load', 'loadStep'))} kg par semaine) : ${names('load').join(', ')}.`);
  if (names('assist').length) summary.push(`Moins d’aide chaque semaine (environ −${fmt(steps('assist', 'assistStep'))} kg) : ${names('assist').join(', ')}.`);
  if (names('reps').length) summary.push(`Progression par les répétitions (+${fmt(steps('reps', 'repStep'))} par série et par semaine) : ${names('reps').join(', ')}.`);
  if (names('stable').length) summary.push(`Sans changement d’une semaine à l’autre : ${names('stable').join(', ')}.`);
  if (topVol.length) summary.push(`Séries par semaine : ${topVol.join(' · ')}.`);
  if (firstDeload !== undefined) summary.push(`Semaine allégée en semaine ${firstDeload + 1} : la suite garde ce rythme (une toutes les ${deloadEvery} semaines).`);
  else if (deloadEvery) summary.push('Pas de semaine allégée prévue : la suite en propose une toutes les 5 semaines (pratique courante, preuves limitées).');
  return { weeks: W, deloads, deloadEvery, trends, summary, sessionsPerWeek: spw };
}

// ---------------- Suite proposée ----------------
/** Semaine k du programme : celle saisie, ou (au-delà) celle que propose le coach dans la continuité. */
export function programWeek(program, state, k) {
  const ws = program.weeks || [];
  if (k < ws.length) return { ...ws[k], suite: false, deload: false };
  const an = analyzeProgram(program, state);
  const W = ws.length;
  // dernière semaine « normale » comme base, et nombre de semaines de progression depuis
  let baseIdx = W - 1;
  while (baseIdx > 0 && an.deloads.has(baseIdx)) baseIdx--;
  const isDeload = i => an.deloadEvery > 0 && (i + 1) % an.deloadEvery === 0;
  let steps = 0;
  for (let i = W; i <= k; i++) if (!isDeload(i)) steps++;
  const deload = isDeload(k);
  const base = ws[baseIdx];
  const last = ws[W - 1];
  const byId = Object.fromEntries((state.quests || []).map(q => [q.id, q]));
  const sessions = last.sessions.map((s, si) => ({
    ...s,
    id: `${s.id}-suite${k}`,
    exercises: s.exercises.map(e0 => {
      const q = byId[e0.questId];
      const b = (base.sessions[si] && base.sessions[si].exercises.find(x => x.questId === e0.questId)) || e0;
      const t = an.trends[`${si}:${e0.questId}`] || { pattern: 'single', loadStep: 0, assistStep: 0, repStep: 0, repMin: Math.min(...b.reps), repMax: Math.max(...b.reps) };
      let reps = b.reps.slice();
      let load = b.load;
      let assist = b.assist;
      let why = '';
      const step = q ? coachStep(q, load || 20) : 2.5;
      if (t.pattern === 'load' && load) { load = coachRound(load + t.loadStep * steps, step); why = `+${fmt(t.loadStep)} kg par semaine, comme dans ton programme`; }
      else if (t.pattern === 'assist' && assist !== null && assist !== undefined) { assist = assist <= 0 ? coachRound(assist - t.assistStep * steps, 2.5) : Math.max(0, coachRound(assist - t.assistStep * steps, 2.5)); why = `−${fmt(t.assistStep)} kg d’aide par semaine, comme dans ton programme`; }
      else {
        // répétitions (programme) ou, sans progression prévue, double progression : +1 rép par semaine jusqu'en haut de la fourchette, puis charge
        const rs = t.pattern === 'reps' ? t.repStep : 1;
        const lo = t.repMin;
        const hi = Math.max(t.repMax, lo + 2) + 2; // on peut monter 2 répétitions au-dessus de ce que prévoyait le programme, puis on alourdit
        const span = Math.max(1, hi - lo);
        const total = rs * steps;
        const wraps = Math.floor((Math.max(...b.reps) - lo + total) / (span + 1));
        reps = b.reps.map(r => lo + ((r - lo + total) % (span + 1)));
        if (wraps > 0 && load) load = coachRound(load + step * wraps, step);
        if (wraps > 0 && assist) assist = Math.max(0, coachRound(assist - 2.5 * wraps, 2.5));
        why = t.pattern === 'reps' ? `+${rs} rép. par série et par semaine, comme dans ton programme${wraps ? ', puis charge plus lourde en repartant du bas' : ''}` : `ton programme ne progressait pas sur cet exercice : +1 rép. par semaine, puis charge plus lourde`;
      }
      // ce qui a vraiment été réussi : pas plus haut que la dernière charge réussie + une marche
      const real = q ? coachRealEntries(q).filter(h => h.date >= program.startDate) : [];
      const lastReal = real[real.length - 1];
      if (lastReal && load && coachKind(q) === 'load' && Number(lastReal.value) > 0 && load > Number(lastReal.value) + step * 2) {
        load = coachRound(Number(lastReal.value) + step, step);
        why += ` (limité à ${fmt(load)} kg : ta dernière séance était à ${fmt(Number(lastReal.value))} kg)`;
      }
      if (deload) {
        if (load) load = coachRound(load * 0.9, step);
        if (reps.length > 2) reps = reps.slice(0, -1);
        why = 'semaine allégée : −10 % de charge et une série de moins';
      }
      return { ...e0, sets: reps.length, reps, load, assist, why };
    }),
  }));
  return { sessions, suite: true, deload };
}

// ---------------- Prochaine séance ----------------
/** Première séance du programme pas encore faite (ni passée), dans l'ordre ; au-delà des semaines saisies : la suite proposée. */
export function programNext(state, today) {
  const p = state.coach && state.coach.program;
  if (!p || p.paused || !(p.weeks || []).length) return null;
  const log = p.log || {};
  for (let k = 0; k < (p.weeks.length + 52); k++) {
    const week = programWeek(p, state, k);
    for (let si = 0; si < week.sessions.length; si++) {
      const key = sessionKey(k, si);
      if (log[key]) continue;
      const s = week.sessions[si];
      const weekStart = addDaysISO(p.startDate, 7 * k);
      let date = s.dow ? addDaysISO(weekStart, s.dow - 1) : weekStart;
      if (date < today) date = today;
      return { key, weekIdx: k, sessionIdx: si, session: s, date, suite: week.suite, deload: week.deload, weekStart };
    }
  }
  return null;
}

/** Séance guidée (même format que celles du coach) pour une séance du programme. */
export function programSession(state, next) {
  if (!next) return null;
  const byId = Object.fromEntries((state.quests || []).map(q => [q.id, q]));
  const exercises = next.session.exercises.map(e => {
    const q = byId[e.questId];
    if (!q) return null;
    const base = computeExerciseTarget(q, { ...profileOpts(state, next.date), today: next.date });
    const reps = (e.reps || []).length ? e.reps.slice() : base.targetReps;
    const load = q.unit === 'kg' ? (e.load !== null && e.load !== undefined ? e.load : base.load) : base.load;
    // aide ou lest prévu par le coach sur un exercice au poids du corps (aide négative = lest) : l'exercice se règle alors en kg
    const planAssist = q.unit === 'reps' && !isTimedQuest(q) && e.assist !== null && e.assist !== undefined;
    const kind = planAssist ? 'assisted' : base.kind;
    const assist = planAssist ? e.assist : base.assist;
    const planned = `${reps.every(r => r === reps[0]) ? `${reps.length} × ${reps[0]}` : reps.join(' - ')}${isTimedQuest(q) ? ' s' : ''}${q.unit === 'kg' && load ? ` à ${fmt(load)} kg` : ''}${kind === 'assisted' && assist ? `, ${assistText(assist)}` : ''}`;
    return {
      ...base,
      kind,
      sets: reps.length,
      targetReps: reps,
      load,
      assist,
      restSec: Number(e.rest) > 0 ? Number(e.rest) : base.restSec,
      change: next.suite ? 'suite' : 'program',
      reason: next.suite ? `Suite proposée : ${planned} (${e.why || 'dans la continuité de ton programme'}).` : `Prévu par ton coach : ${planned}.`,
      manual: false,
    };
  }).filter(Boolean);
  const estMin = Math.round(5 + exercises.reduce((s, e) => s + e.sets * (0.75 + e.restSec / 60), 0));
  const label = `${next.session.name || `Séance ${next.sessionIdx + 1}`}${next.suite ? ' (suite proposée)' : ''}`;
  return {
    templateIdx: -1, templateId: label, date: next.date, exercises, estMin, estKcal: Math.round(estMin * 4.5), warmup: '',
    notes: [next.suite ? `Ton programme est terminé : voici la suite que je propose (semaine ${next.weekIdx + 1}${next.deload ? ', allégée' : ''}).` : `Programme de ton coach : semaine ${next.weekIdx + 1}, ${label}.`],
    program: { key: next.key, weekIdx: next.weekIdx, suite: next.suite },
  };
}

/**
 * La personne a répondu « Non » à « l'appli prend le relais ? » (program.takeOver === false) : une fois les semaines de son coach
 * finies, la suite n'est plus proposée, seulement montrée en aperçu (pas de séance guidée, pas de réglages).
 */
export function programCoachOff(state, next) {
  const p = state && state.coach && state.coach.program;
  return !!(p && p.takeOver === false && next && next.suite);
}

/** Lundi de la semaine en cours (date de départ par défaut d'un programme). */
export const programDefaultStart = today => getWeekStart(today);
/** Semaine du programme où l'on se trouve d'après le calendrier (pour l'affichage). */
export const programCalendarWeek = (p, today) => Math.floor(coachDaysBetween(p.startDate, today) / 7);
export const catalogById = id => EXERCISE_CATALOG.find(c => c.id === id) || null;
