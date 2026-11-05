import { Art } from '../Art';
import { useMemo, useState } from 'react';
import { MuscleBodyMap } from '../coach/MuscleBodyMap';
import { coachBalance } from '../../coach/advice';
import { getTodayISODate } from '../../lib/dates';
import { activeCosmetics } from '../../data/rewards';
import { JigglypuffAvatar } from '../JigglypuffAvatar';
import { NeutralAvatar } from '../NeutralAvatar';
import { NEUTRAL, pick } from '../../edition';

const chip = 'px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1';

// Icône de la personne entourée d'une jauge (la progression vers le niveau suivant, sans chiffres).
function AvatarRing({ gameState, hero, pct, size = 52, locked = false }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="7" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={locked ? '#f59e0b' : 'var(--ring-color, #ec4899)'} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(100, pct)) / 100)} className="transition-all duration-700" data-testid="xp-ring" />
      </svg>
      <span className="rounded-full bg-slate-950 flex items-center justify-center overflow-hidden" style={{ width: size - 12, height: size - 12 }}>
        {NEUTRAL ? <NeutralAvatar name={hero} size={size - 16} /> : <JigglypuffAvatar currentWeightKg={gameState.userWeightKg} targetWeightKg={gameState.targetWeightKg} size={size - 16} />}
      </span>
      {locked && <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center text-[11px]">🔒</span>}
    </span>
  );
}

// En-tête épuré : seulement l'icône (jauge d'EXP autour), le nom, l'état de la sauvegarde s'il y a un souci et ⚙️.
// Toucher l'icône ouvre le profil : niveau, EXP, rang, épreuve, série et bonus, poids, muscles, récompenses.
export function HeaderProfile({
  currentStreak, gameState, levelInfo, lifetimeStats, onOpenMore, onOpenRewards, onOpenSync, onOpenTrial,
  onRetrySync, setActiveTab, streakBonusPct, syncStatus, trialRank,
}) {
  const [open, setOpen] = useState(false);
  const { theme, title } = activeCosmetics(gameState.cosmetics, levelInfo.level);
  const hero = /^Dresseur/i.test(gameState.heroName || '') ? '' : gameState.heroName || ''; // le nom par défaut de l'édition Rondoudou n'est pas un prénom
  const balanceRows = useMemo(() => (open ? coachBalance(gameState, getTodayISODate()).rows : null), [open, gameState.muscleMode, gameState.quests]);
  const locked = !!levelInfo.locked;
  const syncProblem = syncStatus === 'off' || syncStatus === 'error';
  const go = tab => { setOpen(false); setActiveTab(tab); };

  return (
    <>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setOpen(true)} aria-label="Mon profil" data-testid="profile-button" className="tap-free rounded-full">
          <AvatarRing gameState={gameState} hero={hero} pct={levelInfo.progressPct} locked={locked} />
        </button>
        <h1 className="flex-1 min-w-0 truncate text-lg sm:text-2xl font-black tracking-tight bg-gradient-to-r from-pink-300 via-rose-200 to-amber-200 bg-clip-text text-transparent">
          {pick('From Grosdoudou to Rondoudou', hero || 'Road2Fit')}
        </h1>
        {NEUTRAL && hero && <span className="hidden sm:inline text-base font-black text-slate-300" data-testid="app-title">Road2Fit</span>}
        {syncProblem && (
          <button type="button" onClick={syncStatus === 'error' ? onRetrySync : onOpenSync} aria-label="Mon compte et ma sauvegarde"
            className={`${chip} ${syncStatus === 'off' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-rose-500/15 text-rose-300 border-rose-500/30'}`}>
            {syncStatus === 'off' ? '⚠️ Non sauvegardé' : '⚠️ Réessayer'}
          </button>
        )}
        <button type="button" onClick={onOpenMore} title="Réglages et données" aria-label="Réglages et données"
          className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:text-white">
          <Art name="gear" size={22} bare />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[65] bg-slate-950/85 backdrop-blur-sm flex items-start justify-center px-3 pt-14 pb-6 overflow-y-auto" onClick={() => setOpen(false)}>
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-4" onClick={e => e.stopPropagation()} role="dialog" aria-label="Mon profil" data-testid="profile-sheet">
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="absolute top-3 right-3 w-9 h-9 rounded-lg bg-slate-800 text-slate-300 font-black">✕</button>
            <div className="flex items-center gap-4">
              <AvatarRing gameState={gameState} hero={hero} pct={levelInfo.progressPct} locked={locked} size={84} />
              <div className="min-w-0">
                <p className="text-xl font-black text-white truncate">{hero || pick('Rondoudou', 'Moi')}</p>
                <p className="text-sm font-black text-pink-300">Niv. {levelInfo.level}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-pink-500/20 text-pink-300 border border-pink-500/40">{levelInfo.rank.badge} {levelInfo.rank.title}</span>
                  {title.id && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-violet-500/20 text-violet-200 border border-violet-400/40">{title.label}</span>}
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                <span>EXP ({gameState.xp})</span>
                <span className="text-pink-300">{levelInfo.currentLevelXp} / {levelInfo.nextLevelXp}</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                <div className={`h-full rounded-full bg-gradient-to-r ${theme.bar}`} style={{ width: `${levelInfo.progressPct}%` }} />
              </div>
              {locked ? (
                <p className="mt-2 text-xs text-amber-300">🔒 Niveau bloqué : réussis l’épreuve pour devenir {levelInfo.locked.badge} {levelInfo.locked.title}. Ton EXP en réserve : {levelInfo.reserve}.</p>
              ) : levelInfo.nextRank && (
                <p className="mt-2 text-xs text-slate-400">Prochain rang : {levelInfo.nextRank.badge} {levelInfo.nextRank.title} (niv. {levelInfo.nextRank.minLevel}, encore {levelInfo.xpToNextRank} EXP)</p>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className={`${chip} bg-amber-500/15 text-amber-300 border-amber-500/30`}><Art name="flame" size={15} bare /> Série : {currentStreak} j</span>
              {streakBonusPct > 0 && <span className={`${chip} bg-slate-800 text-amber-200 border-slate-700`}><Art name="bolt" size={14} bare />+{streakBonusPct} % d’EXP</span>}
              <span className={`${chip} bg-slate-800 text-slate-200 border-slate-700`}>{lifetimeStats.totalKcal} kcal au total</span>
              <button type="button" onClick={() => go('weight')} className={`${chip} bg-slate-800 text-slate-200 border-slate-600`}><Art name="scale" size={15} bare /> {gameState.userWeightKg} kg ➔ {gameState.targetWeightKg} kg</button>
              <button type="button" onClick={() => { setOpen(false); onOpenSync(); }} aria-label="Mon compte et ma sauvegarde"
                className={`${chip} ${syncStatus === 'synced' ? 'bg-slate-800 text-emerald-300 border-slate-700' : syncProblem ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-slate-800 text-amber-300 border-slate-700'}`}>
                {syncStatus === 'synced' ? '☁️ Sauvegardé' : syncStatus === 'off' ? '⚠️ Non sauvegardé' : syncStatus === 'error' ? '⚠️ Sauvegarde injoignable' : '☁️ …'}
              </button>
            </div>

            {balanceRows && (
              <button type="button" onClick={() => go('coach')} aria-label="Muscles à travailler" className="w-full flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl p-3 text-left">
                <MuscleBodyMap rows={balanceRows} mini />
                <span className="text-sm font-bold text-slate-200">Équilibre des muscles</span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2">
              {trialRank && <button type="button" onClick={() => { setOpen(false); onOpenTrial(); }} className={`py-3 rounded-xl text-sm font-black ${locked ? 'bg-amber-400 text-slate-950 animate-pulse' : 'bg-slate-800 text-slate-100'}`}>🔒 Épreuve de rang</button>}
              <button type="button" onClick={() => { setOpen(false); onOpenRewards(); }} className="py-3 rounded-xl text-sm font-bold bg-slate-800 text-slate-100"><Art name="gift" size={16} />Récompenses</button>
              <button type="button" onClick={() => go('bilan')} className="py-3 rounded-xl text-sm font-bold bg-slate-800 text-slate-100"><Art name="chart" size={16} />Bilan</button>
              <button type="button" onClick={() => go('trophies')} className="py-3 rounded-xl text-sm font-bold bg-slate-800 text-slate-100"><Art name="trophy" size={16} />Trophées</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
