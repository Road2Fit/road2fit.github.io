import { useMemo, useState } from 'react';
import { SLANG, SLANG_CATS, searchSlang } from '../data/slang';

// « Lexique de la salle » (⚙️ Réglages et données → Lexique) : l'argot de la musculation, cherchable. Les mêmes mots sont compris par la dictée,
// la saisie d'un programme, la recherche d'exercice et le coach intelligent (data/slang.js).
export function LexiconModal({ onClose }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const list = useMemo(() => searchSlang(q).filter(e => !cat || e.cat === cat), [q, cat]);
  const chip = on => `px-2.5 py-1 rounded-full text-xs font-bold border ${on ? 'bg-pink-600 border-pink-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`;
  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/85 backdrop-blur-sm flex px-4 pt-14 sm:py-4 overflow-y-auto" onClick={onClose}>
      <div className="m-auto bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-4 space-y-3" onClick={e => e.stopPropagation()} role="dialog" aria-label="Lexique de la salle" data-testid="lexicon">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-white">Lexique de la salle</h3>
            <p className="text-xs text-slate-400">{SLANG.length} mots compris par l’appli et le coach.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="shrink-0 w-9 h-9 rounded-lg bg-slate-800 text-slate-300 font-black">✕</button>
        </div>
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Chercher : DC, RDL, top set, pump, sèche…" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white" data-testid="lexicon-search" />
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setCat('')} className={chip(!cat)}>Tout</button>
          {SLANG_CATS.map(c => <button key={c} type="button" onClick={() => setCat(c)} className={chip(cat === c)}>{c}</button>)}
        </div>
        <ul className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1" data-testid="lexicon-list">
          {list.map((e, i) => (
            <li key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
              <p className="text-sm font-black text-white">{e.t.slice(0, 5).join(' · ')}</p>
              <p className="text-xs text-slate-300">{e.means}</p>
            </li>
          ))}
          {!list.length && <li className="text-xs text-slate-400 p-2">Pas trouvé. Tu peux quand même l’écrire au coach intelligent : il connaît aussi beaucoup d’autres mots.</li>}
        </ul>
      </div>
    </div>
  );
}
