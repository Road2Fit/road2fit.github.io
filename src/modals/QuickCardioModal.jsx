import { useState } from 'react';
import { CardioInputToggles } from '../components/CardioInputToggles';
import { ACTIVITY_GROUPS } from '../data/activities';
import { EXERCISE_CATALOG, normSearch } from '../data/catalog';
import { Footprints, X } from '../icons';
import { cardioHasElevation, formatPaceAndSpeed } from '../lib/calories';

const CARDIO = EXERCISE_CATALOG.filter(c => c.type === 'cardio');

// « Activité (course, sport…) » : course, marche, sports collectifs, raquette, plein air, eau, cardio.
// Distance seulement pour les activités qui se mesurent en km ; dénivelé / pente seulement pour la course et la marche.
export function QuickCardioModal({
  handleSaveQuickCardio, liveQuickCardioCalories, quickCardioCatalogId, quickCardioDate,
  quickCardioDistanceKm, quickCardioDurationMin, quickCardioElevationM, quickCardioNote,
  quickCardioRpe, setQuickCardioCatalogId, setQuickCardioDate, setQuickCardioDistanceKm,
  setQuickCardioDurationMin, setQuickCardioElevationM, setQuickCardioModalOpen, setQuickCardioNote,
  setQuickCardioRpe, quickCardioInput, setQuickCardioInput, quickResolved, quickActivity,
}) {
  const [search, setSearch] = useState('');
  const hasElevation = cardioHasElevation(quickActivity.cardioMode);
  const hasDistance = quickActivity.unit === 'km' || hasElevation;
  const speedMode = hasDistance && quickCardioInput.inputMode === 'speed';
  const percentMode = hasElevation && quickCardioInput.slopeMode === 'percent';
  const tokens = normSearch(search).split(/\s+/).filter(Boolean);
  const visible = CARDIO.filter(c => c.id === quickCardioCatalogId || tokens.every(t => normSearch(`${c.name} ${c.group || ''} ${c.brands || ''}`).includes(t)));
  const groups = [...ACTIVITY_GROUPS, ...new Set(visible.map(c => c.group).filter(g => !ACTIVITY_GROUPS.includes(g)))];
  const field = 'w-full bg-slate-950 border border-slate-700 rounded-xl py-2 text-center font-black text-white text-sm';
  const cols = (hasDistance && !speedMode ? 1 : 0) + 1 + (hasElevation && !percentMode ? 1 : 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex p-4 pt-20 pb-24 sm:py-4 overflow-y-auto">
      <div className="m-auto bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Footprints className="w-6 h-6 text-emerald-400" />
            <div>
              <h3 className="text-base font-black text-white">Ajouter une activité annexe</h3>
              <p className="text-xs text-slate-400">Sport collectif, plein air, cardio, course ou marche : s’ajoute au bilan calorique et au Journal</p>
            </div>
          </div>
          <button onClick={() => setQuickCardioModalOpen(false)} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSaveQuickCardio} className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300" htmlFor="activity-select">Activité</label>
            <input
              type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher (football, vélo, randonnée, zumba…)"
              aria-label="Rechercher une activité"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            />
            <select
              id="activity-select" value={quickCardioCatalogId} onChange={e => setQuickCardioCatalogId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white"
            >
              {groups.map(g => {
                const list = visible.filter(c => c.group === g);
                return list.length ? (
                  <optgroup key={g} label={g}>
                    {list.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </optgroup>
                ) : null;
              })}
            </select>
          </div>

          {(hasDistance || hasElevation) && (
            <CardioInputToggles ci={quickCardioInput} setCi={setQuickCardioInput} showSpeed={hasDistance} showSlope={hasElevation} distanceKm={quickResolved.distanceKm} elevationM={quickResolved.elevationM} />
          )}

          <div className={`grid gap-2.5 ${cols === 3 ? 'grid-cols-3' : cols === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {hasDistance && !speedMode && (
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Distance (km)</label>
                <input type="number" step="0.1" min="0.1" value={quickCardioDistanceKm} onChange={e => setQuickCardioDistanceKm(e.target.value)} className={field} />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Durée (min)</label>
              <input type="number" min="1" value={quickCardioDurationMin} onChange={e => setQuickCardioDurationMin(e.target.value)} className={field} />
            </div>
            {hasElevation && !percentMode && (
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Dénivelé D+ (m)</label>
                <input type="number" min="0" value={quickCardioElevationM} onChange={e => setQuickCardioElevationM(e.target.value)} className={field} />
              </div>
            )}
          </div>

          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between text-xs">
            {hasDistance ? (
              <div>
                <span className="text-slate-400 block">Allure & Vitesse</span>
                <span className="font-extrabold text-emerald-300">
                  {formatPaceAndSpeed(quickResolved.distanceKm, quickCardioDurationMin).pace} • {formatPaceAndSpeed(quickResolved.distanceKm, quickCardioDurationMin).speed}
                </span>
              </div>
            ) : (
              <div>
                <span className="text-slate-400 block">Durée</span>
                <span className="font-extrabold text-emerald-300">{quickCardioDurationMin} min</span>
              </div>
            )}
            <div className="text-right">
              <span className="text-orange-300 block font-bold">Dépense estimée</span>
              <span className="text-base font-black text-orange-300">🔥 {liveQuickCardioCalories} kcal</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Date</label>
              <input type="date" value={quickCardioDate} onChange={e => setQuickCardioDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Intensité RPE ({quickCardioRpe}/10)</label>
              <input type="range" min="1" max="10" value={quickCardioRpe} onChange={e => setQuickCardioRpe(Number(e.target.value))} className="w-full accent-emerald-500 mt-2" />
            </div>
          </div>

          <input
            type="text" placeholder="Note (ex : match du jeudi, sortie du dimanche…)" value={quickCardioNote} onChange={e => setQuickCardioNote(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
          />

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setQuickCardioModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300">Annuler</button>
            <button type="submit" className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg">Ajouter au Bilan du Jour</button>
          </div>
        </form>
      </div>
    </div>
  );
}
