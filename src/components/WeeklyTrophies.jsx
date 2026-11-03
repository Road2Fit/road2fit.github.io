import { useMemo } from 'react';
import { Art } from './Art';
import { coachWeeklyGoals } from '../coach/advice';
import { addDaysISO, getTodayISODate, getWeekStart } from '../lib/dates';
import { getAllEntries } from '../lib/quests';

/**
 * Trophées de la semaine (onglet Trophées) : les anciens « Objectifs de la semaine » du Coach, présentés comme des trophées
 * qui se renouvellent chaque lundi (séances de muscu, endurance, pesées). Les trois gagnés : bonus d'EXP à réclamer.
 * « Gagné N fois » : semaines terminées où le trophée a été obtenu (avec les objectifs actuels).
 */
export function WeeklyTrophies({ gameState, onClaimWeekly }) {
  const today = getTodayISODate();
  const wg = useMemo(() => coachWeeklyGoals(gameState, today), [gameState.quests, gameState.weightHistory, gameState.coach, today]);
  const wins = useMemo(() => {
    const dates = [...getAllEntries(gameState).map(e => e.date), ...(gameState.weightHistory || []).map(w => w.date)].filter(Boolean).sort();
    const out = { strength: 0, cardio: 0, weigh: 0 };
    if (!dates.length) return out;
    let ws = getWeekStart(dates[0]);
    const cur = getWeekStart(today);
    for (let n = 0; ws < cur && n < 156; n++, ws = addDaysISO(ws, 7)) {
      coachWeeklyGoals(gameState, ws).goals.forEach(g => { if (g.done) out[g.id] = (out[g.id] || 0) + 1; });
    }
    return out;
  }, [gameState.quests, gameState.weightHistory, gameState.coach, today]);
  const days = 7 - ((new Date(`${today}T00:00:00`).getDay() + 6) % 7);

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3" data-testid="weekly-trophies">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-black text-white"><Art name="medal" />Trophées de la semaine</h3>
        {wg.allDone && !wg.claimed && (
          <button onClick={() => onClaimWeekly(wg.weekStart)} className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-xs font-black" data-testid="weekly-claim">Réclamer +{wg.xp} EXP</button>
        )}
        {wg.claimed && <span className="text-xs font-bold text-emerald-300">Bonus de la semaine récupéré</span>}
      </div>
      <p className="text-xs text-slate-400">Ils se renouvellent chaque lundi (encore {days} jour{days > 1 ? 's' : ''} cette semaine). Les trois gagnés : +{wg.xp} EXP de bonus.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {wg.goals.map(g => (
          <div key={g.id} className={`p-3 rounded-2xl border flex items-start gap-3 ${g.done ? 'bg-slate-900 border-amber-500/50' : 'bg-slate-900/50 border-slate-800'}`} data-testid={`weekly-${g.id}`}>
            <div className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center text-2xl shrink-0">
              <span className={g.done ? '' : 'grayscale opacity-60'}>{g.icon}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-white text-sm">{g.label}</h4>
                {g.done && <span className="text-xs font-black text-amber-300">Gagné</span>}
              </div>
              <p className="text-xs text-slate-400">{g.value}{g.unit} / {g.target}{g.unit} cette semaine</p>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1.5">
                <div className={`h-full ${g.done ? 'bg-amber-400' : 'bg-pink-500'}`} style={{ width: `${Math.min(100, (g.value / Math.max(1, g.target)) * 100)}%` }} />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Gagné {wins[g.id] || 0} fois</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
