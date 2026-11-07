// Ce que le coach intelligent reçoit : un résumé texte compact des données utiles (jamais de photo, d'e-mail, de note de pesée ni de prénom).
import { coachBalance, coachOverview } from '../coach/advice';
import { slangText } from '../data/slang';
import { assistText } from '../lib/assist';
import { experienceLine } from '../coach/experience';
import { cardioLine } from '../coach/cardio';
import { analyzeProgram } from '../coach/program';
import { activeProfile } from '../coach/profiles';
import { COACH_DAY_NAMES, coachRealEntries, coachSetsOf, getCoachSettings } from '../coach/settings';
import { arenaOf } from '../data/muscles';
import { EXERCISE_CATALOG } from '../data/catalog';
import { addDaysISO } from '../lib/dates';
import { isTimedCatalog, isTimedQuest } from '../lib/quests';

// jours de l'appli (0 = dimanche … 6 = samedi) ↔ jours pour le coach (1 = lundi … 7 = dimanche)
export const toAiDay = d => (Number(d) === 0 ? 7 : Number(d));
export const fromAiDay = d => (Number(d) === 7 ? 0 : Number(d));
const dayName = d => COACH_DAY_NAMES[Number(d)] || '';

let catalogCache = '';
let catalogCacheN = 0;
/** Catalogue compact (identique pour tout le monde : mis en cache côté serveur). */
export function catalogText() {
  if (!catalogCache || catalogCacheN !== EXERCISE_CATALOG.length) { // le catalogue commun peut grandir pendant la séance
    catalogCacheN = EXERCISE_CATALOG.length;
    catalogCache = EXERCISE_CATALOG.map(c => `${c.id} | ${c.name} | ${c.type === 'cardio' ? 'cardio' : 'muscu'} | ${c.unit}${isTimedCatalog(c) ? ' (durée)' : ''}`).join('\n')
      + `\n\nArgot de salle (à comprendre dans tout ce que dit ou écrit la personne : terme = sens) :\n${slangText()}`;
  }
  return catalogCache;
}

const n1 = v => Math.round((Number(v) || 0) * 10) / 10;

function entryText(q, e) {
  const timed = isTimedQuest(q);
  const reps = coachSetsOf(e, Number(q.goalSets) || 3, Number(q.goalReps) || 8);
  const unit = timed ? ' s' : '';
  if (q.type === 'cardio') return `${e.date} : ${n1(e.distanceKm || (q.unit === 'km' ? e.value : 0)) ? `${n1(e.distanceKm || e.value)} km, ` : ''}${n1(e.durationMin || (q.unit === 'min' ? e.value : 0))} min`;
  const load = q.unit === 'kg' ? (Array.isArray(e.setLoads) ? `${e.setLoads.join('/')} kg ` : `${n1(e.value)} kg `) : Number(e.assistanceKg) ? `${assistText(e.assistanceKg)} ` : '';
  return `${e.date} : ${load}${reps.join('-')}${unit}${e.rpe ? ` (ressenti ${e.rpe}/10)` : ''}`;
}

/** Liste des exercices de la personne (identifiant, nom, muscle, mesure, valeur actuelle, objectif, dernières séances). */
export function exercisesText(state, { history = 3 } = {}) {
  const qs = (state.quests || []).filter(q => q.goalMode !== 'free_mode');
  if (!qs.length) return 'Aucun exercice enregistré pour l’instant.';
  return qs.map(q => {
    const timed = isTimedQuest(q);
    const mesure = q.type === 'cardio' ? `cardio (${q.unit})` : q.unit === 'kg' ? `charge actuelle ${n1(q.currentValue)} kg` : timed ? 'durée en secondes' : Number(q.currentAssistanceKg) > 0 ? `poids du corps, aide actuelle ${n1(q.currentAssistanceKg)} kg` : Number(q.currentAssistanceKg) < 0 ? `poids du corps lesté, lest actuel ${n1(-q.currentAssistanceKg)} kg` : 'poids du corps (lest possible)';
    const goal = q.type === 'cardio' ? '' : `, objectif ${q.goalSets || 3}x${q.goalReps || 8}${timed ? ' s' : ''}${q.unit === 'kg' && q.goalValue ? ` (cible ${n1(q.goalValue)} kg)` : ''}`;
    const last = history ? coachRealEntries(q).slice(-history).map(e => entryText(q, e)).join(' ; ') : '';
    return `- ${q.id} | ${q.name} | ${q.type === 'cardio' ? 'cardio' : arenaOf(q)} | ${mesure}${goal}${last ? ` | dernières séances : ${last}` : ''}`;
  }).join('\n');
}

const lastWeight = state => {
  const w = (state.weightHistory || []).slice().sort((a, b) => String(a.date).localeCompare(String(b.date))).pop();
  return w ? Number(w.weightKg) : Number(state.userWeightKg) || null;
};

/** Contexte court pour la dictée : exercices et charges actuelles. */
export function dictationContext(state, today) {
  return `Date : ${today}. Poids de corps : ${lastWeight(state) || 'inconnu'} kg.\nExercices de l'utilisateur (identifiant | nom | muscle | mesure) :\n${exercisesText(state, { history: 1 })}`;
}

/** Dates des prochaines séances de muscu prévues par l'appli (séance personnalisée du coach comprise), au plus `n`. */
export function upcomingSessions(state, today, overview, n = 4) {
  const c = getCoachSettings(state);
  const ov = overview || coachOverview(state, today);
  const list = ((ov && ov.plannedAll) || []).map(p => p.iso).filter(d => d >= today);
  if (ov && ov.program && ov.first) list[0] = ov.first.iso; // séance du programme de son coach
  if (c.plan && Array.isArray(c.plan.questIds) && c.plan.questIds.length && c.plan.date >= today) list[0] = c.plan.date; // séance personnalisée : remplace la prochaine
  return [...new Set(list.filter(Boolean))].sort().slice(0, n);
}

/** Contexte complet pour la discussion avec le coach. */
export function coachContext(state, today, { overview } = {}) {
  const c = getCoachSettings(state);
  const lines = [];
  const dow = new Date(`${today}T00:00:00`).getDay();
  lines.push(`Aujourd'hui : ${dayName(dow)} ${today}.`);
  // calendrier explicite : « jeudi » = le prochain jeudi, sans erreur de date
  lines.push(`Calendrier des 14 prochains jours : ${Array.from({ length: 14 }, (_, i) => { const d = addDaysISO(today, i); return `${dayName(new Date(`${d}T00:00:00`).getDay())} ${d}${i === 0 ? ' (aujourd’hui)' : ''}`; }).join(', ')}.`);
  const weekStart = addDaysISO(today, -((dow + 6) % 7));
  const doneWeek = new Set();
  (state.quests || []).filter(q => q.type === 'strength').forEach(q => coachRealEntries(q).forEach(e => { if (e.date >= weekStart && e.date <= today) doneWeek.add(e.date); }));
  lines.push(`Séances de muscu déjà faites cette semaine (du lundi ${weekStart} à aujourd'hui) : ${doneWeek.size ? [...doneWeek].sort().join(', ') : 'aucune'}.`);
  try {
    const up = upcomingSessions(state, today, overview);
    lines.push(`Séances prévues par l'appli avec les réglages actuels : ${up.length ? up.map(u => `${dayName(new Date(`${u}T00:00:00`).getDay())} ${u}`).join(', ') : 'aucune'}.`);
  } catch { /* rien */ }
  const p = c.profile || {};
  lines.push(`Profil : ${p.sex === 'f' ? 'femme' : 'homme'}${p.age ? `, ${p.age} ans` : ''}${p.heightCm ? `, ${p.heightCm} cm` : ''}${lastWeight(state) ? `, ${lastWeight(state)} kg` : ''}${state.targetWeightKg ? `, poids visé ${state.targetWeightKg} kg` : ''}.`);
  const gym = Object.keys(c.gymSlots || {}).map(Number).sort((a, b) => toAiDay(a) - toAiDay(b));
  lines.push(experienceLine(state));
  lines.push(cardioLine(state, today));
  lines.push(`Réglages : ${c.splitMode === 'trio' ? '3 séances par semaine (mode 3 séances)' : `${c.sessionsPerWeek} séances de muscu par semaine`}, durée ${Number(c.sessionMinutes) ? `${c.sessionMinutes} min` : 'libre'}, jours de salle : ${gym.length ? gym.map(d => `${dayName(d)} (${toAiDay(d)})`).join(', ') : 'non précisés'}.`);
  lines.push(`Sport régulier : ${c.sport || 'aucun'}${(c.volleyDays || []).length ? `, jours : ${c.volleyDays.map(d => `${dayName(d)} (${toAiDay(d)})`).join(', ')}` : ''}. Matchs à venir : ${(c.matchDates || []).filter(d => d >= today).slice(0, 6).join(', ') || 'aucun'}.`);
  const act = activeProfile(state, today);
  const prof = act.id;
  lines.push(`Objectif de travail : ${c.workProfile || 'auto'}${prof && prof !== c.workProfile ? ` (en ce moment : ${prof}${act.fromWeight ? `, choisi automatiquement car la personne veut ${act.fromWeight === 'lose' ? 'perdre' : 'prendre'} du poids` : ''})` : ''}. Suivi des muscles : ${state.muscleMode === 'optimized' ? '14 muscles' : '5 grands groupes'}.`);
  if (c.readiness && c.readiness.date === today) lines.push(`Forme déclarée aujourd'hui : ${c.readiness.level}.`);
  const skips = (c.gymSkips || []).filter(d => d >= today);
  if (skips.length) lines.push(`Séances de salle annulées : ${skips.join(', ')}.`);
  const extra = (c.gymExtra || []).filter(d => d >= today);
  if (extra.length) lines.push(`Séances en plus (exceptionnelles) : ${extra.join(', ')}.`);
  lines.push(`Journée double possible : une séance de muscu peut se faire un jour de sport (ex. salle puis ${c.sport || 'sport'} le même jour). Pour ça, extra_session à cette date (séance exceptionnelle, le reste de la semaine ne bouge pas) ; l’appli retire alors les jambes ce jour-là. Ne touche pas aux jours de sport pour ça.`);
  const g = c.mainGoal && c.mainGoal.kind ? c.mainGoal : null;
  lines.push(`Objectif principal : ${g ? `${g.text} (type ${g.kind}${g.target ? `, cible ${g.target}` : ''}${g.deadline ? `, pour le ${g.deadline}` : ''})` : 'aucun'}. Forme des séries : ${c.methodStyle === 'classic' ? 'classique (séries fixes)' : c.methodStyle === 'variety' ? 'variée à sa demande (le coach alterne les formes)' : 'selon les études (séries classiques, dégressives et supersets seulement si la séance est courte, repos-pause pour un objectif de répétitions)'}.`);
  const mem = Array.isArray(c.memory) ? c.memory : [];
  lines.push(`Ce que tu as retenu de la personne : ${mem.length ? mem.map(m => `[${m.id}] ${m.text}`).join(' ; ') : 'rien pour l’instant'}.`);

  try {
    const ov = overview || coachOverview(state, today);
    if (ov && ov.session && ov.hasExercises) {
      const s = ov.session;
      lines.push(`Prochaine séance prévue par l'appli${ov.program ? ' (programme de son coach)' : ''} : ${s.date || (ov.first && ov.first.iso) || ''}${s.estMin ? `, environ ${s.estMin} min` : ''}.`);
      s.exercises.forEach(e => {
        const tgt = `${e.sets}x${(e.targetReps || []).join('-')}${e.timed ? ' s' : ''}${e.kind === 'load' ? ` à ${e.load} kg` : e.kind === 'assisted' ? ` (${assistText(e.assist)})` : ''}`;
        const form = e.plan ? ` — forme : ${e.method} (${e.plan.map(p => `${p.reps}${e.kind === 'load' ? '×' + p.load : ''}`).join(', ')})` : '';
        const sup = e.superset ? ` — superset ${e.superset.id}` : '';
        lines.push(`  · ${e.questId} | ${e.name} : ${tgt}${form}${sup}${e.reason ? ` — pourquoi : ${String(e.reason).slice(0, 220)}` : ''}${e.methodWhy ? ` ${e.methodWhy}` : ''}`);
      });
      if (Array.isArray(s.notes) && s.notes.length) lines.push(`  Remarques de l'appli : ${s.notes.slice(0, 4).join(' ; ')}`);
    } else {
      lines.push('Prochaine séance : aucune (pas encore d’exercice de musculation).');
    }
  } catch { /* le résumé reste utile sans la séance */ }

  if (c.program && Array.isArray(c.program.weeks) && c.program.weeks.length) {
    try {
      const a = analyzeProgram(c.program, state);
      lines.push(`Programme de son coach extérieur${c.program.paused ? ' (en pause)' : ''} : ${a.summary.join(' ')}`);
      if (c.program.takeOver === false) lines.push('Après ce programme, la personne a choisi de continuer sans l’appli (pas de suite proposée, aperçu seulement) : ne lui impose pas de séances ; si elle veut de l’aide pour la suite, dis-lui qu’elle peut l’activer dans la carte du programme.');
    } catch { /* rien */ }
  }

  try {
    const b = coachBalance(state, today);
    const low = b.rows.filter(r => r.status === 'low' || r.status === 'mid').map(r => `${r.arena} (${r.avg} séries/sem.)`);
    if (low.length) lines.push(`Muscles peu travaillés ces 4 dernières semaines : ${low.join(', ')}.`);
  } catch { /* rien */ }

  const since = addDaysISO(today, -13);
  const days = new Set();
  (state.quests || []).forEach(q => coachRealEntries(q).forEach(e => { if (e.date >= since) days.add(e.date); }));
  lines.push(`Jours d'entraînement sur les 14 derniers jours : ${days.size}.`);
  lines.push(`Exercices (identifiant | nom | muscle | mesure | objectif | dernières séances) :\n${exercisesText(state)}`);
  return lines.join('\n');
}
