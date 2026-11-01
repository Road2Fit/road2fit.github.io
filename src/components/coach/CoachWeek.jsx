import { COACH_TYPES } from '../../coach/settings';
import { card } from './ui';


export function CoachWeek({ dayShort, first, ov, plan, plannedMap, sport, today }) {
  return (
    <section className={card}>
      <h3 className="font-black text-white">Ma semaine</h3>
      {ov.weeks.map(w => (
        <div key={w.weekStart}>
          <p className="text-xs text-slate-400 mb-1.5">
            Semaine du {w.weekStart.slice(8, 10)}/{w.weekStart.slice(5, 7)}
            {w.matchInWeek ? ' · match' : ''}
            {w.shortfall > 0 ? ` · ${w.shortfall} séance(s) à reporter (pas assez de jours libres espacés de 48 h)` : ''}
          </p>
          <div className="grid grid-cols-7 gap-1.5">
            {w.days.map(d => {
              const p = plannedMap[d.iso];
              const map = {
                done: ['✅', 'Fait', 'border-emerald-500/50 bg-emerald-950/20'],
                planned: ['💪', d.type ? COACH_TYPES[d.type].label : p ? `Séance ${ov.templates[p.templateIdx] ? ov.templates[p.templateIdx].id : ''}` : 'Muscu', 'border-pink-500/60 bg-pink-950/20'],
                volley: [sport.icon, sport.cap, 'border-sky-500/40 bg-sky-950/20'],
                match: ['🏆', 'Match', 'border-amber-500/50 bg-amber-950/20'],
                rest: ['😴', 'Repos', 'border-slate-800 bg-slate-950']
              };
              let m = map[d.status];
              if (plan && d.status !== 'done') {
                if (d.iso === plan.date) m = ['💪', 'Ma séance', map.planned[2]];
                else if (first && d.iso === first.iso && d.status === 'planned') m = map.rest;
              }
              return (
                <div key={d.iso} className={`rounded-lg border p-1.5 text-center ${m[2]} ${d.iso === today ? 'ring-2 ring-pink-400' : ''}`}>
                  <p className="text-xs font-bold text-slate-400">{dayShort[d.dow]} {d.iso.slice(8, 10)}</p>
                  <p className="text-base leading-tight">{m[0]}</p>
                  <p className="text-[9px] font-bold text-slate-200 leading-tight">{m[1]}</p>
                  {d.status === 'planned' && !d.legsOk && !d.type && <p className="text-[8px] text-sky-300 leading-tight">sans jambes</p>}
                  {d.status === 'planned' && d.slot && <p className="text-[8px] text-slate-400 leading-tight">{d.slot.start}</p>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <p className="text-xs text-slate-500">
        Les séances sont espacées d’au moins 2 jours (≈ 48 h de récupération). Pas de jambes la veille d’un jour {sport.de}, ni à moins de 48 h ou le lendemain d’un match.
      </p>
    </section>
  );
}
