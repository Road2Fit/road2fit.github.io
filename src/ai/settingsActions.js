// 4.54 (demande de Gabin : « le coach IA doit pouvoir modifier tous les paramètres de l'utilisateur, sans qu'il ait à
// fouiller dans l'appli ») : deux actions de plus, vérifiées champ par champ comme les autres (rien d'inconnu ne passe),
// appliquées seulement après « Appliquer ».
//  - settings : lieu et matériel, douleurs, séances à la maison, semaines allégées, périodisation, créneaux de salle, niveau,
//    vrai 1RM même débutant, son, pseudo ;
//  - exercise : mettre en pause / reprendre un exercice, noter un record réel, régler la charge ou l'aide du test de max.
import { HOME_EQUIPMENT, PLACES } from '../coach/equipment';
import { PAIN_MUSCLES, PAIN_ZONES, isSided, painLabel } from '../coach/pains';
import { LEVELS } from '../coach/experience';
import { PROFILES } from '../coach/profiles';
import { getCoachSettings } from '../coach/settings';
import { getWeekStart } from '../lib/dates';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const num = (v, a, b) => { const n = Number(v); return Number.isFinite(n) && n >= a && n <= b ? n : null; };
const dates = (v, today) => (Array.isArray(v) ? [...new Set(v.map(String).filter(d => ISO.test(d) && d >= today))].sort().slice(0, 60) : []);
const ZONES = new Set([...PAIN_ZONES.map(z => z.id), ...PAIN_MUSCLES.map(m => `m:${m.muscle}`)]);
const EQUIP = new Set(HOME_EQUIPMENT.map(e => e.id));
const fromAiDay = d => (d === 7 ? 0 : d); // 1 = lundi … 7 = dimanche → 0-6 de l'appli

/** Vérifie les champs de l'action settings ; renvoie seulement ceux qui sont valides (ou null si aucun). */
export function normalizeSettings(x, state, today) {
  if (!x || typeof x !== 'object') return null;
  const o = {};
  if (PLACES.some(p => p.id === x.place)) o.place = x.place;
  if (Array.isArray(x.equipment)) o.equipment = [...new Set(x.equipment.filter(e => EQUIP.has(e)))];
  if (Array.isArray(x.pains)) {
    o.pains = x.pains.filter(p => p && ZONES.has(p.zone)).slice(0, 12)
      .map(p => ({ zone: p.zone, side: isSided(p.zone) ? (p.side === 'left' || p.side === 'right' ? p.side : 'both') : null, since: today }));
  }
  if (x.homeDays && typeof x.homeDays === 'object') { const add = dates(x.homeDays.add, today), remove = dates(x.homeDays.remove, today); if (add.length || remove.length) o.homeDays = { add, remove }; }
  if (x.deloadWeeks && typeof x.deloadWeeks === 'object') {
    const wk = v => [...new Set(dates(v, getWeekStart(today)).map(getWeekStart))];
    const add = wk(x.deloadWeeks.add), remove = wk(x.deloadWeeks.remove);
    if (add.length || remove.length) o.deloadWeeks = { add, remove };
  }
  if (x.cycle && typeof x.cycle === 'object') {
    const w = num(x.cycle.weeks, 0, 12);
    const prof = Array.isArray(x.cycle.profiles) ? x.cycle.profiles.filter(p => has(PROFILES, p)).slice(0, 4) : null;
    if (w !== null) o.cycle = { weeks: Math.round(w), profiles: prof || [] };
  }
  if (x.gymSlots && typeof x.gymSlots === 'object' && !Array.isArray(x.gymSlots)) {
    const slots = {};
    for (const [k, v] of Object.entries(x.gymSlots)) {
      const d = num(k, 1, 7);
      if (d === null) continue;
      if (v === null) { slots[fromAiDay(d)] = null; continue; }
      if (v && HHMM.test(v.start) && HHMM.test(v.end) && v.end > v.start) slots[fromAiDay(d)] = { start: v.start, end: v.end };
    }
    if (Object.keys(slots).length) o.gymSlots = slots;
  }
  if (LEVELS.some(l => l.id === x.level)) o.level = x.level;
  if (typeof x.maxTest1rm === 'boolean') o.maxTest1rm = x.maxTest1rm;
  if (typeof x.sound === 'boolean') o.sound = x.sound;
  if (typeof x.name === 'string') { const n = x.name.replace(/\s+/g, ' ').trim().slice(0, 30); if (n) o.name = n; }
  return Object.keys(o).length ? o : null;
}

export function applySettings(state, o) {
  const c = getCoachSettings(state);
  const coach = { ...(state.coach || {}) };
  const top = {};
  if (o.place) coach.place = o.place;
  if (o.equipment) coach.equipment = o.equipment;
  if (o.pains) coach.pains = o.pains;
  if (o.homeDays) { const s = new Set(c.homeDays || []); o.homeDays.add.forEach(d => s.add(d)); o.homeDays.remove.forEach(d => s.delete(d)); coach.homeDays = [...s].sort(); }
  if (o.deloadWeeks) { const s = new Set(c.deloadWeeks || []); o.deloadWeeks.add.forEach(d => s.add(d)); o.deloadWeeks.remove.forEach(d => s.delete(d)); coach.deloadWeeks = [...s].sort(); }
  if (o.cycle) { coach.cycleWeeks = o.cycle.weeks; coach.cycleProfiles = o.cycle.profiles; coach.cycleStart = o.cycle.weeks ? c.cycleStart || getWeekStart(new Date().toISOString().slice(0, 10)) : null; }
  if (o.gymSlots) { const s = { ...(c.gymSlots || {}) }; for (const [d, v] of Object.entries(o.gymSlots)) { if (v === null) delete s[d]; else s[d] = v; } coach.gymSlots = s; }
  if (o.level) coach.experience = { ...(c.experience || {}), level: o.level };
  if (o.maxTest1rm !== undefined) coach.maxTest1rm = o.maxTest1rm;
  if (o.sound !== undefined) top.soundEnabled = o.sound;
  if (o.name) top.heroName = o.name;
  return { ...state, ...top, coach };
}

export function settingsLabel(o) {
  const bits = [];
  if (o.place) bits.push(`lieu : ${(PLACES.find(p => p.id === o.place) || {}).label}`);
  if (o.equipment) bits.push(`matériel : ${o.equipment.map(e => (HOME_EQUIPMENT.find(x => x.id === e) || {}).label).join(', ') || 'aucun'}`);
  if (o.pains) bits.push(`douleurs : ${o.pains.map(painLabel).join(', ') || 'aucune'}`);
  if (o.homeDays) bits.push(`à la maison ${[...o.homeDays.add.map(d => `+${d}`), ...o.homeDays.remove.map(d => `−${d}`)].join(' ')}`);
  if (o.deloadWeeks) bits.push(`semaine allégée ${[...o.deloadWeeks.add.map(d => `+${d}`), ...o.deloadWeeks.remove.map(d => `−${d}`)].join(' ')}`);
  if (o.cycle) bits.push(o.cycle.weeks ? `cycle de ${o.cycle.weeks} semaines` : 'pas de cycle');
  if (o.gymSlots) bits.push('créneaux de salle');
  if (o.level) bits.push(`niveau : ${(LEVELS.find(l => l.id === o.level) || {}).label}`);
  if (o.maxTest1rm !== undefined) bits.push(o.maxTest1rm ? 'vrai 1RM au test de max, même si c’est tôt' : 'test de max prudent (5 reps au début)');
  if (o.sound !== undefined) bits.push(o.sound ? 'son activé' : 'son coupé');
  if (o.name) bits.push(`pseudo : ${o.name}`);
  return `Réglages : ${bits.join(' ; ')}`.slice(0, 160);
}

// ---------- exercice ----------
export function normalizeExercise(x, state) {
  if (!x || typeof x !== 'object') return null;
  const q = (state.quests || []).find(z => z.id === x.questId);
  if (!q) return null;
  const o = { questId: q.id };
  if (typeof x.paused === 'boolean') o.paused = x.paused;
  if (x.record && typeof x.record === 'object') {
    if (q.unit === 'kg') { const kg = num(x.record.kg, 1, 600); if (kg) o.record = { kg }; }
    else { const e = num(x.record.extraKg, 0, 200); const a = num(x.record.assistKg, 0, 150); if (e !== null) o.record = { extraKg: e }; else if (a !== null) o.record = { assistKg: a }; }
  }
  if (has(x, 'maxTestLoad')) { const v = x.maxTestLoad === null ? null : num(x.maxTestLoad, 1, 600); if (v !== undefined && (v !== null || x.maxTestLoad === null)) o.maxTestLoad = v; }
  if (has(x, 'maxTestAssist')) { const v = x.maxTestAssist === null ? null : num(x.maxTestAssist, -150, 150); if (v !== null || x.maxTestAssist === null) o.maxTestAssist = v; }
  return Object.keys(o).length > 1 ? o : null;
}

export function applyExercise(state, o, today) {
  let maxRecords = state.maxRecords;
  if (o.record) maxRecords = { ...(state.maxRecords || {}), [o.questId]: { ...o.record, date: today } };
  return {
    ...state,
    maxRecords,
    quests: state.quests.map(q => {
      if (q.id !== o.questId) return q;
      let n = { ...q };
      if (o.paused !== undefined) n.paused = o.paused;
      if (has(o, 'maxTestLoad')) { if (o.maxTestLoad === null) delete n.maxTestLoad; else n.maxTestLoad = o.maxTestLoad; }
      if (has(o, 'maxTestAssist')) { if (o.maxTestAssist === null) delete n.maxTestAssist; else n.maxTestAssist = o.maxTestAssist; }
      return n;
    }),
  };
}

export function exerciseLabel(o, state) {
  const q = (state.quests || []).find(z => z.id === o.questId) || {};
  const bits = [];
  if (o.paused !== undefined) bits.push(o.paused ? 'en pause' : 'repris');
  if (o.record) bits.push(o.record.kg ? `record ${o.record.kg} kg` : o.record.extraKg !== undefined ? `record lesté +${o.record.extraKg} kg` : `record avec ${o.record.assistKg} kg d’aide`);
  if (has(o, 'maxTestLoad')) bits.push(o.maxTestLoad === null ? 'test de max : charge du coach' : `test de max à ${o.maxTestLoad} kg`);
  if (has(o, 'maxTestAssist')) bits.push(o.maxTestAssist === null ? 'test de max : aide du coach' : o.maxTestAssist > 0 ? `test de max avec ${o.maxTestAssist} kg d’aide` : o.maxTestAssist < 0 ? `test de max lesté +${-o.maxTestAssist} kg` : 'test de max sans aide');
  return `${q.name} : ${bits.join(', ')}`.slice(0, 160);
}

/** Ligne de contexte : valeurs actuelles des réglages que l'action settings peut changer. */
export function settingsLine(state) {
  const c = getCoachSettings(state);
  const slots = Object.entries(c.gymSlots || {}).map(([d, v]) => `${Number(d) === 0 ? 7 : d} ${v.start}-${v.end}`).join(', ');
  return `Réglages modifiables (action settings) : lieu ${c.place || 'gym'} ; matériel ${(c.equipment || []).join(', ') || 'aucun'} ; séances à la maison ${(c.homeDays || []).join(', ') || 'aucune'} ; semaines allégées ${(c.deloadWeeks || []).join(', ') || 'aucune'} ; cycle ${Number(c.cycleWeeks) ? `${c.cycleWeeks} semaines (${(c.cycleProfiles || []).join(' puis ') || 'semaine allégée'})` : 'aucun'} ; créneaux ${slots || 'aucun'} ; vrai 1RM forcé au test de max : ${c.maxTest1rm ? 'oui' : 'non'} ; son ${state.soundEnabled === false ? 'coupé' : 'activé'}.`;
}
