import { useState } from 'react';
import { CUSTOM_KINDS } from '../../coach/methods';

// Forme personnalisée : la personne règle chaque série (répétitions, charge ou aide, repos, type). Le coach retient ce modèle
// (quest.coachCustom, relatif à la charge du jour) et le reprend aux séances suivantes avec des charges qui progressent.
const inp = 'w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white';
const RESTS = [0, 10, 15, 20, 30, 45, 60, 90, 120, 150, 180, 240];

export function CustomSetsEditor({ e, onSave, onCancel }) {
  const unit = e.timed ? 's' : 'reps';
  const start = (e.plan && e.plan.length ? e.plan : (e.targetReps || []).map(r => ({ reps: r, load: e.load, assist: e.assist, rest: e.restSec, kind: 'work' })))
    .map(p => ({ reps: p.reps, load: p.load ?? e.load, assist: p.assist ?? e.assist, rest: p.rest ?? e.restSec ?? 90, kind: p.kind === 'cluster' ? 'work' : p.kind || 'work' }));
  const [rows, setRows] = useState(start.length ? start : [{ reps: 8, load: e.load, assist: e.assist, rest: 90, kind: 'work' }]);
  const set = (i, p) => setRows(r => r.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const add = () => setRows(r => (r.length >= 12 ? r : [...r, { ...r[r.length - 1] }]));
  const del = i => setRows(r => (r.length <= 1 ? r : r.filter((_, j) => j !== i)));

  return (
    <div className="mt-2 rounded-xl border border-violet-500/50 bg-violet-950/20 p-3 space-y-2" data-testid="custom-editor">
      <p className="text-xs font-black text-violet-200">Ta forme personnalisée</p>
      <p className="text-xs text-slate-400">Règle chaque série comme tu veux. Le coach la retient : aux prochaines séances il reprend la même forme, avec des charges qui suivent ta progression.</p>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="rounded-lg bg-slate-950 border border-slate-800 p-2 space-y-1.5" data-testid="custom-row">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white">Série {i + 1}</span>
              {rows.length > 1 && <button type="button" onClick={() => del(i)} className="text-xs font-bold text-rose-300" aria-label={`Retirer la série ${i + 1}`}>Retirer</button>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs text-slate-400">
              <label>{unit === 's' ? 'Secondes' : 'Répétitions'}<input inputMode="numeric" value={r.reps} onChange={ev => set(i, { reps: ev.target.value })} className={inp} data-testid="custom-reps" /></label>
              {e.kind === 'load' && <label>Charge (kg)<input inputMode="decimal" value={r.load} onChange={ev => set(i, { load: ev.target.value.replace(',', '.') })} className={inp} data-testid="custom-load" /></label>}
              {e.kind === 'assisted' && <label>Aide (kg)<input inputMode="decimal" value={r.assist} onChange={ev => set(i, { assist: ev.target.value.replace(',', '.') })} className={inp} data-testid="custom-assist" /></label>}
              <label>Repos après
                <select value={r.rest} onChange={ev => set(i, { rest: Number(ev.target.value) })} className={inp} data-testid="custom-rest">
                  {[...new Set([...RESTS, Number(r.rest) || 0])].sort((a, b) => a - b).map(s => <option key={s} value={s}>{s ? (s >= 60 ? `${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60}` : ''}` : `${s} s`) : 'aucun'}</option>)}
                </select>
              </label>
              <label>Type
                <select value={r.kind} onChange={ev => set(i, { kind: ev.target.value })} className={inp} data-testid="custom-kind">
                  {CUSTOM_KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </label>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={add} disabled={rows.length >= 12} className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-xs font-bold text-white" data-testid="custom-add">+ Une série</button>
        <button type="button" onClick={() => onSave(rows)} className="flex-1 px-3 py-1.5 rounded-lg bg-pink-600 text-xs font-black text-white" data-testid="custom-save">Enregistrer ma forme</button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-xs font-bold text-white">Annuler</button>
      </div>
      <p className="text-[11px] text-slate-500">Les mini-séries et dégressives ne comptent pas pour la progression ; seules tes séries normales, lourdes et allégées la font avancer.</p>
    </div>
  );
}
