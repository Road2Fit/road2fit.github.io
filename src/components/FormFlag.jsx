import { useState } from 'react';
import { FLAG_PROBLEMS } from '../form/flag';

/** 4.38 : « Signaler une erreur » sous le rapport d'une série filmée. Envoie le squelette de la série (jamais l'image)
 *  avec ce qui est faux et le bon nombre de reps, pour corriger l'algorithme plus tard.
 *  4.49 (demande de Gabin) : « Analyse juste ? L'envoyer comme modèle » : même envoi, marqué 'good', pour comparer les
 *  séries bien comptées et les autres. Si le nombre corrigé diffère de celui de la caméra, c'est un signalement de reps. */
export function FormFlag({ onFlag, noted = 0, counted = null, chin = false, timed = false, allowGood = true }) {
  const [open, setOpen] = useState(null); // null | 'error' | 'good'
  const [problems, setProblems] = useState(() => (counted != null && counted !== noted && !timed ? ['count'] : []));
  const [reps, setReps] = useState(Number(noted) || 0);
  const [goodReps, setGoodReps] = useState(counted != null ? counted : Number(noted) || 0);
  const [note, setNote] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | sent | error
  const [sentGood, setSentGood] = useState(false);
  const [err, setErr] = useState('');
  if (!onFlag) return null;
  if (state === 'sent') {
    return <p className="text-xs font-bold text-emerald-300" data-testid="flag-sent">{sentGood ? 'Merci, c’est envoyé : cette série servira de modèle de série bien comptée.' : 'Merci, c’est envoyé : ce cas servira à corriger l’analyse.'}</p>;
  }
  const canGood = allowGood && (timed || counted != null);
  if (!open) {
    return (
      <div className="space-y-0.5">
        {canGood && <button type="button" onClick={() => setOpen('good')} className="w-full py-1 text-[11px] font-bold text-emerald-300 underline underline-offset-2" data-testid="form-good-open">Analyse juste ? L’envoyer comme modèle</button>}
        <button type="button" onClick={() => setOpen('error')} className="w-full py-1 text-[11px] font-bold text-slate-400 underline underline-offset-2" data-testid="form-flag-open">Cette analyse est fausse ? Signaler une erreur</button>
      </div>
    );
  }
  const send = payload => {
    setState('sending'); setErr('');
    setSentGood(payload.problems.includes('good'));
    Promise.resolve(onFlag(payload))
      .then(() => setState('sent'), e => { setState('error'); setErr((e && e.message) || 'Envoi impossible.'); });
  };
  const privacy = <p className="text-[11px] text-slate-500">Envoyé : le squelette de ta série (des points, en chiffres) et ces réponses. Jamais l’image ni la vidéo.</p>;
  const noteBox = placeholder => (
    <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={500} placeholder={placeholder} data-testid="flag-note"
      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-slate-500" />
  );
  const stepper = (value, set, label, prefix) => (
    <div className="flex items-center gap-2">
      <span className="flex-1 text-xs text-slate-300">{label}</span>
      <button type="button" onClick={() => set(v => Math.max(0, v - 1))} aria-label="Une rep de moins" data-testid={`${prefix}-minus`} className="w-8 h-8 rounded-lg bg-slate-800 text-white font-black">−</button>
      <span className="w-8 text-center text-sm font-black text-white" data-testid={prefix}>{value}</span>
      <button type="button" onClick={() => set(v => v + 1)} aria-label="Une rep de plus" data-testid={`${prefix}-plus`} className="w-8 h-8 rounded-lg bg-slate-800 text-white font-black">+</button>
    </div>
  );
  const buttons = (onSend, disabled, label) => (
    <div className="flex gap-2">
      <button type="button" onClick={() => setOpen(null)} className="flex-1 py-2 rounded-lg bg-slate-800 text-xs font-bold text-slate-200">Annuler</button>
      <button type="button" onClick={onSend} disabled={disabled || state === 'sending'} className="flex-1 py-2 rounded-lg bg-pink-600 text-xs font-black text-white disabled:opacity-40" data-testid="flag-send">{state === 'sending' ? 'Envoi…' : label}</button>
    </div>
  );

  if (open === 'good') {
    const differs = !timed && counted != null && goodReps !== counted;
    return (
      <div className="bg-slate-950 rounded-xl px-2.5 py-2 space-y-2" data-testid="form-good">
        <p className="text-xs font-black text-white">Envoyer cette série comme modèle</p>
        <p className="text-[11px] text-slate-400">Une série bien filmée et bien comptée sert de comparaison avec celles où l’analyse se trompe.</p>
        {!timed && stepper(goodReps, setGoodReps, `Reps vraiment faites (la caméra en a vu ${counted})`, 'good-reps')}
        {differs && <p className="text-[11px] text-amber-300" data-testid="good-differs">Ce n’est pas le nombre vu par la caméra : ce sera envoyé comme une erreur de comptage.</p>}
        {noteBox('Précise si tu veux (ex. téléphone couché, filmé de profil…)')}
        {privacy}
        {state === 'error' && <p className="text-xs text-rose-200" data-testid="flag-error">{err}</p>}
        {buttons(() => send({ problems: differs ? ['count'] : ['good'], trueReps: timed ? null : goodReps, note }), false, 'Envoyer')}
      </div>
    );
  }

  const toggle = id => setProblems(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));
  const list = FLAG_PROBLEMS.filter(p => !p.hidden && (!p.chinOnly || chin));
  return (
    <div className="bg-slate-950 rounded-xl px-2.5 py-2 space-y-2" data-testid="form-flag">
      <p className="text-xs font-black text-white">Qu’est-ce qui est faux ?</p>
      <div className="flex flex-wrap gap-1.5">
        {list.map(p => (
          <button key={p.id} type="button" onClick={() => toggle(p.id)} aria-pressed={problems.includes(p.id)} data-testid={`flag-${p.id}`}
            className={`tap-free px-2.5 py-1.5 rounded-lg text-xs font-bold border ${problems.includes(p.id) ? 'bg-pink-600 border-pink-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>{p.label}</button>
        ))}
      </div>
      {problems.includes('count') && !timed && stepper(reps, setReps, `Reps vraiment faites${counted != null ? ` (la caméra en a vu ${counted})` : ''}`, 'flag-reps')}
      {noteBox('Précise si tu veux (ex. la 3e rep n’a pas été comptée, quelqu’un passait derrière…)')}
      {privacy}
      {state === 'error' && <p className="text-xs text-rose-200" data-testid="flag-error">{err}</p>}
      {buttons(() => send({ problems, trueReps: problems.includes('count') && !timed ? reps : null, note }), !problems.length, 'Envoyer')}
    </div>
  );
}
