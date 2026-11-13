import { useState } from 'react';
import { QuestChart } from '../components/QuestChart';
import { MaxCard } from '../components/MaxCard';
import { MaximaSources } from '../components/MaximaSources';
import { estimateQuestMax } from '../lib/maxima';
import { coachStep } from '../coach/settings';
import { getTodayISODate } from '../lib/dates';
import { Art } from '../components/Art';
import { assistText } from '../lib/assist';
import { ARENA_GROUPS } from '../data/arenas';
import { openMovement } from '../lib/movement';
import { Crown, Play, Plus, Shield, Sliders, Trash2, TrendingUp } from '../icons';
import { cardioHasElevation, formatPaceAndSpeed } from '../lib/calories';
import { evaluateQuestProgress } from '../lib/progress';
import { formatSetsBreakdown, getSetDetailsArray, isTimedQuest, repUnit } from '../lib/quests';
import { cleanText, pick } from '../edition';
import { arenaLabel, hasArena } from '../data/muscles';

export function QuestsTab({
  arenaLevels = [], filteredQuests, gameState, setGameState, handleDeleteQuest, openCreateQuestModal, openEditQuestModal,
  openLevelUpModal, openLogModal, questFilter, setActiveTab, setQuestFilter,
  setSelectedChartQuestId,
}) {
  const [openId, setOpenIdRaw] = useState(null);
  const [showChart, setShowChart] = useState(false);
  const [showMax, setShowMax] = useState(false);
  const setOpenId = id => { setOpenIdRaw(id); setShowChart(false); setShowMax(false); };
  // maximum de l'exercice (effort ressenti toujours pris en compte) et record réel noté à la main
  const saveRecord = (id, rec) => setGameState && setGameState(prev => ({ ...prev, maxRecords: { ...(prev.maxRecords || {}), [id]: { ...rec, date: getTodayISODate() } } }));
  const clearRecord = id => setGameState && setGameState(prev => { const { [id]: _r, ...rest } = prev.maxRecords || {}; return { ...prev, maxRecords: rest }; });
  const openQuest = openId ? gameState.quests.find(q => q.id === openId) : null;
  // fiche complète d'un exercice (objectif, progression, noter la séance, geste, courbe, réglages) : dans la fenêtre
  const renderCard = quest => {
            const evalState = evaluateQuestProgress(quest);
            const lastEntry =
              quest.history && quest.history.length > 0
                ? quest.history[quest.history.length - 1]
                : null;
            const goalMode = quest.goalMode || 'sets_reps';
            const goalSets = Math.max(1, Number(quest.goalSets) || 3);
            const goalReps = Math.max(
              1,
              Number(quest.goalReps) || Number(quest.goalValue) || 6
            );
            const currentSetsArray =
              quest.type === 'strength'
                ? getSetDetailsArray(quest, goalSets, goalReps)
                : [];
            const questLevel = Number(quest.level) || 1;

            return (
              <div
                key={quest.id}
                className={`rounded-2xl border p-4 ${evalState.isBossDefeated ? 'bg-slate-900 border-amber-400/70' : 'bg-slate-900/90 border-slate-800'}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl shrink-0">{quest.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-extrabold text-white leading-snug">{quest.name}</h3>
                    <p className="text-sm text-slate-300">
                      {quest.type === 'strength'
                        ? goalMode === 'weight_only' ? `Objectif ${quest.goalValue} kg`
                          : goalMode === 'reps_only' ? `Objectif ${goalReps} ${repUnit(quest)}`
                          : goalMode === 'free_mode' ? 'Entraînement libre'
                          : `Objectif ${goalSets} × ${goalReps} ${repUnit(quest)}`
                        : goalMode === 'free_mode' ? 'Entraînement libre' : `Objectif ${quest.goalValue} ${quest.unit}`}
                      {quest.unit === 'kg' && goalMode !== 'weight_only' ? ` · ${quest.currentValue} kg` : ''}
                      {quest.unit === 'reps' && Number(quest.currentAssistanceKg) ? ` · ${assistText(quest.currentAssistanceKg)}` : ''}
                    </p>
                    <p className="text-xs text-slate-500">Niv. {questLevel} · {arenaLabel(quest)}</p>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between items-center text-xs font-bold mb-1">
                    <span className="text-slate-400">Vers le niveau {questLevel + 1}</span>
                    <span className={evalState.isBossDefeated ? 'text-amber-300' : 'text-pink-300'}>{evalState.percent} %</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${evalState.isBossDefeated ? 'bg-amber-400' : quest.type === 'cardio' ? 'bg-emerald-500' : 'bg-pink-500'}`} style={{ width: `${evalState.percent}%` }} />
                  </div>
                </div>

                {evalState.isBossDefeated && (
                  <button type="button" onClick={() => { setOpenId(null); openLevelUpModal(quest); }} className="mt-3 w-full py-2.5 px-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 bg-amber-400 text-slate-950">
                    <Art name="crown" size={18} bare />
                    <span>Objectif atteint ! Passer au niveau {questLevel + 1}</span>
                  </button>
                )}

                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => { setOpenId(null); openLogModal(quest); }} className="flex-1 px-3.5 py-2.5 rounded-xl font-bold text-sm bg-pink-600 hover:bg-pink-500 text-white flex items-center justify-center gap-1.5 transition">
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Noter la séance</span>
                  </button>
                  {quest.type === 'strength' && (
                    <button type="button" onClick={() => openMovement(quest)} title="Voir le mouvement (animation)" aria-label="Voir le mouvement" className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold text-slate-200 whitespace-nowrap"><Art name="film" size={16} className="mr-1" />Geste</button>
                  )}
                  <button
                    onClick={() => setShowChart(v => !v)}
                    title="Voir la courbe de progression"
                    aria-label="Voir la courbe de progression"
                    aria-pressed={showChart}
                    data-testid="quest-chart-toggle"
                    className={`p-2.5 rounded-xl transition ${showChart ? 'bg-pink-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                  >
                    <Art name="chart" size={18} bare />
                  </button>
                  <button type="button" onClick={() => setShowMax(v => !v)} title="Mon maximum" aria-label="Mon maximum" aria-pressed={showMax} data-testid="quest-max-toggle"
                    className={`p-2.5 rounded-xl transition ${showMax ? 'bg-pink-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}>
                    <Art name="gauge" size={18} bare />
                  </button>
                </div>

                <details className="mt-2 group" open>
                  <summary className="text-xs font-bold text-slate-400 py-1.5"><Art name="gear" size={15} className="mr-1" />Détails et réglages</summary>
                  {quest.type === 'strength' ? (
                    <div className="mt-4 bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <Shield className="w-4 h-4 text-pink-400" />
                          {goalMode === 'weight_only' ? (
                            <span>
                              Charge actuelle :{' '}
                              <strong className="text-white">{quest.currentValue} kg</strong> /{' '}
                              <strong className="text-amber-300">{quest.goalValue} kg</strong>
                            </span>
                          ) : goalMode === 'reps_only' ? (
                            <span>
                              Record :{' '}
                              <strong className="text-white">
                                {Math.max(...currentSetsArray, Number(quest.currentValue) || 0)} {repUnit(quest)}
                              </strong>{' '}
                              / Cible <strong className="text-amber-300">{goalReps} {repUnit(quest)}</strong>
                            </span>
                          ) : (
                            <span>
                              {pick('Poké-Séries validées', 'Séries validées')} :{' '}
                              <strong className="text-white">
                                {Math.min(evalState.validatedSets, goalSets)} / {goalSets} séries de {goalReps} {repUnit(quest)}
                              </strong>
                            </span>
                          )}
                        </div>

                        {isTimedQuest(quest) ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                            Chronométré • Cible {quest.goalValue || goalReps} s
                          </span>
                        ) : quest.unit === 'reps' ? (
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                              (Number(quest.currentAssistanceKg) || 0) > 0
                                ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            }`}
                          >
                            {(Number(quest.currentAssistanceKg) || 0) > 0
                              ? `Aide : -${quest.currentAssistanceKg} kg (Cible : ${
                                  Number(quest.goalAssistanceKg) > 0
                                    ? `-${quest.goalAssistanceKg} kg`
                                    : 'Strict 0 kg'
                                })`
                              : 'Strict • 0 kg d’aide'}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            {quest.currentValue} kg / Cible {quest.goalValue} kg
                          </span>
                        )}
                      </div>

                      {goalMode === 'sets_reps' && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {Array.from({
                            length: Math.max(goalSets, currentSetsArray.length)
                          }).map((_, idx) => {
                            const repDone = Number(currentSetsArray[idx]) || 0;
                            const isValidated = repDone >= goalReps;
                            return (
                              <div
                                key={idx}
                                className={`px-2.5 py-2 rounded-xl border flex items-center justify-between text-xs font-bold transition ${
                                  isValidated
                                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                                    : 'bg-slate-900 border-slate-800 text-slate-400'
                                }`}
                              >
                                <span className="text-xs uppercase tracking-wider">
                                  Série {idx + 1}
                                </span>
                                <span className="flex items-center gap-1 font-black">
                                  {repDone}/{goalReps}
                                  {isValidated ? (
                                    <span title={pick('Pokéball validée', 'Série validée')}>{pick('🔴', '✅')}</span>
                                  ) : (
                                    <span className="text-xs text-amber-400">⚪</span>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                        <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800/80">
                          <span className="text-xs uppercase text-slate-400 block">
                            Départ (Niv.{questLevel})
                          </span>
                          <span className="font-bold text-slate-200">
                            {quest.unit === 'kg'
                              ? `${quest.startValue} kg`
                              : `${quest.startValue} ${repUnit(quest)}`}
                          </span>
                          {quest.unit === 'reps' && !isTimedQuest(quest) && (
                            <span className="block text-xs text-violet-300">
                              {Number(quest.startAssistanceKg) > 0
                                ? `Aide ${quest.startAssistanceKg}kg`
                                : 'Strict 0kg'}
                            </span>
                          )}
                        </div>

                        <div className="bg-pink-950/30 rounded-lg p-2 border border-pink-500/30">
                          <span className="text-xs uppercase text-pink-300 block">
                            Actuel
                          </span>
                          <span className="font-extrabold text-white">
                            {goalMode === 'weight_only'
                              ? `${quest.currentValue} kg`
                              : `${formatSetsBreakdown(currentSetsArray)} ${repUnit(quest)}`}
                          </span>
                          <span className="block text-xs text-pink-300">
                            {quest.unit === 'kg'
                              ? `Barre à ${quest.currentValue} kg`
                              : isTimedQuest(quest) ? 'Chronométré'
                              : Number(quest.currentAssistanceKg) > 0
                              ? `Aide ${quest.currentAssistanceKg}kg`
                              : 'Strict 0kg'}
                          </span>
                        </div>

                        <div className="bg-amber-950/30 rounded-lg p-2 border border-amber-500/30">
                          <span className="text-xs uppercase text-amber-300 block">
                            Objectif Niv.{questLevel + 1}
                          </span>
                          <span className="font-extrabold text-amber-300">
                            {goalMode === 'weight_only'
                              ? `${quest.goalValue} kg`
                              : goalMode === 'reps_only'
                              ? `${goalReps} ${repUnit(quest)}`
                              : `${goalSets} × ${goalReps} ${repUnit(quest)}`}
                          </span>
                          <span className="block text-xs text-amber-200/80">
                            {quest.unit === 'kg'
                              ? `à ${quest.goalValue} kg`
                              : isTimedQuest(quest) ? 'par série'
                              : Number(quest.goalAssistanceKg) > 0
                              ? `Aide ${quest.goalAssistanceKg}kg`
                              : 'Strict 0kg'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 space-y-2.5">
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-slate-900 rounded-lg p-2 border border-slate-800">
                          <span className="text-xs uppercase text-slate-400 block">
                            Départ (Niv.{questLevel})
                          </span>
                          <span className="font-bold text-slate-200">
                            {quest.startValue} {quest.unit}
                          </span>
                        </div>
                        <div className="bg-emerald-950/40 rounded-lg p-2 border border-emerald-500/30">
                          <span className="text-xs uppercase text-emerald-300 block">
                            Record Actuel
                          </span>
                          <span className="font-extrabold text-white">
                            {quest.currentValue} {quest.unit}
                          </span>
                        </div>
                       <div className="bg-amber-950/30 rounded-lg p-2 border border-amber-500/30">
                          <span className="text-xs uppercase text-amber-300 block">
                            {goalMode === 'free_mode' ? 'Objectif' : `Objectif Niv.${questLevel + 1}`}
                          </span>
                          <span className="font-extrabold text-amber-300">
                            {goalMode === 'free_mode' ? 'Libre' : `${quest.goalValue} ${quest.unit}`}
                          </span>
                        </div>
                      </div>
                      {quest.unit === 'km' && quest.durationMin && (
                        <div className="flex flex-wrap items-center justify-between text-xs text-slate-300 px-1 pt-1">
                          <span>
                            Allure :{' '}
                            <strong className="text-emerald-300">
                              {formatPaceAndSpeed(quest.currentValue, quest.durationMin).pace}
                            </strong>{' '}
                            ({formatPaceAndSpeed(quest.currentValue, quest.durationMin).speed})
                          </span>
                          {cardioHasElevation(quest.cardioMode) && <span>D+ : {quest.elevationM || 0} m</span>}
                        </div>
                      )}
                    </div>
                  )}

                  
                  <p className="mt-3 text-xs text-slate-400">
                    {lastEntry ? <>Dernière séance : {lastEntry.calories || 45} kcal{lastEntry.note ? ` · ${cleanText(lastEntry.note)}` : ''}</> : 'Aucune séance notée'}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {!evalState.isBossDefeated && (
                      <button type="button" onClick={() => { setOpenId(null); openLevelUpModal(quest); }} className="flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300">
                        <Art name="crown" size={18} bare />
                        <span>Valider l’objectif et passer au niveau {questLevel + 1}</span>
                      </button>
                    )}
                    <button onClick={() => { setOpenId(null); openEditQuestModal(quest); }} title="Ajuster l'objectif" className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition">
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Ajuster</span>
                    </button>
                    <button onClick={() => { setOpenId(null); handleDeleteQuest(quest.id); }} title="Supprimer cet exercice" aria-label="Supprimer cet exercice" className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </details>
              </div>
            );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1 md:flex-wrap md:overflow-visible md:mx-0 md:px-0" role="group" aria-label="Filtrer par muscle" data-testid="muscle-filters">
        <button
          onClick={() => setQuestFilter('all')}
          className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold transition ${
            questFilter === 'all'
              ? 'bg-pink-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          {pick('Toutes les Arènes', 'Tous les groupes')} ({gameState.quests.length})
        </button>
        {ARENA_GROUPS.filter(g => questFilter === g.id || gameState.quests.some(q => hasArena(q, g.id))).map(g => (
          <button
            key={g.id}
            onClick={() => setQuestFilter(g.id)}
            className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              questFilter === g.id
                ? 'bg-pink-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {g.icon} {g.label}
          </button>
        ))}
      </div>

      {gameState.quests.length === 0 ? (
        <div className="bg-slate-900/70 border border-pink-500/30 rounded-2xl p-8 text-center space-y-3">
          <p className="text-4xl">👋</p>
          <p className="text-lg font-black text-white">Bienvenue !</p>
          <p className="text-sm text-slate-300">Ajoute ton premier exercice : le coach te proposera ensuite tes séances, avec les charges et les répétitions.</p>
          <button
            onClick={openCreateQuestModal}
            className="px-4 py-2.5 rounded-xl text-sm font-black bg-pink-600 hover:bg-pink-500 text-white inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Ajouter mon premier exercice
          </button>
        </div>
      ) : filteredQuests.length === 0 ? (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <p className="text-sm font-bold text-slate-300">
            Aucun exercice actif dans cette catégorie.
          </p>
          <button
            onClick={openCreateQuestModal}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-500 text-white inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Ajouter un exercice
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2" data-testid="quest-list">
          {filteredQuests.map(quest => {
            const done = evaluateQuestProgress(quest).isBossDefeated;
            return (
              <div key={quest.id} className="relative">
                <button type="button" onClick={() => setOpenId(quest.id)} data-testid="quest-tile" aria-label={quest.name}
                  className={`w-full h-full flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 min-h-[6.5rem] text-center ${done ? 'bg-slate-900 border-amber-400/70' : 'bg-slate-900/90 border-slate-800 hover:border-slate-600'}`}>
                  <span className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-2xl">{quest.icon}</span>
                  <span className="text-sm font-bold text-white leading-tight line-clamp-2">{quest.name}</span>
                </button>
                {/* objectif atteint (record battu) : une coupe ; la toucher ouvre la validation du niveau suivant */}
                {done && (
                  <button type="button" onClick={() => openLevelUpModal(quest)} aria-label={`Valider le record : ${quest.name}`} data-testid="quest-record"
                    className="tap-free absolute -top-2 -right-2 w-10 h-10 rounded-full bg-amber-400 border-2 border-slate-950 flex items-center justify-center shadow-lg animate-pulse">
                    <Art name="trophy" size={22} bare />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {openQuest && (
        <div className="fixed inset-0 z-[55] bg-slate-950/80 backdrop-blur-sm overflow-y-auto" onClick={() => setOpenId(null)}>
          {/* min-h-full + flex à l'intérieur : la fiche reste en bas (ou au centre) mais défile entièrement quand elle est plus haute que l'écran */}
          <div className="min-h-full flex items-end sm:items-center justify-center px-3 pt-14 pb-3">
          <div className="relative w-full max-w-lg" onClick={e => e.stopPropagation()} role="dialog" aria-label={openQuest.name} data-testid="quest-sheet">
            <button type="button" onClick={() => setOpenId(null)} aria-label="Fermer" className="absolute -top-11 right-0 w-9 h-9 rounded-lg bg-slate-800 text-slate-300 font-black">✕</button>
            {renderCard(openQuest)}
            {showMax && (
              <div className="mt-2 space-y-2" data-testid="quest-max">
                <MaxCard quest={openQuest} result={estimateQuestMax(openQuest, gameState, { useRpe: true, today: getTodayISODate() })} step={coachStep(openQuest, Number(openQuest.currentValue) || 0)}
                  onSave={rec => saveRecord(openQuest.id, rec)} onClear={() => clearRecord(openQuest.id)} />
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3"><MaximaSources /></div>
              </div>
            )}
            {showChart && <div className="mt-2 bg-slate-900 border border-slate-800 rounded-2xl p-3" data-testid="quest-chart"><QuestChart quest={openQuest} /></div>}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
