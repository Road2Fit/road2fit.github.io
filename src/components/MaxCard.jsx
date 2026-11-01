import { useState } from 'react';
import { formatDuration, workingLoads } from '../lib/maxima';

const fmt = x => String(Math.round(x * 10) / 10).replace('.', ',');
const fmtDate = iso => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
const input = 'w-24 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-white text-center';

const CONFIDENCE = {
  bonne: ['Fiabilité bonne', 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'],
  moyenne: ['Fiabilité moyenne', 'bg-amber-500/20 text-amber-300 border-amber-500/40'],
  faible: ['Fiabilité faible', 'bg-rose-500/20 text-rose-300 border-rose-500/40'],
};

/** Saisie du record réel (1 répétition, ou meilleure performance) selon le type d'exercice. */
function RecordForm({ result, onClear, onSave }) {
  const { kind, manual } = result;
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const labels = {
    load: ['Charge max réussie sur 1 rép (kg)'],
    assisted: ['Aide minimale avec laquelle tu as réussi 1 rép (kg, 0 = sans aide)'],
    bodyweight: ['Lest ajouté pour 1 rép (kg, 0 = poids du corps seul)'],
    timed: ['Meilleure tenue (secondes)'],
    cardio: ['Distance (km)', 'Temps (min)'],
  }[kind];
  const current = !manual
    ? null
    : kind === 'load' ? `${fmt(manual.kg)} kg`
    : kind === 'assisted' ? `${fmt(manual.assistKg)} kg d’aide`
    : kind === 'bodyweight' ? `+${fmt(manual.extraKg)} kg`
    : kind === 'timed' ? `${manual.seconds} s`
    : `${fmt(manual.distanceKm)} km en ${fmt(manual.minutes)} min`;

  const submit = e => {
    e.preventDefault();
    const n = Number(String(a).replace(',', '.'));
    const m = Number(String(b).replace(',', '.'));
    if (!(n >= 0) || a === '') return;
    const rec =
      kind === 'load' ? { kg: n }
      : kind === 'assisted' ? { assistKg: n }
      : kind === 'bodyweight' ? { extraKg: n }
      : kind === 'timed' ? { seconds: n }
      : { distanceKm: n, minutes: m };
    if (kind === 'cardio' && !(n > 0 && m > 0)) return;
    if (kind === 'load' && !(n > 0)) return;
    onSave(rec);
    setA('');
    setB('');
  };

  return (
    <form onSubmit={submit} className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
      <p className="text-xs font-bold text-slate-300">
        ✍️ Mon record réel
        {current && <span className="ml-2 text-emerald-300">{current} <span className="text-slate-500 font-semibold">(le {fmtDate(manual.date)})</span></span>}
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-slate-400 space-y-1">
          <span className="block max-w-[230px]">{labels[0]}</span>
          <input type="number" step="0.5" min="0" value={a} onChange={e => setA(e.target.value)} className={input} placeholder={current ? 'modifier' : ''} />
        </label>
        {kind === 'cardio' && (
          <label className="text-xs text-slate-400 space-y-1">
            <span className="block">{labels[1]}</span>
            <input type="number" step="0.1" min="0" value={b} onChange={e => setB(e.target.value)} className={input} />
          </label>
        )}
        <button type="submit" className="px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-black">Enregistrer</button>
        {manual && (
          <button type="button" onClick={onClear} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold">Effacer</button>
        )}
      </div>
    </form>
  );
}

/** Carte d'un exercice : maximum estimé, base de calcul, record réel, charges de travail. */
export function MaxCard({ onClear, onSave, quest, result, step }) {
  const { kind, manual } = result;
  const conf = result.confidence && CONFIDENCE[result.confidence];
  // référence des charges de travail : le record réel s'il existe, sinon l'estimation
  const reference = kind === 'load' ? (manual ? manual.kg : result.estimate) : null;

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-extrabold text-white">{quest.icon} {quest.name}</h4>
        {conf && <span className={`px-2 py-0.5 rounded-full border text-xs font-bold ${conf[1]}`}>{conf[0]}</span>}
      </div>

      {(kind === 'load' || kind === 'assisted' || kind === 'bodyweight') && !result.empty && (
        <div className="space-y-1">
          {kind === 'load' && (
            <p className="text-2xl font-black text-pink-300">≈ {fmt(result.estimate)} kg <span className="text-xs font-semibold text-slate-400">sur 1 répétition</span></p>
          )}
          {kind === 'assisted' && (
            <>
              <p className="text-2xl font-black text-pink-300">
                {result.assistFor1 > 0 ? `≈ ${fmt(Math.round(result.assistFor1 * 2) / 2)} kg d’aide` : 'Sans aide'}{' '}
                <span className="text-xs font-semibold text-slate-400">pour 1 répétition</span>
              </p>
              {result.extraFor1 > 0 && <p className="text-xs text-emerald-300 font-bold">Tu pourrais même ajouter ≈ {fmt(Math.round(result.extraFor1 * 2) / 2)} kg de lest.</p>}
            </>
          )}
          {kind === 'bodyweight' && (
            <p className="text-2xl font-black text-pink-300">
              {result.extraFor1 > 0 ? `≈ +${fmt(Math.round(result.extraFor1 * 2) / 2)} kg de lest` : 'Poids du corps seul'}{' '}
              <span className="text-xs font-semibold text-slate-400">pour 1 répétition</span>
            </p>
          )}
          <p className="text-xs text-slate-400">
            Fourchette des équations : {fmt(result.range[0])} à {fmt(result.range[1])} kg{kind !== 'load' ? ' (charge réellement soulevée)' : ''}.
            D’après {result.basis.reps} rép à {fmt(result.basis.load)} kg{kind !== 'load' ? ' soulevés' : ''} le {fmtDate(result.basis.date)}
            {result.basis.rir > 0 ? ` (effort ${result.basis.rpe}/10 : +${result.basis.rir} rép en réserve)` : ''}.
          </p>
          {!result.fromRecent && <p className="text-xs text-amber-300">⚠️ Aucune séance depuis plus de 90 jours : estimation d’après ta meilleure séance ancienne.</p>}
          {result.basis.reps > 10 && <p className="text-xs text-amber-300">⚠️ Série de plus de 10 répétitions : l’estimation est moins précise. Une série de 3 à 5 répétitions donnerait un résultat plus sûr.</p>}
        </div>
      )}

      {kind === 'timed' && (
        <p className="text-2xl font-black text-pink-300">
          {result.best ? `${result.best.seconds} s` : '—'}{' '}
          <span className="text-xs font-semibold text-slate-400">{result.best ? `meilleure tenue observée (le ${fmtDate(result.best.date)})` : 'pas encore de séance'}</span>
        </p>
      )}

      {kind === 'cardio' && !result.empty && (
        <div className="space-y-1.5">
          <p className="text-xs text-slate-400">
            Base : {fmt(result.base.km)} km en {formatDuration(result.base.min)}
            {result.base.source === 'record' ? ' (ton record réel)' : ` (séance du ${fmtDate(result.base.date)})`}. Meilleure distance : {fmt(result.bestDistance)} km.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {result.predictions.map(p => (
              <div key={p.km} className="bg-slate-950 border border-slate-800 rounded-xl p-2 text-center">
                <p className="text-xs text-slate-400">{p.km === 21.1 ? 'Semi' : p.km === 42.2 ? 'Marathon' : `${p.km} km`}</p>
                <p className="text-xs font-black text-pink-300">{formatDuration(p.min)}</p>
                <p className="text-xs text-slate-500">{formatDuration(p.min / p.km).replace(/^0 min /, '')}/km</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">Prédiction de Riegel : fiable surtout pour des distances proches de celle de la base.</p>
        </div>
      )}

      {result.empty && (
        <p className="text-xs text-slate-400">
          {kind === 'cardio'
            ? 'Pas encore de sortie exploitable (distance et durée, entre 3,5 et 230 minutes).'
            : 'Pas encore de séance exploitable : il faut au moins une série de 15 répétitions ou moins.'}
          {kind === 'cardio' && result.bestDistance > 0 ? ` Meilleure distance : ${fmt(result.bestDistance)} km.` : ''}
        </p>
      )}

      {manual && kind === 'load' && !result.empty && (
        <p className="text-xs text-slate-400">
          {Math.abs(manual.kg - result.estimate) / manual.kg < 0.03
            ? '🎯 Ton record réel confirme l’estimation.'
            : manual.kg > result.estimate
              ? `💪 Ton record réel dépasse l’estimation de ${Math.round(((manual.kg - result.estimate) / result.estimate) * 100)} %.`
              : `ℹ️ L’estimation est ${Math.round(((result.estimate - manual.kg) / manual.kg) * 100)} % au-dessus de ton record réel : tu as sans doute encore de la marge.`}
        </p>
      )}

      <RecordForm result={result} onSave={onSave} onClear={onClear} />

      {reference > 0 && (
        <details className="bg-slate-950 border border-slate-800 rounded-xl p-3">
          <summary className="cursor-pointer text-xs font-bold text-slate-300">📋 Charges de travail ({manual ? 'd’après ton record réel' : 'd’après l’estimation'} : {fmt(reference)} kg)</summary>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {workingLoads(reference, step).map(l => (
              <div key={l.pct} className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-center">
                <p className="text-xs text-slate-400">{l.pct} % · ≈ {l.reps} rép</p>
                <p className="text-xs font-black text-white">{fmt(l.kg)} kg</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">Repères NSCA : le nombre de répétitions possibles varie d’une personne et d’un exercice à l’autre (±2).</p>
        </details>
      )}
    </div>
  );
}
