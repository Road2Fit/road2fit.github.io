import { coachDateFR, coachFmt } from '../../coach/labels';
import { coachSuggestExercises } from '../../coach/suggest';
import { card } from './ui';

export function CoachObjectives({ gameState, onAddExercise, questRows }) {
  return (
    <section className={card}>
      <h3 className="font-black text-white">Mes objectifs</h3>
      {questRows.length === 0 && <p className="text-xs text-slate-400">Aucun exercice de musculation pour l’instant.</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        {questRows.map(r => {
          const t = r.target;
          const next = t.kind === 'load' ? `${coachFmt(t.load)} kg × ${t.goalReps}` : t.kind === 'assisted' ? `aide ${coachFmt(t.assist)} kg × ${t.goalReps}` : `${t.goalReps} ${t.timed ? 's' : 'reps'}`;
          const eta = r.eta.done ? 'Atteint' : r.eta.days ? `≈ ${coachDateFR(r.eta.date)} (≈ +${coachFmt(r.eta.perWeek)}/sem.)` : r.eta.stalled ? 'Rythme actuel trop lent pour estimer' : 'Estimation après 3 séances';
          const sugg = r.plateau ? coachSuggestExercises(gameState, r.arena, 2) : [];
          return (
            <div key={r.q.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-extrabold text-white text-sm truncate">{r.q.icon} {r.q.name}</p>
                <span className="text-xs font-black text-pink-300">{r.progress}%</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1.5">
                <div className="h-full bg-pink-500" style={{ width: `${r.progress}%` }} />
              </div>
              <p className="text-xs text-slate-300 mt-1.5">Prochaine cible : <b>{next}</b></p>
              <p className="text-xs text-slate-400">Objectif final : {eta}</p>
              {r.plateau && (
                <div className="mt-2 text-xs bg-amber-950/30 border border-amber-500/40 rounded-lg p-2 text-amber-100 space-y-1">
                  <p>⚠️ <b>Stagnation</b> sur les 3 dernières séances. Idées : une semaine allégée, une variante de l’exercice, et un contrôle du sommeil et des protéines.</p>
                  {sugg.map(c => (
                    <button key={c.id} onClick={() => onAddExercise(c.id)} className="mr-1 mt-1 px-2 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold">+ {c.name}</button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
