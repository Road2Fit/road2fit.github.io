import { X } from '../icons';
import { isTimedQuest } from '../lib/quests';
import { pick } from '../edition';

export function LevelUpModal({
  handleConfirmLevelUp, levelUpModalQuest, nextGoalAssistanceKg, nextGoalMode, nextGoalReps,
  nextGoalSets, nextGoalValue, setLevelUpModalQuest, setNextGoalAssistanceKg, setNextGoalMode,
  setNextGoalReps, setNextGoalSets, setNextGoalValue,
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex p-4 pt-20 pb-24 sm:py-4 overflow-y-auto">
      <div className="m-auto bg-slate-900 border-2 border-amber-400/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-2xl">
              👑
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                {pick('🎵 ♪ Rondoudouuuu ! ♪ Objectif Validé !', '✅ Objectif atteint !')}
              </span>
              <h3 className="text-lg font-black text-white">
                {levelUpModalQuest.name} passe au Niveau {(Number(levelUpModalQuest.level) || 1) + 1} !
              </h3>
            </div>
          </div>
          <button
            onClick={() => setLevelUpModalQuest(null)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConfirmLevelUp} className="space-y-4">
          <p className="text-xs text-slate-300">
            Choisis maintenant ton <strong>nouvel objectif plus difficile</strong> pour viser le{' '}
            <strong className="text-amber-300">
              Niveau {(Number(levelUpModalQuest.level) || 1) + 2}
            </strong>{' '}
            (+300 EXP bonus) :
          </p>

          {levelUpModalQuest.type === 'strength' ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'weight_only', label: '🏋️ Poids (kg)' },
                  { id: 'reps_only', label: '🔁 Répétitions' },
                  { id: 'sets_reps', label: '🛡️ Séries × Reps' }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setNextGoalMode(m.id)}
                    className={`p-2 rounded-xl text-xs font-extrabold border transition ${
                      nextGoalMode === m.id
                        ? 'bg-pink-600 border-pink-400 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {levelUpModalQuest.unit === 'kg' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setNextGoalValue(v => +(Number(v) + 2.5).toFixed(1))}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/40"
                    >
                      +2.5 kg
                    </button>
                    <button
                      type="button"
                      onClick={() => setNextGoalValue(v => +(Number(v) + 5).toFixed(1))}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/40"
                    >
                      +5 kg
                    </button>
                  </>
                )}
                {levelUpModalQuest.unit === 'reps' && !isTimedQuest(levelUpModalQuest) && (
                  <button
                    type="button"
                    onClick={() =>
                      setNextGoalAssistanceKg(a => Math.max(0, Number(a) - 5))
                    }
                    className="px-2.5 py-1 rounded-lg bg-violet-500/20 text-violet-300 text-xs font-bold border border-violet-500/40"
                  >
                    -5 kg d’élastique
                  </button>
                )}
                {nextGoalMode !== 'weight_only' && (
                  <button
                    type="button"
                    onClick={() => setNextGoalReps(r => Number(r) + (isTimedQuest(levelUpModalQuest) ? 10 : 2))}
                    className="px-2.5 py-1 rounded-lg bg-pink-500/20 text-pink-300 text-xs font-bold border border-pink-500/40"
                  >
                    {isTimedQuest(levelUpModalQuest) ? '+10 s' : '+2 reps'}
                  </button>
                )}
                {nextGoalMode === 'sets_reps' && (
                  <button
                    type="button"
                    onClick={() => setNextGoalSets(s => Number(s) + 1)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/40"
                  >
                    +1 série
                  </button>
                )}
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                {(levelUpModalQuest.unit === 'kg' || nextGoalMode === 'weight_only') && (
                  <div>
                    <label className="block text-xs font-bold text-amber-300 mb-1">
                      Nouvelle Charge Cible (kg)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={nextGoalValue}
                      onChange={e => setNextGoalValue(e.target.value)}
                      className="w-full bg-slate-900 border border-amber-500/40 rounded-xl py-2 text-center font-black text-amber-300 text-base"
                    />
                  </div>
                )}

                {nextGoalMode === 'sets_reps' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Séries Cibles
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={nextGoalSets}
                        onChange={e => setNextGoalSets(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 text-center font-black text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        {isTimedQuest(levelUpModalQuest) ? 'Secondes par Série' : 'Répétitions par Série'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={nextGoalReps}
                        onChange={e => setNextGoalReps(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 text-center font-black text-white"
                      />
                    </div>
                  </div>
                )}

                {nextGoalMode === 'reps_only' && (
                  <div>
                    <label className="block text-xs font-bold text-pink-300 mb-1">
                      {isTimedQuest(levelUpModalQuest) ? 'Nouvel Objectif de Durée (secondes)' : 'Nouvel Objectif de Répétitions'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={nextGoalReps}
                      onChange={e => setNextGoalReps(e.target.value)}
                      className="w-full bg-slate-900 border border-pink-500/40 rounded-xl py-2 text-center font-black text-white"
                    />
                  </div>
                )}

                {levelUpModalQuest.unit === 'reps' && !isTimedQuest(levelUpModalQuest) && (
                  <div>
                    <label className="block text-xs font-bold text-violet-300 mb-1">
                      🪢 Aide Élastique Cible en kg (0 = Strict)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={nextGoalAssistanceKg}
                      onChange={e => setNextGoalAssistanceKg(e.target.value)}
                      className="w-full bg-slate-900 border border-violet-500/40 rounded-xl py-2 text-center font-black text-violet-200"
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <label className="block text-xs font-bold text-emerald-300 mb-1">
                Nouvel Objectif Cardio ({levelUpModalQuest.unit})
              </label>
              <input
                type="number"
                step="0.5"
                value={nextGoalValue}
                onChange={e => setNextGoalValue(e.target.value)}
                className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl py-2 text-center font-black text-emerald-300 text-base"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setLevelUpModalQuest(null)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300"
            >
              Plus tard
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 text-slate-950 shadow-lg"
            >
              Valider Niveau {(Number(levelUpModalQuest.level) || 1) + 1} (+300 EXP)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
