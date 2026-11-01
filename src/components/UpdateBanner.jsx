import { useEffect, useState } from 'react';

// « Nouvelle version disponible » : s'affiche quand main.jsx détecte une mise à jour (événement rondoufit-update)
export function UpdateBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const h = () => setShow(true);
    window.addEventListener('rondoufit-update', h);
    return () => window.removeEventListener('rondoufit-update', h);
  }, []);
  if (!show) return null;
  return (
    <div className="fixed top-3 inset-x-3 z-[80] flex justify-center">
      <div className="flex items-center gap-3 bg-emerald-950 border border-emerald-400/60 rounded-2xl px-4 py-2.5 shadow-2xl text-sm text-emerald-100">
        <span className="font-bold">Nouvelle version disponible</span>
        <button onClick={() => window.location.reload()} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs">Recharger</button>
        <button onClick={() => setShow(false)} aria-label="Plus tard" className="text-emerald-300 text-xs font-bold">Plus tard</button>
      </div>
    </div>
  );
}
