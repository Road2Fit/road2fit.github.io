// Import d'un historique exporté de Hevy ou de Strong (fichier CSV) : séances, séries, charges.
// Hevy : title, start_time, exercise_title, set_index, set_type, weight_kg (ou weight_lbs), reps, duration_seconds, rpe…
// Strong : Date, Workout Name, Exercise Name, Set Order, Weight, Reps, Seconds, RPE… (poids dans l'unité réglée dans Strong).
// Les noms anglais sont reconnus par une table des noms standard de ces applis, puis par les alias de la dictée.
import { EXERCISE_CATALOG } from '../data/catalog';
import { VOICE_DICTIONARY } from '../voice/dictionary';
import { stripAccents } from './text';

const norm = s => stripAccents(String(s || '').toLowerCase()).replace(/[-_/]/g, ' ').replace(/\s+/g, ' ').trim();

// Noms standard Hevy / Strong (« Exercice (Matériel) ») → identifiant du catalogue
const EN = {
  'bench press (barbell)': 'bench_press', 'bench press': 'bench_press', 'bench press (dumbbell)': 'fp_db_bench', 'bench press (smith machine)': 'fp_smith_bench',
  'incline bench press (barbell)': 'fp_incline_barbell', 'incline bench press (dumbbell)': 'incline_dumbbell', 'incline bench press (smith machine)': 'fp_smith_incline',
  'decline bench press (barbell)': 'fp_decline_barbell', 'close grip bench press': 'fp_close_grip_bench', 'close grip bench press (barbell)': 'fp_close_grip_bench',
  'chest press (machine)': 'fp_chest_press', 'chest fly (dumbbell)': 'fp_db_fly', 'incline chest fly (dumbbell)': 'fp_incline_fly', 'butterfly (pec deck)': 'fp_pec_deck', 'chest fly (machine)': 'fp_pec_deck', 'pec deck': 'fp_pec_deck',
  'cable fly crossovers': 'fp_cable_fly', 'cable crossover': 'fp_cable_fly', 'chest fly (cable)': 'fp_cable_fly', 'push up': 'pushups', 'diamond push up': 'fp_diamond_pushups', 'decline push up': 'fp_decline_pushups',
  'chest dip': 'dips', 'triceps dip': 'dips', 'dip': 'dips', 'dips': 'dips', 'chest dip (assisted)': 'fp_assisted_dip', 'bench dip': 'fp_bench_dips',
  'squat (barbell)': 'squat', 'back squat': 'squat', 'squat': 'squat', 'front squat (barbell)': 'fp_front_squat', 'front squat': 'fp_front_squat', 'squat (smith machine)': 'fp_smith_squat', 'smith machine squat': 'fp_smith_squat',
  'goblet squat': 'fp_goblet', 'goblet squat (kettlebell)': 'fp_goblet', 'goblet squat (dumbbell)': 'fp_goblet', 'hack squat': 'fp_hack_squat', 'hack squat (machine)': 'fp_hack_squat', 'belt squat (machine)': 'fp_belt_squat',
  'bulgarian split squat': 'fp_bulgarian', 'bulgarian split squat (dumbbell)': 'fp_bulgarian', 'leg press': 'leg_press', 'leg press (machine)': 'leg_press', 'leg press horizontal (machine)': 'fp_leg_press_h',
  'leg extension (machine)': 'fp_leg_ext', 'leg extension': 'fp_leg_ext', 'seated leg curl (machine)': 'fp_leg_curl_seat', 'lying leg curl (machine)': 'fp_leg_curl_lying', 'leg curl (machine)': 'fp_leg_curl_seat', 'standing leg curl (machine)': 'fp_standing_leg_curl',
  'standing calf raise': 'fp_calf_standing', 'standing calf raise (machine)': 'fp_calf_standing', 'seated calf raise': 'fp_calf_seated', 'seated calf raise (machine)': 'fp_calf_seated', 'calf press on leg press': 'fp_calf_press', 'calf press (machine)': 'fp_calf_press',
  'walking lunge (dumbbell)': 'fp_walking_lunge', 'lunge (dumbbell)': 'fp_walking_lunge', 'walking lunge': 'fp_walking_lunge', 'lunge (barbell)': 'fp_barbell_lunge', 'step up': 'fp_step_up', 'step up (dumbbell)': 'fp_step_up',
  'hip abduction (machine)': 'fp_abductors', 'hip adduction (machine)': 'fp_adductors', 'hip thrust (barbell)': 'fp_hip_thrust_bar', 'hip thrust': 'fp_hip_thrust_bar', 'hip thrust (machine)': 'fp_hip_thrust_machine', 'glute bridge': 'fp_glute_bridge', 'glute kickback (cable)': 'fp_glute_kickback',
  'deadlift (barbell)': 'deadlift', 'deadlift': 'deadlift', 'conventional deadlift': 'deadlift', 'romanian deadlift (barbell)': 'fp_rdl', 'romanian deadlift (dumbbell)': 'fp_rdl', 'romanian deadlift': 'fp_rdl', 'stiff leg deadlift (barbell)': 'fp_rdl',
  'sumo deadlift (barbell)': 'fp_sumo', 'sumo deadlift': 'fp_sumo', 'trap bar deadlift': 'fp_trapbar', 'good morning (barbell)': 'fp_good_morning', 'back extension': 'fp_back_extension', 'back extension (hyperextension)': 'fp_back_extension', 'hyperextension': 'fp_back_extension',
  'overhead press (barbell)': 'overhead_press', 'overhead press': 'overhead_press', 'strict military press (barbell)': 'overhead_press', 'military press': 'overhead_press', 'shoulder press (barbell)': 'overhead_press',
  'overhead press (dumbbell)': 'fp_db_shoulder', 'shoulder press (dumbbell)': 'fp_db_shoulder', 'seated overhead press (dumbbell)': 'fp_db_shoulder', 'shoulder press (machine)': 'fp_machine_shoulder', 'shoulder press (machine plates)': 'fp_hammer_shoulder', 'overhead press (smith machine)': 'fp_smith_shoulder', 'arnold press (dumbbell)': 'fp_arnold',
  'lateral raise (dumbbell)': 'fp_lateral_db', 'lateral raise': 'fp_lateral_db', 'lateral raise (machine)': 'fp_lateral_machine', 'lateral raise (cable)': 'fp_lateral_cable', 'front raise (dumbbell)': 'fp_front_raise',
  'reverse fly (dumbbell)': 'fp_rear_fly_db', 'rear delt reverse fly (dumbbell)': 'fp_rear_fly_db', 'reverse fly (machine)': 'fp_reverse_pec_deck', 'rear delt reverse fly (machine)': 'fp_reverse_pec_deck', 'face pull (cable)': 'fp_face_pull', 'face pull': 'fp_face_pull', 'upright row (barbell)': 'fp_upright_row',
  'shrug (barbell)': 'fp_shrugs_bar', 'shrug (dumbbell)': 'fp_shrugs_db', 'shrug (machine)': 'fp_shrug_machine',
  'pull up': 'pullups', 'pull up (weighted)': 'pullups', 'pullup': 'pullups', 'chin up': 'chinups', 'chin up (weighted)': 'chinups', 'pull up (assisted)': 'fp_assisted_pullup', 'assisted pull up': 'fp_assisted_pullup',
  'lat pulldown (cable)': 'lat_pulldown', 'lat pulldown (machine)': 'fp_hammer_pulldown', 'lat pulldown': 'lat_pulldown', 'lat pulldown close grip (cable)': 'fp_close_pulldown', 'straight arm pulldown (cable)': 'fp_straight_arm_pd',
  'seated cable row': 'fp_seated_row', 'seated row (cable)': 'fp_seated_row', 'seated cable row v grip (cable)': 'fp_seated_row', 'seated row (machine)': 'fp_low_row_machine', 'iso lateral row (machine)': 'fp_hammer_row',
  'bent over row (barbell)': 'barbell_row', 'barbell row': 'barbell_row', 'pendlay row (barbell)': 'barbell_row', 'bent over row (dumbbell)': 'fp_db_row', 'dumbbell row': 'fp_db_row', 'single arm row (dumbbell)': 'fp_db_row', 't bar row': 'fp_tbar_row', 'inverted row': 'fp_inverted_row', 'pullover (dumbbell)': 'fp_db_pullover', 'pullover (machine)': 'fp_pullover_machine',
  'bicep curl (barbell)': 'barbell_curl', 'barbell curl': 'barbell_curl', 'ez bar biceps curl': 'barbell_curl', 'bicep curl (ez bar)': 'barbell_curl', 'bicep curl (dumbbell)': 'fp_db_curl', 'dumbbell curl': 'fp_db_curl', 'hammer curl (dumbbell)': 'fp_hammer_curl', 'hammer curl': 'fp_hammer_curl',
  'preacher curl (barbell)': 'fp_preacher_bar', 'preacher curl (ez bar)': 'fp_preacher_bar', 'preacher curl (machine)': 'fp_preacher_machine', 'bicep curl (cable)': 'fp_cable_curl', 'cable curl': 'fp_cable_curl', 'concentration curl': 'fp_concentration_curl', 'incline curl (dumbbell)': 'fp_incline_curl', 'bicep curl (machine)': 'fp_biceps_machine',
  'triceps pushdown': 'fp_pushdown_bar', 'triceps rope pushdown': 'fp_pushdown', 'tricep pushdown (cable)': 'fp_pushdown_bar', 'triceps pushdown (cable straight bar)': 'fp_pushdown_bar', 'skullcrusher (barbell)': 'fp_skull', 'skullcrusher (ez bar)': 'fp_skull', 'skull crusher': 'fp_skull',
  'overhead triceps extension (cable)': 'fp_overhead_ext_cable', 'triceps extension (dumbbell)': 'fp_overhead_ext_db', 'overhead triceps extension (dumbbell)': 'fp_overhead_ext_db', 'triceps kickback (dumbbell)': 'fp_kickback', 'triceps extension (machine)': 'fp_triceps_machine', 'wrist curl (barbell)': 'fp_wrist_curl', 'wrist curl (dumbbell)': 'fp_wrist_curl',
  'crunch': 'crunches_floor', 'crunch (machine)': 'fp_ab_machine', 'cable crunch': 'cable_crunch', 'decline crunch': 'fp_decline_crunch', 'reverse crunch': 'fp_reverse_crunch', 'sit up': 'fp_situp', 'hanging leg raise': 'hanging_leg_raises', 'hanging knee raise': 'fp_captain_knee', 'knee raise (captain s chair)': 'fp_captain_knee',
  'leg raise': 'fp_leg_raise_floor', 'lying leg raise': 'fp_leg_raise_floor', 'plank': 'fp_plank', 'side plank': 'fp_side_plank', 'ab wheel': 'ab_wheel', 'toes to bar': 'fp_toes_to_bar', 'mountain climber': 'fp_mountain', 'burpee': 'fp_burpees', 'wall sit': 'fp_wall_sit', 'dead hang': 'fp_dead_hang',
  'clean and jerk': 'wl_clean_jerk', 'power clean': 'wl_power_clean', 'clean': 'wl_clean', 'hang clean': 'wl_hang_clean', 'snatch': 'wl_snatch', 'power snatch': 'wl_power_snatch', 'push press': 'wl_push_press', 'overhead squat': 'wl_overhead_squat', 'muscle up': 'cal_muscle_up', 'pistol squat': 'cal_pistol', 'woodchop (cable)': 'fp_woodchop', 'pallof press': 'fp_pallof',
};

const CATALOG = new Map(EXERCISE_CATALOG.map(c => [c.id, c]));
const BY_NAME = new Map(EXERCISE_CATALOG.map(c => [norm(c.name), c.id]));
const ALIASES = [];
VOICE_DICTIONARY.forEach(d => (d.aliases || []).forEach(a => { const n = norm(a); if (n.length >= 4 && CATALOG.has(d.id)) ALIASES.push([n, d.id]); }));
ALIASES.sort((a, b) => b[0].length - a[0].length);

/** Identifiant du catalogue pour un nom d'exercice de Hevy / Strong (ou null). */
export function matchExercise(name) {
  const n = norm(name);
  if (!n) return null;
  const direct = EN[n] || EN[n.replace(/\s*\(.*?\)\s*/g, ' ').trim()] || BY_NAME.get(n);
  if (direct && CATALOG.has(direct)) return direct;
  const hit = ALIASES.find(([a]) => new RegExp(`(^| )${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( |$)`).test(n));
  return hit ? hit[1] : null;
}

// ---- lecture du CSV (guillemets, virgule ou point-virgule) ----
export function parseCsv(text) {
  const src = String(text || '').replace(/^﻿/, '');
  const first = src.split(/\r?\n/, 1)[0] || '';
  const sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (q) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && src[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some(c => c !== '')) rows.push(row); row = []; }
    else cell += ch;
  }
  row.push(cell); if (row.some(c => c !== '')) rows.push(row);
  return rows;
}

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = n => String(n).padStart(2, '0');
/** Date AAAA-MM-JJ d'une date Hevy (« 15 Jan 2024, 18:30 ») ou Strong (« 2024-01-15 18:30:00 »). */
export function csvDate(s) {
  const t = String(s || '').trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4})/.exec(t);
  if (m && MONTHS[m[2].toLowerCase()]) return `${m[3]}-${pad(MONTHS[m[2].toLowerCase()])}-${pad(m[1])}`;
  m = /^([A-Za-z]{3})[a-z]* (\d{1,2}),? (\d{4})/.exec(t);
  if (m && MONTHS[m[1].toLowerCase()]) return `${m[3]}-${pad(MONTHS[m[1].toLowerCase()])}-${pad(m[2])}`;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(t);
  if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
  return null;
}
const numOf = s => { const v = parseFloat(String(s || '').replace(',', '.')); return Number.isFinite(v) ? v : 0; };

/** Lit un export Hevy / Strong. lbs : poids en livres (Strong réglé en lbs). Renvoie les séances par exercice reconnu. */
export function readWorkoutCsv(text, { lbs = false } = {}) {
  const rows = parseCsv(text);
  if (rows.length < 2) return { source: null, sessions: 0, exercises: [], unknown: [], sets: 0 };
  const head = rows[0].map(h => norm(h));
  const col = (...names) => { for (const n of names) { const i = head.indexOf(n); if (i >= 0) return i; } return -1; };
  const iDate = col('start time', 'date', 'workout date');
  const iEx = col('exercise title', 'exercise name', 'exercise');
  const iKg = col('weight kg', 'weight (kg)', 'poids', 'poids (kg)');
  const iLbs = col('weight lbs', 'weight (lbs)');
  const iW = col('weight');
  const iReps = col('reps', 'repetitions');
  const iSec = col('duration seconds', 'seconds', 'duration');
  const iType = col('set type');
  const iRpe = col('rpe');
  const source = head.includes('exercise title') ? 'Hevy' : head.includes('exercise name') ? 'Strong' : 'CSV';
  if (iDate < 0 || iEx < 0) return { source, sessions: 0, exercises: [], unknown: [], sets: 0, error: 'Colonnes « date » et « exercice » introuvables : est-ce bien un export Hevy ou Strong ?' };
  const byEx = new Map(); const unknown = new Set(); const days = new Set(); let sets = 0;
  rows.slice(1).forEach(r => {
    const date = csvDate(r[iDate]);
    const name = (r[iEx] || '').trim();
    if (!date || !name) return;
    if (iType >= 0 && /warm/i.test(r[iType] || '')) return; // échauffement : jamais compté
    const reps = Math.round(numOf(r[iReps]));
    const sec = Math.round(numOf(r[iSec]));
    let kg = iKg >= 0 ? numOf(r[iKg]) : iLbs >= 0 ? numOf(r[iLbs]) * 0.4536 : numOf(r[iW]) * (lbs ? 0.4536 : 1);
    kg = Math.round(kg * 4) / 4;
    if (!reps && !sec) return;
    const id = matchExercise(name);
    if (!id) { unknown.add(name); return; }
    if (!byEx.has(id)) byEx.set(id, new Map());
    const perDay = byEx.get(id);
    if (!perDay.has(date)) perDay.set(date, []);
    perDay.get(date).push({ reps, sec, kg, rpe: numOf(r[iRpe]) || 0 });
    days.add(date); sets++;
  });
  const exercises = [...byEx.entries()].map(([catalogId, perDay]) => ({ catalogId, name: CATALOG.get(catalogId).name, sessions: [...perDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, s]) => ({ date, sets: s })) }));
  return { source, sessions: days.size, exercises, unknown: [...unknown].sort(), sets };
}

/** Ajoute les séances lues à l'état : exercices créés si besoin, une entrée d'historique par exercice et par jour.
 *  Réimporter le même fichier ne crée pas de doublon (identifiant d'entrée stable). */
export function applyWorkoutImport(state, read, today, { makeQuest, afterHistory, calories } = {}) {
  let quests = [...(state.quests || [])];
  let added = 0; let created = 0;
  const w = Number(state.userWeightKg) || 80;
  read.exercises.forEach(ex => {
    const c = CATALOG.get(ex.catalogId);
    let q = quests.find(x => x.catalogId === ex.catalogId);
    if (!q) {
      q = makeQuest(c, { ...state, quests }, today, `importé de ${read.source}`).quest;
      // le point de départ de l'exercice = la première séance importée
      q = { ...q, history: (q.history || []).map(h => ({ ...h, date: ex.sessions[0].date })) };
      quests = [...quests, q];
      created++;
    }
    const timed = !!q.timed;
    const ids = new Set((q.history || []).map(h => h.id));
    const fresh = ex.sessions.map(s => {
      const id = `imp_${read.source}_${ex.catalogId}_${s.date}`;
      if (ids.has(id)) return null;
      const reps = s.sets.map(x => (timed ? x.sec || x.reps : x.reps || x.sec));
      const loads = s.sets.map(x => x.kg);
      const top = Math.max(...loads);
      const isKg = q.unit === 'kg';
      const assists = isKg ? null : loads.map(k => (k > 0 ? -k : 0)); // tractions lestées : le lest = aide négative
      const rpes = s.sets.map(x => x.rpe).filter(Boolean);
      const e = {
        id, date: s.date, value: isKg ? top : Math.max(...reps), sets: reps.length, reps: Math.max(...reps), setDetails: reps, validatedSets: reps.length,
        goalSets: reps.length, goalReps: Math.max(...reps), assistanceKg: assists ? Math.max(...assists) : 0,
        rpe: rpes.length ? Math.round(rpes.reduce((a, b) => a + b, 0) / rpes.length) : 7, rpeSet: rpes.length > 0, goalBeaten: false,
        note: `Importé de ${read.source}`,
        ...(isKg && new Set(loads).size > 1 ? { setLoads: loads } : {}),
        ...(assists && new Set(assists).size > 1 ? { setAssists: assists } : {}),
      };
      e.calories = calories ? Math.round(calories({ unit: q.unit, timed, weightKg: isKg ? top : 0, assistanceKg: e.assistanceKg, setDetails: reps, rpe: e.rpe, userWeightKg: w })) : 0;
      return e;
    }).filter(Boolean);
    if (!fresh.length) return;
    added += fresh.length;
    const updated = afterHistory(q, [...(q.history || []), ...fresh]);
    quests = quests.map(x => (x.id === q.id ? updated : x));
  });
  return { state: { ...state, quests }, added, created };
}
