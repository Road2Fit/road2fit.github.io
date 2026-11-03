import { Art } from '../Art';
import { useMemo } from 'react';
import { Flame } from '../../icons';
import { MuscleBodyMap } from '../coach/MuscleBodyMap';
import { coachBalance } from '../../coach/advice';
import { getTodayISODate } from '../../lib/dates';
import { RANK_FRAMES, activeCosmetics } from '../../data/rewards';
import { RPG_RANKS } from '../../data/gamification';
import { JigglypuffAvatar } from '../JigglypuffAvatar';
import { NeutralAvatar } from '../NeutralAvatar';
import { NEUTRAL, pick } from '../../edition';

const chip = 'px-2 py-0.5 rounded-full text-xs sm:text-xs font-bold border flex items-center gap-1';

export function HeaderProfile({
  currentStreak, gameState, levelInfo, lifetimeStats, onOpenMore, onOpenRewards, onOpenSync, onOpenTrial,
  onRetrySync, setActiveTab, streakBonusPct, syncStatus, trialRank,
}) {
  const { theme, accessory, title } = activeCosmetics(gameState.cosmetics, levelInfo.level);
  const hero = /^Dresseur/i.test(gameState.heroName || '') ? '' : gameState.heroName || ''; // le nom par défaut de l'édition Rondoudou n'est pas un prénom
  // silhouette des muscles à côté de la barre d'EXP (5 grands groupes en mode simplifié, 14 muscles en mode optimisé)
  const balanceRows = useMemo(() => coachBalance(gameState, getTodayISODate()).rows, [gameState.muscleMode, gameState.quests]);
  const rankIndex = Math.max(0, RPG_RANKS.findIndex(r => r.title === levelInfo.rank.title));
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-3 sm:gap-4">
        <div
          onClick={() => setActiveTab('weight')}
          title="Voir le suivi du poids"
          className={`cursor-pointer relative w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${theme.ring} ${RANK_FRAMES[rankIndex]} shrink-0 group transition-transform hover:scale-105`}
        >
          <div className="w-full h-full bg-slate-950/95 rounded-[14px] flex flex-col items-center justify-center relative overflow-hidden">
            {NEUTRAL ? <NeutralAvatar name={hero} size={44} /> : <JigglypuffAvatar currentWeightKg={gameState.userWeightKg} targetWeightKg={gameState.targetWeightKg} size={44} />}
            <span className="absolute bottom-0.5 px-2 py-0.2 rounded-full bg-slate-900/90 border border-pink-400/50 text-[9px] font-black uppercase tracking-widest text-pink-300">
              Niv. {levelInfo.level}
            </span>
          </div>
          {accessory.id !== 'none' && (
            <span className={`absolute pointer-events-none ${accessory.pos}`}>{accessory.icon}</span>
          )}
          <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-slate-900 border border-pink-400/60 flex items-center justify-center text-sm">
            {levelInfo.rank.badge}
          </span>
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full text-xs sm:text-xs font-bold uppercase tracking-wider bg-pink-500/20 text-pink-300 border border-pink-500/40">
                  {levelInfo.rank.badge} {levelInfo.rank.title}
                </span>
                {title.id && (
                  <span className="px-2 py-0.5 rounded-full text-xs sm:text-xs font-bold bg-violet-500/20 text-violet-200 border border-violet-400/40">{title.label}</span>
                )}
              </div>
              <h1 className="mt-1 text-base sm:text-2xl font-black tracking-tight leading-tight bg-gradient-to-r from-pink-300 via-rose-200 to-amber-200 bg-clip-text text-transparent">
                {pick('From Grosdoudou to Rondoudou', hero || 'Road2Fit')}
              </h1>
            </div>
            <div className="shrink-0 flex items-center gap-2">
            {NEUTRAL && hero && (
              <span className="text-sm sm:text-base font-black tracking-tight text-slate-300 leading-none" data-testid="app-title">Road2Fit</span>
            )}
            <button
              type="button"
              onClick={onOpenMore}
              title="Réglages et données"
              aria-label="Réglages et données"
              className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-700 text-lg text-slate-200 hover:text-white"
            >
              <Art name="gear" size={22} bare />
            </button>
            </div>
          </div>

          <div className="flex items-end gap-3">
          <div className="w-full max-w-md">
            <div className="flex justify-between text-xs sm:text-xs font-semibold text-slate-400 mb-1">
              <span className="hidden sm:inline">Jauge EXP ({gameState.xp} EXP)</span><span className="sm:hidden">EXP</span>
              <span className="text-pink-300 whitespace-nowrap">{levelInfo.currentLevelXp} / {levelInfo.nextLevelXp}</span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div className={`h-full rounded-full bg-gradient-to-r ${theme.bar} transition-all duration-500`} style={{ width: `${levelInfo.progressPct}%` }} />
            </div>
          </div>
          {balanceRows && (
            <button type="button" onClick={() => setActiveTab('coach')} title="Muscles à travailler : touche pour voir le détail dans le Coach" aria-label="Muscles à travailler" className="shrink-0 -mb-1">
              <MuscleBodyMap rows={balanceRows} mini />
            </button>
          )}
          </div>
        </div>
      </div>

      {levelInfo.locked ? (
        <p className="text-xs text-amber-300">
          🔒 Niveau bloqué : réussis l’épreuve pour devenir {levelInfo.locked.badge} {levelInfo.locked.title}. Ton EXP en réserve : {levelInfo.reserve}.
        </p>
      ) : (
        levelInfo.nextRank && (
          <p className="hidden sm:block text-xs text-slate-500">
            Prochain rang : {levelInfo.nextRank.badge} {levelInfo.nextRank.title} (niv. {levelInfo.nextRank.minLevel}, encore {levelInfo.xpToNextRank} EXP)
          </p>
        )
      )}

      {/* Essentiel seulement : série, poids, état de la sauvegarde. Récompenses, épreuve de rang et le reste sont dans ⚙️. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          title={`${lifetimeStats.totalKcal} kcal brûlées au total${streakBonusPct > 0 ? ` · chaque semaine d’affilée avec une séance : +10 % d’EXP (maximum +50 %)` : ''}`}
          className={`${chip} bg-amber-500/15 text-amber-300 border-amber-500/30`}
        >
          <Art name="flame" size={15} bare /> Série : {currentStreak} j
        </span>
        {streakBonusPct > 0 && <span title="Chaque semaine d’affilée avec une séance donne +10 % d’EXP (maximum +50 %)" className={`${chip} bg-slate-800 text-amber-200 border-slate-700`}><Art name="bolt" size={14} bare />+{streakBonusPct} % d’EXP</span>}
        <button type="button" onClick={() => setActiveTab('weight')} title="Voir le suivi du poids" className={`${chip} bg-slate-800 text-slate-200 border-slate-600`}>
          <Art name="scale" size={15} bare /> {gameState.userWeightKg} kg ➔ {gameState.targetWeightKg} kg
        </button>
        <button
          type="button"
          onClick={onOpenSync}
          title={syncStatus === 'synced' ? 'Sauvegardé en ligne : touche pour ouvrir mon compte' : 'Mon compte et ma sauvegarde'}
          aria-label="Mon compte et ma sauvegarde"
          className={`${chip} ${
            syncStatus === 'synced'
              ? 'bg-slate-800 text-emerald-300 border-slate-700'
              : syncStatus === 'saving' || syncStatus === 'loading'
              ? 'bg-slate-800 text-amber-300 border-slate-700 animate-pulse'
              : syncStatus === 'off'
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
          }`}
        >
          {syncStatus === 'synced' ? '☁️ ✓'
            : syncStatus === 'saving' ? '☁️ …'
            : syncStatus === 'loading' ? '☁️ …'
            : syncStatus === 'off' ? '⚠️ Non sauvegardé'
            : '⚠️ Sauvegarde injoignable'}
        </button>
        {syncStatus === 'error' && (
          <button onClick={onRetrySync} className={`${chip} bg-slate-800 text-white border-slate-600`}>🔄 Réessayer</button>
        )}
        {trialRank && levelInfo.locked && (
          <button type="button" onClick={onOpenTrial} className={`${chip} bg-amber-500/20 text-amber-200 border-amber-400/60 animate-pulse`}>
            🔒 Épreuve de rang
          </button>
        )}
      </div>
    </div>
  );
}
