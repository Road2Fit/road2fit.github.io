import { Art } from './Art';
import { useEffect, useRef, useState } from 'react';

// Bouton « + » flottant : les actions de saisie rapide au même endroit (au pouce)
export function QuickAddMenu({ onCourse, onExercise, onTimer, onVoice }) {
  const [open, setOpen] = useState(false);
  // Il s'efface quand on descend (pour ne cacher aucun bouton) et revient dès qu'on remonte
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY.current) < 8) return;
      setHidden(y > lastY.current && y > 80);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const item = (label, icon, fn, title) => (
    <button key={label} onClick={() => { setOpen(false); fn(); }} title={title} className="flex items-center gap-2 px-4 py-3 rounded-full bg-slate-900 border border-slate-600 text-sm font-bold text-white shadow-xl">
      <Art name={icon} size={20} bare />
      <span>{label}</span>
    </button>
  );
  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-slate-950/50" onClick={() => setOpen(false)} />}
      <div className={`fixed right-4 bottom-20 md:bottom-6 z-40 flex flex-col items-end gap-2 transition-transform duration-200 ${hidden && !open ? 'translate-x-24' : ''}`}>
        {open && (
          <div className="flex flex-col items-end gap-2">
            {item('Dicter ma séance', 'mic', onVoice, 'Dicter toute ma séance à la voix')}
            {item('Nouvel exercice', 'dumbbell', onExercise)}
            {item('Activité (course, sport…)', 'runner', onCourse)}
            {item('Minuteur de repos', 'timer', onTimer)}
          </div>
        )}
        <button
          onClick={() => setOpen(o => !o)}
          aria-label="Ajouter"
          title="Ajouter"
          className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl bg-pink-600 transition-transform ${open ? 'rotate-45' : ''}`}
        >
          <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" aria-hidden="true"><path d="M12 4v16M4 12h16" /></svg>
        </button>
      </div>
    </>
  );
}
