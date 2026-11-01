import { ACHIEVEMENTS_LIST } from '../data/gamification';
import { CheckCircle2 } from '../icons';
import { ACH_PROGRESS } from '../lib/stats';

export function TrophiesTab({ achStats, gameState }) {
  // débloqués d'abord, puis les plus proches d'être gagnés, les secrets à la fin
  const score = ach => {
    if (gameState.unlockedAchievements.includes(ach.id)) return 2;
    if (ach.secret) return -1;
    const pr = ACH_PROGRESS[ach.id];
    return pr ? Math.min(1, (Number(achStats[pr.key]) || 0) / pr.max) : 0;
  };
  const sorted = [...ACHIEVEMENTS_LIST].sort((a, b) => score(b) - score(a));
  const got = gameState.unlockedAchievements.length;
  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
        <p className="font-black text-white">{got} trophée{got > 1 ? 's' : ''} sur {ACHIEVEMENTS_LIST.length}</p>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-amber-400" style={{ width: `${(got / ACHIEVEMENTS_LIST.length) * 100}%` }} /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map(ach => {
          const unlocked = gameState.unlockedAchievements.includes(ach.id);
          return (
            <div
              key={ach.id}
              className={`p-4 rounded-2xl border flex items-start gap-3.5 transition ${
                unlocked
                  ? 'bg-slate-900 border-amber-500/50'
                  : 'bg-slate-900/50 border-slate-800'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-2xl shrink-0">
                <span className={unlocked ? '' : 'grayscale opacity-60'}>{ach.secret && !unlocked ? '❔' : ach.icon}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-white text-sm">{ach.secret && !unlocked ? 'Trophée secret' : ach.title}</h4>
                  {unlocked && (
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {ach.secret && !unlocked ? 'Continue à t’entraîner pour le découvrir…' : ach.desc}
                </p>
                {!unlocked && ACH_PROGRESS[ach.id] && !ach.secret && (() => {
                  const pr = ACH_PROGRESS[ach.id];
                  const cur = Math.min(pr.max, Number(achStats[pr.key]) || 0);
                  return (
                    <div className="mt-2">
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-pink-500" style={{ width: `${(cur / pr.max) * 100}%` }} />
                      </div>
                      <span className="text-xs text-slate-400">{Math.round(cur * 10) / 10} / {pr.max}</span>
                    </div>
                  );
                })()}
                <span className="inline-block mt-2 text-xs font-bold text-pink-300">
                  Bonus : +{ach.xpBonus} EXP
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
