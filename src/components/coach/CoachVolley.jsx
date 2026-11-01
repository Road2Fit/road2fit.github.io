import { useState } from 'react';
import { EXERCISE_CATALOG } from '../../data/catalog';
import { card } from './ui';

export function CoachVolley({ gameState, onAddExercise, sport }) {
  const [showSrc, setShowSrc] = useState(false);
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
