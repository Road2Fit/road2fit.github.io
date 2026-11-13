import { useState } from 'react';
import { normalizeSlang } from '../data/slang';
import { EXERCISE_CATALOG, normSearch } from '../data/catalog';
import { FINE_GROUPS, fineGroupOf, isOptimized, secondGroupOf } from '../data/muscles';
import { isTimedCatalog } from '../lib/quests';
import { DEFAULT_SPORT, sportInfo } from '../data/sports';
import { sportPerf } from '../data/sportPerf';

/** 4.43 : exercices adaptés au sport de la personne (prévention + programme de performance) ; null si aucun sport précisé. */
export function sportExercises(sportId) {
  const id = sportId === undefined ? DEFAULT_SPORT : sportId;
  if (!id) return null;
  const sp = sportInfo(id);
  const ids = [...new Set([...(sp.exercises || []), ...sportPerf(sp.id).pack])].filter(x => EXERCISE_CATALOG.some(c => c.id === x));
  return { sport: sp, ids };
}

// Sélecteur d'exercice avec barre de recherche
// `compat` + `onSelectOther` (changement d'exercice) : TOUS les exercices du muscle sont listés ; ceux qui ne se mesurent pas comme l'exercice actuel
// (kg / répétitions / durée) sont marqués et passent par `onSelectOther`.
export const unitLabel = c => (isTimedCatalog(c) ? 'durée' : c.unit === 'kg' ? 'charge en kg' : 'répétitions');

export function ExercisePicker({ value, onSelect, accept, allowCustom = true, compat, onSelectOther, onCreateAi = null, sportId }) {
  const mySport = sportExercises(sportId);
  const [query, setQuery] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState('');
  // introuvable : le coach intelligent crée l'exercice, ajouté au catalogue de tous les utilisateurs
  const createAi = async () => {
    if (!onCreateAi || aiBusy) return;
    setAiBusy(true); setAiMsg('');
    try { const id = await onCreateAi(query.trim()); setQuery(''); onSelect(id); } catch (e) { setAiMsg(e.message || 'Le coach n’a pas pu créer cet exercice.'); }
    setAiBusy(false);
  };
  const [filter, setFilter] = useState('all');
  const optimized = isOptimized();
  const FILTERS = optimized
    ? [['all', 'Tous'], ...(mySport ? [['sport', `${mySport.sport.icon} ${mySport.sport.cap}`]] : []), ...FINE_GROUPS.map(g => [g.id, `${g.icon} ${g.id === 'Hanches' ? 'Adducteurs' : g.id.replace('Ischio-jambiers', 'Ischios')}`]), ['cardio', '❤ Cardio']]
    : [['all', 'Tous'], ...(mySport ? [['sport', `${mySport.sport.icon} ${mySport.sport.cap}`]] : []), ['Dos', 'Dos'], ['Pectoraux', 'Pecs'], ['Jambes', 'Jambes'], ['Épaules & Bras', 'Épaules/Bras'], ['Abdominaux', 'Abdos'], ['cardio', '❤ Cardio']];
  const ORDER = optimized ? [...FINE_GROUPS.map(g => g.id), 'Course & Cardio', 'Volley-ball'] : ['Dos', 'Pectoraux', 'Jambes', 'Épaules & Bras', 'Abdominaux', 'Course & Cardio', 'Volley-ball'];
  const groupOf = c => (optimized ? fineGroupOf({ ...c, catalogId: c.id }) : c.category);
  const tokens = normSearch(query).split(/\s+/).filter(Boolean);
  const slangTokens = normSearch(normalizeSlang(query)).split(/\s+/).filter(Boolean); // « dc », « rdl », « ohp »…
  const results = EXERCISE_CATALOG
    .filter(c => {
      if (accept && !accept(c)) return false;
      const inFilter = filter === 'all' || (filter === 'sport' ? !!mySport && mySport.ids.includes(c.id) : filter === 'cardio' ? c.type === 'cardio' : (groupOf(c) === filter || (optimized && secondGroupOf({ ...c, catalogId: c.id }) === filter)) && c.type !== 'cardio');
      if (!inFilter) return false;
      const hay = normSearch(`${c.name} ${c.category} ${c.equip || ''} ${c.brands || ''}`);
      return tokens.every(t => hay.includes(t)) || (slangTokens.join(' ') !== tokens.join(' ') && slangTokens.every(t => hay.includes(t)));
    })
    .sort((a, b) => (filter === 'sport' ? mySport.ids.indexOf(a.id) - mySport.ids.indexOf(b.id) : ORDER.indexOf(groupOf(a)) - ORDER.indexOf(groupOf(b))));
  const selected = EXERCISE_CATALOG.find(c => c.id === value);
  return (
    <div className="space-y-2">
      <div className="text-xs text-pink-300 font-bold">
        Sélection : {selected ? `${selected.icon} ${selected.name}` : String(value).startsWith('custom') ? 'Exercice personnalisé' : '—'}
      </div>
      <input
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
        placeholder="🔍 Rechercher : pec deck, hammer, haltères, mollets, poulie…"
        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white"
      />
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            data-testid={`picker-filter-${id}`}
            className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
              filter === id ? 'bg-pink-600 border-pink-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="text-xs text-slate-500">{results.length} exercice(s)</div>
      <div className="max-h-56 overflow-y-auto space-y-1 pr-1 border border-slate-800 rounded-xl p-1.5 bg-slate-950">
        {results.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => (compat && !compat(c) ? onSelectOther(c) : onSelect(c.id))}
            data-testid={`pick-${c.id}`}
            className={`w-full text-left px-2.5 py-2 rounded-lg text-sm flex items-center justify-between gap-2 border ${compat && !compat(c) ? 'opacity-75 ' : ''}${
              c.id === value ? 'bg-pink-600/20 border-pink-500 text-white' : 'border-transparent hover:bg-slate-800 text-slate-200'
            }`}
          >
            <span className="font-semibold truncate">{c.icon} {c.name}</span>
            <span className="shrink-0 text-xs font-bold text-slate-400 bg-slate-800 rounded-full px-2 py-0.5">{compat && !compat(c) ? `Autre unité : ${unitLabel(c)}` : c.equip || (c.type === 'cardio' ? 'Cardio' : c.unit === 'kg' ? 'Charge' : 'Poids du corps')}</span>
          </button>
        ))}
        {results.length === 0 && <p className="text-xs text-slate-400 p-2">Aucun résultat</p>}
        {onCreateAi && query.trim().length >= 3 && results.length < 3 && (
          <button type="button" onClick={createAi} disabled={aiBusy} data-testid="picker-ai-create" className="w-full text-left px-2.5 py-2 rounded-lg text-sm text-sky-300 hover:bg-slate-800 font-bold">
            {aiBusy ? 'Le coach crée l’exercice…' : `Créer « ${query.trim()} » avec le coach (ajouté au catalogue de tout le monde)`}
          </button>
        )}
        {aiMsg && <p className="text-xs text-rose-300 px-2">{aiMsg}</p>}
        {allowCustom && <button type="button" onClick={() => onSelect('custom_bodyweight')} className="w-full text-left px-2.5 py-2 rounded-lg text-sm text-pink-300 hover:bg-slate-800 font-bold">
          Autre exercice au poids du corps personnalisé…
        </button>}
        {allowCustom && <button type="button" onClick={() => onSelect('custom_strength')} className="w-full text-left px-2.5 py-2 rounded-lg text-sm text-pink-300 hover:bg-slate-800 font-bold">
          Autre exercice avec charge (kg) personnalisé…
        </button>}
      </div>
    </div>
  );
}
