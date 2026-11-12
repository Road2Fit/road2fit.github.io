import { useState } from 'react';
import { FLAG_PROBLEMS } from '../form/flag';

/** 4.38 : « Signaler une erreur » sous le rapport d'une série filmée. Envoie le squelette de la série (jamais l'image)
 *  avec ce qui est faux et le bon nombre de reps, pour corriger l'algorithme plus tard. */
export function FormFlag({ onFlag, noted = 0, counted = null, chin = false, timed = false }) {
  const [open, setOpen] = useState(false);
  const [problems, setProblems] = useState(() => (counted != null && counted !== noted && !timed ? ['count'] : []));
  const [reps, setReps] = useState(Number(noted) || 0);
  const [note, setNote] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | sent | error
  const [err, setErr] = useState('');
  if (!onFlag) return null;
  if (state === 'sent') return <p className="text-xs font-bold text-emerald-300" data-testid="flag-sent">Merci, c’est envoyé : ce cas servira à corriger l’analyse.</p>;
  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="w-full py-1 text-[11px] font-bold text-slate-400 underline underline-offset-2" data-testid="form-flag-open">Cette analyse est fausse ? Signaler une erreur</button>;
  }
  const toggle = id => setProblems(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));
  const list = FLAG_PROBLEMS.filter(p => !p.chinOnly || chin);
  const send = () => {
    setState('sending'); setErr('');
    Promise.resolve(onFlag({ problems, trueReps: problems.includes('count') && !timed ? reps : null, note }))
      .then(() => setState('sent'), e => { setState('error'); setErr((e && e.message) || 'Envoi impossible.'); });
  };
  return (
    <div className="bg-slate-950 rounded-xl px-2.5 py-2 space-y-2" data-testid="form-flag">
      <p className="text-xs font-black text-white">Qu’est-ce qui est faux ?</p>
      <div className="flex flex-wrap gap-1.5">
        {list.map(p => (
          <button key={p.id} type="button" onClick={() => toggle(p.id)} aria-pressed={problems.includes(p.id)} data-testid={`flag-${p.id}`}
            className={`tap-free px-2.5 py-1.5 rounded-lg text-xs font-bold border ${problems.includes(p.id) ? 'bg-pink-600 border-pink-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>{p.label}</button>
        ))}
      </div>
      {problems.includes('count') && !timed && (
        <div className="flex items-center gap-2">
          <span className="flex-1 text-xs text-slate-300">Reps vraiment faites{counted != null ? ` (la caméra en a vu ${counted})` : ''}</span>
          <button type="button" onClick={() => setReps(v => Math.max(0, v - 1))} aria-label="Une rep de moins" data-testid="flag-reps-minus" className="w-8 h-8 rounded-lg bg-slate-800 text-white font-black">−</button>
          <span className="w-8 text-center text-sm font-black text-white" data-testid="flag-reps">{reps}</span>
          <button type="button" onClick={() => setReps(v => v + 1)} aria-label="Une rep de plus" data-testid="flag-reps-plus" className="w-8 h-8 rounded-lg bg-slate-800 text-white font-black">+</button>
        </div>
      )}
      <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={500} placeholder="Précise si tu veux (ex. la 3e rep n’a pas été comptée, quelqu’un passait derrière…)" data-testid="flag-note"
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-slate-500" />
      <p className="text-[11px] text-slate-500">Envoyé : le squelette de ta série (des points, en chiffres) et ces réponses. Jamais l’image ni la vidéo.</p>
      {state === 'error' && <p className="text-xs text-rose-200" data-testid="flag-error">{err}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2 rounded-lg bg-slate-800 text-xs font-bold text-slate-200">Annuler</button>
        <button type="button" onClick={send} disabled={!problems.length || state === 'sending'} className="flex-1 py-2 rounded-lg bg-pink-600 text-xs font-black text-white disabled:opacity-40" data-testid="flag-send">{state === 'sending' ? 'Envoi…' : 'Envoyer'}</button>
      </div>
    </div>
  );
}
