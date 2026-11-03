// « Raconte ton passé » : la personne raconte (souvent à l'oral) ce qu'elle a fait en musculation ; le coach intelligent
// (tâche « history ») en tire le niveau, l'ancienneté, l'arrêt, les blessures et les exercices avec leurs records.
// Ici : vérification de sa réponse (normalizeHistory) puis application après « Appliquer » (applyHistory).
import { callAi } from './client';
import { catalogText, dictationContext } from './context';
import { EXERCISE_CATALOG } from '../data/catalog';
import { detrainFactor, experienceCoachPatch, getExperience, LEVELS } from '../coach/experience';
import { METHODS } from '../coach/methods';
import { getCoachSettings } from '../coach/settings';
import { addKnownExercises } from '../lib/onboarding';
import { estimateOneRm } from '../lib/maxima';

const n = (v, lo, hi) => { const x = Number(v); return Number.isFinite(x) && x >= lo && x <= hi ? x : 0; };
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export async function aiHistory(state, text, today) {
  return callAi('history', { context: dictationContext(state, today), catalog: catalogText(), text: String(text).slice(0, 8000) });
}

/** Réponse du serveur → aperçu sûr (exercices existants, nouveaux du catalogue, non reconnus). */
export function normalizeHistory(data, state, today) {
  const d = data && typeof data === 'object' ? data : {};
  const quests = (state.quests || []).filter(q => q.type === 'strength');
  const seen = new Set();
  const rows = [];
  (Array.isArray(d.exercises) ? d.exercises : []).slice(0, 40).forEach(x => {
    if (!x || typeof x !== 'object') return;
    const best = x.best || {};
    const work = x.work || {};
    const row = {
      kg: Math.round(n(best.kg, 0, 500) * 2) / 2,
      reps: Math.round(n(best.reps, 0, 100)),
      date: ISO.test(String(x.bestDate || '')) && x.bestDate <= today ? x.bestDate : '',
      workSets: Math.round(n(work.sets, 0, 10)),
      workReps: Math.round(n(work.reps, 0, 50)),
      workKg: Math.round(n(work.kg, 0, 500) * 2) / 2,
    };
    const q = quests.find(y => y.id === x.questId);
    const c = !q && EXERCISE_CATALOG.find(y => y.id === x.catalogId && y.type === 'strength');
    const already = c && quests.find(y => y.catalogId === c.id);
    if (q || already) {
      const qq = q || already;
      if (seen.has(qq.id)) return;
      seen.add(qq.id);
      rows.push({ ...row, status: 'existing', questId: qq.id, name: qq.name, unit: qq.unit });
    } else if (c) {
      if (seen.has(c.id)) return;
      seen.add(c.id);
      rows.push({ ...row, status: 'new', catalogId: c.id, name: c.name, unit: c.unit });
    } else {
      const name = String(x.customName || '').trim().slice(0, 60);
      if (name) rows.push({ ...row, status: 'unknown', name });
    }
  });
  return {
    level: LEVELS.some(l => l.id === d.level) ? d.level : null,
    years: Math.round(n(d.years, 0, 60)),
    breakMonths: Math.round(n(d.breakMonths, 0, 120)),
    weeklySets: Math.round(n(d.weeklySets, 0, 40)),
    methods: (Array.isArray(d.methods) ? d.methods : []).filter(m => METHODS[m] && m !== 'straight'),
    limits: String(d.limits || '').replace(/\s+/g, ' ').trim().slice(0, 200),
    rows,
    summary: String(d.summary || '').trim().slice(0, 400),
    unclear: String(d.unclear || '').trim().slice(0, 200),
  };
}

/** Applique l'aperçu : niveau et fiche (fusionnés avec l'existant), records, exercices connus, nouveaux exercices. */
export function applyHistory(state, h, today) {
  const coach = getCoachSettings(state);
  const cur = getExperience(state) || {};
  const level = h.level || cur.level || null;
  let exp = null;
  if (level) {
    exp = { ...cur, level, breakMonths: h.breakMonths || cur.breakMonths || 0 };
    if (h.years) exp.years = h.years;
    if (h.weeklySets) exp.weeklySets = h.weeklySets;
    if (h.methods.length) exp.methods = [...new Set([...(cur.methods || []), ...h.methods])];
    if (h.limits) exp.limits = h.limits;
  }
  let next = { ...state, coach: { ...coach, ...(exp ? experienceCoachPatch(coach, exp, today) : {}) }, maxRecords: { ...(state.maxRecords || {}) } };
  // le patch ne retient les limites que pour un expert : on les garde aussi pour les autres niveaux
  if (h.limits && !(exp && exp.level === 'expert')) {
    const mem = (next.coach.memory || []).filter(m => !String(m.text || '').startsWith('Limites physiques : '));
    next.coach = { ...next.coach, memory: [...mem, { id: `m_lim_${today}`, text: `Limites physiques : ${h.limits}`, at: today }] };
  }
  const known = level === 'advanced' || level === 'expert';
  const existing = h.rows.filter(r => r.status === 'existing');
  next.quests = (next.quests || []).map(q => {
    const r = existing.find(x => x.questId === q.id);
    return r && known ? { ...q, known: true } : q;
  });
  existing.forEach(r => {
    if (r.unit !== 'kg' || !(r.kg > 0)) return;
    const one = r.reps > 1 ? (estimateOneRm(r.kg, r.reps) || { mean: r.kg }).mean : r.kg;
    const old = next.maxRecords[r.questId];
    if (!old || !(Number(old.kg) >= one)) next.maxRecords[r.questId] = { kg: Math.round(one * 10) / 10, date: r.date || today };
  });
  const fresh = h.rows.filter(r => r.status === 'new').map(r => ({ catalogId: r.catalogId, kg: r.kg || '', reps: r.reps || '', date: r.date, workSets: r.workSets, workReps: r.workReps, workKg: r.workKg }));
  next = addKnownExercises(next, fresh, today, { known, factor: detrainFactor(exp ? exp.breakMonths : 0), origin: 'ton passé raconté au coach' });
  return next;
}

/** Une ligne lisible pour l'aperçu. */
export function historyRowText(r) {
  const parts = [];
  if (r.kg > 0) parts.push(`${r.kg} kg × ${r.reps || 1}`);
  else if (r.reps > 0) parts.push(`${r.reps} répétitions`);
  if (r.date) parts.push(`le ${r.date.split('-').reverse().join('/')}`);
  if (r.workSets && r.workReps) parts.push(`séance type ${r.workSets} × ${r.workReps}${r.workKg ? ` à ${r.workKg} kg` : ''}`);
  return parts.join(' · ');
}
