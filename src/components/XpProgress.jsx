import { DAILY_FULL_XP } from '../lib/xp';
import { addDaysISO, getTodayISODate, getWeekStart } from '../lib/dates';

const fmtDate = iso => `${iso.slice(8)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** Bilan de l'EXP : 8 dernières semaines, rythme moyen et dates estimées du prochain niveau et du prochain rang. */
export function XpProgress({ gameState, levelInfo }) {
  const today = getTodayISODate();
  const thisWeek = getWeekStart(today);
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const ws = addDaysISO(thisWeek, -7 * (7 - i));
    return { ws, xp: (gameState.xpWeeks || {})[ws] || 0 };
  });
  const max = Math.max(1, ...weeks.map(w => w.xp));
  const avg = weeks.slice(-4).reduce((s, w) => s + w.xp, 0) / 4;
  const eta = remaining => (avg > 0 && remaining > 0 ? fmtDate(addDaysISO(today, Math.ceil((remaining / avg) * 7))) : null);
  const toLevel = levelInfo.nextLevelXp - levelInfo.currentLevelXp;
  const earnedToday = gameState.xpDaily && gameState.xpDaily.date === today ? gameState.xpDaily.earned : 0;

  return (
    <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
      <h3 className="font-black text-white">Mon EXP semaine par semaine</h3>
      <div className="flex items-end gap-1.5 h-24">
        {weeks.map(w => (
          <div key={w.ws} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
            <span className="text-[9px] text-slate-400 font-semibold">{w.xp || ''}</span>
            <div
              className={`w-full rounded-t-md ${w.ws === thisWeek ? 'bg-pink-400' : 'bg-pink-600/70'}`}
              style={{ height: `${Math.max(w.xp ? 6 : 2, Math.round((w.xp / max) * 70))}%` }}
            />
            <span className="text-[9px] text-slate-500">{w.ws.slice(8)}/{w.ws.slice(5, 7)}</span>
          </div>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
          <p className="text-slate-400">Rythme des 4 dernières semaines</p>
          <p className="font-black text-pink-300">{Math.round(avg)} EXP / semaine</p>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
          <p className="text-slate-400">Prochain niveau ({levelInfo.level + 1})</p>
          <p className="font-black text-pink-300">
            {levelInfo.locked
              ? 'après l’épreuve de rang'
              : eta(toLevel)
                ? `vers le ${eta(toLevel)} (encore ${toLevel} EXP)`
                : `encore ${toLevel} EXP`}
          </p>
        </div>
        {levelInfo.nextRank && !levelInfo.locked && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <p className="text-slate-400">Prochain rang : {levelInfo.nextRank.badge} {levelInfo.nextRank.title}</p>
            <p className="font-black text-pink-300">
              {eta(levelInfo.xpToNextRank) ? `vers le ${eta(levelInfo.xpToNextRank)}` : `encore ${levelInfo.xpToNextRank} EXP`}
            </p>
          </div>
        )}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
          <p className="text-slate-400">Plafond du jour</p>
          <p className="font-black text-pink-300">{Math.min(earnedToday, DAILY_FULL_XP)} / {DAILY_FULL_XP} EXP à plein tarif</p>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Les dates sont une estimation d’après ton rythme récent. Au-delà de {DAILY_FULL_XP} EXP gagnées dans la journée, l’EXP des séances ne compte plus qu’à moitié.
      </p>
    </section>
  );
}
