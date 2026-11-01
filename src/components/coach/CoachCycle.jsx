import { coachDateFR } from '../../coach/labels';
import { card } from './ui';

export function CoachCycle({ updateCoach, w0, weekStart0 }) {
  return (
    <section className={card}>
      <h3 className="font-black text-white">🔁 Cycle d’entraînement</h3>
      {w0.cycle ? (
        <div className="space-y-2 text-xs text-slate-300">
          <p>Tu es en <b>semaine {w0.cycle.n} sur {w0.cycle.len}</b> du cycle. {w0.cycle.deload ? 'C’est la semaine allégée : −10 % de charge et une série de moins.' : `La prochaine semaine allégée commence le ${coachDateFR(w0.cycle.nextDeload)}.`}</p>
          <div className="flex gap-2">
            <button onClick={() => updateCoach({ cycleWeeks: 0, cycleStart: null })} className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-bold">Désactiver les cycles</button>
            <button onClick={() => updateCoach({ cycleStart: weekStart0 })} className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-bold">Recommencer un cycle cette semaine</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-xs text-slate-300">
          <p>Le coach peut organiser ton entraînement en blocs : les charges montent pendant quelques semaines, puis une semaine allégée automatique permet de récupérer. C’est une pratique courante, avec des preuves directes limitées (Bell 2023).</p>
          <div className="flex flex-wrap gap-2">
            {[4, 5, 6].map(n => (
              <button key={n} onClick={() => updateCoach({ cycleWeeks: n, cycleStart: weekStart0 })} className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-black">Cycle de {n} semaines</button>
            ))}
          </div>
          <p className="text-xs text-slate-500">La semaine en cours devient la semaine 1.</p>
        </div>
      )}
    </section>
  );
}
