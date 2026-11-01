import { coachSlotFor } from '../../coach/planning';
import { COACH_DAY_NAMES, coachDayLabel, coachDow } from '../../coach/settings';
import { addDaysISO } from '../../lib/dates';
import { card } from './ui';
import { SPORTS, sportInfo } from '../../data/sports';

export function CoachSettings({
  addMatches, addSeries, coach, dayShort, extraVolleyInput, matchInput, matchList, serie,
  setExtraVolleyInput, setMatchInput, setSerie, today, toggleGymSkip, toggleMatch, toggleVolleyDay,
  toggleVolleySkip, upcomingGym, upcomingVolley, updateCoach,
}) {
  const sp = sportInfo(coach.sport);
  return (
    <section className={card}>
      <h3 className="font-black text-white">⚙️ Réglages & calendrier des matchs</h3>
      <div className="space-y-2 text-xs">
        <p className="text-slate-300 font-bold">Organisation des séances</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => updateCoach({ splitMode: 'auto' })}
            className={`px-3 py-1.5 rounded-lg font-black border ${coach.splitMode !== 'trio' ? 'bg-pink-600 border-pink-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>
            Full body (2 ou 3 par semaine)
          </button>
          <button onClick={() => updateCoach({ splitMode: 'trio', sessionsPerWeek: 3 })}
            className={`px-3 py-1.5 rounded-lg font-black border ${coach.splitMode === 'trio' ? 'bg-pink-600 border-pink-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>
            3 séances : Full body + Jambes + Haut du corps
          </button>
        </div>
        {coach.splitMode !== 'trio' ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-300 font-bold">Séances de muscu par semaine :</span>
            {[2, 3].map(n => (
              <button key={n} onClick={() => updateCoach({ sessionsPerWeek: n })}
                className={`px-3 py-1.5 rounded-lg font-black border ${coach.sessionsPerWeek === n ? 'bg-pink-600 border-pink-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>
                {n}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">Le coach place les trois séances sur tes créneaux et choisit l’ordre pour que les mêmes muscles aient au moins 48 h de repos (jambes jamais la veille d’un volley ou d’un match).</p>
        )}
      </div>
      <div className="space-y-2 text-xs">
        <p className="text-slate-300 font-bold">🗓️ Mes créneaux de salle</p>
        <p className="text-xs text-slate-500">Coche les jours où tu peux aller à la salle et indique les horaires. Le coach ne propose des séances que ces jours-là et adapte leur durée au créneau. Sans aucun créneau, tous les jours sans volley ni match sont utilisables.</p>
        <div className="space-y-1.5">
          {[1, 2, 3, 4, 5, 6, 0].map(dow => {
            const sl = (coach.gymSlots || {})[dow];
            const setSlot = patch => updateCoach({ gymSlots: { ...(coach.gymSlots || {}), [dow]: { ...(sl || { start: '18:00', end: '19:30' }), ...patch } } });
            return (
              <div key={dow} className="flex flex-wrap items-center gap-2">
                <button onClick={() => {
                  const next = { ...(coach.gymSlots || {}) };
                  if (sl) delete next[dow]; else next[dow] = { start: '18:00', end: '19:30' };
                  updateCoach({ gymSlots: next });
                }} className={`w-24 px-2.5 py-1.5 rounded-lg border font-bold text-left ${sl ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                  {sl ? '✔ ' : ''}{COACH_DAY_NAMES[dow]}
                </button>
                {sl && (
                  <>
                    <input type="time" value={sl.start} onChange={e => setSlot({ start: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white" />
                    <span className="text-slate-500">à</span>
                    <input type="time" value={sl.end} onChange={e => setSlot({ end: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white" />
                    <span className="text-slate-500">{(() => { const m = coachSlotFor({ gymSlots: { [dow]: sl } }, addDaysISO(today, (dow - coachDow(today) + 7) % 7)); return m && m.min ? `${m.min} min` : 'horaires invalides'; })()}</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
        {Object.keys(coach.gymSlots || {}).length > 0 && (
          <div className="space-y-1">
            <p className="text-slate-400">Pas disponible un de ces jours-là ? Touche-le pour l’annuler :</p>
            <div className="flex flex-wrap gap-1.5">
              {upcomingGym.map(d => {
                const off = (coach.gymSkips || []).includes(d);
                return (
                  <button key={d} onClick={() => toggleGymSkip(d)}
                    className={`px-2 py-1 rounded-lg border text-xs font-bold ${off ? 'bg-slate-800 border-slate-600 text-slate-500 line-through' : 'bg-emerald-600/80 border-emerald-400 text-white'}`}>
                    {coachDayLabel(d)}{off ? ' · indispo' : ''}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-300 font-bold">Durée de séance voulue :</span>
        {[0, 45, 60, 75, 90].map(n => (
          <button key={n} onClick={() => updateCoach({ sessionMinutes: n })}
            className={`px-3 py-1.5 rounded-lg font-black border ${Number(coach.sessionMinutes) === n ? 'bg-pink-600 border-pink-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>
            {n === 0 ? 'Libre' : `${n} min`}
          </button>
        ))}
        <span className="text-xs text-slate-500 w-full">Le coach complète chaque séance proposée (séries, puis exercices de tes objectifs) pour tenir cette durée. Estimation : échauffement 5 min + séries et repos.</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <label className="text-slate-300 font-bold mr-1" htmlFor="coach-sport">Mon sport régulier :</label>
        <select id="coach-sport" value={coach.sport || ''} onChange={e => updateCoach({ sport: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-bold">
          <option value="">Non précisé</option>
          {SPORTS.filter(s => s.id !== 'autre').map(s => <option key={s.id} value={s.id}>{s.icon} {s.cap}</option>)}
          <option value="autre">🎽 Autre sport</option>
        </select>
        <span className="text-slate-300 font-bold mr-1">Jours :</span>
        {[1, 2, 3, 4, 5, 6, 0].map(dow => (
          <button key={dow} onClick={() => toggleVolleyDay(dow)}
            className={`px-2.5 py-1 rounded-lg font-bold border ${(coach.volleyDays || []).includes(dow) ? 'bg-sky-600 border-sky-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
            {dayShort[dow]}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        <p className="text-xs text-slate-300 font-bold">{sp.icon} Pas {sp.de} (ou {sp.label} en plus)</p>
        <p className="text-xs text-slate-500">Touche un jour d’entraînement habituel pour dire que tu n’as pas {sp.label} ce jour-là : le coach te laisse alors faire des jambes la veille et planifier la muscu ce jour-là.</p>
        <div className="flex flex-wrap gap-1.5">
          {upcomingVolley.map(d => {
            const skipped = (coach.volleySkips || []).includes(d);
            return (
              <button key={d} onClick={() => toggleVolleySkip(d)}
                className={`px-2 py-1 rounded-lg border text-xs font-bold ${skipped ? 'bg-slate-800 border-slate-600 text-slate-500 line-through' : 'bg-sky-600/80 border-sky-400 text-white'}`}>
                {sp.icon} {coachDayLabel(d)}{skipped ? ' · annulé' : ''}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400">{sp.cap} exceptionnel :</span>
          <input type="date" value={extraVolleyInput} min={today} onChange={e => setExtraVolleyInput(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white" />
          <button disabled={!extraVolleyInput} onClick={() => { updateCoach({ volleyExtra: Array.from(new Set([...(coach.volleyExtra || []), extraVolleyInput])).sort() }); setExtraVolleyInput(''); }} className="px-3 py-1.5 rounded-lg bg-sky-600 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black">Ajouter</button>
          {(coach.volleyExtra || []).filter(d => d >= today).map(d => (
            <button key={d} onClick={() => updateCoach({ volleyExtra: (coach.volleyExtra || []).filter(x => x !== d) })} className="px-2 py-1 rounded-lg bg-sky-600/80 text-white text-xs font-bold">{sp.icon} {coachDayLabel(d)} ✕</button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs text-slate-300 font-bold">🏆 Jours de match</p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <input type="date" value={matchInput} min={today} onChange={e => setMatchInput(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white" />
          <button disabled={!matchInput} onClick={() => { addMatches([matchInput]); setMatchInput(''); }} className="px-3 py-1.5 rounded-lg bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-black">Ajouter</button>
        </div>
        <details className="text-xs">
          <summary className="cursor-pointer text-slate-400 font-bold">Ajouter plusieurs matchs d’un coup</summary>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-slate-400">Tous les</span>
            <select value={serie.dow} onChange={e => setSerie({ ...serie, dow: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white">
              {[1, 2, 3, 4, 5, 6, 0].map(d => <option key={d} value={d}>{COACH_DAY_NAMES[d].toLowerCase()}s</option>)}
            </select>
            <span className="text-slate-400">du</span>
            <input type="date" value={serie.from} onChange={e => setSerie({ ...serie, from: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white" />
            <span className="text-slate-400">au</span>
            <input type="date" value={serie.to} onChange={e => setSerie({ ...serie, to: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white" />
            <button onClick={addSeries} className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 font-bold">Ajouter</button>
          </div>
          <p className="text-xs text-slate-500 mt-1">Tu peux ensuite retirer les dates sans match une par une.</p>
        </details>
        {matchList.length === 0 ? (
          <p className="text-xs text-slate-500">Aucun match à venir enregistré.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {matchList.map(d => (
                <button key={d} onClick={() => toggleMatch(d)} title="Retirer" className="px-2 py-1 rounded-lg bg-amber-500/90 text-slate-950 text-xs font-bold">
                  {coachDayLabel(d).slice(0, 3)} {d.slice(8, 10)}/{d.slice(5, 7)}/{d.slice(2, 4)} ✕
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{matchList.length} match(s) à venir. Touche une date pour la retirer.</span>
              <button onClick={() => { if (window.confirm('Retirer tous les matchs à venir ?')) updateCoach({ matchDates: (coach.matchDates || []).filter(d => d < today) }); }} className="text-rose-300 font-bold">Tout effacer</button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
