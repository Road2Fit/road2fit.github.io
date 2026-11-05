import { Play } from '../icons';
import { Art } from './Art';
import { useMemo } from 'react';
import { coachOverview } from '../coach/advice';
import { programCoachOff } from '../coach/program';
import { coachDayLabel } from '../coach/settings';
import { getTodayISODate } from '../lib/dates';

/**
 * Grande carte d'accueil du Coach : prochaine séance, accès direct à la séance guidée et à l'onglet Coach.
 */
export function CoachBanner({ gameState, guidedActive, onCoachTab, onOpenCoach, onResumeGuided, onStartGuided }) {
  const today = getTodayISODate();
  const ov = useMemo(
    () => coachOverview(gameState, today),
    [gameState.quests, gameState.coach, gameState.userWeightKg, today]
  );
  const off = programCoachOff(gameState, ov.program);
  const session = !off && ov.session && ov.session.exercises.length > 0 ? ov.session : null;
  const isToday = !!(ov.first && ov.first.iso === today);

  let headline = 'Ton coach personnel';
  let detail = 'Il prépare tes séances, règle les charges et suit ta progression.';
  if (guidedActive) {
    headline = 'Séance guidée en cours';
    detail = 'Reprends là où tu t’étais arrêté.';
  } else if (session && ov.first) {
    headline = isToday ? 'Séance prévue aujourd’hui' : `Prochaine séance : ${coachDayLabel(ov.first.iso)}`;
    detail = `${session.exercises.length} exercice(s) · ≈ ${session.estMin} min · ≈ ${session.estKcal} kcal`;
  } else if (off) {
    headline = 'Tu continues sans l’appli';
    detail = 'Le programme de ton coach est fini : l’aperçu de la suite est dans le Coach.';
  } else if (!ov.hasExercises) {
    headline = 'Ajoute tes exercices';
    detail = 'Dès que tu as des objectifs de musculation, le coach te prépare tes séances.';
  }

  const canStart = !guidedActive && session && isToday;
  if (onCoachTab) return null; // dans le Coach : la grande carte de la séance (lancer / reprendre) est dans la page
  return (
    <section className="bg-slate-900 border border-pink-400/50 rounded-2xl p-4 sm:p-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center shrink-0"><Art name={guidedActive ? 'dumbbell' : 'coach'} size={32} bare /></div>
        <div className="space-y-0.5">
          <h2 className="text-lg sm:text-xl font-black text-white">{headline}</h2>
          <p className="text-sm text-slate-300">{detail}</p>
        </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {guidedActive && (
            <button type="button" onClick={onResumeGuided} className="flex-1 md:flex-none px-5 py-3 rounded-xl font-black text-sm sm:text-base bg-emerald-600 hover:bg-emerald-500 text-white">
              Reprendre ma séance
            </button>
          )}
          {canStart && (
            <button type="button" onClick={() => onStartGuided(session)} className="flex-1 md:flex-none px-5 py-3 rounded-xl font-black text-sm sm:text-base inline-flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-500 text-white">
              <Play className="w-4 h-4 fill-current" />Lancer ma séance
            </button>
          )}
          {!onCoachTab && (
            <button type="button" onClick={onOpenCoach} className="flex-1 md:flex-none px-5 py-3 rounded-xl font-bold text-sm sm:text-base bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-600">
              <Art name="coach" />Ouvrir le Coach
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
