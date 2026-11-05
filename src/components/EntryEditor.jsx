import { Art } from './Art';
import { useState } from 'react';
import { cardioHasElevation } from '../lib/calories';
import { isTimedQuest, repUnit } from '../lib/quests';

const field = 'w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-white text-center';
const label = 'block text-xs font-bold text-slate-400 mb-1';

/** Formulaire de correction d'une séance déjà enregistrée (onglet Journal). */
export function EntryEditor({ entry, onCancel, onSave, quest }) {
  const cardio = quest.type === 'cardio';
  const isMinutes = quest.unit === 'min'; // la valeur est alors la durée
  const showElevation = cardioHasElevation(quest.cardioMode); // dénivelé : course et marche seulement
  const [date, setDate] = useState(entry.date);
  const [rpe, setRpe] = useState(entry.rpe || 7);
  const [note, setNote] = useState(entry.note || '');
  const [sets, setSets] = useState((entry.setDetails && entry.setDetails.length ? entry.setDetails : [entry.reps || entry.value || 0]).map(String));
  const [value, setValue] = useState(String(entry.value ?? ''));
  const [assist, setAssist] = useState(String(entry.assistanceKg || 0));
  // charge / aide changée entre deux séries : une valeur par série
  const [loads, setLoads] = useState(entry.setLoads ? entry.setLoads.map(String) : null);
  const [assists, setAssists] = useState(entry.setAssists ? entry.setAssists.map(String) : null);
  const [duration, setDuration] = useState(String(entry.durationMin || 25));
  const [elevation, setElevation] = useState(String(entry.elevationM || 0));

  const setRep = (i, v) => setSets(s => s.map((x, j) => (j === i ? v : x)));
  const unit = repUnit(quest);

  const save = e => {
    e.preventDefault();
    onSave(
      cardio
        ? { date, value, durationMin: isMinutes ? value : duration, elevationM: showElevation ? elevation : 0, rpe, note }
        : { date, setDetails: sets, value, assistanceKg: assist, rpe, note, ...(loads ? { setLoads: loads } : {}), ...(assists ? { setAssists: assists } : {}) }
    );
  };

  return (
    <form onSubmit={save} className="bg-slate-900 border border-pink-500/40 rounded-xl p-3.5 space-y-3">
      <p className="text-xs font-black text-pink-300"><Art name="pencil" />Corriger cette séance</p>

      {cardio ? (
        <div className={`grid gap-2 ${isMinutes && !showElevation ? 'grid-cols-1' : isMinutes || !showElevation ? 'grid-cols-2' : 'grid-cols-3'}`}>
          <div>
            <label className={label}>{isMinutes ? 'Durée (min)' : 'Distance (km)'}</label>
            <input type="number" step="0.1" min="0" value={value} onChange={e => setValue(e.target.value)} className={field} />
          </div>
          {!isMinutes && (
            <div>
              <label className={label}>Durée (min)</label>
              <input type="number" min="1" value={duration} onChange={e => setDuration(e.target.value)} className={field} />
            </div>
          )}
          {showElevation && (
            <div>
              <label className={label}>Dénivelé (m)</label>
              <input type="number" min="0" value={elevation} onChange={e => setElevation(e.target.value)} className={field} />
            </div>
          )}
        </div>
      ) : (
        <>
          <div>
            <label className={label}>{isTimedQuest(quest) ? 'Secondes' : 'Répétitions'} réalisées, série par série{loads ? ' (en dessous : charge en kg)' : assists ? ' (en dessous : aide en kg)' : ''}</label>
            <div className="flex flex-wrap items-center gap-2">
              {sets.map((r, i) => (
                <div key={i} className="w-16">
                  <span className="block text-center text-xs text-slate-500">S{i + 1} ({unit})</span>
                  <input type="number" min="0" value={r} onChange={e => setRep(i, e.target.value)} className={field} />
                  {loads && (
                    <input type="number" step="0.5" min="0" title="Charge de cette série (kg)" value={loads[i] ?? loads[loads.length - 1]} onChange={e => setLoads(l => sets.map((_, j) => (j === i ? e.target.value : l[j] ?? l[l.length - 1])))} className={`${field} mt-1 text-amber-300`} />
                  )}
                  {assists && (
                    <input type="number" step="0.5" min="0" title="Aide de cette série (kg)" value={assists[i] ?? assists[assists.length - 1]} onChange={e => setAssists(l => sets.map((_, j) => (j === i ? e.target.value : l[j] ?? l[l.length - 1])))} className={`${field} mt-1 text-violet-300`} />
                  )}
                </div>
              ))}
              <div className="flex gap-1 pt-4">
                <button type="button" onClick={() => setSets(s => [...s, s[s.length - 1] || '0'])} className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black" title="Ajouter une série">+</button>
                <button type="button" disabled={sets.length <= 1} onClick={() => setSets(s => s.slice(0, -1))} className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black disabled:opacity-40" title="Retirer la dernière série">−</button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {quest.unit === 'kg' && (
              <div>
                <label className={label}>Charge (kg)</label>
                <input type="number" step="0.5" min="0" value={value} onChange={e => setValue(e.target.value)} className={field} />
              </div>
            )}
            {quest.unit === 'reps' && (
              <div>
                <label className={label}>Aide / élastique (kg, 0 = strict)</label>
                <input type="number" step="0.5" min="0" value={assist} onChange={e => setAssist(e.target.value)} className={field} />
              </div>
            )}
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={label}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={field} />
        </div>
        <div>
          <label className={label}>Effort ressenti (1 à 10)</label>
          <input type="number" min="1" max="10" value={rpe} onChange={e => setRpe(e.target.value)} className={field} />
        </div>
      </div>
      <div>
        <label className={label}>Note</label>
        <input type="text" value={note} onChange={e => setNote(e.target.value)} className={`${field} text-left`} />
      </div>

      <div className="flex gap-2">
        <button type="submit" className="px-4 py-2 rounded-xl font-black text-xs bg-pink-600 hover:bg-pink-500 text-white">Enregistrer la correction</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl font-bold text-xs bg-slate-800 text-slate-300 hover:text-white">Annuler</button>
      </div>
    </form>
  );
}
