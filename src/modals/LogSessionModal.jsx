import { Art } from '../components/Art';
import { CardioInputToggles } from '../components/CardioInputToggles';
import { ELASTIC_PRESETS } from '../data/presets';
import { cardioHasElevation } from '../lib/calories';
import { openMovement } from '../lib/movement';
import { X } from '../icons';
import { isStartEntry, isTimedQuest, repUnit } from '../lib/quests';

export function LogSessionModal({
  applyCoachTarget, handleAddSetSlot, handleApplyUniformToSets, handleRemoveSetSlot, handleSaveSession, handleSetOverride, logPerSetLoad, logSetOverrides, togglePerSetLoad,
  handleUpdateSingleSetRep, liveModalCalories, logAssistanceKg, logDate, logDurationMin,
  logElevationM, logEntryMode, logModalQuest, logNote, logSetDetails, logUniformReps,
  logUniformSets, logUseAssistance, logValue, setLogAssistanceKg, setLogDate, setLogDurationMin,
  setLogElevationM, logCardioInput, setLogCardioInput, cardioFigures, setLogEntryMode, setLogModalQuest, setLogNote, setLogUseAssistance, setLogValue,
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex px-4 pt-14 sm:py-4 overflow-y-auto">
      <div className="m-auto bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{logModalQuest.icon}</span>
            <div>
              <h3 className="text-lg font-black text-white">
                {logModalQuest.name}
              </h3>
              <p className="text-xs text-pink-300 font-semibold">
                Noter la séance · niveau {logModalQuest.level || 1}
              </p>
            </div>
          </div>
          <button
            onClick={() => setLogModalQuest(null)}
            aria-label="Fermer" className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {(() => {
          const hs = (logModalQuest.history || []).filter(h => !isStartEntry(h));
          const last = hs[hs.length - 1];
          if (!last) return null;
          const txt = logModalQuest.type === 'cardio'
            ? `${last.value} ${logModalQuest.unit}${last.durationMin ? ` en ${last.durationMin} min` : ''}`
            : `${Array.isArray(last.setDetails) ? last.setDetails.join(' - ') : `${last.sets}×${last.reps}`} ${repUnit(logModalQuest)}${logModalQuest.unit === 'kg' ? ` à ${last.value} kg` : isTimedQuest(logModalQuest) ? '' : Number(last.assistanceKg) > 0 ? ` (aide ${last.assistanceKg} kg)` : ' (strict)'}`;
          return (
            <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl px-3 py-2 text-xs text-indigo-100">
              <Art name="timer" />Dernière fois ({last.date ? last.date.slice(8, 10) + '/' + last.date.slice(5, 7) : '—'}) : <b>{txt}</b> — à battre !
            </div>
          );
        })()}

        {logModalQuest.type === 'strength' && (
          <div className="flex gap-2">
          <button type="button" onClick={() => openMovement(logModalQuest)} title="Voir le mouvement (animation)" aria-label="Voir le mouvement" className="shrink-0 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold text-slate-200 whitespace-nowrap"><Art name="film" size={16} className="mr-1" />Geste</button>
          {!isTimedQuest(logModalQuest) && (
            <button type="button" onClick={applyCoachTarget} className="flex-1 py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-bold">
              <Art name="coach" />Remplir comme prévu par le coach
            </button>
          )}
          </div>
        )}

        <form onSubmit={handleSaveSession} className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
            <div>
              <label className="sr-only">
                Date de la séance
              </label>
              <input
                type="date"
                value={logDate}
                onChange={e => setLogDate(e.target.value)}
                className="w-full bg-transparent text-sm font-bold text-white focus:outline-none"
              />
            </div>
            <span className="text-xs font-bold text-slate-400 whitespace-nowrap">≈ {liveModalCalories} kcal</span>
          </div>

          {logModalQuest.type === 'strength' ? (
            <>
              {logModalQuest.unit === 'kg' && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                  <label className="block text-xs font-bold text-slate-300 mb-2">
                    <Art name="dumbbell" />Charge utilisée (en kg) — Cible :{' '}
                    <span className="text-amber-300">{logModalQuest.goalValue} kg</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setLogValue(v => Math.max(0, Number(v) - 2.5))}
                      className="shrink-0 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold"
                    >
                      -2.5
                    </button>
                    <input
                      type="number"
                      step="0.5"
                      value={logValue}
                      onChange={e => setLogValue(e.target.value)}
                      className="flex-1 min-w-0 w-full bg-slate-900 border border-slate-700 rounded-xl py-2 text-center text-lg font-black text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setLogValue(v => Number(v) + 2.5)}
                      className="shrink-0 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold"
                    >
                      +2.5
                    </button>
                  </div>
                  <label className="mt-2.5 flex items-start gap-2 text-xs text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={logPerSetLoad} onChange={e => togglePerSetLoad(e.target.checked)} className="mt-0.5" />
                    <span>
                      Charge différente selon la série <span className="text-slate-500">(ex. 2 séries à 15 kg puis 2 à 17,5 kg)</span>
                    </span>
                  </label>
                </div>
              )}

              {logModalQuest.unit === 'reps' && !isTimedQuest(logModalQuest) && (
                <div className="bg-slate-950 border border-violet-500/40 rounded-xl p-3.5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-violet-200">
                      <Art name="band" />Aide élastique (kg)
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setLogUseAssistance(false);
                          setLogAssistanceKg(0);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                          !logUseAssistance
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        Strict (0 kg)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLogUseAssistance(true);
                          if (logAssistanceKg === 0) setLogAssistanceKg(15);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                          logUseAssistance
                            ? 'bg-violet-600 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        Avec aide
                      </button>
                    </div>
                  </div>

                  {logUseAssistance && (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setLogAssistanceKg(k => Math.max(0.5, Number(k) - 2.5))
                          }
                          className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-800 text-white font-bold text-xs"
                        >
                          -2.5
                        </button>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={logAssistanceKg}
                          onChange={e => setLogAssistanceKg(e.target.value)}
                          className="flex-1 min-w-0 w-full bg-slate-900 border border-violet-500/40 rounded-lg py-1.5 text-center font-black text-violet-200 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setLogAssistanceKg(k => Number(k) + 2.5)
                          }
                          className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-800 text-white font-bold text-xs"
                        >
                          +2.5
                        </button>
                      </div>
                      <label className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer">
                        <input type="checkbox" checked={logPerSetLoad} onChange={e => togglePerSetLoad(e.target.checked)} className="mt-0.5" />
                        <span>
                          Aide différente selon la série <span className="text-slate-500">(ex. 10 kg d’aide, puis 7,5 kg)</span>
                        </span>
                      </label>

                      <details className="text-xs text-slate-400">
                        <summary className="font-bold text-slate-300">Repères par élastique</summary>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {ELASTIC_PRESETS.filter(p => p.kg > 0).map(preset => (
                          <button
                            key={preset.kg}
                            type="button"
                            onClick={() => setLogAssistanceKg(preset.kg)}
                            className={`px-2 py-1 rounded-md text-xs font-bold border ${
                              Number(logAssistanceKg) === preset.kg
                                ? 'bg-violet-600 border-violet-400 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-300'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-slate-950 border border-pink-500/40 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-pink-300 block">
                      {isTimedQuest(logModalQuest) ? 'Vos Séries & Durées (secondes)' : 'Vos Séries & Répétitions'}
                    </span>
                  </div>

                  <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setLogEntryMode('per_set')}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                        logEntryMode === 'per_set'
                          ? 'bg-pink-600 text-white'
                          : 'text-slate-400'
                      }`}
                    >
                      Série par série
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogEntryMode('uniform')}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                        logEntryMode === 'uniform'
                          ? 'bg-pink-600 text-white'
                          : 'text-slate-400'
                      }`}
                    >
                      Format uniforme
                    </button>
                  </div>
                </div>

                {logEntryMode === 'per_set' ? (
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleApplyUniformToSets(
                            logModalQuest.goalSets || 3,
                            logModalQuest.goalReps || logModalQuest.goalValue || 6
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold transition"
                      >
                        ✓ Tout remplir à l’objectif ({logModalQuest.goalSets || 3} ×{' '}
                        {logModalQuest.goalReps || logModalQuest.goalValue || 6} {repUnit(logModalQuest)})
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleRemoveSetSlot}
                          className="px-2 py-1 rounded bg-slate-800 text-xs font-bold text-slate-300 hover:text-white"
                        >
                          - Série
                        </button>
                        <button
                          type="button"
                          onClick={handleAddSetSlot}
                          className="px-2 py-1 rounded bg-slate-800 text-xs font-bold text-slate-300 hover:text-white"
                        >
                          + Série
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {logSetDetails.map((repCount, idx) => {
                        const targetR =
                          Number(logModalQuest.goalReps) ||
                          Number(logModalQuest.goalValue) ||
                          6;
                        const isSetOk = Number(repCount) >= targetR;
                        return (
                          <div
                            key={idx}
                            className={`flex items-center justify-between px-3 py-2 rounded-xl border ${
                              isSetOk
                                ? 'bg-emerald-950/30 border-emerald-500/40'
                                : 'bg-slate-900 border-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold text-white">
                                Série {idx + 1}
                              </span>
                              {isSetOk ? (
                                <span className="text-xs font-bold text-emerald-400">
                                  Validée ({repCount}/{targetR})
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  Cible : {targetR} {repUnit(logModalQuest)}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {logPerSetLoad && (logModalQuest.unit === 'kg' || logUseAssistance) && (
                                <span className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    title={logModalQuest.unit === 'kg' ? 'Charge de cette série (kg)' : 'Aide de cette série (kg)'}
                                    value={logSetOverrides[idx] ?? (logModalQuest.unit === 'kg' ? logValue : logAssistanceKg)}
                                    onChange={e => handleSetOverride(idx, e.target.value)}
                                    className={`w-16 bg-slate-950 border rounded-lg py-1 text-center font-black text-sm ${logModalQuest.unit === 'kg' ? 'border-amber-500/50 text-amber-300' : 'border-violet-500/50 text-violet-300'}`}
                                  />
                                  <span className="text-xs text-slate-500 font-bold">kg</span>
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleUpdateSingleSetRep(idx, -1)}
                                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={repCount}
                                onChange={e =>
                                  handleUpdateSingleSetRep(idx, e.target.value, true)
                                }
                                className="w-12 bg-slate-950 border border-slate-700 rounded-lg py-1 text-center font-black text-white text-sm"
                              />
                              <span className="text-xs text-slate-400 font-bold">{repUnit(logModalQuest)}</span>
                              <button
                                type="button"
                                onClick={() => handleUpdateSingleSetRep(idx, 1)}
                                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">
                        Nombre de séries
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="15"
                        value={logUniformSets}
                        onChange={e =>
                          handleApplyUniformToSets(e.target.value, logUniformReps)
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 text-center font-black text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">
                        {isTimedQuest(logModalQuest) ? 'Secondes par série' : 'Répétitions par série'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="600"
                        value={logUniformReps}
                        onChange={e =>
                          handleApplyUniformToSets(logUniformSets, e.target.value)
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 text-center font-black text-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-slate-950 border border-emerald-500/30 rounded-xl p-4 space-y-3">
              <CardioInputToggles ci={logCardioInput} setCi={setLogCardioInput} showSpeed={logModalQuest.unit === 'km' || cardioHasElevation(logModalQuest.cardioMode)} showSlope={cardioHasElevation(logModalQuest.cardioMode)} distanceKm={cardioFigures(logModalQuest).distanceKm} elevationM={cardioFigures(logModalQuest).elevationM} />
              <div className="grid grid-cols-3 gap-3">
                {!(logModalQuest.unit === 'km' && logCardioInput.inputMode === 'speed') && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    {logModalQuest.unit === 'km' ? 'Distance (km)' : 'Durée (min)'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={logValue}
                    onChange={e => setLogValue(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 text-center font-black text-white"
                  />
                </div>
                )}
                {logModalQuest.unit === 'km' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      Temps (min)
                    </label>
                    <input
                      type="number"
                      value={logDurationMin}
                      onChange={e => setLogDurationMin(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 text-center font-black text-white"
                    />
                  </div>
                )}
                {cardioHasElevation(logModalQuest.cardioMode) && logCardioInput.slopeMode !== 'percent' && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Dénivelé D+ (m)
                  </label>
                  <input
                    type="number"
                    value={logElevationM}
                    onChange={e => setLogElevationM(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 text-center font-black text-white"
                  />
                </div>
                )}
              </div>
            </div>
          )}

          <input
            type="text"
            placeholder="Note (facultatif)"
            value={logNote}
            onChange={e => setLogNote(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white"
          />

          <div className="sticky bottom-0 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 px-5 sm:px-6 py-3 bg-slate-900 border-t border-slate-800 rounded-b-2xl flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setLogModalQuest(null)}
              className="px-4 py-3 rounded-xl text-sm font-bold bg-slate-800 text-slate-300"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-none px-5 py-3 rounded-xl text-sm font-black bg-pink-600 text-white"
            >
              Valider la séance
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
