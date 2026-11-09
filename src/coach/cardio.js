// ==========================================================================
// COACH CARDIO : le cœur est entraîné comme un muscle à part entière.
// Fonctions pures (testées dans cardio.test.js). Repères (data/cardioSources.js) :
//  - OMS 2020 (Bull et al.) : 150 à 300 min d'activité modérée par semaine, ou 75 à 150 min intense, ou un mélange
//    (1 min intense = 2 min modérées).
//  - ACSM 2009 (Donnelly et al.) : perte de poids nette au-delà d'environ 250 min par semaine ; 150-250 min = perte modeste.
//  - ACSM 2011 (Garber et al.) : modéré = 64-76 % de la FC max, intense = 77-95 % ; 3 à 5 séances par semaine.
//  - Tanaka 2001 : FC max ≈ 208 − 0,7 × âge.
//  - Helgerud 2007 : 4 × 4 min à 90-95 % de la FC max (récup. active 3 min) améliore plus la VO2max que l'endurance lente.
//  - Wewege 2017 : fractionné et continu font perdre autant de graisse, le fractionné en environ 40 % de temps en moins.
//  - Stöggl & Sperlich 2014 : entraînement « polarisé » (surtout facile + un peu très intense) = plus gros progrès d'endurance.
//  - NHS Couch to 5K : 3 sorties par semaine, en alternant course et marche (1 min de course / 1 min 30 de marche au début).
//  - Schumann 2022 : le cardio ne freine ni la force ni le muscle ; un peu l'explosivité s'il est dans la même séance.
// Ce n'est pas un avis médical.
// ==========================================================================
import { addDaysISO, getWeekStart } from '../lib/dates';
import { getAllEntries } from '../lib/quests';
import { coachDayInfo, coachPlanWeek } from './planning';
import { coachDaysBetween, getCoachSettings } from './settings';

export const CARDIO_GOALS = [
  { id: 'weight', label: 'Perdre du poids', icon: '🔥' },
  { id: 'endurance', label: 'Améliorer mon cardio', icon: '🏃' },
  { id: 'health', label: 'Santé du cœur', icon: '❤️' },
];

// activités proposées par le coach ; catalogId = exercice où la séance est enregistrée
export const CARDIO_KINDS = [
  { id: 'walk', label: 'Marche', icon: '🚶', catalogId: 'brisk_walk', speed: 5.5 },
  { id: 'run', label: 'Course', icon: '🏃', catalogId: 'running_endurance', speed: 8.5 },
  { id: 'bike', label: 'Vélo', icon: '🚴', catalogId: 'fp_bike' },
  { id: 'rower', label: 'Rameur', icon: '🚣', catalogId: 'fp_rower', speed: 12 },
  { id: 'elliptical', label: 'Elliptique', icon: '🌀', catalogId: 'fp_elliptical' },
];
const kindOf = id => CARDIO_KINDS.find(k => k.id === id) || CARDIO_KINDS[0];

const DEFAULTS = { on: false, asked: false, goal: 'health', kinds: ['walk'], perWeek: 2, minutes: 30, runner: false, ref: null, days: [] };

export function getCardioSettings(state) {
  const c = getCoachSettings(state).cardio || {};
  const out = { ...DEFAULTS, ...c };
  out.kinds = (Array.isArray(out.kinds) ? out.kinds : []).filter(k => CARDIO_KINDS.some(x => x.id === k));
  if (!out.kinds.length) out.kinds = ['walk'];
  out.perWeek = Math.max(1, Math.min(6, Number(out.perWeek) || 2));
  out.minutes = Math.max(15, Math.min(120, Number(out.minutes) || 30));
  if (!CARDIO_GOALS.some(g => g.id === out.goal)) out.goal = 'health';
  // jours de la semaine choisis pour le cardio (0 = dimanche … 6 = samedi) ; vide = le coach choisit
  out.days = [...new Set((Array.isArray(out.days) ? out.days : []).map(Number).filter(d => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
  return out;
}

/** Objectif de cardio par défaut selon l'objectif principal du coach (perte de poids → poids). */
export function cardioGoalFromMain(state) {
  const g = getCoachSettings(state).mainGoal;
  return g && g.kind === 'weight' ? 'weight' : 'health';
}

// ---- Fréquence cardiaque (Tanaka 2001, zones ACSM 2011) ----
export function hrMax(age) {
  const a = Number(age);
  return a >= 10 && a <= 100 ? Math.round(208 - 0.7 * a) : null;
}
export const ZONES = {
  easy: { label: 'Facile', pct: [64, 76], talk: 'tu peux parler en phrases' },
  hard: { label: 'Soutenu', pct: [90, 95], talk: 'seulement quelques mots' },
  rest: { label: 'Récupération', pct: [50, 64], talk: 'tu reprends ton souffle' },
  calm: { label: 'Tranquille', pct: [50, 64], talk: 'allure de promenade' },
};
export function zoneText(zone, age) {
  const z = ZONES[zone] || ZONES.easy;
  const m = hrMax(age);
  return m ? `${Math.round((m * z.pct[0]) / 100)}-${Math.round((m * z.pct[1]) / 100)} battements/min · ${z.talk}` : z.talk;
}

// ---- Allures de course (sans montre cardio) ----
// Daniels et Gilbert 1979 (« Oxygen Power ») : coût en oxygène de la course VO2 = −4,60 + 0,182258 v + 0,000104 v² (v en m/min)
// et part de la VO2max tenue pendant une course de t minutes ; le rapport des deux = VDOT (« VO2max de course »).
// Allures d'entraînement de Daniels : facile = 59-74 % de la VDOT, fractionné (I) vers 98 %.
const vo2Cost = v => -4.6 + 0.182258 * v + 0.000104 * v * v;
const fracFor = t => 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t);
/** VDOT d'une performance (distance en km, temps en minutes) ; null hors de 1 à 42,2 km ou d'une vitesse plausible. */
export function vdotFrom(km, min) {
  const d = Number(km), t = Number(min);
  if (!(d >= 1 && d <= 42.2 && t > 0)) return null;
  const v = (d * 1000) / t;
  if (v < 100 || v > 400) return null; // 6 à 24 km/h
  return Math.round((vo2Cost(v) / fracFor(t)) * 10) / 10;
}
/** Vitesse (km/h) qui coûte la fraction `frac` de la VDOT. */
export function speedAt(vdot, frac) {
  const a = 0.000104, b = 0.182258, c = -(4.6 + frac * vdot);
  return Math.round(((-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a)) * 0.06 * 10) / 10;
}
/** « 6'23/km » */
export function paceText(kmh) {
  if (!(kmh > 0)) return '';
  const s = Math.round(3600 / kmh);
  return `${Math.floor(s / 60)}'${String(s % 60).padStart(2, '0')}/km`;
}
export const RUN_PACES = { easy: [0.62, 0.70], runwalk: [0.59, 0.65], hard: [0.94, 0.98] };
const isRun = q => q && q.type === 'cardio' && ['run', 'interval', 'trail'].includes(q.cardioMode);
const measured = e => Number(e.distanceKm) > 0 && Number(e.durationMin) > 0 && !e.estimated && !/estimés/.test(String(e.note || ''));

/** Référence de course : temps déclaré (Réglages → Cardio) ou meilleure course mesurée des 120 derniers jours. */
export function runRef(state, today) {
  const c = getCardioSettings(state);
  let best = null;
  const dec = c.ref && vdotFrom(c.ref.km, c.ref.min);
  if (dec) best = { vdot: dec, source: 'declared', km: Number(c.ref.km), min: Number(c.ref.min) };
  const from = today ? addDaysISO(today, -120) : '';
  getAllEntries(state).forEach(e => {
    if (!isRun(e.quest) || !measured(e) || (from && e.date < from)) return;
    const v = vdotFrom(e.distanceKm, e.durationMin);
    if (v && (!best || v > best.vdot)) best = { vdot: v, source: 'history', km: Number(e.distanceKm), min: Number(e.durationMin), date: e.date };
  });
  return best;
}
/** Vitesse de marche habituelle (marches mesurées), 5,5 km/h par défaut. */
export function walkSpeed(state) {
  const sp = getAllEntries(state).filter(e => e.quest.type === 'cardio' && e.quest.cardioMode === 'walk' && measured(e)).map(e => (e.distanceKm * 60) / e.durationMin).filter(v => v >= 3.5 && v <= 8);
  if (!sp.length) return 5.5;
  sp.sort((a, b) => a - b);
  return Math.round(sp[Math.floor(sp.length / 2)] * 10) / 10;
}

// Consigne d'une étape : vitesse et allure (course avec référence), cadence de pas (marche : 100 pas/min = intensité modérée,
// Tudor-Locke 2019), sinon effort ressenti sur 10 et test de la parole (valides, Reed et Pipe 2014).
function stepTarget(step, kind, ref, walkV) {
  const span = (a, b) => ({ speed: [a, b], text: `${String(a).replace('.', ',')}-${String(b).replace('.', ',')} km/h (${paceText(b)} à ${paceText(a)})` });
  if (kind === 'run') {
    if (step.zone === 'calm' || step.zone === 'rest') return { ...span(5, 6), cue: step.zone === 'rest' ? 'marche ou trottine pour récupérer' : 'marche rapide', mid: 5.5 };
    const p = step.zone === 'hard' ? RUN_PACES.hard : step.run ? RUN_PACES.runwalk : RUN_PACES.easy;
    if (!ref) return step.zone === 'hard' ? { cue: 'effort 8 sur 10 : tu ne peux dire que quelques mots', mid: 10 } : { cue: 'allure où tu peux parler en phrases (sur tapis : essaie 7 à 8 km/h)', mid: 7.5 };
    const a = speedAt(ref.vdot, p[0]), b = speedAt(ref.vdot, p[1]);
    return { ...span(a, b), cue: step.zone === 'hard' ? 'dur mais régulier, la même vitesse aux 4 efforts' : 'tu peux parler en phrases', mid: (a + b) / 2 };
  }
  if (kind === 'walk') {
    if (step.zone === 'calm') return { ...span(Math.max(3.5, r1(walkV - 1)), r1(walkV - 0.5)), cue: 'marche tranquille', mid: walkV - 0.75 };
    return { ...span(r1(walkV), r1(walkV + 0.5)), cue: 'au moins 100 pas par minute (25 pas en 15 s)', mid: walkV + 0.25 };
  }
  const rpe = { calm: 'effort 2 sur 10', rest: 'effort 2-3 sur 10, tu reprends ton souffle', easy: 'effort 3-4 sur 10 : tu peux parler en phrases', hard: 'effort 8 sur 10 : seulement quelques mots' };
  return { cue: rpe[step.zone] || rpe.easy };
}
const fmtKm = km => String(Math.round(km * 10) / 10).replace('.', ',');

// ---- Le cœur comme un muscle : minutes « cœur » par semaine ----
// Intensité d'une activité d'après sa dépense enregistrée (calories NETTES, donc MET brut = kcal / (kg × h) + 1) :
// modéré dès 3 MET, intense dès 6 MET (seuils de l'OMS et de l'ACSM). En dessous de 3 MET (marche lente) : pas compté.
export function entryHeart(e, userWeightKg) {
  if (!e || !e.quest || e.quest.type !== 'cardio') return null;
  const dur = Number(e.durationMin) || (e.quest.unit === 'min' ? Number(e.value) || 0 : 0);
  if (dur <= 0) return null;
  const w = Math.max(30, Number(userWeightKg) || 75);
  const kcal = Number(e.calories) || 0;
  const met = kcal > 0 ? kcal / (w * dur / 60) + 1 : 4;
  const level = met >= 6 ? 'vigorous' : met >= 3 ? 'moderate' : 'light';
  return { dur, met: Math.round(met * 10) / 10, level, points: level === 'vigorous' ? dur * 2 : level === 'moderate' ? dur : 0 };
}

export function heartWeek(state, weekStart) {
  const end = addDaysISO(weekStart, 6);
  let moderate = 0, vigorous = 0, sessions = 0;
  getAllEntries(state).forEach(e => {
    if (!e.date || e.date < weekStart || e.date > end) return;
    const h = entryHeart(e, state.userWeightKg);
    if (!h || h.level === 'light') return;
    sessions++;
    if (h.level === 'vigorous') vigorous += h.dur; else moderate += h.dur;
  });
  return { moderate: Math.round(moderate), vigorous: Math.round(vigorous), points: Math.round(moderate + 2 * vigorous), sessions };
}

/** Repère de la semaine en minutes « cœur » (1 min intense = 2) : 150 (OMS), 250 pour perdre du poids (ACSM 2009). */
export function heartTarget(state) {
  const c = getCardioSettings(state);
  const weight = c.on ? c.goal === 'weight' : cardioGoalFromMain(state) === 'weight';
  return weight ? { min: 150, good: 250, max: 300, why: 'perte de poids : plus de 250 min par semaine (ACSM 2009)' } : { min: 75, good: 150, max: 300, why: '150 à 300 min par semaine (OMS 2020)' };
}

/** « Muscle » cœur pour la page Équilibre : moyenne des 4 dernières semaines complètes + semaine en cours. */
export function heartBalance(state, today) {
  const ws = getWeekStart(today);
  const weeks = [1, 2, 3, 4].map(k => heartWeek(state, addDaysISO(ws, -7 * k)));
  const avg = Math.round(weeks.reduce((s, w) => s + w.points, 0) / 4);
  const now = heartWeek(state, ws);
  const band = heartTarget(state);
  const ref = Math.max(avg, now.points); // une bonne semaine en cours compte tout de suite
  const status = ref === 0 ? 'none' : ref < band.min ? 'low' : ref < band.good ? 'mid' : 'good';
  return { avg, week: now, band, status, missing: Math.max(0, band.good - now.points) };
}

// ---- Séances proposées ----
// Course débutant : alternance course / marche (inspirée du programme NHS Couch to 5K), un palier toutes les 3 séances réussies.
export const RUNWALK_STAGES = [
  { run: 1, walk: 1.5, reps: 8 },
  { run: 1.5, walk: 2, reps: 6 },
  { run: 2, walk: 2, reps: 6 },
  { run: 3, walk: 1.5, reps: 5 },
  { run: 5, walk: 2, reps: 3 },
  { run: 8, walk: 2, reps: 2 },
  { run: 10, walk: 2, reps: 2 },
  { run: 20, walk: 0, reps: 1 },
  { run: 25, walk: 0, reps: 1 },
];

function planEntries(state, type) {
  return getAllEntries(state).filter(e => e.cardioPlan && e.cardioPlan.type === type).sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

/** Palier d'alternance course / marche : +1 après 3 séances du palier faites sans ressenti « dur » (RPE ≤ 7). */
export function runwalkStage(state) {
  const done = planEntries(state, 'runwalk');
  let stage = 0, ok = 0;
  done.forEach(e => {
    const s = Number(e.cardioPlan.stage) || 0;
    if (s < stage) return;
    if (s > stage) { stage = s; ok = 0; }
    if ((Number(e.rpe) || 7) <= 7) ok++;
    if (ok >= 3) { stage = Math.min(RUNWALK_STAGES.length - 1, stage + 1); ok = 0; }
  });
  return stage;
}
/** La personne court déjà 20 min d'affilée (déclaré, ou palier final de l'alternance atteint). */
export const canRun = state => getCardioSettings(state).runner || runwalkStage(state) >= RUNWALK_STAGES.length - 2;

const r1 = x => Math.round(x * 10) / 10;
function stepsFor(type, minutes, stage) {
  const warm = [{ label: 'Échauffement', min: 5, zone: 'calm' }];
  const cool = [{ label: 'Retour au calme', min: 5, zone: 'calm' }];
  if (type === 'interval') {
    const reps = [];
    for (let i = 0; i < 4; i++) {
      reps.push({ label: `Effort ${i + 1}/4`, min: 4, zone: 'hard' });
      if (i < 3) reps.push({ label: 'Récupération active', min: 3, zone: 'rest' });
    }
    return [{ label: 'Échauffement', min: 10, zone: 'easy' }, ...reps, ...cool];
  }
  if (type === 'runwalk') {
    const st = RUNWALK_STAGES[stage] || RUNWALK_STAGES[0];
    const reps = [];
    for (let i = 0; i < st.reps; i++) {
      reps.push({ label: st.reps > 1 ? `Course ${i + 1}/${st.reps}` : 'Course continue', min: st.run, zone: 'easy', run: true });
      if (st.walk && i < st.reps - 1) reps.push({ label: 'Marche', min: st.walk, zone: 'calm' });
    }
    return [...warm, ...reps, ...cool];
  }
  const main = Math.max(5, minutes - 10);
  return [...warm, { label: type === 'long' ? 'Sortie longue' : 'Effort continu', min: main, zone: 'easy' }, ...cool];
}

const TYPE_LABEL = { easy: 'Endurance facile', long: 'Sortie longue', interval: 'Fractionné 4 × 4 min', runwalk: 'Course et marche' };
const TYPE_WHY = {
  easy: 'Le gros du travail du cœur se fait à allure facile (Stöggl 2014) ; chaque minute compte pour ton repère de la semaine (OMS 2020).',
  long: 'Une sortie plus longue par semaine fait progresser l’endurance ; elle reste à allure facile.',
  interval: '4 efforts de 4 min, durs mais réguliers : c’est ce qui a le plus amélioré la VO2max (Helgerud 2007), et pour la perte de poids il fait autant que le continu en moins de temps (Wewege 2017). En course, la vitesse vient de ton temps de référence (allure « I » de Daniels).',
  runwalk: 'Alternance course / marche pour commencer sans te blesser (comme le programme NHS Couch to 5K) : le coach allonge la course toutes les 3 séances réussies.',
};

/** Types de séances de la semaine selon l'objectif (surtout facile ; un fractionné si la personne peut courir ou a une machine). */
export function cardioWeekTypes(state) {
  const c = getCardioSettings(state);
  const n = c.perWeek;
  const hardOk = canRun(state) ? c.kinds.some(k => k !== 'walk') : c.kinds.some(k => ['bike', 'rower', 'elliptical'].includes(k));
  const out = [];
  if (c.goal === 'endurance') {
    if (hardOk && n >= 2) out.push('interval');
    if (n >= 3) out.push('long');
  } else if (c.goal === 'weight') {
    if (hardOk && n >= 3) out.push('interval');
    if (n >= 4) out.push('long');
  }
  while (out.length < n) out.push('easy');
  return out;
}

// activité d'une séance : rotation des activités choisies ; fractionné sur une activité qui le permet
function kindFor(state, type, k) {
  const c = getCardioSettings(state);
  if (type === 'interval') {
    const pref = canRun(state) ? ['run', 'bike', 'rower', 'elliptical'] : ['bike', 'rower', 'elliptical'];
    return pref.find(x => c.kinds.includes(x)) || c.kinds[0];
  }
  const list = type === 'long' && c.kinds.includes('run') && canRun(state) ? ['run'] : c.kinds;
  return list[k % list.length];
}

/** Construit une séance de cardio (étapes chronométrées, zone, pourquoi). */
export function cardioSession(state, type, iso, k = 0) {
  const c = getCardioSettings(state);
  const age = Number((getCoachSettings(state).profile || {}).age) || 0;
  let kind = kindFor(state, type, k);
  let tp = type;
  if (kind === 'run' && !canRun(state) && tp !== 'interval') tp = 'runwalk';
  const minutes = tp === 'long' ? Math.round(c.minutes * 1.5) : c.minutes;
  const stage = tp === 'runwalk' ? runwalkStage(state) : 0;
  const ref = kind === 'run' ? runRef(state, iso) : null;
  const walkV = walkSpeed(state);
  const steps = stepsFor(tp, minutes, stage).map(s => {
    const target = stepTarget(s, kind, ref, walkV);
    const km = target.mid && ['run', 'walk'].includes(kind) ? (target.mid * s.min) / 60 : 0;
    return { ...s, min: r1(s.min), target, km: Math.round(km * 100) / 100 };
  });
  const total = Math.round(steps.reduce((s, x) => s + x.min, 0));
  const distanceKm = Math.round(steps.reduce((s, x) => s + x.km, 0) * 10) / 10;
  const K = kindOf(kind);
  return {
    ref, distanceKm, distanceText: distanceKm ? `≈ ${fmtKm(distanceKm)} km` : '',
    iso, type: tp, kind, stage, catalogId: K.catalogId, icon: K.icon,
    title: tp === 'runwalk' ? TYPE_LABEL.runwalk : `${TYPE_LABEL[tp]} · ${K.label.toLowerCase()}`,
    minutes: total, steps, why: TYPE_WHY[tp],
    zones: [...new Set(steps.map(s => s.zone))].filter(z => z !== 'calm').map(z => ({ zone: z, label: ZONES[z].label, text: zoneText(z, age) })),
  };
}

// séances de cardio faites ce jour-là (n'importe quelle activité cardio d'au moins 10 min, d'intensité modérée ou plus)
function cardioDoneDays(state) {
  const out = {};
  getAllEntries(state).forEach(e => {
    const h = entryHeart(e, state.userWeightKg);
    if (!h || h.level === 'light' || h.dur < 10 || !e.date) return;
    (out[e.date] = out[e.date] || []).push(e.cardioPlan ? e.cardioPlan.type : 'easy');
  });
  return out;
}

/**
 * Séances de cardio de la semaine (lundi → dimanche). gymDays = jours de muscu prévus ou faits (planning du coach).
 * Placement : d'abord les jours sans muscu ni sport, bien espacés ; le fractionné et la sortie longue jamais la veille
 * d'un match ou d'un sport (jambes fraîches, comme pour la muscu) ; sinon le même jour que la muscu, après elle
 * (Schumann 2022 : pas de frein sur la force ni le muscle).
 */
/** Mode du catalogue (course, marche, vélo…) → type de cardio du coach. */
export function kindFromMode(mode) {
  const m = String(mode || '');
  if (/bike|velo|cycl|spin/.test(m)) return 'bike';
  if (/row|rame/.test(m)) return 'rower';
  if (/ellip/.test(m)) return 'elliptical';
  if (/run|interval|trail|course/.test(m)) return 'run';
  return 'walk';
}

/** Séance de cardio dictée par la personne (« Prochaine séance » de la dictée) : exactement ce qu'elle a demandé. */
export function customCardioSession(x) {
  const km = Number(x.distanceKm) || 0;
  const min = Math.max(1, Math.round(Number(x.minutes) || 30));
  const fmt = v => String(Math.round(v * 10) / 10).replace('.', ',');
  return {
    iso: x.iso, type: 'custom', kind: kindFromMode(x.cardioMode), catalogId: x.catalogId, icon: x.icon || '🏃',
    title: x.name || 'Cardio', minutes: min, distanceKm: km, distanceText: km ? `${fmt(km)} km` : '', custom: true, customId: x.id,
    steps: [{ label: x.name || 'Cardio', min, zone: 'easy', km, target: { text: km ? `${fmt(km)} km en ${min} min` : `${min} min`, cue: 'comme tu l’as prévu' } }],
    why: 'Ta séance, dictée par toi : le coach la reprend telle quelle.', zones: [],
  };
}

export function cardioPlanWeek(state, weekStart, today, gymDays = []) {
  const c = getCardioSettings(state);
  const coachS = getCoachSettings(state);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
  const doneDays = cardioDoneDays(state);
  // séances dictées de la semaine, pas encore faites
  const customs = (coachS.cardioCustom || []).filter(x => x && weekDays.includes(x.iso) && x.iso >= today && !doneDays[x.iso]).map(customCardioSession);
  if (!c.on) return { on: false, sessions: customs, done: [] };
  const coach = getCoachSettings(state);
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
  const doneMap = cardioDoneDays(state);
  const done = days.filter(d => doneMap[d]).map(d => ({ iso: d, types: doneMap[d] }));
  let types = cardioWeekTypes(state);
  done.forEach(d => d.types.forEach(t => {
    const i = types.indexOf(t) >= 0 ? types.indexOf(t) : types.indexOf('easy') >= 0 ? types.indexOf('easy') : types.length - 1;
    if (i >= 0) types.splice(i, 1);
  }));
  const gym = new Set(gymDays);
  // jours choisis par la personne : seulement eux (le cardio n'est alors jamais mis ailleurs)
  const cand = days.filter(d => d >= today && !doneMap[d]).map(d => ({ iso: d, info: coachDayInfo(d, coach) })).filter(x => !x.info.isMatch && !x.info.isVolley && (!c.days.length || c.days.includes(x.info.dow)));
  const chosen = [];
  const taken = [...done.map(d => d.iso)];
  // fractionné et sortie longue d'abord (ils ont le plus de contraintes)
  const order = types.slice().sort((a, b) => (a === 'easy' ? 1 : 0) - (b === 'easy' ? 1 : 0));
  order.forEach(t => {
    const hard = t !== 'easy';
    const options = cand.filter(x => !chosen.some(c2 => c2.iso === x.iso) && (!hard || x.info.legsOk));
    if (!options.length) return;
    const score = x => {
      const gap = taken.length ? Math.min(...taken.map(d => Math.abs(coachDaysBetween(d, x.iso)))) : 3;
      return (gym.has(x.iso) ? 0 : 10) + Math.min(gap, 3) * 3 - coachDaysBetween(weekStart, x.iso) * 0.1;
    };
    const best = options.slice().sort((a, b) => score(b) - score(a))[0];
    chosen.push({ iso: best.iso, type: t, withGym: gym.has(best.iso) });
    taken.push(best.iso);
  });
  chosen.sort((a, b) => a.iso.localeCompare(b.iso));
  const planned = chosen.map((x, k) => ({ ...cardioSession(state, x.type, x.iso, k + done.length), withGym: x.withGym }));
  // une séance dictée remplace celle que le coach avait prévue le même jour
  const sessions = [...planned.filter(p => !customs.some(cu => cu.iso === p.iso)), ...customs.map(cu => ({ ...cu, withGym: gym.has(cu.iso) }))]
    .sort((a, b) => a.iso.localeCompare(b.iso));
  return { on: true, sessions, done, shortfall: Math.max(0, types.length - chosen.length) };
}

// ---- Enregistrer une séance de cardio guidée ----
/**
 * Ajoute l'entrée dans l'exercice cardio de l'activité (créé s'il n'existe pas). Sans distance saisie, elle est estimée
 * d'après une allure habituelle de l'activité (marche 5,5 km/h, course facile 8,5 km/h…), pour les calories ACSM.
 * calc = calculateCardioCalories (injecté pour garder ce module sans dépendance aux calories).
 */
export function applyCardioSession(state, session, { durationMin, distanceKm, rpe = 6, date, catalog, calc }) {
  const cat = catalog.find(x => x.id === session.catalogId);
  if (!cat) return { state, entry: null };
  const dur = Math.max(1, Math.round(Number(durationMin) || session.minutes));
  const K = kindOf(session.kind);
  const usesDist = cat.unit === 'km' || ['walk', 'run', 'incline_walk', 'interval'].includes(cat.cardioMode);
  let dist = Number(distanceKm) || 0;
  let estimated = false;
  if (usesDist && dist <= 0) {
    // allure moyenne de la séance : marche pendant les pauses de l'alternance, plus vite pendant les efforts
    const speedOf = s => (s.target && s.target.mid && ['run', 'walk'].includes(session.kind) ? s.target.mid : s.zone === 'calm' || s.zone === 'rest' ? (session.kind === 'run' ? 5 : (K.speed || 5.5) * 0.8) : s.zone === 'hard' ? (K.speed || 8.5) * 1.25 : session.type === 'runwalk' && s.run ? 7.5 : K.speed || 5.5);
    const planned = session.steps.reduce((s, x) => s + x.min, 0) || dur;
    dist = Math.round(session.steps.reduce((s, x) => s + speedOf(x) * x.min / 60, 0) * (dur / planned) * 100) / 100;
    estimated = true;
  }
  const calories = calc({ cardioMode: cat.cardioMode, distanceKm: dist, durationMin: dur, elevationM: 0, rpe, userWeightKg: state.userWeightKg });
  const value = cat.unit === 'min' ? dur : dist;
  const entry = {
    id: `h_cardio_${Date.now()}`,
    date, value, durationMin: dur, ...(cat.unit === 'km' ? { distanceKm: dist } : {}), ...(estimated ? { estimated: true } : {}), rpe, calories, goalBeaten: false,
    cardioPlan: { type: session.type, stage: session.stage || 0, kind: session.kind },
    note: `${session.title} (coach)${cat.unit === 'km' ? ` : ${dist} km${estimated ? ' estimés' : ''} en ${dur} min` : ` : ${dur} min`}`,
  };
  let found = false;
  const quests = (state.quests || []).map(q => {
    if (q.catalogId !== cat.id) return q;
    found = true;
    return { ...q, currentValue: Math.max(Number(q.currentValue) || 0, value), durationMin: dur, history: [...(q.history || []), entry] };
  });
  if (!found) {
    quests.push({
      id: `q_${cat.id}_${Date.now()}`, catalogId: cat.id, name: cat.name, category: cat.category || 'Course & Cardio', type: 'cardio',
      cardioMode: cat.cardioMode || 'run', unit: cat.unit, level: 1, icon: cat.icon, startValue: value, currentValue: value,
      goalValue: Math.max(cat.defaultGoal || 10, Math.round(value * 1.5)), durationMin: dur, history: [entry],
    });
  }
  return { state: { ...state, quests }, entry };
}

/** Ligne pour le coach intelligent (contexte). */
export function cardioLine(state, today) {
  const c = getCardioSettings(state);
  const hb = heartBalance(state, today);
  const base = `Cœur (cardio) : ${hb.week.points} min « cœur » cette semaine (modéré ${hb.week.moderate} min, intense ${hb.week.vigorous} min), moyenne ${hb.avg}/sem., repère ${hb.band.good}.`;
  if (!c.on) return `${base} Cardio du coach : désactivé.`;
  const ref = runRef(state, today);
  const refTxt = ref ? ` Référence course : ${ref.km} km en ${Math.round(ref.min * 10) / 10} min (VDOT ${ref.vdot}, facile ${speedAt(ref.vdot, RUN_PACES.easy[0])}-${speedAt(ref.vdot, RUN_PACES.easy[1])} km/h, fractionné ${speedAt(ref.vdot, RUN_PACES.hard[0])}-${speedAt(ref.vdot, RUN_PACES.hard[1])} km/h).` : ' Pas de temps de référence en course.';
  const DN = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const daysTxt = c.days.length ? ` Jours de cardio choisis : ${c.days.map(d => `${DN[d]} (${d === 0 ? 7 : d})`).join(', ')}.` : ' Jours de cardio : choisis par l’appli (de préférence sans muscu ni sport).';
  let nextTxt = '';
  try {
    const ws = getWeekStart(today);
    const up = [0, 7].flatMap(k => { const w0 = addDaysISO(ws, k); const wk = coachPlanWeek(state, w0, today); return cardioPlanWeek(state, w0, today, wk.days.filter(d => d.gym).map(d => d.iso)).sessions; }).slice(0, 6);
    nextTxt = ` Prochaines séances de cardio prévues par l'appli avec ces réglages : ${up.length ? up.map(s => `${DN[new Date(`${s.iso}T00:00:00`).getDay()]} ${s.iso} (${s.title}, ${s.minutes} min)`).join(', ') : 'aucune'}.`;
  } catch (e) { /* rien */ }
  return `${base}${refTxt}${daysTxt}${nextTxt} Cardio du coach : objectif ${(CARDIO_GOALS.find(g => g.id === c.goal) || {}).label}, ${c.perWeek} séance(s) de ${c.minutes} min, activités ${c.kinds.map(k => kindOf(k).label).join(', ')}, ${canRun(state) ? 'court déjà 20 min' : `alternance course/marche palier ${runwalkStage(state) + 1}/${RUNWALK_STAGES.length}`}.`;
}
