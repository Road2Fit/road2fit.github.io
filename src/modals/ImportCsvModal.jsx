// Importer l'historique d'une autre appli (Hevy, Strong) : fichier CSV exporté depuis cette appli.
// Aperçu (séances, exercices reconnus ou non) puis import, après une copie de sécurité.
import { useRef, useState } from 'react';
import { Art } from '../components/Art';
import { applyWorkoutImport, readWorkoutCsv } from '../lib/importCsv';
import { makeQuestFromCatalog } from '../lib/questFactory';
import { questAfterHistoryChange } from '../lib/history';
import { calculateStrengthCalories } from '../lib/calories';
import { saveSafetyCopy } from '../lib/safetyCopy';
import { getTodayISODate } from '../lib/dates';

export function ImportCsvModal({ gameState, setGameState, onClose, triggerToast }) {
  const fileRef = useRef(null);
  const [text, setText] = useState('');
  const [lbs, setLbs] = useState(false);
  const read = text ? readWorkoutCsv(text, { lbs }) : null;
  const pick = e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setText(String(r.result || ''));
    r.readAsText(f);
    e.target.value = '';
  };
  const doImport = () => {
    if (!read || !read.exercises.length) return;
    saveSafetyCopy(gameState, `avant l'import ${read.source}`);
    const res = applyWorkoutImport(gameState, read, getTodayISODate(), { makeQuest: makeQuestFromCatalog, afterHistory: questAfterHistoryChange, calories: calculateStrengthCalories });
    setGameState(res.state);
    if (triggerToast) triggerToast(`${res.added} séance(s) d'exercice importée(s)${res.created ? `, ${res.created} exercice(s) ajouté(s)` : ''}.`);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[75] bg-slate-950/85 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="min-h-full flex items-end sm:items-center justify-center px-3 pt-14 pb-3">
        <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-3" onClick={e => e.stopPropagation()} role="dialog" aria-label="Importer depuis Hevy ou Strong" data-testid="csv-import">
          <h3 className="font-black text-white text-lg"><Art name="download" />Importer depuis Hevy ou Strong</h3>
          <p className="text-xs text-slate-400">Dans l’autre appli : Réglages → Exporter les données (fichier CSV). Choisis ce fichier ici.</p>
          <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" onChange={pick} className="hidden" data-testid="csv-file" />
          <button type="button" onClick={() => fileRef.current && fileRef.current.click()} className="w-full py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 font-bold">Choisir le fichier CSV</button>
          {read && read.error && <p className="text-sm text-rose-300">{read.error}</p>}
          {read && !read.error && (
            <div className="space-y-2" data-testid="csv-preview">
              <p className="text-sm text-slate-200"><b>{read.source}</b> : {read.sessions} jour(s) d’entraînement, {read.sets} série(s), {read.exercises.length} exercice(s) reconnu(s).</p>
              {read.source !== 'Hevy' && (
                <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={lbs} onChange={e => setLbs(e.target.checked)} data-testid="csv-lbs" />Mes poids sont en livres (lbs)</label>
              )}
              {read.exercises.length > 0 && <p className="text-xs text-slate-400">{read.exercises.map(e => e.name).join(' · ')}</p>}
              {read.unknown.length > 0 && <p className="text-xs text-amber-300">Pas reconnus (ignorés) : {read.unknown.join(' · ')}</p>}
              <button type="button" onClick={doImport} disabled={!read.exercises.length} className="w-full py-3 rounded-xl bg-pink-600 text-white font-black disabled:opacity-40" data-testid="csv-go">Importer</button>
            </div>
          )}
          <button type="button" onClick={onClose} className="w-full py-2 text-sm text-slate-400">Fermer</button>
        </div>
      </div>
    </div>
  );
}
