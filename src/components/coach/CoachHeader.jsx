import { card } from './ui';

export function CoachHeader({ coach, guidedActive, onResumeGuided, trainingWeeks, updateCoach, w0, weekStart0 }) {
  return (
    <section className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-black text-white">Cette semaine</h2>
          <p className="text-xs text-slate-400 mt-0.5">Séances calculées d’après ton historique : des repères, pas un avis médical.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="px-2.5 py-1 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300">
            Muscu cette semaine : {coach.sessionsPerWeek - w0.remaining}/{coach.sessionsPerWeek}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300">
            {w0.matchInWeek ? 'Match cette semaine' : 'Pas de match prévu'}
          </span>
          {w0.cycle && <span className="px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300">Cycle : semaine {w0.cycle.n}/{w0.cycle.len}</span>}
          {w0.deload && <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">Semaine allégée</span>}
        </div>
      </div>

      {guidedActive && (
        <button onClick={onResumeGuided} className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm">
          ▶ Reprendre la séance guidée en cours
        </button>
      )}

      {trainingWeeks >= 6 && !w0.deload && !coach.cycleWeeks && (
        <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-3 text-xs text-amber-100 flex flex-wrap items-center justify-between gap-2">
          <span>
            Tu t’entraînes depuis <b>{trainingWeeks} semaines d’affilée</b>. Une semaine allégée (−10 % de charge, une série de moins) est une pratique courante pour récupérer. Les preuves directes sont limitées, à toi de voir.
          </span>
          <button onClick={() => updateCoach({ deloadWeeks: [...(coach.deloadWeeks || []), weekStart0] })} className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-black">
            Activer la semaine allégée
          </button>
        </div>
      )}
      {w0.deload && (
        <div className="flex items-center justify-between gap-2 text-xs text-slate-300">
          <span>Semaine allégée active : charges −10 % et une série de moins.</span>
          <button onClick={() => updateCoach({ deloadWeeks: (coach.deloadWeeks || []).filter(w => w !== weekStart0) })} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 font-bold">
            Désactiver
          </button>
        </div>
      )}
    </section>
  );
}
