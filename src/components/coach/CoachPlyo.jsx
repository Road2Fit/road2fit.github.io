import { useState } from 'react';
import { EXERCISE_CATALOG } from '../../data/catalog';
import { CONTRACTION_SOURCES } from '../../data/contractionSources';
import { CONTRACTION_MODES, missingPlyo, perfSport, plyoPackFor, plyoPerWeek } from '../../coach/contraction';
import { getCoachSettings } from '../../coach/settings';
import { sportInfo } from '../../data/sports';
import { makeQuestFromCatalog } from '../../lib/questFactory';
import { getTodayISODate } from '../../lib/dates';
import { card } from './ui';

/**
 * 4.42 : les 4 façons de faire travailler le muscle, et la pliométrie (sauts) : séances par semaine, exercices à ajouter
 * (pack général ou propre au sport de la personne). Coach → Réglages.
 */
export function CoachPlyo({ gameState, setGameState }) {
  const [open, setOpen] = useState(false);
  const coach = getCoachSettings(gameState);
  const per = plyoPerWeek(coach);
  const sport = perfSport(coach.sport);
  const pack = plyoPackFor(sport);
  const missing = missingPlyo(gameState, sport);
  const setPer = n => setGameState(prev => ({ ...prev, coach: { ...prev.coach, plyo: { ...((prev.coach && prev.coach.plyo) || {}), perWeek: n } } }));
  const add = ids => setGameState(prev => {
    const today = getTodayISODate();
    const have = new Set((prev.quests || []).map(q => q.catalogId));
    const fresh = ids.filter(id => !have.has(id)).map(id => EXERCISE_CATALOG.find(c => c.id === id)).filter(Boolean).map(c => makeQuestFromCatalog(c, prev, today, 'pliométrie').quest);
    return fresh.length ? { ...prev, quests: [...prev.quests, ...fresh] } : prev;
  });
  return (
    <section className={card} data-testid="coach-plyo">
      <h3 className="font-black text-white">Pliométrie et façons de travailler</h3>
      <div className="space-y-1">
        <p className="text-xs font-bold text-slate-300">Séances avec des sauts par semaine{sport ? ` (pour ${sportInfo(sport).poss})` : ''}</p>
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map(n => (
            <button key={n} type="button" onClick={() => setPer(n)} aria-pressed={per === n} data-testid={`plyo-week-${n}`}
              className={`tap-free w-10 py-1.5 rounded-lg text-sm font-black border ${per === n ? 'bg-pink-600 border-pink-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>{n}</button>
          ))}
        </div>
        <p className="text-[11px] text-slate-400">Les sauts se font en début de séance, les jours où tes jambes peuvent travailler{coach.sport ? ' (jamais la veille d’un match)' : ''}, avec au moins un jour d’écart.</p>
      </div>
      <div className="flex flex-wrap gap-1.5 text-xs" data-testid="plyo-pack">
        {pack.map(id => {
          const c = EXERCISE_CATALOG.find(x => x.id === id);
          if (!c) return null;
          return missing.includes(id)
            ? <button key={id} type="button" onClick={() => add([id])} data-testid={`plyo-add-${id}`} className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 font-bold">+ {c.name}</button>
            : <span key={id} className="px-2.5 py-1 rounded-lg bg-emerald-900/30 border border-emerald-500/40 text-emerald-300 font-bold">{c.name}</span>;
        })}
      </div>
      {missing.length > 1 && <button type="button" onClick={() => add(missing)} data-testid="plyo-add-pack" className="w-full py-2 rounded-xl bg-pink-600 text-white text-sm font-black">Ajouter les {missing.length} exercices de sauts</button>}
      <button type="button" onClick={() => setOpen(x => !x)} className="text-xs font-bold text-pink-300 underline" data-testid="contraction-toggle">{open ? 'Masquer' : 'Concentrique, excentrique, isométrique, pliométrique : c’est quoi ?'}</button>
      {open && (
        <div className="space-y-2" data-testid="contraction-info">
          {CONTRACTION_MODES.map(m => <p key={m.id} className="text-xs text-slate-300"><b className="text-white">{m.label}</b> : {m.short}</p>)}
          <p className="text-xs text-slate-300">Pour une séance d’isométrie, d’excentrique ou explosive : sur la prochaine séance ou un jour de « Ma semaine », choisis la « Façon de travailler ». Pour un seul exercice : « Pourquoi ? / Ajuster » → Forme des séries.</p>
          {CONTRACTION_SOURCES.map((s, i) => (
            <div key={i} className="text-xs bg-slate-950 border border-slate-800 rounded-xl p-2.5">
              <p className="text-slate-200"><b>{s.mark}</b> {s.ref}</p>
              <p className="text-slate-400 mt-0.5">{s.finding}</p>
              <a href={s.url} target="_blank" rel="noreferrer" className="text-sky-300 underline">Ouvrir la source</a>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
