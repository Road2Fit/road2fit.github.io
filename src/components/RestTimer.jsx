import { useEffect, useState } from 'react';
import { playGameSound } from '../lib/sound';

export function RestTimer({ guidedOpen = false, soundEnabled }) {
  const [open, setOpen] = useState(false);
  const [endAt, setEndAt] = useState(null);
  const [left, setLeft] = useState(0);
  const [total, setTotal] = useState(90);
  const [next, setNext] = useState('');
  useEffect(() => {
    if (!endAt) return;
    const id = setInterval(() => {
      const l = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setLeft(l);
      if (l === 0) {
        clearInterval(id);
        setEndAt(null);
        playGameSound('boss', soundEnabled);
        try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {}
      }
    }, 250);
    return () => clearInterval(id);
  }, [endAt]);
  const start = sec => { setTotal(sec); setLeft(sec); setEndAt(Date.now() + sec * 1000); };
  const addTime = () => { setTotal(t => t + 30); setLeft(l => l + 30); setEndAt(e => (e || Date.now()) + 30000); };
  const stop = () => { setEndAt(null); setLeft(0); setNext(''); };
  useEffect(() => {
    const h = e => {
      const d = e.detail;
      start(Number(d && typeof d === 'object' ? d.sec : d) || 90);
      setNext(d && typeof d === 'object' && d.next ? d.next : '');
    };
    const o = () => setOpen(true);
    window.addEventListener('rondoufit-rest', h);
    window.addEventListener('rondoufit-rest-open', o);
    return () => { window.removeEventListener('rondoufit-rest', h); window.removeEventListener('rondoufit-rest-open', o); };
  });
  const fmt = sec => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  const running = !!endAt;
  // pendant une séance guidée : en bas à droite ; sinon seulement s'il tourne ou s'il est ouvert, à gauche pour laisser la place au bouton « + »
  if (!guidedOpen && !running && !open) return null;
  return (
    <div className={`fixed flex flex-col gap-2 ${guidedOpen ? 'z-[62] bottom-[72px] inset-x-0 px-4 py-2 items-stretch bg-slate-950 border-t border-slate-800' : 'z-40 bottom-20 md:bottom-6 left-4 items-start'}`}>
      {open && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-3 shadow-2xl w-56 self-end space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-pink-300">Repos entre séries</span>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
          </div>
          {running && (
            <div>
              <div className="text-3xl font-black text-white text-center tabular-nums">{fmt(left)}</div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                <div className="h-full bg-pink-500 transition-all" style={{ width: `${Math.min(100, (left / total) * 100)}%` }} />
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={addTime} className="flex-1 py-1.5 rounded-lg bg-slate-800 text-xs font-bold text-slate-200 hover:bg-slate-700">+30 s</button>
                <button onClick={stop} className="flex-1 py-1.5 rounded-lg bg-rose-900/60 text-xs font-bold text-rose-200 hover:bg-rose-800">Stop</button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            {[60, 90, 120].map(sec => (
              <button key={sec} onClick={() => start(sec)} className="py-2 rounded-lg bg-pink-600/80 hover:bg-pink-600 text-white text-xs font-black">
                {sec} s
              </button>
            ))}
          </div>
        </div>
      )}
      {running && next && !guidedOpen && <span className="px-3 py-1 rounded-full bg-slate-900/95 border border-emerald-400/50 text-xs font-bold text-emerald-100 shadow-lg max-w-[16rem] truncate">{next}</span>}
      <button
        onClick={() => setOpen(o => !o)}
        title="Minuteur de repos"
        className={`${guidedOpen ? 'w-full max-w-2xl mx-auto py-2 rounded-xl' : 'h-12 px-4 rounded-full shadow-xl'} text-sm font-black flex items-center justify-center gap-2 ${
          running ? 'bg-emerald-600 text-white' : guidedOpen ? 'bg-slate-800 text-slate-200' : 'bg-slate-800 text-white'
        }`}
      >
        {running ? <span className="tabular-nums text-base">Repos {fmt(left)}</span> : <span>Repos</span>}
        {running && next && guidedOpen && <span className="font-bold text-xs truncate">{next}</span>}
      </button>
    </div>
  );
}
