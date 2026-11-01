import { cleanText } from '../edition';
import { formatDayFr } from '../lib/dates';
import { cardioHasElevation } from '../lib/calories';
import { useState } from 'react';
import { EntryEditor } from '../components/EntryEditor';

import { Calendar, Trash2 } from '../icons';
import { isTimedQuest, repUnit } from '../lib/quests';
import { fmtLoads, isMixed } from '../lib/setLoads';
import { arenaLabel } from '../data/muscles';

export function JournalTab({ activeJournalDayObj, dailyJournalList, handleDeleteSessionEntry, handleEditSessionEntry, setSelectedJournalDay }) {
  const [editingId, setEditingId] = useState(null);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <div className="lg:col-span-4 space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-pink-300 flex items-center gap-2">
          <Calendar className="w-4 h-4" /> Jours d’entraînement ({dailyJournalList.length})
        </h3>

        {dailyJournalList.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-400">
            Aucune séance enregistrée pour le moment.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {dailyJournalList.map(dayObj => {
              const isSelected = activeJournalDayObj?.date === dayObj.date;
              return (
                <button
                  key={dayObj.date}
                  type="button"
                  onClick={() => setSelectedJournalDay(dayObj.date)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition flex flex-col gap-2 ${
                    isSelected
                      ? 'bg-slate-800 border-pink-400'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white flex items-center gap-2">
                      {formatDayFr(dayObj.date)}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-orange-500/20 text-orange-300 text-xs font-extrabold border border-orange-500/30">
                      {dayObj.totalKcal} kcal
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                      {dayObj.items.length} exercice(s)
                    </span>
                    {dayObj.improvedCount > 0 && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                        Progrès sur {dayObj.improvedCount} exo(s)
                      </span>
                    )}
                    {dayObj.goalsBeatenCount > 0 && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-black border border-amber-500/40">
                        {dayObj.goalsBeatenCount} Objectif(s) Battu(s)
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="lg:col-span-8">
        {activeJournalDayObj ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-pink-400">
                  Rapport Détaillé de la Journée
                </span>
                <h3 className="text-xl font-black text-white mt-0.5">
                  Séance du {formatDayFr(activeJournalDayObj.date)}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-300 text-xs font-black">
                  {activeJournalDayObj.totalKcal} kcal brûlées
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-black">
                  {activeJournalDayObj.totalSets} séries ({activeJournalDayObj.totalReps} reps)
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {activeJournalDayObj.items.map(({ entry, quest, setsArr, comparison }, idx) => (
                <div
                  key={entry.id || idx}
                  className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl">
                        {quest.icon}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-extrabold text-white text-base">
                            {quest.name}
                          </h4>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-xs font-bold text-slate-300">
                            {arenaLabel(quest)}
                          </span>
                          {comparison.goalBeaten && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 text-xs font-black">
                              OBJECTIF BATTU !
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{cleanText(entry.note)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-orange-500/15 text-orange-300 font-bold text-xs">
                        {entry.calories || 45} kcal
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingId(editingId === entry.id ? null : entry.id)}
                        title="Corriger cette séance (répétitions, charge, aide…)"
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-pink-950/60 text-slate-300 hover:text-pink-200 border border-slate-800 hover:border-pink-500/40 transition text-xs font-bold flex items-center gap-1"
                      >
                        ✏️ <span>Corriger</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSessionEntry(quest.id, entry.id)}
                        title="Supprimer cette séance"
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-500/40 text-xs font-bold flex items-center gap-1 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Supprimer</span>
                      </button>
                    </div>
                  </div>

                  {editingId === entry.id && (
                    <EntryEditor
                      entry={entry}
                      quest={quest}
                      onCancel={() => setEditingId(null)}
                      onSave={patch => {
                        handleEditSessionEntry(quest.id, entry.id, patch);
                        setEditingId(null);
                      }}
                    />
                  )}

                  {quest.type === 'strength' ? (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {quest.unit === 'kg' && (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-extrabold">
                          {isMixed(entry.setLoads) ? `Charges : ${fmtLoads(entry.setLoads)}` : `Charge : ${entry.value} kg`}
                        </span>
                      )}
                      {quest.unit === 'reps' && !isTimedQuest(quest) && (
                        <span className="px-2.5 py-1 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-extrabold">
                          {isMixed(entry.setAssists)
                            ? `Aide élastique : -${fmtLoads(entry.setAssists)}`
                            : (Number(entry.assistanceKg) || 0) > 0
                            ? `Aide élastique : -${entry.assistanceKg} kg`
                            : 'Strict (0 kg d’aide)'}
                        </span>
                      )}
                      {setsArr.map((r, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200"
                        >
                          Série {sIdx + 1} : <strong className="text-pink-300">{r} {repUnit(quest)}</strong>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-300 font-bold">
                      <span>Distance/Durée : {entry.value} {quest.unit}</span>
                      {entry.durationMin && <span>Temps : {entry.durationMin} min</span>}
                      {entry.elevationM !== undefined && cardioHasElevation(quest.cardioMode) && <span>D+ : {entry.elevationM} m</span>}
                    </div>
                  )}

                  <div
                    className={`rounded-xl p-3 border text-xs space-y-1.5 ${
                      comparison.improved || comparison.goalBeaten
                        ? 'bg-emerald-950/25 border-emerald-500/40'
                        : 'bg-slate-900/70 border-slate-800'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-extrabold uppercase tracking-wider text-xs text-slate-300">
                        Comparaison avec la séance précédente
                      </span>
                      {!comparison.isFirst && (
                        <span className="text-xs font-bold text-slate-300">
                          {comparison.prevSummary} <span className="text-pink-400">➔</span>{' '}
                          <strong className="text-white">{comparison.currSummary}</strong>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {comparison.badges.length > 0 ? (
                        comparison.badges.map((b, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-xs"
                          >
                            {b}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 text-xs">
                          Maintien des acquis (même charge / volume que la séance précédente).
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
