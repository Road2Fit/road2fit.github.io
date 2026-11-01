import { card } from './ui';

export function CoachWeeklyGoals({ onClaimWeekly, weeklyGoals }) {
  return (
    <section className={card}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-black text-white">🏅 Objectifs de la semaine</h3>
        {weeklyGoals.allDone && !weeklyGoals.claimed && (
          <button onClick={() => onClaimWeekly(weeklyGoals.weekStart)} className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-xs font-black">Réclamer +{weeklyGoals.xp} XP</button>
        )}
        {weeklyGoals.claimed && <span className="text-xs font-bold text-emerald-300">✅ Récompense récupérée</span>}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {weeklyGoals.goals.map(g => (
          <div key={g.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200">{g.icon} {g.label}</span>
              <span className={g.done ? 'text-emerald-300 font-black' : 'text-slate-300 font-bold'}>{g.value}{g.unit} / {g.target}{g.unit}</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
              <div className={`h-full ${g.done ? 'bg-emerald-500' : 'bg-pink-500'}`} style={{ width: `${Math.min(100, (g.value / g.target) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500">Les trois objectifs atteints dans la semaine rapportent {weeklyGoals.xp} XP bonus (une fois par semaine).</p>
    </section>
  );
}
