import { Art } from '../components/Art';
import { XpProgress } from '../components/XpProgress';
import { useState } from 'react';
import { progressSummary } from '../lib/progressSummary';
import { getTodayISODate } from '../lib/dates';

// 4.22 : le bilan commence par l'essentiel (4 dernières semaines : régularité et progrès par exercice) ;
// la comparaison de la semaine garde 3 chiffres, le reste derrière « Voir tout ».
const WEEK_MAIN = ['sessions', 'volume', 'kcal'];

export function BilanTab({ gameState, levelInfo, records, weekData }) {
  const [allWeek, setAllWeek] = useState(false);
  const p = progressSummary(gameState, getTodayISODate());
  const shown = [...p.up.slice(0, 4), ...p.down.slice(0, 2)];
  return (
    <div className="space-y-6">
      <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3" data-testid="progress-card">
        <h3 className="font-black text-white"><Art name="chart" />Tes 4 dernières semaines</h3>
        <p className="text-lg font-black text-white leading-tight" data-testid="progress-headline">{p.headline}</p>
        <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden" role="img" aria-label={`${p.done} séances sur ${p.planned}`}><div className="h-full bg-pink-600 rounded-full" style={{ width: `${Math.round(p.ratio * 100)}%` }} /></div>
        <p className="text-xs text-slate-300">{p.verdict}</p>
        {shown.length > 0 && (
          <ul className="space-y-1" data-testid="progress-rows">
            {shown.map(r => (
              <li key={r.id} className="flex items-center justify-between gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm">
                <span className="font-bold text-white truncate">{r.icon} {r.name}</span>
                <span className="shrink-0 text-right"><span className="text-slate-400 text-xs">{p.text(r)}</span> <b className={r.diff > 0 ? 'text-emerald-400' : 'text-rose-400'}>{r.diff > 0 ? '+' : ''}{String(r.diff).replace('.', ',')}</b></span>
              </li>
            ))}
          </ul>
        )}
        {p.flat.length > 0 && <p className="text-xs text-slate-400">Stable : {p.flat.map(r => r.name).join(', ')}.</p>}
      </section>

      <XpProgress gameState={gameState} levelInfo={levelInfo} />

      <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <h3 className="font-black text-white"><Art name="chart" />Bilan de la semaine <span className="text-xs text-slate-400 font-semibold">(vs semaine précédente)</span></h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { k: 'sessions', l: 'Séances', u: '' },
            { k: 'days', l: 'Jours actifs', u: '' },
            { k: 'kcal', l: 'Calories brûlées', u: ' kcal' },
            { k: 'km', l: 'Distance', u: ' km' },
            { k: 'volume', l: 'Volume soulevé', u: ' kg' },
            { k: 'reps', l: 'Répétitions', u: '' }
          ].filter(m => allWeek || WEEK_MAIN.includes(m.k)).map(m => {
            const diff = Math.round((weekData.cur[m.k] - weekData.prev[m.k]) * 10) / 10;
            return (
              <div key={m.k} className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-xs font-bold uppercase text-slate-400 block">{m.l}</span>
                <span className="text-xl font-black text-white">{weekData.cur[m.k]}{m.u}</span>
                <span className={`block text-xs font-bold ${diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                  {diff > 0 ? '▲ +' : diff < 0 ? '▼ ' : '＝ '}{diff !== 0 ? diff : 'stable'}{diff !== 0 ? m.u : ''}
                </span>
              </div>
            );
          })}
        </div>
        {!allWeek && <button type="button" onClick={() => setAllWeek(true)} className="text-xs font-bold text-slate-400 underline underline-offset-2" data-testid="week-all">Voir tout</button>}
      </section>

      <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <h3 className="font-black text-white"><Art name="medal" />Records personnels</h3>
        {records.length === 0 && <p className="text-xs text-slate-400">Enregistre une séance pour voir vos records apparaître.</p>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {records.map(g => (
            <div key={g.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3">
              <p className="font-extrabold text-white text-sm mb-1.5">{g.icon} {g.name}</p>
              {g.recs.map(r => (
                <div key={r.key} className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-slate-400">{r.label}</span>
                  <span className="text-right">
                    <b className="text-pink-300">{r.text}</b>
                    <span className="text-slate-500 ml-1.5">{r.date ? r.date.slice(8, 10) + '/' + r.date.slice(5, 7) : ''}</span>
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
