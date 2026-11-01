import { Art } from './Art';
import { useState } from 'react';
import { Calendar, Flame, Trash2 } from '../icons';
import { formatSetsBreakdown, getSetDetailsArray } from '../lib/quests';
import { pick } from '../edition';

export function DailySummary({ dailySummary, handleDeleteSessionEntry, selectedDate, setSelectedDate }) {
  // la liste des séances du jour est repliée par défaut (gain de place sur téléphone)
  const [showActs, setShowActs] = useState(false);
  return (
    <section className="bg-gradient-to-r from-slate-900 via-slate-900/95 to-pink-950/30 border border-slate-800 rounded-2xl p-3 sm:p-5 shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 text-sm font-black text-white">
              <Art name="flame" size={18} bare /> Calories du jour
            </span>
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1">
              <Calendar className="w-3.5 h-3.5 text-pink-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none"
              />
            </div>
          </div>
          <p className="hidden sm:block text-xs text-slate-400">
            Calories brûlées ce jour-là{pick(' par Rondoudou', '')}. La poubelle à droite d’une séance la supprime en cas d’erreur.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl px-3 py-2 text-center">
            <span className="text-xs font-bold uppercase text-slate-400 block">
              <Art name="dumbbell" />Musculation
            </span>
            <span className="text-sm sm:text-base font-black text-pink-300">
              {dailySummary.strengthKcal} kcal
            </span>
          </div>
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl px-3 py-2 text-center">
            <span className="text-xs font-bold uppercase text-slate-400 block">
              <Art name="runner" />Course / Cardio
            </span>
            <span className="text-sm sm:text-base font-black text-emerald-300">
              {dailySummary.cardioKcal} kcal
            </span>
          </div>
          <div className="bg-gradient-to-br from-orange-500/20 to-rose-500/20 border border-orange-500/40 rounded-xl px-3 py-2 text-center">
            <span className="text-xs font-bold uppercase text-orange-300 block">
              <Art name="flame" />Total Jour
            </span>
            <span className="text-sm sm:text-base font-black text-orange-300">
              {dailySummary.totalKcal} kcal
            </span>
          </div>
        </div>
      </div>

      {dailySummary.activities.length > 0 && (
        <button type="button" onClick={() => setShowActs(v => !v)} aria-expanded={showActs} className="mt-3 w-full text-left text-xs font-bold text-sky-300">
          {showActs ? '▾ Masquer' : '▸ Voir'} les {dailySummary.activities.length} séance(s) de ce jour
        </button>
      )}
      {dailySummary.activities.length > 0 && showActs && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap gap-2">
          {dailySummary.activities.map(act => {
            const setsArr =
              act.questType === 'strength'
                ? getSetDetailsArray(act, act.goalSets, act.goalReps)
                : [];
            return (
              <div
                key={act.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-slate-700 text-xs transition"
              >
                <span>{act.questIcon}</span>
                <span className="font-bold text-white">{act.questName}</span>
                {act.questType === 'cardio' ? (
                  <span className="text-emerald-300 font-semibold">
                    {act.value} {act.questUnit} ({act.durationMin || 25} min)
                  </span>
                ) : (
                  <span className="text-pink-300 font-semibold">
                    {act.questUnit === 'kg' ? `${act.value} kg • ` : ''}
                    [{formatSetsBreakdown(setsArr)} {act.questTimed ? 's' : 'reps'}]
                    {act.questUnit === 'reps' && !act.questTimed && (
                      <span className="ml-1 text-violet-300">
                        ({act.assistanceKg > 0 ? `Aide ${act.assistanceKg}kg` : 'Strict 0kg'})
                      </span>
                    )}
                  </span>
                )}
                <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold text-xs">
                  {act.calories || 0} kcal
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteSessionEntry(act.questId, act.id)}
                  title="Supprimer cette séance entrée par erreur"
                  className="ml-1 p-1 rounded-lg bg-slate-900 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/40 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
