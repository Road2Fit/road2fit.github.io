import { useState } from 'react';

// Bloc repliable : le contenu n'est affiché (et calculé) qu'une fois ouvert.
export function Fold({ children, defaultOpen = false, subtitle, title }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 bg-slate-900/70 border border-slate-700 rounded-2xl px-4 py-3.5 text-left"
      >
        <span>
          <span className="block font-black text-white text-sm">{title}</span>
          {subtitle && !open && <span className="block text-xs text-slate-400 mt-0.5">{subtitle}</span>}
        </span>
        <span className="text-slate-300 text-lg">{open ? '▾' : '▸'}</span>
      </button>
      {open && children}
    </div>
  );
}
