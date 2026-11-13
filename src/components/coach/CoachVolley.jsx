import { useState } from 'react';
import { EXERCISE_CATALOG } from '../../data/catalog';
import { card } from './ui';
import { JUMP_SPORTS, missingPlyo, plyoPerWeek } from '../../coach/contraction';
import { makeQuestFromCatalog } from '../../lib/questFactory';
import { getTodayISODate } from '../../lib/dates';

export function CoachVolley({ gameState, setGameState, onAddExercise, sport }) {
  const [showSrc, setShowSrc] = useState(false);
  // 4.42 : sports de saut → pliométrie pour la détente (exercices du sport + 2 séances par semaine)
  const jump = JUMP_SPORTS.includes(sport.id) && setGameState;
  const per = plyoPerWeek(gameState.coach);
  const missing = jump ? missingPlyo(gameState, sport.id) : [];
  const startPlyo = () => setGameState(prev => {
    const today = getTodayISODate();
    const fresh = missingPlyo(prev, sport.id).map(id => EXERCISE_CATALOG.find(c => c.id === id)).filter(Boolean).map(c => makeQuestFromCatalog(c, prev, today, 'pliométrie').quest);
    const pl = (prev.coach && prev.coach.plyo) || {};
    return { ...prev, quests: [...prev.quests, ...fresh], coach: { ...prev.coach, plyo: { ...pl, perWeek: Math.max(2, Number(pl.perWeek) || 0) } } };
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
          <p className="text-xs font-black text-white">Détente : pliométrie</p>
          <p className="text-xs text-slate-300">Des sauts en début de séance améliorent la détente verticale (chez les volleyeurs : méta-analyse Ramirez-Campillo 2020), même à faible volume.</p>
          {per > 0 && !missing.length
            ? <p className="text-xs text-emerald-300" data-testid="sport-plyo-on">{per} séance{per > 1 ? 's' : ''} avec des sauts par semaine (réglable dans « Pliométrie et façons de travailler »).</p>
            : <button type="button" onClick={startPlyo} data-testid="sport-plyo-start" className="w-full py-2 rounded-xl bg-pink-600 text-white text-sm font-black">Ajouter les sauts {sport.de} (2 séances par semaine)</button>}
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
