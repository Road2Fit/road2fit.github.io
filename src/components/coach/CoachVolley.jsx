import { useState } from 'react';
import { EXERCISE_CATALOG } from '../../data/catalog';
import { card } from './ui';
import { missingPlyo, plyoPerWeek } from '../../coach/contraction';
import { sportPerf } from '../../data/sportPerf';
import { STYLE_LABEL } from './perfLabels';
import { makeQuestFromCatalog } from '../../lib/questFactory';
import { getTodayISODate } from '../../lib/dates';

export function CoachVolley({ gameState, setGameState, onAddExercise, sport }) {
  const [showSrc, setShowSrc] = useState(false);
  // 4.42 : programme de performance du sport (exercices adaptés + séances avec des sauts conseillées), pour tous les sports
  const perf = sportPerf(sport.id);
  const jump = !!setGameState;
  const [showPerfSrc, setShowPerfSrc] = useState(false);
  const per = plyoPerWeek(gameState.coach);
  const missing = jump ? missingPlyo(gameState, sport.id) : [];
  const startPlyo = () => setGameState(prev => {
    const today = getTodayISODate();
    const fresh = missingPlyo(prev, sport.id).map(id => EXERCISE_CATALOG.find(c => c.id === id)).filter(Boolean).map(c => makeQuestFromCatalog(c, prev, today, 'pliométrie').quest);
    const pl = (prev.coach && prev.coach.plyo) || {};
    return { ...prev, quests: [...prev.quests, ...fresh], coach: { ...prev.coach, plyo: { ...pl, perWeek: Math.max(perf.perWeek, Number(pl.perWeek) || 0) } } };
  });
  return (
    <section className={card}>
      <h3 className="font-black text-white">{sport.icon} {sport.cap} : {sport.title}</h3>
      <p className="text-xs text-slate-300">
        {sport.intro}
      </p>
      <div className="flex flex-wrap gap-1.5 text-xs">
        {sport.exercises.map(id => {
          const c = EXERCISE_CATALOG.find(x => x.id === id);
          if (!c) return null;
          const owned = gameState.quests.some(q => q.catalogId === id);
          return owned ? (
            <span key={id} className="px-2.5 py-1 rounded-lg bg-emerald-900/30 border border-emerald-500/40 text-emerald-300 font-bold">{c.name}</span>
          ) : (
            <button key={id} onClick={() => onAddExercise(id)} className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-bold">+ {c.name}</button>
          );
        })}
      </div>
      {jump && (
        <div className="rounded-xl bg-slate-950 border border-slate-800 p-2.5 space-y-1.5" data-testid="sport-plyo">
          <p className="text-xs font-black text-white">Performance : {perf.focus}</p>
          <div className="flex flex-wrap gap-1 text-[11px]">
            {perf.pack.map(id => { const c = EXERCISE_CATALOG.find(x => x.id === id); return c ? <span key={id} className={`px-2 py-0.5 rounded-md border ${missing.includes(id) ? 'border-slate-700 text-slate-300' : 'border-emerald-500/40 text-emerald-300'}`}>{c.name}</span> : null; })}
          </div>
          <p className="text-xs text-slate-300">{perf.perWeek > 0 ? `${perf.perWeek} séance${perf.perWeek > 1 ? 's' : ''} par semaine commence${perf.perWeek > 1 ? 'nt' : ''} par ces sauts, quand tu es frais.` : 'Ces exercices entrent dans tes séances habituelles.'}{perf.style ? ` Conseil : de temps en temps, une séance « ${STYLE_LABEL[perf.style]} » (Façon de travailler).` : ''}</p>
          {!missing.length && (perf.perWeek === 0 || per >= perf.perWeek)
            ? <p className="text-xs text-emerald-300" data-testid="sport-plyo-on">Programme en place{per > 0 ? ` : ${per} séance${per > 1 ? 's' : ''} avec des sauts par semaine` : ''}.</p>
            : <button type="button" onClick={startPlyo} data-testid="sport-plyo-start" className="w-full py-2 rounded-xl bg-pink-600 text-white text-sm font-black">Mettre en place le programme {sport.de}</button>}
          <button type="button" onClick={() => setShowPerfSrc(x => !x)} className="text-[11px] font-bold text-pink-300 underline" data-testid="sport-perf-sources-toggle">{showPerfSrc ? 'Masquer les études' : `Études (${perf.sources.length})`}</button>
          {showPerfSrc && perf.sources.map((x, i) => (
            <div key={i} className="text-xs bg-slate-900 border border-slate-800 rounded-lg p-2" data-testid="sport-perf-source">
              <p className="text-slate-200"><b>{x.mark}</b> {x.ref}</p>
              <p className="text-slate-400">{x.finding}</p>
              <a href={x.url} target="_blank" rel="noreferrer" className="text-sky-300 underline">Ouvrir la source</a>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-amber-200/90" data-testid="sport-evidence">{sport.note}</p>
      {sport.sources.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowSrc(x => !x)} className="text-xs font-bold text-pink-300 underline" data-testid="sport-sources-toggle">{showSrc ? 'Masquer les études' : `Voir les études (${sport.sources.length})`}</button>
          {showSrc && (
            <div className="space-y-2 mt-2" data-testid="sport-sources">
              <p className="text-xs text-slate-500">✔ = référence retrouvée en ligne avec ses chiffres (lus dans le résumé, pas dans le texte complet) ; ◐ = référence réelle mais auteurs, revue ou chiffre à vérifier. Les études portent sur des groupes, souvent des jeunes ou des sportifs d’élite.</p>
              {sport.sources.map((s, i) => (
                <div key={i} className="text-xs bg-slate-950 border border-slate-800 rounded-xl p-2.5">
                  <p className="text-slate-200"><b>{s.ok ? '✔' : '◐'}</b> {s.text}</p>
                  <p className="text-slate-400 mt-0.5">→ {s.use}</p>
                  {s.url && <a href={s.url} target="_blank" rel="noreferrer" className="text-sky-300 underline">Ouvrir la source</a>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
