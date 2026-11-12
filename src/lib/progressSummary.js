// Bilan de progression (4.22) : ce qui a changé sur les 4 dernières semaines, en clair. Fonction pure, testée.
// Régularité : jours d'entraînement de musculation faits / prévus (séances par semaine × 4).
// Par exercice : la dernière séance de la période comparée à la dernière AVANT la période (sinon à la première de la période) ;
// charge en kg, répétitions de la meilleure série au poids du corps, secondes pour une tenue.
import { coachRealEntries, getCoachSettings } from '../coach/settings';
import { addDaysISO } from './dates';
import { isTimedQuest } from './quests';

const best = (q, e) => {
  if (q.unit === 'kg') return Number(e.value) || 0;
  const sets = Array.isArray(e.setDetails) && e.setDetails.length ? e.setDetails.map(Number) : [Number(e.reps) || Number(e.value) || 0];
  return Math.max(...sets, 0);
};
const fmt = v => String(Math.round(v * 10) / 10).replace('.', ',');

export function progressSummary(state, today, days = 28) {
  const from = addDaysISO(today, -(days - 1));
  const coach = getCoachSettings(state);
  const planned = Math.max(1, Number(coach.sessionsPerWeek) || 3) * Math.round(days / 7);
  const trained = new Set();
  const rows = [];
  (state.quests || []).filter(q => q.type === 'strength').forEach(q => {
    const es = coachRealEntries(q);
    const inWin = es.filter(e => e.date >= from && e.date <= today);
    inWin.forEach(e => trained.add(e.date));
    if (!inWin.length) return;
    const before = es.filter(e => e.date < from);
    const ref = before.length ? before[before.length - 1] : inWin[0];
    const last = inWin[inWin.length - 1];
    if (ref === last) return; // une seule séance : rien à comparer
    const a = best(q, ref), b = best(q, last);
    if (!(a > 0)) return;
    const unit = q.unit === 'kg' ? 'kg' : isTimedQuest(q) ? 's' : 'reps';
    rows.push({ id: q.id, name: q.name, icon: q.icon, unit, from: a, to: b, diff: Math.round((b - a) * 10) / 10, pct: (b - a) / a, sessions: inWin.length });
  });
  rows.sort((x, y) => y.pct - x.pct);
  const up = rows.filter(r => r.diff > 0), down = rows.filter(r => r.diff < 0), flat = rows.filter(r => r.diff === 0);
  const done = trained.size;
  const top = up[0] || null;
  const parts = [`${done} séance${done > 1 ? 's' : ''} sur ${planned} prévue${planned > 1 ? 's' : ''}`];
  if (top) parts.push(`+${fmt(top.diff)} ${top.unit === 'reps' && top.diff === 1 ? 'rep' : top.unit} sur ${top.name}`);
  return {
    days, from, done, planned, ratio: Math.min(1, done / planned),
    rows, up, down, flat,
    headline: parts.join(' · '),
    verdict: !done ? 'Pas de séance sur la période : la première compte double.' : done / planned >= 0.85 ? 'Très régulier : continue comme ça.' : done / planned >= 0.5 ? 'Régularité correcte : une séance de plus par semaine ferait la différence.' : 'Peu de séances : mieux vaut plus court, mais plus souvent.',
    text: r => `${fmt(r.from)} → ${fmt(r.to)} ${r.unit}`,
  };
}
