// Résumé de profil partagé avec les amis (jamais le poids, les photos, les notes ni la sauvegarde complète).
// Construit sur l'appareil à partir des données, puis publié dans `profiles.summary` (voir docs/supabase-amis.sql).
import { arenaOf } from '../data/muscles';
import { RPG_RANKS } from '../data/gamification';
import { levelFromXp } from './levels';
import { estimateQuestMax } from './maxima';
import { computeCurrentStreak } from './stats';
import { getAllEntries, isTimedQuest } from './quests';
import { getWeekStart } from './dates';

const round1 = n => Math.round(n * 10) / 10;
const clip = (s, n = 60) => String(s || '').slice(0, n);

/** Séries d'une séance enregistrée, en texte court : « 4 × 8 à 60 kg », « 12 - 10 - 9 reps », « 3 × 45 s »… */
function describeEntry(e) {
  const q = e.quest;
  const sets = Array.isArray(e.setDetails) && e.setDetails.length ? e.setDetails.map(Number) : null;
  if (q.type === 'cardio') {
    const parts = [];
    if (q.unit === 'km' && Number(e.value) > 0) parts.push(`${round1(Number(e.value))} km`);
    if (Number(e.durationMin) > 0) parts.push(`${Math.round(Number(e.durationMin))} min`);
    return parts.join(' · ') || 'Séance';
  }
  const unit = isTimedQuest(q) ? 's' : 'reps';
  const reps = sets ? (sets.every(r => r === sets[0]) ? `${sets.length} × ${sets[0]}` : sets.join(' - ')) : `${Number(e.sets) || 1} × ${Number(e.reps) || 0}`;
  if (q.unit === 'kg' && Number(e.value) > 0) return `${reps} à ${round1(Number(e.value))} kg`;
  if (Number(e.assistanceKg) > 0) return `${reps} ${unit} (aide ${round1(Number(e.assistanceKg))} kg)`;
  return `${reps} ${unit}`;
}

/** Maximum lisible d'un exercice : { label, value } ou null s'il n'y a rien à montrer. */
function describeMax(q, state, today) {
  const r = estimateQuestMax(q, state, { today });
  // record réel saisi à la main (onglet « Mes maxima ») : c'est ce que la personne a rentré, il passe en premier
  const m = (state.maxRecords || {})[q.id];
  if (m) {
    if (Number(m.kg) > 0) return `${round1(Number(m.kg))} kg (record)`;
    if (Number(m.extraKg) > 0) return `lesté de ${round1(Number(m.extraKg))} kg (record)`;
    if (Number(m.assistKg) > 0) return `aide de ${round1(Number(m.assistKg))} kg (record)`;
    if (Number(m.seconds) > 0) return `${Math.round(Number(m.seconds))} s (record)`;
    if (Number(m.distanceKm) > 0) return `${round1(Number(m.distanceKm))} km${Number(m.minutes) > 0 ? ` en ${Math.round(Number(m.minutes))} min` : ''} (record)`;
  }
  if (!r || r.empty) return null;
  if (r.kind === 'cardio') return r.bestDistance > 0 ? `${round1(r.bestDistance)} km (plus longue distance)` : null;
  if (r.kind === 'timed') return r.best ? `${r.best.seconds} s` : null;
  if (r.kind === 'load') return `${round1(r.estimate)} kg (1 répétition estimée)`;
  const best = Math.max(0, ...(q.history || []).flatMap(h => (Array.isArray(h.setDetails) ? h.setDetails.map(Number) : [Number(h.reps) || 0])));
  return best > 0 ? `${best} répétitions (meilleure série)` : null;
}

export function buildFriendProfile(state, today) {
  const entries = getAllEntries(state).filter(e => e.date);
  const dates = [...new Set(entries.map(e => e.date))].sort();
  const lastDate = dates[dates.length - 1] || null;
  const info = levelFromXp(Number(state.xp) || 0, { passed: state.rankTrials || [] });
  const level = info.level;
  // Rang partagé par sa position (0 à 6), pas par son nom : chacun le lit avec les noms de SON édition
  const rank = Math.max(0, RPG_RANKS.findIndex(r => r.title === info.rank.title));
  const wk = getWeekStart(today);
  const quests = (state.quests || []).filter(q => q.type === 'strength' || q.type === 'cardio');
  return {
    v: 1,
    name: /^dresseur/i.test(state.heroName || '') ? '' : clip(state.heroName, 30), // le nom par défaut de l'édition Rondoudou n'est pas un prénom
    level,
    rank,
    streak: computeCurrentStreak(state.quests),
    sessionDays: dates.length,
    weekDays: dates.filter(d => d >= wk).length,
    sport: clip(state.coach && state.coach.sport, 30),
    lastSession: lastDate
      ? { date: lastDate, items: entries.filter(e => e.date === lastDate).slice(0, 12).map(e => ({ name: clip(e.quest.name), icon: clip(e.quest.icon, 4), text: describeEntry(e) })) }
      : null,
    maxima: quests.map(q => ({ name: clip(q.name), icon: clip(q.icon, 4), text: describeMax(q, state, today) })).filter(m => m.text).slice(0, 60),
    exercises: quests.slice(0, 80).map(q => ({
      name: clip(q.name),
      icon: clip(q.icon, 4),
      muscle: q.type === 'cardio' ? 'Cardio' : arenaOf(q),
      level: Number(q.level) || 1,
    })),
    updatedAt: today,
  };
}
