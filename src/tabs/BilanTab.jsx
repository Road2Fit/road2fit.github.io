import { Art } from '../components/Art';
import { XpProgress } from '../components/XpProgress';

export function BilanTab({ gameState, levelInfo, records, weekData }) {
  return (
    <div className="space-y-6">
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
          ].map(m => {
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
