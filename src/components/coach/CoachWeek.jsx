import { useState } from 'react';
import { sessionFocus } from '../../coach/focus';
import { Art } from '../Art';
import { COACH_TYPES, coachDayLabel } from '../../coach/settings';
import { card } from './ui';
import { DayThemePicker } from './DayTheme';

const uniq = list => Array.from(new Set(list)).sort();

// « Ma semaine » : chaque jour peut cumuler la muscu ET le sport (journée double). Toucher un jour (à venir) ouvre ses
// réglages : séance de muscu en plus juste ce jour-là (coach.gymExtra, sans changer le reste de la semaine), salle annulée
// (coach.gymSkips), sport en plus ou annulé (coach.volleyExtra / volleySkips).
export function CoachWeek({ coach = {}, cardioWeeks = [], dayShort, first, ov, plan, plannedMap, sport, today, updateCoach }) {
  // cardio du coach : séance prévue ou faite ce jour-là (le cœur se travaille comme un muscle)
  const cardioOf = iso => {
    for (const cw of cardioWeeks) {
      if ((cw.done || []).some(d => d.iso === iso)) return { done: true, label: 'Cardio' };
      const s = (cw.sessions || []).find(x => x.iso === iso);
      if (s) return { done: false, label: `${s.minutes} min` };
    }
    return null;
  };
  const [sel, setSel] = useState(null);
  const allDays = ov.weeks.flatMap(w => w.days);
  const selDay = allDays.find(d => d.iso === sel) || null;

  // ce que montre la case « muscu » d'un jour : séance faite, prévue, séance personnalisée du coach, ou rien
  const gymOf = d => {
    if (d.gym === 'done') return { icon: '✅', label: 'Fait', done: true };
    if (plan && d.iso === plan.date) return { icon: '💪', label: 'Ma séance' };
    if (d.gym === 'planned') {
      if (plan && first && d.iso === first.iso) return null; // remplacée par la séance personnalisée
      const p = plannedMap[d.iso];
      const tf = p && ov.templates[p.templateIdx] ? sessionFocus(ov.templates[p.templateIdx].quests) : null;
      const label = d.type ? COACH_TYPES[d.type].label : tf ? tf.label : p && ov.templates[p.templateIdx] ? `Séance ${ov.templates[p.templateIdx].id}` : 'Muscu';
      return { icon: '💪', label };
    }
    return null;
  };

  const act = patch => { if (updateCoach) updateCoach(patch); };
  const addGym = iso => act({ gymExtra: uniq([...(coach.gymExtra || []), iso]), gymSkips: (coach.gymSkips || []).filter(x => x !== iso) });
  const removeExtra = iso => act({ gymExtra: (coach.gymExtra || []).filter(x => x !== iso) });
  const skipGym = iso => act({ gymSkips: uniq([...(coach.gymSkips || []), iso]), gymExtra: (coach.gymExtra || []).filter(x => x !== iso) });
  const unskipGym = iso => act({ gymSkips: (coach.gymSkips || []).filter(x => x !== iso) });
  const addSport = iso => act({ volleyExtra: uniq([...(coach.volleyExtra || []), iso]), volleySkips: (coach.volleySkips || []).filter(x => x !== iso) });
  const removeSport = iso => (coach.volleyExtra || []).includes(iso)
    ? act({ volleyExtra: (coach.volleyExtra || []).filter(x => x !== iso) })
    : act({ volleySkips: uniq([...(coach.volleySkips || []), iso]) });

  const btn = 'px-3 py-2 rounded-lg text-xs font-black border';
  return (
    <section className={card}>
      <h3 className="font-black text-white"><Art name="calendar" />Ma semaine</h3>
      {ov.weeks.map(w => (
        <div key={w.weekStart}>
          <p className="text-xs text-slate-400 mb-1.5">
            Semaine du {w.weekStart.slice(8, 10)}/{w.weekStart.slice(5, 7)}
            {w.matchInWeek ? ' · match' : ''}
            {w.shortfall > 0 ? ` · ${w.shortfall} séance(s) à reporter (${w.split ? 'pas assez de jours de salle libres' : 'pas assez de jours libres espacés de 48 h'})` : ''}
          </p>
          <div className="grid grid-cols-7 gap-1.5">
            {w.days.map(d => {
              const g = gymOf(d);
              const sp = d.sportKind === 'match' ? { icon: '🏆', label: 'Match' } : d.sportKind ? { icon: sport.icon, label: sport.cap } : null;
              const both = g && sp;
              const cd = cardioOf(d.iso);
              const tone = g && g.done ? 'border-emerald-500/50 bg-emerald-950/20'
                : both ? 'border-pink-500/60 bg-gradient-to-b from-pink-950/30 to-sky-950/40'
                : g ? 'border-pink-500/60 bg-pink-950/20'
                : d.sportKind === 'match' ? 'border-amber-500/50 bg-amber-950/20'
                : sp ? 'border-sky-500/40 bg-sky-950/20'
                : cd ? (cd.done ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-rose-500/60 bg-rose-950/25')
                : 'border-slate-800 bg-slate-950';
              const canEdit = d.iso >= today && !!updateCoach;
              return (
                <button
                  key={d.iso}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setSel(sel === d.iso ? null : d.iso)}
                  aria-label={`${coachDayLabel(d.iso)} : ${[g && `muscu (${g.label})`, sp && sp.label, cd && 'cardio'].filter(Boolean).join(' et ') || 'repos'}`}
                  aria-pressed={sel === d.iso}
                  data-testid={`week-day-${d.iso}`}
                  className={`rounded-lg border p-1 text-center flex flex-col items-center gap-0.5 min-w-0 ${tone} ${d.iso === today ? 'ring-2 ring-pink-400' : ''} ${sel === d.iso ? 'outline outline-2 outline-white' : ''}`}
                >
                  <span className="text-[11px] font-bold text-slate-400">{dayShort[d.dow]} {d.iso.slice(8, 10)}</span>
                  {g && (
                    <span className="flex flex-col items-center leading-tight">
                      <span className="text-sm">{g.icon}</span>
                      <span className="text-[9px] font-bold text-slate-100 break-words">{g.label}</span>
                      {d.extra && !g.done && <span className="text-[8px] text-emerald-300">en plus</span>}
                      {!g.done && !d.legsOk && (!d.type || sp) && <span className="text-[8px] text-sky-300">sans jambes</span>}
                      {!g.done && d.slot && <span className="text-[8px] text-slate-400">{d.slot.start}</span>}
                    </span>
                  )}
                  {both && <span className="w-full border-t border-dashed border-slate-600" />}
                  {sp && (
                    <span className="flex flex-col items-center leading-tight">
                      <span className="text-sm">{sp.icon}</span>
                      <span className="text-[9px] font-bold text-slate-100 break-words">{sp.label}</span>
                    </span>
                  )}
                  {cd && (
                    <span className="flex flex-col items-center leading-tight" data-testid={`week-cardio-${d.iso}`}>
                      <span className="text-sm">{cd.done ? '✅' : '❤️'}</span>
                      <span className="text-[9px] font-bold text-rose-200">{cd.label}</span>
                    </span>
                  )}
                  {!g && !sp && !cd && (
                    <span className="flex flex-col items-center leading-tight">
                      <span className="text-sm">😴</span>
                      <span className="text-[9px] font-bold text-slate-300">{d.skipped ? 'Annulée' : 'Repos'}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {selDay && (() => {
        const g = gymOf(selDay);
        const isSport = selDay.sportKind === 'sport';
        return (
          <div className="bg-slate-950 border border-slate-700 rounded-xl p-3 space-y-2" data-testid="week-day-panel">
            <p className="text-sm font-black text-white">{coachDayLabel(selDay.iso)}</p>
            <div className="flex flex-wrap gap-2">
              {selDay.gym === 'done' ? (
                <span className="text-xs text-emerald-300 font-bold">Séance de muscu déjà faite ✅</span>
              ) : g || selDay.gym === 'planned' ? (
                selDay.extra
                  ? <button type="button" onClick={() => removeExtra(selDay.iso)} className={`${btn} bg-slate-800 border-slate-600 text-slate-100`}>Retirer la séance en plus</button>
                  : <button type="button" onClick={() => skipGym(selDay.iso)} className={`${btn} bg-slate-800 border-slate-600 text-slate-100`}>Pas de salle ce jour</button>
              ) : selDay.skipped ? (
                <button type="button" onClick={() => unskipGym(selDay.iso)} className={`${btn} bg-pink-600 border-pink-400 text-white`}>Remettre la séance</button>
              ) : (
                <button type="button" onClick={() => addGym(selDay.iso)} className={`${btn} bg-pink-600 border-pink-400 text-white`} data-testid="week-add-gym">💪 + Séance de muscu en plus</button>
              )}
              {selDay.sportKind !== 'match' && (
                isSport
                  ? <button type="button" onClick={() => removeSport(selDay.iso)} className={`${btn} bg-slate-800 border-slate-600 text-slate-100`}>Pas {sport.de} ce jour</button>
                  : <button type="button" onClick={() => addSport(selDay.iso)} className={`${btn} bg-sky-700 border-sky-500 text-white`}>{sport.icon} + {sport.cap} ce jour</button>
              )}
            </div>
            {selDay.gym === 'planned' && !plan && <DayThemePicker coach={coach} date={selDay.iso} today={today} updateCoach={updateCoach} prefix="week-theme" />}
          </div>
        );
      })()}

    </section>
  );
}
