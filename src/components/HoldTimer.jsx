import { useEffect, useRef, useState } from 'react';
import { playRepBeep, unlockBeep } from '../form/repBeep';

/**
 * 4.42 : chrono de tenue isométrique dans la séance guidée. « Tenir » lance le décompte de la position (5 s à chaque rep
 * pour une pause isométrique, 20-30 s pour une tenue) ; un bip et une vibration à la fin, puis la tenue suivante.
 */
export function HoldTimer({ seconds, reps = 1, where = '' }) {
  const [start, setStart] = useState(null);
  const [done, setDone] = useState(0);
  const [now, setNow] = useState(0);
  const doneRef = useRef(0);
  useEffect(() => {
    if (start === null) return undefined;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t - start >= seconds * 1000) {
        clearInterval(id);
        try { playRepBeep(); } catch { /* son indisponible */ }
        try { if (navigator.vibrate) navigator.vibrate(120); } catch { /* pas de vibreur */ }
        doneRef.current += 1;
        setDone(doneRef.current);
        setStart(null);
      }
    }, 200);
    return () => clearInterval(id);
  }, [start, seconds]);
  const left = start === null ? seconds : Math.max(0, Math.ceil(seconds - (now - start) / 1000));
  const all = done >= reps;
  return (
    <div className="rounded-2xl border border-violet-500/50 bg-violet-950/40 p-3 text-center space-y-2" data-testid="hold-timer">
      <p className="text-xs font-bold text-violet-200">Tiens {seconds} s {where}{reps > 1 ? ` à chaque rep (${Math.min(done, reps)}/${reps})` : ''}</p>
      <p className="text-4xl font-black text-white" data-testid="hold-left">{left} s</p>
      <button type="button" disabled={start !== null} data-testid="hold-start"
        onClick={() => { unlockBeep(); const t = Date.now(); setNow(t); setStart(t); }}
        className="w-full py-2.5 rounded-xl bg-violet-600 text-white text-sm font-black disabled:opacity-50">
        {start !== null ? 'Tiens…' : all ? 'Encore une tenue' : reps > 1 ? `Tenir (rep ${done + 1})` : 'Lancer la tenue'}
      </button>
    </div>
  );
}
